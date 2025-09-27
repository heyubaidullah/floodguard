/**
 * @module HttpClient
 * @description Low-level HTTP client for communicating with A2A protocol servers
 */

import {
  type AgentCard,
  type Task,
  type MessagePart,
  type PushNotificationConfig,
  type Artifact,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcStreamResponse,
  A2AError,
  validateArtifact,
  TraceClass,
  Trace
} from '@dexwox-labs/a2a-core';

/**
 * Request interface for agent discovery
 * @internal
 */
interface DiscoverRequest extends JsonRpcRequest {
  method: 'discover';
  params: { capability?: string };
}

/**
 * Response interface for agent discovery
 * @internal
 */
interface DiscoverResponse extends JsonRpcResponse<{ agents: AgentCard[] }> {}
import { CircuitBreaker } from './utils/circuit-breaker';
import { AgentCardResolver } from './agent-card-resolver';

/**
 * Options for streaming operations
 * 
 * @internal
 */
interface StreamOptions {
  /** Callback function for received messages */
  onMessage: (data: JsonRpcStreamResponse) => void;
  /** Optional callback function for stream errors */
  onError?: (error: Error) => void;
  /** Optional callback function when stream completes */
  onComplete?: () => void;
}

/**
 * Configuration options for the HTTP client
 * 
 * These options control how the HTTP client connects to and communicates with
 * A2A protocol servers, including timeouts, headers, and authentication.
 * 
 * @example
 * ```typescript
 * const options: HttpClientOptions = {
 *   baseUrl: 'https://a2a-server.example.com',
 *   timeout: 10000, // 10 seconds
 *   headers: {
 *     'X-API-Key': 'your-api-key'
 *   },
 *   agentCard: {
 *     cacheTtl: 600000 // 10 minutes
 *   },
 *   pushAuth: {
 *     token: 'initial-auth-token',
 *     refresh: async () => {
 *       // Get a new token from your auth service
 *       return 'new-auth-token';
 *     }
 *   }
 * };
 * ```
 */
export interface HttpClientOptions {
  /** 
   * Base URL for API endpoints (e.g. 'https://api.example.com/v1')
   * This is the root URL where all A2A protocol requests will be sent
   */
  baseUrl: string;
  
  /**
   * Request timeout in milliseconds (default: 5000)
   * After this duration, requests will be aborted and an error thrown
   */
  timeout?: number;
  
  /** 
   * Additional HTTP headers to include with every request
   * Useful for authentication, tracking, and other custom headers
   */
  headers?: Record<string, string>;
  
  /**
   * Options for agent card resolution and caching
   * Controls how the client discovers and caches agent information
   */
  agentCard?: {
    /** Path to agent card (default: '/.well-known/agent.json') */
    path?: string;
    /** Cache TTL in milliseconds (default: 300000 - 5 minutes) */
    cacheTtl?: number;
  };
  
  /**
   * Push notification authentication configuration
   * Used for authenticating with push notification endpoints
   */
  pushAuth?: {
    /** Auth token for push notifications */
    token?: string;
    /** Auth token refresh callback that returns a new token when needed */
    refresh?: () => Promise<string>;
  };
}

/**
 * Low-level HTTP client for communicating with A2A protocol servers
 * 
 * This class provides the core HTTP communication layer for the A2A SDK,
 * handling JSON-RPC requests, streaming, and agent card resolution.
 * 
 * @example
 * ```typescript
 * const httpClient = new A2AHttpClient({
 *   baseUrl: 'https://a2a-server.example.com'
 * });
 * 
 * // Discover available agents
 * const agents = await httpClient.discover();
 * console.log('Available agents:', agents);
 * 
 * // Send a message to an agent
 * const messageId = await httpClient.sendMessage([
 *   { type: 'text', content: 'Hello, agent!' }
 * ], 'assistant-agent');
 * ```
 */
@TraceClass('A2AHttpClient')
export class A2AHttpClient {
  /** @private Configuration options for the client */
  private readonly options: HttpClientOptions;
  /** @private Circuit breaker for handling failures */
  private readonly circuitBreaker: CircuitBreaker;
  /** @private Resolver for agent card information */
  private readonly agentCardResolver: AgentCardResolver;

  /** @private Default circuit breaker configuration */
  private static readonly DEFAULT_CIRCUIT_BREAKER_OPTIONS = {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 10000
  };

  /**
   * Creates a new A2A HTTP client instance
   * 
   * Initializes the HTTP client with the provided options, setting up the circuit breaker
   * and agent card resolver. Default values are applied for any missing options.
   * 
   * @param options - Configuration options for the client
   * 
   * @example
   * ```typescript
   * // Basic configuration
   * const client = new A2AHttpClient({
   *   baseUrl: 'https://a2a-server.example.com'
   * });
   * 
   * // Advanced configuration
   * const advancedClient = new A2AHttpClient({
   *   baseUrl: 'https://a2a-server.example.com',
   *   timeout: 10000,
   *   headers: {
   *     'Authorization': 'Bearer token123',
   *     'X-Custom-Header': 'custom-value'
   *   },
   *   agentCard: {
   *     path: '/custom-agent-path.json',
   *     cacheTtl: 600000 // 10 minutes
   *   }
   * });
   * ```
   */
  constructor(options: HttpClientOptions) {
    this.options = {
      timeout: 5000,
      ...options
    };
    this.circuitBreaker = new CircuitBreaker(
      A2AHttpClient.DEFAULT_CIRCUIT_BREAKER_OPTIONS
    );
    this.agentCardResolver = new AgentCardResolver(this.options.baseUrl, {
      agentCardPath: this.options.agentCard?.path,
      cacheTtl: this.options.agentCard?.cacheTtl,
      timeout: this.options.timeout
    });
  }

  /**
   * Gets the resolved agent card for the connected server
   * 
   * Retrieves the agent card from the server, which contains metadata about
   * the agent's capabilities, name, and other information. Results are cached
   * according to the configured TTL.
   * 
   * @returns Promise resolving to the agent card
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * 
   * @example
   * ```typescript
   * const agentCard = await httpClient.getAgentCard();
   * console.log(`Connected to agent: ${agentCard.name}`);
   * console.log(`Agent capabilities: ${agentCard.capabilities.join(', ')}`);
   * ```
   */
  async getAgentCard(): Promise<AgentCard> {
    return this.agentCardResolver.resolve();
  }

  /**
   * Refreshes the agent card cache
   * 
   * Forces a refresh of the cached agent card information, bypassing the TTL.
   * This is useful when you know the agent's capabilities may have changed.
   * 
   * @returns Promise resolving to the refreshed agent card
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * 
   * @example
   * ```typescript
   * // Force a refresh of the agent card
   * const refreshedCard = await httpClient.refreshAgentCard();
   * console.log('Updated capabilities:', refreshedCard.capabilities);
   * ```
   */
  async refreshAgentCard(): Promise<AgentCard> {
    return this.agentCardResolver.refresh();
  }

  /**
   * Discovers available agents matching an optional capability filter
   * 
   * This method queries the A2A network for available agents. If a capability
   * is specified, only agents that support that capability will be returned.
   * 
   * @param capability - Optional capability filter (e.g., 'text-generation', 'image-generation')
   * @returns Promise resolving to an array of matching agent cards
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the capability filter is invalid
   * 
   * @example
   * ```typescript
   * // Get all available agents
   * const allAgents = await httpClient.discover();
   * console.log(`Found ${allAgents.length} agents`);
   * 
   * // Get only agents with text generation capability
   * const textAgents = await httpClient.discover('text-generation');
   * console.log(`Found ${textAgents.length} text generation agents`);
   * ```
   */
  async discover(capability?: string): Promise<AgentCard[]> {
    const request: DiscoverRequest = {
      jsonrpc: '2.0',
      method: 'discover',
      params: capability ? { capability } : {}
    };

    const response = await this.sendRequest(request);
    return response.result.agents;
  }

  /**
   * Gets task details by ID
   * 
   * Retrieves the current state and details of a task by its ID. This method
   * fetches the complete task object including status, input, output, and any
   * error information.
   * 
   * @param taskId - The ID of the task to retrieve
   * @returns Promise resolving to the complete task object
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the task ID is invalid or not found
   * 
   * @example
   * ```typescript
   * try {
   *   const task = await httpClient.getTask('task-123');
   *   console.log(`Task status: ${task.status}`);
   *   
   *   if (task.status === 'completed') {
   *     console.log('Task output:', task.output);
   *   } else if (task.status === 'failed') {
   *     console.error('Task failed:', task.error);
   *   }
   * } catch (error) {
   *   console.error('Error retrieving task:', error.message);
   * }
   * ```
   */
  async getTask(taskId: string): Promise<Task> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'getTask',
      params: { taskId }
    };

    const response = await this.sendRequest<JsonRpcResponse<Task>>(request);
    return response.result;
  }

  /**
   * Sends a task for execution
   * 
   * Submits a task to the A2A server for execution. The task can contain
   * input data, target agent information, and other parameters needed for
   * execution.
   * 
   * @param task - The task object to execute
   * @returns Promise resolving to the updated task with initial status
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the task is invalid
   * 
   * @example
   * ```typescript
   * const task = {
   *   id: 'task-' + Date.now(),
   *   name: 'Weather Analysis',
   *   agentId: 'weather-agent',
   *   status: 'submitted',
   *   input: { location: 'New York', days: 5 },
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString()
   * };
   * 
   * const submittedTask = await httpClient.sendTask(task);
   * console.log(`Task submitted with ID: ${submittedTask.id}`);
   * console.log(`Initial status: ${submittedTask.status}`);
   * ```
   */
  async sendTask(task: Task): Promise<Task> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'executeTask',
      params: { task }
    };

    const response = await this.sendRequest<JsonRpcResponse<Task>>(request);
    return response.result;
  }

  /**
   * Cancels a running task
   * @param taskId Task ID to cancel
   * @returns Promise resolving to updated Task
   * @throws A2AError if cancellation fails
   */
  async cancelTask(taskId: string): Promise<Task> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'cancelTask',
      params: { taskId }
    };

    const response = await this.sendRequest<JsonRpcResponse<Task>>(request);
    return response.result;
  }

  /**
   * Gets push notification configuration for a task
   * @param taskId Task ID to get config for
   * @returns Promise resolving to PushNotificationConfig
   * @throws A2AError if config retrieval fails
   */
  async getPushNotificationConfig(taskId: string): Promise<PushNotificationConfig> {
    const params: Record<string, unknown> = { taskId };
    
    // Add auth token if configured
    if (this.options.pushAuth?.token) {
      params.authToken = this.options.pushAuth.token;
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'getPushNotificationConfig',
      params
    };

    const response = await this.sendRequest<JsonRpcResponse<PushNotificationConfig>>(request);
    return response.result;
  }

  /**
   * Sets push notification configuration for a task
   * @param taskId Task ID to configure
   * @param config Push notification configuration
   * @returns Promise resolving to updated PushNotificationConfig
   * @throws A2AError if configuration fails
   */
  async setPushNotificationConfig(
    taskId: string,
    config: PushNotificationConfig
  ): Promise<PushNotificationConfig> {
    const params: Record<string, unknown> = { taskId, config };
    
    // Add auth token if configured
    if (this.options.pushAuth?.token) {
      params.authToken = this.options.pushAuth.token;
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'setPushNotificationConfig',
      params
    };

    const response = await this.sendRequest<JsonRpcResponse<PushNotificationConfig>>(request);
    return response.result;
  }

  /**
   * Refreshes the push notification auth token
   * @returns Promise resolving to new token
   * @throws A2AError if refresh fails
   */
  async refreshPushAuthToken(): Promise<string> {
    if (!this.options.pushAuth?.refresh) {
      throw {
        code: -32003,
        message: 'Push notification auth refresh not configured'
      };
    }

    try {
      const newToken = await this.options.pushAuth.refresh();
      this.options.pushAuth = {
        ...this.options.pushAuth,
        token: newToken
      };
      return newToken;
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  private async createStreamRequest(task: Task): Promise<Response> {
    const params: Record<string, unknown> = { task };
    
    // Add push auth token if configured
    if (this.options.pushAuth?.token) {
      params.authToken = this.options.pushAuth.token;
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'executeTask',
      params
    };

    const headers = {
      'Content-Type': 'application/json',
      ...this.options.headers
    };

    const response = await fetch(this.options.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.options.timeout!)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (!response.body) {
      throw new Error('No response body for streaming');
    }
    return response;
  }

  private async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onEvent: (event: JsonRpcStreamResponse) => void
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = this.processBuffer(buffer, onEvent);
    }
  }

  private processBuffer(buffer: string, onEvent: (event: JsonRpcStreamResponse) => void): string {
    const lines = buffer.split('\n');
    const remainingBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        this.processEventLine(line.substring(6).trim(), onEvent);
      }
    }

    return remainingBuffer;
  }

  private processEventLine(data: string, onEvent: (event: JsonRpcStreamResponse) => void): void {
    if (!data) return;
    
    try {
      const event = JSON.parse(data) as JsonRpcStreamResponse;
      onEvent(event);
    } catch (err) {
      console.error('Error parsing SSE event:', err);
    }
  }

  /**
   * Streams task execution events via Server-Sent Events (SSE)
   * @param task Task to execute
   * @param onEvent Callback for processing stream events
   * @returns Promise that resolves when stream completes
   * @throws A2AError if streaming fails to start
   */
  async streamTask(
    task: Task, 
    onEvent: (event: JsonRpcStreamResponse) => void,
    options?: {
      lastEventId?: string;
      onResubscribe?: (newTask: Task) => void;
    }
  ): Promise<void> {
    try {
      const params: Record<string, unknown> = { task };
      
      // Add push auth token if configured
      if (this.options.pushAuth?.token) {
        params.authToken = this.options.pushAuth.token;
      }
      
      // Add resubscription info if provided
      if (options?.lastEventId) {
        params.lastEventId = options.lastEventId;
      }

      const response = await fetch(this.options.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
          ...(options?.lastEventId && {
            'Last-Event-ID': options.lastEventId
          })
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'executeTask',
          params
        }),
        signal: AbortSignal.timeout(this.options.timeout!)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      await this.processStream(reader, onEvent);
    } catch (error) {
      if (options?.onResubscribe && this.isRecoverableError(error)) {
        const newTask = await this.resubscribeTask(task);
        options.onResubscribe(newTask);
        return this.streamTask(newTask, onEvent, options);
      }
      throw error;
    }
  }

  private isRecoverableError(error: unknown): boolean {
    return error instanceof Error && 
      (error.message.includes('connection') || 
       error.message.includes('timeout'));
  }

  private async resubscribeTask(task: Task): Promise<Task> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'resubscribeTask',
      params: { taskId: task.id }
    };
    const response = await this.sendRequest<JsonRpcResponse<Task>>(request);
    return response.result;
  }

  /**
   * Sends a message to an agent
   * @param parts Array of message parts (text/file/data)
   * @param agentId Target agent ID
   * @returns Promise resolving to message ID
   * @throws A2AError if message fails to send
   */
  /**
   * Uploads an artifact to the server
   * @param artifact Artifact data to upload
   * @returns Promise resolving to artifact ID
   * @throws A2AError if upload fails
   */
  async uploadArtifact(artifact: Artifact): Promise<string> {
    try {
      validateArtifact(artifact);
    } catch (err) {
      throw new A2AError(
        'Invalid artifact: ' + (err as Error).message,
        (err as A2AError).code || -32000
      );
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'uploadArtifact',
      params: { artifact }
    };

    try {
      const response = await this.sendRequest(request);
      return response.result as string;
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  /**
   * Downloads an artifact from the server
   * @param artifactId ID of artifact to download
   * @returns Promise resolving to artifact data
   * @throws A2AError if download fails
   */
  async downloadArtifact(artifactId: string): Promise<Artifact> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'downloadArtifact',
      params: { artifactId }
    };

    try {
      const response = await this.sendRequest<JsonRpcResponse<Artifact>>(request);
      return response.result;
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  /**
   * Sends a message to an agent
   * 
   * This method sends a message composed of one or more message parts to a
   * specified agent. Message parts can be text, files, or structured data.
   * 
   * @param parts - Array of message parts to send (text, file, data, etc.)
   * @param agentId - ID of the target agent to receive the message
   * @returns Promise resolving to the message ID assigned by the server
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the message parts or agent ID are invalid
   * 
   * @example
   * ```typescript
   * // Send a simple text message
   * const textMessageId = await httpClient.sendMessage([
   *   { type: 'text', content: 'Hello, agent!' }
   * ], 'assistant-agent');
   * 
   * // Send a message with multiple parts
   * const multipartMessageId = await httpClient.sendMessage([
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
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'sendMessage',
      params: { parts, agentId }
    };

    try {
      const response = await this.sendRequest(request);
      return response.result as string;
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  private normalizeError(err: unknown): A2AError {
    if (err instanceof Error) {
      return new A2AError(
        err.message,
        -32000,
        { stack: err.stack }
      );
    }
    return new A2AError(
      'Unknown error occurred',
      -32000,
      { originalError: err }
    );
  }

  /**
   * Sends a JSON-RPC request to the A2A server
   * 
   * This is the core method that handles all communication with the A2A server.
   * It uses the circuit breaker pattern to prevent cascading failures and
   * implements timeout handling.
   * 
   * @param request - JSON-RPC request object to send
   * @returns Promise resolving to the JSON-RPC response
   * @throws Error if the HTTP request fails or times out
   * @template T - Expected response result type
   * @internal
   */
  private async sendRequest<T = unknown>(request: JsonRpcRequest): Promise<JsonRpcResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      const response = await fetch(this.options.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.options.timeout!)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    });
  }
}
