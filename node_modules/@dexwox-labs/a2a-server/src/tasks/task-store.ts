/**
 * @module TaskStore
 * @description Interface for task storage backends
 * 
 * This module defines the contract for task storage backends in the A2A server.
 * Implementations of this interface provide persistence for tasks and their
 * associated artifacts.
 */

import { Task, Artifact, TaskState } from '@dexwox-labs/a2a-core';

/**
 * Interface for task storage backends
 * 
 * This interface defines the contract for task storage backends in the A2A server.
 * Implementations can use different storage mechanisms such as in-memory storage,
 * file system, or databases.
 * 
 * @example
 * ```typescript
 * // Example implementation with in-memory storage
 * class InMemoryTaskStore implements TaskStore {
 *   private tasks = new Map<string, Task>();
 *   private artifacts = new Map<string, Map<string, Artifact>>();
 *   
 *   async createTask(task: Omit<Task, 'id'>): Promise<Task> {
 *     const id = generateUniqueId();
 *     const newTask = { ...task, id };
 *     this.tasks.set(id, newTask);
 *     return newTask;
 *   }
 *   
 *   // ... other method implementations
 * }
 * ```
 */
export interface TaskStore {
  /**
   * Creates a new task
   * 
   * @param task - Task data without ID
   * @returns Promise resolving to the created task with ID
   */
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  
  /**
   * Gets a task by ID
   * 
   * @param id - ID of the task to retrieve
   * @returns Promise resolving to the task, or null if not found
   */
  getTask(id: string): Promise<Task | null>;
  
  /**
   * Updates a task with new data
   * 
   * @param id - ID of the task to update
   * @param updates - Partial task data to update
   * @returns Promise resolving to the updated task
   */
  updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task>;
  
  /**
   * Updates a task's status
   * 
   * @param id - ID of the task to update
   * @param status - New status for the task
   * @returns Promise resolving to the updated task
   */
  updateTaskStatus(id: string, status: TaskState): Promise<Task>;
  
  /**
   * Cancels a task
   * 
   * @param id - ID of the task to cancel
   * @returns Promise resolving when the task is canceled
   */
  cancelTask(id: string): Promise<void>;
  
  /**
   * Adds an artifact to a task
   * 
   * @param taskId - ID of the task
   * @param artifact - Artifact to add
   * @returns Promise resolving when the artifact is added
   */
  addArtifact(taskId: string, artifact: Artifact): Promise<void>;
  
  /**
   * Gets all artifacts for a task
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to an array of artifacts
   */
  getArtifacts(taskId: string): Promise<Artifact[]>;
  
  /**
   * Gets a specific artifact for a task
   * 
   * @param taskId - ID of the task
   * @param artifactId - ID of the artifact
   * @returns Promise resolving to the artifact, or null if not found
   */
  getArtifact(taskId: string, artifactId: string): Promise<Artifact | null>;
  
  /**
   * Gets tasks by status
   * 
   * @param statuses - Array of task statuses to filter by
   * @returns Promise resolving to an array of tasks with the specified statuses
   */
  getTasksByStatus(statuses: TaskState[]): Promise<Task[]>;
}
