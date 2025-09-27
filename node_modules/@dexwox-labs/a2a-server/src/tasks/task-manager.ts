/**
 * @module TaskManager
 * @description Task lifecycle and state management for the A2A server
 * 
 * This module provides a task manager implementation that handles creating,
 * updating, and managing tasks throughout their lifecycle. It also provides
 * support for task artifacts and push notifications.
 */

import { Task, TaskState, Artifact, TaskNotFoundError, InvalidTaskStateError } from '@dexwox-labs/a2a-core';
import { TaskStore } from './task-store';
import { PushNotificationService } from '../push-notifications/push-service';
import { ResultAggregator } from '../agent-execution/result-aggregator';
import logger from '../utils/logger';

/**
 * Manages task lifecycle and state
 * 
 * The TaskManager is responsible for creating, updating, and managing tasks
 * throughout their lifecycle. It provides methods for task creation, status
 * updates, cancellation, and artifact management.
 * 
 * @example
 * ```typescript
 * // Create a task manager with in-memory storage
 * const taskStore = new InMemoryTaskStore();
 * const taskManager = new TaskManager(taskStore);
 * 
 * // Create a new task
 * const task = await taskManager.createTask({
 *   name: 'ProcessData',
 *   agentId: 'data-processor',
 *   parts: [{ type: 'text', content: 'Process this data', format: 'plain' }],
 *   expectedParts: 1,
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * 
 * console.log('Created task:', task.id);
 * ```
 */
export class TaskManager {
  /** Map of task aggregators for collecting and processing task results */
  private readonly aggregators = new Map<string, ResultAggregator>();

  /**
   * Creates a new TaskManager
   * 
   * @param taskStore - Storage backend for tasks
   * @param pushService - Optional service for push notifications
   */
  constructor(
    private readonly taskStore: TaskStore,
    private readonly pushService?: PushNotificationService
  ) {
    logger.info('TaskManager initialized', { hasPushService: !!pushService });
  }

  /**
   * Creates a new task
   * 
   * Creates a task with the provided parameters and initializes a result
   * aggregator if expectedParts is specified.
   * 
   * @param task - Task parameters (without id and status)
   * @returns Promise resolving to the created task
   * 
   * @example
   * ```typescript
   * const task = await taskManager.createTask({
   *   name: 'ProcessImage',
   *   agentId: 'image-processor',
   *   parts: [{
   *     type: 'file',
   *     content: 'base64-encoded-image-data',
   *     mimeType: 'image/jpeg',
   *     name: 'image.jpg'
   *   }],
   *   expectedParts: 2,
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString()
   * });
   * ```
   */
  async createTask(task: Omit<Task, 'id'|'status'>): Promise<Task> {
    logger.debug('Creating new task', { taskParams: task });
    const createdTask = await this.taskStore.createTask({
      ...task,
      status: 'submitted' as const,
      parts: task.parts ?? []  // Ensure parts array exists
    });
    
    logger.info('Successfully created task', { taskId: createdTask.id });
    
    // Initialize result aggregation if expectedParts is specified
    if (task.expectedParts) {
      logger.debug('Initializing result aggregator', { taskId: createdTask.id });
      this.aggregators.set(createdTask.id, new ResultAggregator(createdTask));
    }
    return createdTask;
  }

  /**
   * Gets the result aggregator for a task
   * 
   * Result aggregators collect and process task results, including
   * handling streaming responses and combining multiple parts.
   * 
   * @param taskId - ID of the task
   * @returns The result aggregator for the task, or undefined if none exists
   */
  getAggregator(taskId: string): ResultAggregator | undefined {
    return this.aggregators.get(taskId);
  }

  /**
   * Gets a task by ID
   * 
   * Retrieves a task from the task store by its ID.
   * 
   * @param taskId - ID of the task to retrieve
   * @returns Promise resolving to the task
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * try {
   *   const task = await taskManager.getTask('task-123');
   *   console.log('Task status:', task.status);
   * } catch (error) {
   *   if (error instanceof TaskNotFoundError) {
   *     console.error('Task not found');
   *   } else {
   *     console.error('Error retrieving task:', error);
   *   }
   * }
   * ```
   */
  async getTask(taskId: string): Promise<Task> {
    logger.debug('Getting task', { taskId });
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      logger.error('Task not found', { taskId });
      throw new TaskNotFoundError(taskId);
    }
    logger.debug('Successfully retrieved task', { taskId });
    return task;
  }

  /**
   * Updates a task with new data
   * 
   * Updates a task with the provided partial task data and sets
   * the updatedAt timestamp to the current time.
   * 
   * @param taskId - ID of the task to update
   * @param updates - Partial task data to update
   * @returns Promise resolving to the updated task
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * const updatedTask = await taskManager.updateTask('task-123', {
   *   name: 'Updated Task Name',
   *   metadata: { priority: 'high' }
   * });
   * ```
   */
  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> {
    const currentTask = await this.getTask(taskId);
    return this.taskStore.updateTask(taskId, { 
      ...currentTask,
      ...updates,
      updatedAt: new Date().toISOString() 
    });
  }

  /**
   * Updates a task's status
   * 
   * Updates the status of a task and sets the updatedAt timestamp
   * to the current time.
   * 
   * @param taskId - ID of the task to update
   * @param status - New status for the task
   * @returns Promise resolving to the updated task
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * // Update task status to 'completed'
   * const task = await taskManager.updateTaskStatus('task-123', 'completed');
   * console.log('Task status updated:', task.status);
   * ```
   */
  async updateTaskStatus(taskId: string, status: TaskState): Promise<Task> {
    logger.info('Updating task status', { taskId, newStatus: status });
    const updatedTask = await this.updateTask(taskId, { status });
    logger.info('Successfully updated task status', { taskId });
    return updatedTask;
  }

  /**
   * Cancels a task
   * 
   * Cancels a task that is not already in a terminal state (completed, failed, or canceled).
   * If a push service is configured, it will send a push notification about the cancellation.
   * 
   * @param taskId - ID of the task to cancel
   * @returns Promise resolving when the task is canceled
   * @throws {TaskNotFoundError} If the task is not found
   * @throws {InvalidTaskStateError} If the task is already in a terminal state
   * 
   * @example
   * ```typescript
   * try {
   *   await taskManager.cancelTask('task-123');
   *   console.log('Task canceled successfully');
   * } catch (error) {
   *   if (error instanceof InvalidTaskStateError) {
   *     console.error('Cannot cancel task in terminal state');
   *   } else {
   *     console.error('Error canceling task:', error);
   *   }
   * }
   * ```
   */
  async cancelTask(taskId: string): Promise<void> {
    logger.info('Attempting to cancel task', { taskId });
    const task = await this.getTask(taskId);
    if (['completed', 'failed', 'canceled'].includes(task.status)) {
      logger.error('Cannot cancel task in terminal state', { taskId, currentStatus: task.status });
      throw new InvalidTaskStateError(
        `Task ${taskId} is already in terminal state: ${task.status}`
      );
    }

    await this.taskStore.cancelTask(taskId);
    logger.info('Successfully canceled task', { taskId });
    
    if (this.pushService) {
      logger.debug('Sending push notification for canceled task', { taskId });
      await this.pushService.notifyStatusChange(taskId, 'canceled');
    }
  }

  /**
   * Lists all active tasks
   * 
   * Retrieves all tasks that are not in a terminal state (completed, failed, or canceled).
   * Active tasks include those with status 'submitted', 'working', or 'input_required'.
   * 
   * @returns Promise resolving to an array of active tasks
   * 
   * @example
   * ```typescript
   * const activeTasks = await taskManager.listActiveTasks();
   * console.log(`Found ${activeTasks.length} active tasks`);
   * 
   * // Process each active task
   * for (const task of activeTasks) {
   *   console.log(`Task ${task.id} is ${task.status}`);
   * }
   * ```
   */
  async listActiveTasks(): Promise<Task[]> {
    logger.debug('Listing active tasks');
    const tasks = await this.taskStore.getTasksByStatus([
      'submitted', 'working', 'input_required'
    ]);
    logger.debug('Found active tasks', { count: tasks.length });
    return tasks;
  }

  /**
   * Adds an artifact to a task
   * 
   * Artifacts represent files, data, or other content associated with a task.
   * This method adds an artifact to a specific task.
   * 
   * @param taskId - ID of the task
   * @param artifact - Artifact to add
   * @returns Promise resolving when the artifact is added
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * await taskManager.addArtifact('task-123', {
   *   id: 'artifact-456',
   *   type: 'file',
   *   content: 'base64-encoded-file-data',
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString(),
   *   metadata: {
   *     filename: 'report.pdf',
   *     mimeType: 'application/pdf'
   *   }
   * });
   * ```
   */
  async addArtifact(taskId: string, artifact: Artifact): Promise<void> {
    await this.taskStore.addArtifact(taskId, artifact);
  }

  /**
   * Gets all artifacts for a task
   * 
   * Retrieves all artifacts associated with a specific task.
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to an array of artifacts
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * const artifacts = await taskManager.getArtifacts('task-123');
   * console.log(`Task has ${artifacts.length} artifacts`);
   * 
   * // Process each artifact
   * for (const artifact of artifacts) {
   *   console.log(`Artifact ${artifact.id} of type ${artifact.type}`);
   * }
   * ```
   */
  async getArtifacts(taskId: string): Promise<Artifact[]> {
    return this.taskStore.getArtifacts(taskId);
  }

  /**
   * Gets a specific artifact for a task
   * 
   * Retrieves a specific artifact by ID from a specific task.
   * 
   * @param taskId - ID of the task
   * @param artifactId - ID of the artifact
   * @returns Promise resolving to the artifact, or null if not found
   * @throws {TaskNotFoundError} If the task is not found
   * 
   * @example
   * ```typescript
   * const artifact = await taskManager.getArtifact('task-123', 'artifact-456');
   * if (artifact) {
   *   console.log('Found artifact:', artifact.id);
   *   console.log('Type:', artifact.type);
   *   console.log('Created at:', artifact.createdAt);
   * } else {
   *   console.log('Artifact not found');
   * }
   * ```
   */
  async getArtifact(taskId: string, artifactId: string): Promise<Artifact | null> {
    return this.taskStore.getArtifact(taskId, artifactId);
  }
}
