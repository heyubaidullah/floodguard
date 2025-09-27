/**
 * @module TaskClient
 * @description Client for managing tasks in the A2A protocol
 */

import { Task, TaskState, JsonRpcRequest, validateTransition, TraceClass } from '@dexwox-labs/a2a-core';
import { MessageClientOptions, PushNotificationConfig } from './types';
import { 
  normalizeError,
  A2ANetworkError,
  A2ATimeoutError
} from './utils/error-handler';
import { sendRequest } from './utils/http-utils';
import { EventEmitter } from 'events';
import { TASK_UPDATED, TASK_COMPLETED, TASK_FAILED } from './types';

/**
 * Client for managing tasks in the A2A protocol
 * 
 * The TaskClient provides methods for creating, monitoring, and managing tasks
 * with support for real-time status updates and push notifications.
 * 
 * @example
 * ```typescript
 * const taskClient = new TaskClient({ baseUrl: 'https://a2a-server.example.com' });
 * 
 * // Get task status
 * const task = await taskClient.getTaskStatus('task-123');
 * console.log(`Task status: ${task.status}`);
 * 
 * // Cancel a task
 * await taskClient.cancelTask('task-123');
 * ```
 */
@TraceClass()
export class TaskClient extends EventEmitter {
  /** @private Cache of push notification configurations by task ID */
  private pushConfigs: Map<string, PushNotificationConfig> = new Map();
  /** @private Map of task ID to callback functions for task updates */
  private taskCallbacks: Map<string, (task: Task) => void> = new Map();

  /**
   * Creates a new TaskClient instance
   * @param options - Configuration options for the client
   */
  constructor(private options: MessageClientOptions) {
    super();
  }

  /**
   * Gets the current status of a task
   * 
   * Retrieves the current state and details of a task by its ID. This method
   * fetches the complete task object including status, input, output, and any
   * error information.
   * 
   * @param taskId - The ID of the task to check
   * @returns Promise resolving to the complete task object
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the task ID is invalid or not found
   * 
   * @example
   * ```typescript
   * try {
   *   const task = await taskClient.getTaskStatus('task-123');
   *   console.log(`Task status: ${task.status}`);
   *   
   *   if (task.status === 'completed') {
   *     console.log('Task output:', task.output);
   *   } else if (task.status === 'failed') {
   *     console.error('Task failed:', task.error);
   *   }
   * } catch (error) {
   *   console.error('Error checking task status:', error.message);
   * }
   * ```
   */
  async getTaskStatus(taskId: string): Promise<Task> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'getTaskStatus',
      params: { taskId }
    };

    try {
      const response = await sendRequest<{ task: Task }>(this.options, request);
      return response.result.task;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network')) {
        throw new A2ANetworkError('Failed to get task status', {
          originalError: err,
          taskId
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Cancels a running task
   * 
   * Attempts to cancel a task that is currently in progress. This will transition
   * the task to the 'canceled' state if successful. Tasks that have already
   * completed or failed cannot be canceled.
   * 
   * @param taskId - The ID of the task to cancel
   * @returns Promise resolving when cancellation is complete
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the task cannot be canceled (e.g., already completed)
   * 
   * @example
   * ```typescript
   * try {
   *   await taskClient.cancelTask('task-123');
   *   console.log('Task canceled successfully');
   * } catch (error) {
   *   if (error.code === 'VALIDATION_ERROR') {
   *     console.error('Cannot cancel task:', error.message);
   *   } else {
   *     console.error('Error canceling task:', error.message);
   *   }
   * }
   * ```
   */
  async cancelTask(taskId: string): Promise<void> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'cancelTask',
      params: { taskId }
    };

    try {
      await sendRequest(this.options, request);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network')) {
        throw new A2ANetworkError('Failed to cancel task', {
          originalError: err,
          taskId
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Lists all tasks for the current session
   * @param options Optional filters for the task list
   * @returns Promise resolving to an array of tasks
   * @throws A2AError if the request fails
   */
  /**
   * Sets push notification configuration for a task
   * 
   * Configures server-side push notifications for task status updates. This allows
   * your application to receive real-time updates about task progress without polling.
   * 
   * @param taskId - The task ID to configure notifications for
   * @param config - Push notification settings including endpoint and events to subscribe to
   * @returns Promise resolving when configuration is complete
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2ATimeoutError} If the request times out
   * @throws {A2AValidationError} If the configuration is invalid
   * 
   * @example
   * ```typescript
   * await taskClient.setPushConfig('task-123', {
   *   enabled: true,
   *   endpoint: 'https://my-app.example.com/webhooks/tasks',
   *   authToken: 'secret-token-123',
   *   events: ['task.updated', 'task.completed', 'task.failed']
   * });
   * 
   * console.log('Push notifications configured for task');
   * ```
   */
  async setPushConfig(taskId: string, config: PushNotificationConfig): Promise<void> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'setPushConfig',
      params: { taskId, config }
    };

    try {
      await sendRequest(this.options, request);
      this.pushConfigs.set(taskId, config);
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        throw new A2ATimeoutError('Task operation timed out', {
          originalError: err,
          taskId
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Gets push notification configuration for a task
   * 
   * Retrieves the current push notification settings for a task. This method
   * first checks the local cache and only makes a server request if needed.
   * 
   * @param taskId - The task ID to check
   * @returns Promise resolving to the push notification configuration
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the task ID is invalid or not found
   * 
   * @example
   * ```typescript
   * const config = await taskClient.getPushConfig('task-123');
   * 
   * console.log('Push notifications enabled:', config.enabled);
   * console.log('Subscribed events:', config.events);
   * console.log('Webhook endpoint:', config.endpoint);
   * ```
   */
  async getPushConfig(taskId: string): Promise<PushNotificationConfig> {
    // Return cached config if available
    if (this.pushConfigs.has(taskId)) {
      return this.pushConfigs.get(taskId)!;
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'getPushConfig',
      params: { taskId }
    };

    try {
      const response = await sendRequest<{ config: PushNotificationConfig }>(this.options, request);
      this.pushConfigs.set(taskId, response.result.config);
      return response.result.config;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Updates the status of a task
   * 
   * Changes a task's status from one state to another. The transition is validated
   * to ensure it follows the allowed state machine transitions in the A2A protocol.
   * 
   * @param taskId - The ID of the task to update
   * @param status - Object containing the current state and target state
   * @param status.from - The current state of the task
   * @param status.to - The desired new state of the task
   * @returns Promise resolving when the status update is complete
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the state transition is invalid
   * 
   * @example
   * ```typescript
   * // Mark a task as completed
   * await taskClient.updateTaskStatus('task-123', {
   *   from: 'working',
   *   to: 'completed'
   * });
   * 
   * // Mark a task as failed
   * await taskClient.updateTaskStatus('task-456', {
   *   from: 'working',
   *   to: 'failed'
   * });
   * ```
   */
  async updateTaskStatus(taskId: string, status: { from: TaskState, to: TaskState }): Promise<void> {
    validateTransition(status.from, status.to);
    
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'updateTaskStatus',
      params: { taskId, status }
    };

    try {
      await sendRequest(this.options, request);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network')) {
        throw new A2ANetworkError('Failed to update task status', {
          originalError: err,
          taskId
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Lists tasks matching the specified criteria
   * 
   * Retrieves a list of tasks from the server, with optional filtering by status,
   * limiting the number of results, and filtering by creation date.
   * 
   * @param options - Optional filter criteria for the task list
   * @param options.status - Optional filter by task status
   * @param options.limit - Optional maximum number of tasks to return
   * @param options.since - Optional ISO timestamp to filter tasks created after this time
   * @returns Promise resolving to an array of tasks matching the criteria
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * 
   * @example
   * ```typescript
   * // Get all tasks
   * const allTasks = await taskClient.listTasks();
   * 
   * // Get only completed tasks
   * const completedTasks = await taskClient.listTasks({ status: 'completed' });
   * 
   * // Get the 10 most recent tasks
   * const recentTasks = await taskClient.listTasks({ limit: 10 });
   * 
   * // Get tasks created in the last hour
   * const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
   * const recentTasks = await taskClient.listTasks({ since: oneHourAgo });
   * ```
   */
  async listTasks(options?: { 
    status?: TaskState;
    limit?: number;
    since?: string;
  }): Promise<Task[]> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'listTasks',
      params: options || {}
    };

    try {
      const response = await sendRequest<{ tasks: Task[] }>(this.options, request);
      return response.result.tasks;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Registers a callback for task updates
   * 
   * Sets up a callback function to be called whenever a specific task is updated.
   * This provides a way to monitor task progress in real-time without polling.
   * 
   * @param taskId - The ID of the task to monitor
   * @param callback - Function to call when the task is updated
   * 
   * @example
   * ```typescript
   * // Monitor a specific task
   * taskClient.onTaskUpdate('task-123', (task) => {
   *   console.log(`Task ${task.id} updated:`, task.status);
   *   
   *   if (task.status === 'completed') {
   *     console.log('Task completed with result:', task.output);
   *   } else if (task.status === 'failed') {
   *     console.error('Task failed with error:', task.error);
   *   }
   * });
   * ```
   */
  onTaskUpdate(taskId: string, callback: (task: Task) => void): void {
    this.taskCallbacks.set(taskId, callback);
    this.on(TASK_UPDATED, (updatedTask: Task) => {
      if (updatedTask.id === taskId) {
        callback(updatedTask);
      }
    });
  }

  /**
   * Handles incoming task updates and triggers callbacks
   * 
   * This internal method processes task updates received from the server and
   * triggers the appropriate callbacks and events. It's typically called by
   * the MessageClient when streaming updates.
   * 
   * @param task - The updated task object
   * @internal
   */
  handleTaskUpdate(task: Task): void {
    // Trigger specific callback if registered
    const callback = this.taskCallbacks.get(task.id);
    if (callback) {
      callback(task);
    }

    // Emit appropriate event based on task state
    this.emit(TASK_UPDATED, task);
    
    if (task.status === 'completed') {
      this.emit(TASK_COMPLETED, task);
      this.taskCallbacks.delete(task.id);
    } else if (task.status === 'failed' || task.status === 'canceled') {
      this.emit(TASK_FAILED, task);
      this.taskCallbacks.delete(task.id);
    }
  }
}
