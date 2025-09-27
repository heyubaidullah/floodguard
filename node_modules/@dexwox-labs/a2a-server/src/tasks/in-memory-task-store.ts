/**
 * @module InMemoryTaskStore
 * @description In-memory implementation of the TaskStore interface
 * 
 * This module provides an in-memory implementation of the TaskStore interface
 * for storing tasks and artifacts. It's useful for development, testing, and
 * simple deployments where persistence is not required.
 */

import { Task, Artifact, TaskState } from '@dexwox-labs/a2a-core';
import { TaskStore } from './task-store';

/**
 * In-memory implementation of the TaskStore interface
 * 
 * This class provides an in-memory implementation of the TaskStore interface
 * using JavaScript Maps. It's suitable for development, testing, and simple
 * deployments where persistence across server restarts is not required.
 * 
 * @example
 * ```typescript
 * // Create an in-memory task store
 * const taskStore = new InMemoryTaskStore();
 * 
 * // Use it with a task manager
 * const taskManager = new TaskManager(taskStore);
 * 
 * // Create and manage tasks
 * const task = await taskManager.createTask({
 *   name: 'Example Task',
 *   agentId: 'example-agent',
 *   parts: [],
 *   expectedParts: 0,
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
export class InMemoryTaskStore implements TaskStore {
  /** Map of task ID to task object */
  private tasks = new Map<string, Task>();
  
  /** Map of task ID to a map of artifact ID to artifact object */
  private artifacts = new Map<string, Map<string, Artifact>>();

  /**
   * Saves a task to the store
   * 
   * This is an internal helper method for storing a task in the in-memory map.
   * 
   * @param task - Task to save
   * @returns Promise resolving when the task is saved
   * @internal
   */
  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  /**
   * Gets a task by ID
   * 
   * This is an internal helper method for retrieving a task from the in-memory map.
   * 
   * @param taskId - ID of the task to retrieve
   * @returns Promise resolving to the task, or null if not found
   * @internal
   */
  async get(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Deletes a task from the store
   * 
   * This is an internal helper method for removing a task from the in-memory map.
   * 
   * @param taskId - ID of the task to delete
   * @returns Promise resolving when the task is deleted
   * @internal
   */
  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  /**
   * Lists tasks with optional filtering
   * 
   * This is an internal helper method for retrieving tasks from the in-memory map
   * with optional filtering by task properties.
   * 
   * @param filter - Optional filter criteria
   * @returns Promise resolving to an array of matching tasks
   * @internal
   */
  async list(filter?: Partial<Task>): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    if (!filter) return tasks;
    
    return tasks.filter(task => {
      return Object.entries(filter).every(([key, value]) => 
        task[key as keyof Task] === value
      );
    });
  }

  /**
   * Creates a new task
   * 
   * Creates a task with the provided parameters, generating a random UUID
   * for the task ID and setting the creation and update timestamps.
   * 
   * @param task - Task parameters (without ID)
   * @returns Promise resolving to the created task with ID
   * 
   * @example
   * ```typescript
   * const task = await taskStore.createTask({
   *   name: 'Process Data',
   *   agentId: 'data-processor',
   *   status: 'submitted',
   *   parts: [],
   *   expectedParts: 0
   * });
   * console.log('Created task with ID:', task.id);
   * ```
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const newTask = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  /**
   * Gets a task by ID
   * 
   * Retrieves a task from the in-memory store by its ID.
   * 
   * @param id - ID of the task to retrieve
   * @returns Promise resolving to the task, or null if not found
   * 
   * @example
   * ```typescript
   * const task = await taskStore.getTask('task-123');
   * if (task) {
   *   console.log('Found task:', task.name);
   * } else {
   *   console.log('Task not found');
   * }
   * ```
   */
  async getTask(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  /**
   * Updates a task with new data
   * 
   * Updates a task with the provided partial task data and sets
   * the updatedAt timestamp to the current time.
   * 
   * @param id - ID of the task to update
   * @param updates - Partial task data to update
   * @returns Promise resolving to the updated task
   * @throws Error if the task is not found
   * 
   * @example
   * ```typescript
   * try {
   *   const updatedTask = await taskStore.updateTask('task-123', {
   *     name: 'Updated Task Name',
   *     metadata: { priority: 'high' }
   *   });
   *   console.log('Task updated:', updatedTask);
   * } catch (error) {
   *   console.error('Failed to update task:', error);
   * }
   * ```
   */
  async updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) throw new Error('Task not found');
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  /**
   * Updates a task's status
   * 
   * Updates the status of a task and sets the updatedAt timestamp
   * to the current time.
   * 
   * @param id - ID of the task to update
   * @param status - New status for the task
   * @returns Promise resolving to the updated task
   * @throws Error if the task is not found
   * 
   * @example
   * ```typescript
   * try {
   *   // Update task status to 'completed'
   *   const task = await taskStore.updateTaskStatus('task-123', 'completed');
   *   console.log('Task status updated:', task.status);
   * } catch (error) {
   *   console.error('Failed to update task status:', error);
   * }
   * ```
   */
  async updateTaskStatus(id: string, status: TaskState): Promise<Task> {
    return this.updateTask(id, { status });
  }

  /**
   * Cancels a task
   * 
   * Updates the task's status to 'canceled'.
   * 
   * @param id - ID of the task to cancel
   * @returns Promise resolving when the task is canceled
   * @throws Error if the task is not found
   * 
   * @example
   * ```typescript
   * try {
   *   await taskStore.cancelTask('task-123');
   *   console.log('Task canceled successfully');
   * } catch (error) {
   *   console.error('Failed to cancel task:', error);
   * }
   * ```
   */
  async cancelTask(id: string): Promise<void> {
    await this.updateTaskStatus(id, 'canceled');
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
   * 
   * @example
   * ```typescript
   * await taskStore.addArtifact('task-123', {
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
    if (!this.artifacts.has(taskId)) {
      this.artifacts.set(taskId, new Map());
    }
    this.artifacts.get(taskId)!.set(artifact.id, artifact);
  }

  /**
   * Gets all artifacts for a task
   * 
   * Retrieves all artifacts associated with a specific task.
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to an array of artifacts
   * 
   * @example
   * ```typescript
   * const artifacts = await taskStore.getArtifacts('task-123');
   * console.log(`Task has ${artifacts.length} artifacts`);
   * 
   * // Process each artifact
   * for (const artifact of artifacts) {
   *   console.log(`Artifact ${artifact.id} of type ${artifact.type}`);
   * }
   * ```
   */
  async getArtifacts(taskId: string): Promise<Artifact[]> {
    return Array.from(this.artifacts.get(taskId)?.values() || []);
  }

  /**
   * Gets a specific artifact for a task
   * 
   * Retrieves a specific artifact by ID from a specific task.
   * 
   * @param taskId - ID of the task
   * @param artifactId - ID of the artifact
   * @returns Promise resolving to the artifact, or null if not found
   * 
   * @example
   * ```typescript
   * const artifact = await taskStore.getArtifact('task-123', 'artifact-456');
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
    return this.artifacts.get(taskId)?.get(artifactId) || null;
  }

  /**
   * Gets tasks by status
   * 
   * Retrieves all tasks that have one of the specified statuses.
   * 
   * @param statuses - Array of task statuses to filter by
   * @returns Promise resolving to an array of tasks with the specified statuses
   * 
   * @example
   * ```typescript
   * // Get all active tasks (submitted, working, or input_required)
   * const activeTasks = await taskStore.getTasksByStatus([
   *   'submitted', 'working', 'input_required'
   * ]);
   * console.log(`Found ${activeTasks.length} active tasks`);
   * 
   * // Get all completed or failed tasks
   * const finishedTasks = await taskStore.getTasksByStatus([
   *   'completed', 'failed'
   * ]);
   * console.log(`Found ${finishedTasks.length} finished tasks`);
   * ```
   */
  async getTasksByStatus(statuses: TaskState[]): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => statuses.includes(task.status));
  }
}
