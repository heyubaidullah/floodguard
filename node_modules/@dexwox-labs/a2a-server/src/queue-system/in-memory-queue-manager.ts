/**
 * @module InMemoryQueueManager
 * @description In-memory implementation of the QueueManager interface
 * 
 * This module provides an in-memory implementation of the QueueManager interface
 * for managing event queues in the A2A protocol server. It stores queues and their
 * statistics in memory, making it suitable for development and testing environments.
 */

import { EventQueue } from '../agent-execution/event-queue';
import { QueueManager, QueueStats, QueueExistsError, NoQueueError } from './queue-manager';

/**
 * In-memory implementation of the QueueManager interface
 * 
 * The InMemoryQueueManager class provides an implementation of the QueueManager
 * interface that stores queues and their statistics in memory. It's suitable for
 * development and testing environments, but may not be appropriate for production
 * use cases with high scalability requirements.
 * 
 * @example
 * ```typescript
 * // Create an in-memory queue manager
 * const queueManager = new InMemoryQueueManager();
 * 
 * // Create a queue for a task
 * const queue = await queueManager.createOrGet('task-123');
 * 
 * // Use the queue
 * queue.publish({
 *   type: 'taskCreated',
 *   task: { id: 'task-123', status: 'created' },
 *   timestamp: Date.now()
 * });
 * ```
 */
export class InMemoryQueueManager implements QueueManager {
  /** Map of task IDs to event queues */
  private readonly queues = new Map<string, EventQueue>();
  
  /** Map of task IDs to queue statistics */
  private readonly stats = new Map<string, QueueStats>();

  /**
   * Adds a new queue for a task
   * 
   * This method registers a new event queue for a specific task.
   * It throws an error if a queue already exists for the task.
   * 
   * @param taskId - ID of the task to add a queue for
   * @param queue - The event queue to add
   * @returns Promise that resolves when the queue is added
   * @throws {QueueExistsError} If a queue already exists for the task
   * 
   * @example
   * ```typescript
   * const queue = new EventQueue();
   * try {
   *   await queueManager.add('task-123', queue);
   *   console.log('Queue added successfully');
   * } catch (error) {
   *   if (error instanceof QueueExistsError) {
   *     console.error('Queue already exists for this task');
   *   }
   * }
   * ```
   */
  async add(taskId: string, queue: EventQueue): Promise<void> {
    if (this.queues.has(taskId)) {
      throw new QueueExistsError(taskId);
    }
    this.queues.set(taskId, queue);
    this.initStats(taskId);
  }

  /**
   * Gets an existing queue for a task
   * 
   * This method retrieves the event queue for a specific task.
   * It returns undefined if no queue exists for the task.
   * 
   * @param taskId - ID of the task to get the queue for
   * @returns Promise resolving to the event queue, or undefined if not found
   * 
   * @example
   * ```typescript
   * const queue = await queueManager.get('task-123');
   * if (queue) {
   *   console.log('Found queue for task');
   *   // Use the queue
   * } else {
   *   console.log('No queue found for task');
   * }
   * ```
   */
  async get(taskId: string): Promise<EventQueue | undefined> {
    return this.queues.get(taskId);
  }

  /**
   * Creates a new queue or gets an existing one
   * 
   * This method retrieves the event queue for a specific task if it exists,
   * or creates a new one if it doesn't. It's a convenience method that
   * combines the functionality of add and get.
   * 
   * @param taskId - ID of the task to get or create a queue for
   * @returns Promise resolving to the existing or newly created event queue
   * 
   * @example
   * ```typescript
   * // Get or create a queue for a task
   * const queue = await queueManager.createOrGet('task-123');
   * 
   * // Use the queue
   * queue.subscribe(event => {
   *   console.log(`Received event: ${event.type}`);
   * });
   * ```
   */
  async createOrGet(taskId: string): Promise<EventQueue> {
    let queue = this.queues.get(taskId);
    if (!queue) {
      queue = new EventQueue();
      this.queues.set(taskId, queue);
      this.initStats(taskId);
    }
    return queue;
  }

  /**
   * Taps into an existing queue to create a new consumer
   * 
   * This method creates a new event queue that receives copies of all events
   * published to the original queue for a specific task. It's useful for
   * creating specialized event handlers or for filtering events.
   * 
   * @param taskId - ID of the task to tap the queue for
   * @returns Promise resolving to a new event queue that receives copies of events
   * @throws {NoQueueError} If no queue exists for the task
   * 
   * @example
   * ```typescript
   * try {
   *   // Create a specialized queue for completed tasks
   *   const tapQueue = await queueManager.tap('task-123');
   *   
   *   // Subscribe to events on the tapped queue
   *   tapQueue.subscribe(event => {
   *     if (event.type === 'taskCompleted') {
   *       // Handle completed tasks
   *       console.log('Task completed:', event.task.id);
   *     }
   *   });
   * } catch (error) {
   *   if (error instanceof NoQueueError) {
   *     console.error('No queue exists for this task');
   *   }
   * }
   * ```
   */
  async tap(taskId: string): Promise<EventQueue> {
    const queue = this.queues.get(taskId);
    if (!queue) {
      throw new NoQueueError(taskId);
    }
    return queue.tap();
  }

  /**
   * Closes and removes a queue
   * 
   * This method shuts down the event queue for a specific task and removes
   * it from the manager. After calling this method, the queue will no longer
   * receive or publish events.
   * 
   * @param taskId - ID of the task to close the queue for
   * @returns Promise that resolves when the queue is closed and removed
   * 
   * @example
   * ```typescript
   * // When done with a task's queue
   * await queueManager.close('task-123');
   * console.log('Queue closed and removed');
   * ```
   */
  close(taskId: string): Promise<void> {
    const queue = this.queues.get(taskId);
    if (queue) {
      queue.close();
      this.queues.delete(taskId);
      this.stats.delete(taskId);
    }
    return Promise.resolve();
  }

  /**
   * Gets statistics for a queue
   * 
   * This method retrieves statistics about the event queue for a specific task,
   * such as the number of events, consumers, and performance metrics.
   * 
   * @param taskId - ID of the task to get queue statistics for
   * @returns Promise resolving to queue statistics
   * @throws {NoQueueError} If no queue exists for the task
   * 
   * @example
   * ```typescript
   * try {
   *   const stats = await queueManager.getStats('task-123');
   *   console.log('Queue size:', stats.size);
   *   console.log('Number of consumers:', stats.consumers);
   *   console.log('Events processed:', stats.processed);
   * } catch (error) {
   *   if (error instanceof NoQueueError) {
   *     console.error('No queue exists for this task');
   *   }
   * }
   * ```
   */
  async getStats(taskId: string): Promise<QueueStats> {
    const stats = this.stats.get(taskId);
    if (!stats) {
      throw new NoQueueError(taskId);
    }
    return stats;
  }

  /**
   * Initializes statistics for a new queue
   * 
   * This private method creates a new statistics object for a queue
   * with default values for all metrics.
   * 
   * @param taskId - ID of the task to initialize statistics for
   */
  private initStats(taskId: string): void {
    this.stats.set(taskId, {
      size: 0,
      consumers: 0,
      processed: 0,
      failed: 0,
      lastActivity: new Date(),
      throughput: 0,
      avgProcessingTime: 0,
      errorRate: 0
    });
  }

  /**
   * Updates statistics for a queue
   * 
   * This method updates the statistics for a specific task's queue with
   * the provided partial updates. It also updates the lastActivity timestamp.
   * 
   * @param taskId - ID of the task to update statistics for
   * @param updates - Partial updates to apply to the statistics
   * @returns Promise that resolves when the statistics are updated
   * 
   * @example
   * ```typescript
   * // Update the processed count and throughput
   * await queueManager.updateStats('task-123', {
   *   processed: 10,
   *   throughput: 2.5
   * });
   * ```
   */
  async updateStats(taskId: string, updates: Partial<QueueStats>): Promise<void> {
    const stats = this.stats.get(taskId);
    if (stats) {
      Object.assign(stats, updates);
      stats.lastActivity = new Date();
    }
  }
}
