/**
 * @module TaskEventManager
 * @description Manages task lifecycle events in the A2A protocol
 * 
 * This module provides a manager for publishing task-related events to an event queue.
 * It handles events for task creation, updates, completion, failure, cancellation,
 * and artifact additions.
 */

import { EventQueue } from './event-queue';
import { 
  Task, 
  A2AError,
  Artifact,
  TaskNotFoundError,
  InvalidTaskStateError
} from '@dexwox-labs/a2a-core';

/**
 * Manages task lifecycle events
 * 
 * The TaskEventManager is responsible for publishing task-related events to an
 * event queue. It provides methods for different types of task events, such as
 * creation, updates, completion, failure, and cancellation.
 * 
 * @example
 * ```typescript
 * // Create an event queue
 * const eventQueue = new EventQueue();
 * 
 * // Create a task event manager
 * const taskEventManager = new TaskEventManager(eventQueue);
 * 
 * // Subscribe to task events
 * eventQueue.subscribe(event => {
 *   console.log(`Task event: ${event.type} for task ${event.task.id}`);
 * });
 * 
 * // Publish a task created event
 * taskEventManager.taskCreated({
 *   id: 'task-123',
 *   name: 'Process Data',
 *   status: 'submitted',
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
export class TaskEventManager {
  /** The event queue to publish events to */
  private eventQueue: EventQueue;

  /**
   * Creates a new TaskEventManager
   * 
   * @param eventQueue - The event queue to publish events to
   */
  constructor(eventQueue: EventQueue) {
    this.eventQueue = eventQueue;
  }

  /**
   * Publishes a task created event
   * 
   * This method publishes an event indicating that a new task has been created.
   * It validates that the task has an ID before publishing the event.
   * 
   * @param task - The task that was created
   * @throws InvalidTaskStateError if the task doesn't have an ID
   * 
   * @example
   * ```typescript
   * taskEventManager.taskCreated({
   *   id: 'task-123',
   *   name: 'Process Data',
   *   status: 'submitted',
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString()
   * });
   * ```
   */
  taskCreated(task: Task): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot create event for task without ID');
    }
    this.eventQueue.publish({
      type: 'taskCreated',
      task,
      timestamp: Date.now()
    });
  }

  /**
   * Publishes a task updated event
   * 
   * This method publishes an event indicating that a task has been updated.
   * It validates that the task has an ID before publishing the event and
   * optionally includes the previous state of the task.
   * 
   * @param task - The updated task
   * @param previousState - Optional previous state of the task
   * @throws InvalidTaskStateError if the task doesn't have an ID
   * 
   * @example
   * ```typescript
   * taskEventManager.taskUpdated(
   *   {
   *     id: 'task-123',
   *     name: 'Process Data',
   *     status: 'working',
   *     createdAt: new Date().toISOString(),
   *     updatedAt: new Date().toISOString()
   *   },
   *   'submitted' // previous state
   * );
   * ```
   */
  taskUpdated(task: Task, previousState?: string): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot update event for task without ID');
    }
    this.eventQueue.publish({
      type: 'taskUpdated',
      task,
      previousState,
      timestamp: Date.now()
    });
  }

  /**
   * Publishes a task completed event
   * 
   * This method publishes an event indicating that a task has been completed.
   * It validates that the task has an ID before publishing the event.
   * 
   * @param task - The completed task
   * @throws InvalidTaskStateError if the task doesn't have an ID
   * 
   * @example
   * ```typescript
   * taskEventManager.taskCompleted({
   *   id: 'task-123',
   *   name: 'Process Data',
   *   status: 'completed',
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString()
   * });
   * ```
   */
  taskCompleted(task: Task): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot complete event for task without ID');
    }
    this.eventQueue.publish({
      type: 'taskCompleted',
      task,
      timestamp: Date.now()
    });
  }

  /**
   * Publishes a task failed event
   * 
   * This method publishes an event indicating that a task has failed.
   * It validates that the task has an ID before publishing the event and
   * normalizes the error to ensure it conforms to the A2AError format.
   * 
   * @param task - The failed task
   * @param error - The error that caused the task to fail
   * @throws InvalidTaskStateError if the task doesn't have an ID
   * 
   * @example
   * ```typescript
   * try {
   *   // Some operation that might fail
   *   throw new Error('Processing failed');
   * } catch (error) {
   *   taskEventManager.taskFailed(
   *     {
   *       id: 'task-123',
   *       name: 'Process Data',
   *       status: 'failed',
   *       createdAt: new Date().toISOString(),
   *       updatedAt: new Date().toISOString()
   *     },
   *     error
   *   );
   * }
   * ```
   */
  taskFailed(task: Task, error: Error | A2AError): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot fail event for task without ID');
    }

    const normalizedError = 'code' in error 
      ? error as A2AError
      : {
          code: -32000,
          message: error.message,
          data: { stack: error.stack }
        };

    this.eventQueue.publish({
      type: 'taskFailed',
      task: {
        ...task,
        error: normalizedError
      },
      timestamp: Date.now()
    });
  }

  /**
   * Publishes a task canceled event
   * 
   * This method publishes an event indicating that a task has been canceled.
   * It validates that the task has an ID before publishing the event.
   * 
   * @param task - The canceled task
   * @throws InvalidTaskStateError if the task doesn't have an ID
   * 
   * @example
   * ```typescript
   * taskEventManager.taskCanceled({
   *   id: 'task-123',
   *   name: 'Process Data',
   *   status: 'canceled',
   *   createdAt: new Date().toISOString(),
   *   updatedAt: new Date().toISOString()
   * });
   * ```
   */
  taskCanceled(task: Task): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot cancel event for task without ID');
    }
    this.eventQueue.publish({
      type: 'taskCanceled',
      task,
      timestamp: Date.now()
    });
  }

  /**
   * Publishes an artifact added event
   * 
   * This method publishes an event indicating that an artifact has been added to a task.
   * It validates that both the task and artifact have IDs before publishing the event.
   * 
   * @param task - The task that the artifact was added to
   * @param artifact - The artifact that was added
   * @throws InvalidTaskStateError if the task or artifact doesn't have an ID
   * 
   * @example
   * ```typescript
   * taskEventManager.artifactAdded(
   *   {
   *     id: 'task-123',
   *     name: 'Process Data',
   *     status: 'working',
   *     createdAt: new Date().toISOString(),
   *     updatedAt: new Date().toISOString()
   *   },
   *   {
   *     id: 'artifact-456',
   *     type: 'file',
   *     content: 'base64-encoded-content',
   *     createdAt: new Date().toISOString(),
   *     updatedAt: new Date().toISOString(),
   *     metadata: {
   *       filename: 'result.pdf',
   *       mimeType: 'application/pdf'
   *     }
   *   }
   * );
   * ```
   */
  artifactAdded(task: Task, artifact: Artifact): void {
    if (!task.id) {
      throw new InvalidTaskStateError('Cannot add artifact to task without ID');
    }
    if (!artifact.id) {
      throw new InvalidTaskStateError('Cannot add artifact without ID');
    }
    this.eventQueue.publish({
      type: 'artifactAdded',
      task,
      artifact,
      timestamp: Date.now()
    });
  }
}
