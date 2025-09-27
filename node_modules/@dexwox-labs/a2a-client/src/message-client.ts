/**
 * @module MessageClient
 * @description Client for sending and receiving messages between A2A agents
 */

import { EventEmitter } from 'events';
import {
  MessagePart,
  JsonRpcRequest,
  TraceClass,
} from '@dexwox-labs/a2a-core';
import { validateMessageParts } from '@dexwox-labs/a2a-core';
import { MessageClientOptions, StreamOptions } from './types';
import {
  normalizeError,
  A2ANetworkError,
} from './utils/error-handler';
import { sendRequest } from './utils/http-utils';
import { TaskClient } from './task-client';
import { AgentClient } from './agent-client';

/**
 * Client for sending and receiving messages between A2A agents
 * 
 * The MessageClient provides methods for sending messages to agents and
 * streaming real-time communication. It also provides access to related
 * TaskClient and AgentClient instances for convenience.
 * 
 * @example
 * ```typescript
 * const messageClient = new MessageClient({ baseUrl: 'https://a2a-server.example.com' });
 * 
 * // Send a simple text message to an agent
 * const messageId = await messageClient.sendMessage([
 *   { type: 'text', content: 'What is the weather in New York?' }
 * ], 'weather-agent');
 * ```
 */
@TraceClass()
export class MessageClient extends EventEmitter {
  /** Configuration options for the client */
  private readonly options: MessageClientOptions;
  /** Task client for managing tasks */
  public readonly tasks: TaskClient;
  /** Agent client for discovering and interacting with agents */
  public readonly agents: AgentClient;

  /**
   * Creates a new MessageClient instance
   * @param options - Configuration options for the client
   */
  constructor(options: MessageClientOptions) {
    super();
    this.options = {
      timeout: 5000,
      ...options
    };
    this.tasks = new TaskClient(this.options);
    this.agents = new AgentClient(this.options);
  }

  /**
   * Sends a message synchronously to an agent
   * 
   * This method sends a message to a specified agent and waits for the server to
   * acknowledge receipt. It validates the message parts before sending and handles
   * network errors appropriately.
   * 
   * @param parts - Array of message parts to send (text, file, data, etc.)
   * @param agentId - ID of the target agent to receive the message
   * @returns Promise resolving to the message ID assigned by the server
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the message parts are invalid
   * 
   * @example
   * ```typescript
   * // Send a text message
   * const textMessageId = await messageClient.sendMessage([
   *   { type: 'text', content: 'Hello, agent!' }
   * ], 'assistant-agent');
   * 
   * // Send a message with multiple parts
   * const multipartMessageId = await messageClient.sendMessage([
   *   { type: 'text', content: 'Here is the data you requested' },
   *   { 
   *     type: 'data', 
   *     content: { temperature: 72, humidity: 65 },
   *     schema: 'weather-data'
   *   }
   * ], 'weather-agent');
   * ```
   */
  async sendMessage(parts: MessagePart[], agentId: string): Promise<string> {
    validateMessageParts(parts);

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'sendMessage',
      params: { parts, agentId }
    };

    try {
      const response = await sendRequest(this.options, request);
      return response.result as string;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network')) {
        throw new A2ANetworkError('Failed to send message', {
          originalError: err,
          agentId
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Streams messages to and from an agent
   * 
   * This method establishes a real-time streaming connection with an agent,
   * allowing for continuous message exchange with automatic error handling.
   * 
   * @param parts - Initial message parts to send to the agent
   * @param agentId - ID of the target agent to stream with
   * @param options - Configuration options and event handlers for the stream
   * @param options.onMessage - Callback function for received messages
   * @param options.onError - Optional callback function for stream errors
   * @param options.onComplete - Optional callback function when stream completes
   * @returns Promise that resolves when the stream completes
   * @throws {A2ANetworkError} If there's a network issue establishing the stream
   * @throws {A2AValidationError} If the message parts are invalid
   * 
   * @example
   * ```typescript
   * await messageClient.streamMessage(
   *   [{ type: 'text', content: 'Tell me a story about dragons' }],
   *   'storyteller-agent',
   *   {
   *     onMessage: (data) => console.log('Received:', data),
   *     onError: (error) => console.error('Stream error:', error),
   *     onComplete: () => console.log('Stream completed')
   *   }
   * );
   * ```
   */
  async streamMessage(
    parts: MessagePart[],
    agentId: string,
    options: StreamOptions & {
      maxRetries?: number;
      retryDelay?: number;
      backoffFactor?: number;
      maxRetryDelay?: number;
      heartbeatInterval?: number;
      heartbeatTimeout?: number;
    }
  ): Promise<void> {
    const {
      maxRetries = 5,
      retryDelay = 1000,
      backoffFactor = 2,
      maxRetryDelay = 30000,
      heartbeatInterval = 10000,
      heartbeatTimeout = 30000,
      onMessage,
      onError,
      onComplete
    } = options;
    let retryCount = 0;
    let isStreaming = true;
    let lastHeartbeat = Date.now();

    const calculateDelay = (attempt: number): number => {
      const delay = retryDelay * Math.pow(backoffFactor, attempt);
      return Math.min(delay, maxRetryDelay);
    };

    const handleEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') {
          lastHeartbeat = Date.now();
        } else {
          if (data.type === 'taskUpdate' && this.tasks) {
            this.tasks.handleTaskUpdate(data.task);
          }
          onMessage(data);
        }
      } catch (err) {
        onError?.(new Error('Failed to parse SSE event'));
      }
    };

    const setupEventSource = (): EventSource => {
      const streamUrl = `${this.options.baseUrl}/stream?agentId=${agentId}`;
      const eventSource = new EventSource(streamUrl);

      eventSource.onmessage = handleEvent;

      eventSource.onerror = (error) => {
        eventSource.close();
        isStreaming = false;
        if (retryCount < maxRetries) {
          const delay = calculateDelay(retryCount);
          retryCount++;
          setTimeout(doStream, delay);
        } else {
          onError?.(new Error('Stream connection failed after retries'));
        }
      };

      eventSource.addEventListener('close', () => {
        isStreaming = false;
        onComplete?.();
      });

      return eventSource;
    };

    const doStream = async (): Promise<void> => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'streamMessage',
        params: { parts, agentId }
      };

      try {
        const response = await fetch(this.options.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.options.headers
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (!response.body) throw new Error('No response body for streaming');

        const eventSource = setupEventSource();

        // Heartbeat monitoring
        const heartbeatMonitor = setInterval(() => {
          if (isStreaming && Date.now() - lastHeartbeat > heartbeatTimeout) {
            eventSource.close();
            onError?.(new Error('Heartbeat timeout exceeded'));
          }
        }, heartbeatInterval);

        // Cleanup on completion
        return new Promise<void>((resolve) => {
          eventSource.addEventListener('close', () => {
            clearInterval(heartbeatMonitor);
            resolve();
          });
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('Network')) {
          throw new A2ANetworkError('Streaming connection failed', {
            originalError: err,
            agentId,
            retryCount
          });
        }
        throw normalizeError(err);
      }
    };

    return doStream();
  }
}
