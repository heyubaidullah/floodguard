/**
 * @module RequestHandler
 * @description Core request handling and routing for the A2A server
 * 
 * This module provides the main request handler implementation for the A2A server,
 * handling all incoming requests, routing them to the appropriate handlers, and
 * managing the lifecycle of tasks and messages.
 */

import { Router, Request, Response } from 'express';
import { DefaultJsonRpcRequestHandler } from './request-handlers/default-jsonrpc-handler';
import { randomUUID } from 'crypto';
import { AgentExecutor, DefaultAgentExecutor } from './agent-execution/agent-executor';
import { TaskManager } from './tasks/task-manager';
import { InMemoryTaskStore } from './tasks/in-memory-task-store';
import {
  buildSuccessResponse,
  buildErrorResponse
} from './response-helpers';
import { PushNotificationService } from './push-notifications/push-service';
import { EventQueue } from './agent-execution/event-queue';
import { TaskEventManager } from './agent-execution/task-event-manager';
import { InMemoryQueueManager } from './queue-system/in-memory-queue-manager';
import { 
  MessagePart,
  Task,
  AgentCard,
  A2AError,
  TaskTransition,
  JsonRpcResponse
} from '@dexwox-labs/a2a-core';
import { createRequestContext } from './agent-execution/request-context';

/**
 * Configuration for push notifications
 * 
 * This interface defines how push notifications should be configured for a task,
 * including which events to listen for and where to send notifications.
 * 
 * @example
 * ```typescript
 * const config: PushNotificationConfig = {
 *   enabled: true,
 *   endpoint: 'https://webhook.example.com/notifications',
 *   authToken: 'your-auth-token',
 *   events: ['taskCompleted', 'taskFailed']
 * };
 * ```
 */
interface PushNotificationConfig {
  /** Whether push notifications are enabled */
  enabled: boolean;
  
  /** Endpoint URL where notifications should be sent */
  endpoint?: string;
  
  /** Authentication token for the push endpoint */
  authToken?: string;
  
  /** List of event types to receive notifications for */
  events: string[];
}

/**
 * Interface for request handlers in the A2A server
 * 
 * This interface defines the contract for all request handlers in the A2A server,
 * including methods for handling messages, managing tasks, configuring push
 * notifications, and discovering agents.
 */
export interface RequestHandler {
  /** Express router for handling HTTP requests */
  readonly router: Router;

  /**
   * Handles sending a message to an agent
   * 
   * @param parts - Message parts to send
   * @param agentId - ID of the target agent
   * @returns Promise resolving to the created task ID
   */
  handleSendMessage(parts: MessagePart[], agentId: string): Promise<string>;
  
  /**
   * Handles streaming a message to an agent
   * 
   * @param parts - Message parts to send
   * @param agentId - ID of the target agent
   * @returns AsyncGenerator yielding message parts as they are processed
   */
  handleStreamMessage(parts: MessagePart[], agentId: string): AsyncGenerator<MessagePart, void, unknown>;

  /**
   * Gets the status of a task
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to the task object
   */
  handleGetTaskStatus(taskId: string): Promise<Task>;
  
  /**
   * Cancels a running task
   * 
   * @param taskId - ID of the task to cancel
   * @returns Promise resolving when the task is canceled
   */
  handleCancelTask(taskId: string): Promise<void>;
  
  /**
   * Resubscribes to a task's message stream
   * 
   * @param taskId - ID of the task
   * @returns AsyncGenerator yielding message parts for the task
   */
  handleTaskResubscription(taskId: string): AsyncGenerator<MessagePart, void, unknown>;

  /**
   * Sets push notification configuration for a task
   * 
   * @param taskId - ID of the task
   * @param config - Push notification configuration
   * @returns Promise resolving when the configuration is set
   */
  handleSetPushConfig(taskId: string, config: PushNotificationConfig): Promise<void>;
  
  /**
   * Gets push notification configuration for a task
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to the push notification configuration
   */
  handleGetPushConfig(taskId: string): Promise<PushNotificationConfig>;

  /**
   * Discovers available agents, optionally filtered by capability
   * 
   * @param capability - Optional capability to filter agents by
   * @returns Promise resolving to an array of agent cards
   */
  handleDiscoverAgents(capability?: string): Promise<AgentCard[]>;

  /**
   * Normalizes errors to A2AError format
   * 
   * @param err - Error to normalize
   * @returns Normalized A2AError
   */
  normalizeError(err: unknown): A2AError;
}

/**
 * Default implementation of the RequestHandler interface
 * 
 * This class provides the standard implementation of the RequestHandler interface,
 * handling all A2A protocol requests including message sending, task management,
 * push notifications, and agent discovery.
 * 
 * @example
 * ```typescript
 * // Create a request handler with available agents
 * const agents: AgentCard[] = [
 *   {
 *     id: 'assistant-agent',
 *     name: 'Assistant',
 *     description: 'A helpful assistant',
 *     capabilities: ['chat', 'answer-questions']
 *   }
 * ];
 * 
 * const requestHandler = new DefaultRequestHandler(agents);
 * 
 * // Use in an Express app
 * app.use('/a2a', requestHandler.router);
 * ```
 */
export class DefaultRequestHandler extends DefaultJsonRpcRequestHandler implements RequestHandler {
  /** Express router for handling HTTP requests */
  public readonly router: Router;

  /** Queue for handling events */
  private readonly eventQueue: EventQueue;
  
  /** Manager for task events */
  private readonly taskEventManager: TaskEventManager;
  
  /** Manager for request queues */
  private readonly queueManager = new InMemoryQueueManager();

  /** Executor for agent operations */
  private readonly agentExecutor: AgentExecutor;
  
  /** Manager for tasks */
  private readonly taskManager = new TaskManager(new InMemoryTaskStore());
  
  /** Service for push notifications */
  private readonly pushService = new PushNotificationService();
  
  /** Available agents */
  private readonly agents: AgentCard[];
 
  /**
   * Creates a new DefaultRequestHandler
   * 
   * @param agents - Array of available agent cards
   */
  constructor(agents: AgentCard[] = []) {
    super();
    this.router = Router();
    this.eventQueue = new EventQueue();
    this.taskEventManager = new TaskEventManager(this.eventQueue);
    this.agentExecutor = new DefaultAgentExecutor(
      new TaskManager(new InMemoryTaskStore()),
      this.taskEventManager
    );
    this.agents = agents;
    this.setupRoutes();
  }

  /**
   * Sets up the Express routes for handling A2A protocol requests
   * 
   * @private
   */
  private setupRoutes(): void {
    this.router.post('/sendMessage', this.handleJsonRpcSendMessage.bind(this));
    this.router.post('/streamMessage', this.handleJsonRpcStreamMessage.bind(this));
    this.router.get('/tasks/:taskId', this.handleJsonRpcGetTaskStatus.bind(this));
    this.router.post('/tasks/:taskId/cancel', this.handleJsonRpcCancelTask.bind(this));
    this.router.get('/agents', this.handleJsonRpcDiscoverAgents.bind(this));
  }

  async handleSendMessage(parts: MessagePart[], agentId: string): Promise<string> {
    const task = await this.taskManager.createTask({
      name: 'MessageTask',
      agentId,
      parts: parts || [],
      expectedParts: parts.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    try {
      await this.agentExecutor.execute(
        createRequestContext(task, agentId),
        this.eventQueue
      );
    } catch (error) {
      await this.taskManager.updateTaskStatus(task.id, 'failed');
      this.taskEventManager.taskFailed(task, this.normalizeError(error));
      throw error;
    }
    
    this.taskEventManager.taskCreated(task);
    for (const part of parts) {
      if (part.type === 'file') {
        this.taskEventManager.artifactAdded(task, {
          id: randomUUID(),
          type: 'file',
          content: { data: part.content },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (part.type === 'data') {
        this.taskEventManager.artifactAdded(task, {
          id: randomUUID(),
          type: 'data',
          content: part.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    return task.id;
  }

  private createArtifactEvent(task: Task, part: MessagePart) {
    if (part.type === 'file') {
      return {
        id: randomUUID(),
        type: part.type,
        content: { data: part.content },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          name: part.name,
          size: part.size,
          mimeType: part.mimeType
        }
      };
    } else if (part.type === 'data') {
      return {
        id: randomUUID(),
        type: part.type,
        content: part.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          schema: ('schema' in part) ? part.schema : 'json'
        }
      };
    }
    throw new Error(`Cannot create artifact from part type: ${part.type}`);
  }

  private createHeartbeat(): MessagePart {
    return {
      type: 'heartbeat',
      content: new Date().toISOString(),
      format: 'plain'
    };
  }

  async *handleStreamMessage(parts: MessagePart[], agentId: string): AsyncGenerator<MessagePart, void, unknown> {
    const task = await this.taskManager.createTask({
      name: 'StreamTask',
      agentId,
      parts,
      expectedParts: parts.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const aggregator = this.taskManager.getAggregator(task.id);
    this.taskEventManager.taskCreated(task);
    
    for (const part of parts) {
      yield part;
      
      if (aggregator) {
        aggregator.addPart(part);
        if (part.type === 'file' || part.type === 'data') {
          try {
            this.taskEventManager.artifactAdded(task, this.createArtifactEvent(task, part));
          } catch (err) {
            console.error('Failed to create artifact:', err);
          }
        }
      }
      
      // Send heartbeat every 15 seconds
      if (Math.random() < 0.066) {  // ~1/15 chance per second
        const heartbeat = this.createHeartbeat();
        yield heartbeat;
        if (aggregator) {
          aggregator.addPart(heartbeat);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    aggregator?.complete();
  }

  /**
   * Gets the status of a task
   * 
   * Retrieves the current status and details of a task by its ID.
   * 
   * @param taskId - ID of the task to retrieve
   * @returns Promise resolving to the task object
   * @throws {A2AError} If the task is not found
   * 
   * @example
   * ```typescript
   * try {
   *   const task = await requestHandler.handleGetTaskStatus('task-123');
   *   console.log('Task status:', task.status);
   *   console.log('Task result:', task.result);
   * } catch (error) {
   *   console.error('Failed to get task:', error);
   * }
   * ```
   */
  async handleGetTaskStatus(taskId: string): Promise<Task> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      throw this.normalizeError({ code: -32004, message: 'Task not found' });
    }
    return task;
  }

  /**
   * Cancels a running task
   * 
   * Attempts to cancel a task that is currently in progress. This will notify
   * the agent to stop processing and update the task status to 'canceled'.
   * 
   * @param taskId - ID of the task to cancel
   * @returns Promise resolving when the task is canceled
   * @throws {A2AError} If the task is not found or has no agent ID
   * 
   * @example
   * ```typescript
   * try {
   *   await requestHandler.handleCancelTask('task-123');
   *   console.log('Task canceled successfully');
   * } catch (error) {
   *   console.error('Failed to cancel task:', error);
   * }
   * ```
   */
  async handleCancelTask(taskId: string): Promise<void> {
    const task = await this.taskManager.getTask(taskId);
    if (!task.agentId) {
      throw this.normalizeError({ code: -32000, message: 'Task has no agentId' });
    }
    await this.agentExecutor.cancel(
      createRequestContext(task, task.agentId),
      this.eventQueue
    );
    await this.taskManager.cancelTask(taskId);
    this.taskEventManager.taskUpdated(task);
  }


  /**
   * Discovers available agents
   * 
   * Returns a list of available agents, optionally filtered by capability.
   * 
   * @param capability - Optional capability to filter agents by
   * @returns Promise resolving to an array of agent cards
   * 
   * @example
   * ```typescript
   * // Get all agents
   * const allAgents = await requestHandler.handleDiscoverAgents();
   * console.log('All agents:', allAgents);
   * 
   * // Get agents with a specific capability
   * const chatAgents = await requestHandler.handleDiscoverAgents('chat');
   * console.log('Chat agents:', chatAgents);
   * ```
   */
  async handleDiscoverAgents(capability?: string): Promise<AgentCard[]> {
    return capability 
      ? this.agents.filter(agent => agent.capabilities.includes(capability))
      : this.agents;
  }

  async *handleTaskResubscription(taskId: string): AsyncGenerator<MessagePart, void, unknown> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      throw this.normalizeError({ code: -32004, message: 'Task not found' });
    }

    // Yield existing task parts first
    const parts = task.parts ?? [];
    for (const part of parts) {
      yield part;
    }

    // Track last activity time
    let lastActivity = Date.now();
    
    // Then continue streaming new updates (mock implementation)
    while (task.status === 'working') {
      await new Promise(resolve => setTimeout(resolve, 1000));
        const update: MessagePart = {
          type: 'text',
          content: `Task ${taskId} update at ${new Date().toISOString()}`,
          format: 'plain'
        };
        yield update;
      lastActivity = Date.now();
      
      // Check if we need to send a heartbeat
      if (Date.now() - lastActivity > 15000) {
        const heartbeat: MessagePart = {
          type: 'heartbeat',
          content: new Date().toISOString(),
          format: 'plain'
        };
        yield heartbeat;
        lastActivity = Date.now();
      }
    }
  }

  /**
   * Sets push notification configuration for a task
   * 
   * Configures push notifications for a specific task, including the endpoint
   * to send notifications to and which events to notify about.
   * 
   * @param taskId - ID of the task
   * @param config - Push notification configuration
   * @returns Promise resolving when the configuration is set
   * @throws {A2AError} If the task is not found
   * 
   * @example
   * ```typescript
   * await requestHandler.handleSetPushConfig('task-123', {
   *   enabled: true,
   *   endpoint: 'https://webhook.example.com/notifications',
   *   authToken: 'your-auth-token',
   *   events: ['taskCompleted', 'taskFailed']
   * });
   * ```
   */
  async handleSetPushConfig(taskId: string, config: PushNotificationConfig): Promise<void> {
    await this.taskManager.getTask(taskId); // Verify task exists
    await this.pushService.setConfig(taskId, config);
  }

  /**
   * Gets push notification configuration for a task
   * 
   * Retrieves the current push notification configuration for a specific task.
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to the push notification configuration
   * @throws {A2AError} If the task is not found
   * 
   * @example
   * ```typescript
   * const config = await requestHandler.handleGetPushConfig('task-123');
   * console.log('Push notification config:', config);
   * console.log('Enabled:', config.enabled);
   * console.log('Events:', config.events);
   * ```
   */
  async handleGetPushConfig(taskId: string): Promise<PushNotificationConfig> {
    await this.taskManager.getTask(taskId); // Verify task exists
    return this.pushService.getConfig(taskId);
  }

  /**
   * Normalizes errors to A2AError format
   * 
   * Converts various error types to the standardized A2AError format used
   * throughout the A2A protocol.
   * 
   * @param err - Error to normalize
   * @returns Normalized A2AError
   * 
   * @example
   * ```typescript
   * try {
   *   // Some operation that might fail
   *   throw new Error('Something went wrong');
   * } catch (error) {
   *   // Normalize the error to A2AError format
   *   const normalizedError = requestHandler.normalizeError(error);
   *   console.error('Normalized error:', normalizedError);
   *   console.error('Error code:', normalizedError.code);
   * }
   * ```
   */
  normalizeError(err: unknown): A2AError {
    if (err instanceof A2AError) {
      return err;
    }
    if (err instanceof Error) {
      return new A2AError(err.message, -32000, { stack: err.stack });
    }
    return new A2AError('Unknown error occurred', -32000, { originalError: err });
  }
}
