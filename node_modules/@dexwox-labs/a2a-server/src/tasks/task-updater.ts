/**
 * @module TaskUpdater
 * @description Manages task state transitions with validation
 * 
 * This module provides functionality for managing task state transitions
 * with validation to ensure that tasks follow the correct lifecycle.
 * It enforces a state machine approach to task status changes.
 */

import { Task, TaskState, TaskTransition, A2AError } from '@dexwox-labs/a2a-core';

/**
 * Error thrown when an invalid task state transition is attempted
 * 
 * This error is thrown when a task state transition is attempted that
 * is not allowed by the state machine rules.
 * 
 * @example
 * ```typescript
 * // This would throw if the transition is invalid
 * try {
 *   await taskUpdater.transitionTask('task-123', 'completed');
 * } catch (error) {
 *   if (error instanceof InvalidTaskStateError) {
 *     console.error('Invalid state transition:', error.message);
 *   }
 * }
 * ```
 */
class InvalidTaskStateError extends A2AError {
  /**
   * Creates a new InvalidTaskStateError
   * 
   * @param message - Error message describing the invalid transition
   */
  constructor(message: string) {
    super(message, -32002); // -32002 = Invalid state transition
  }
}
import { TaskManager } from './task-manager';

/**
 * Manages task state transitions with validation
 * 
 * The TaskUpdater enforces a state machine approach to task status changes,
 * ensuring that tasks can only transition between valid states. It maintains
 * a history of transitions and provides methods for retrieving this history.
 * 
 * @example
 * ```typescript
 * // Create a task updater with a task manager
 * const taskManager = new TaskManager(taskStore);
 * const taskUpdater = new TaskUpdater(taskManager);
 * 
 * // Transition a task from 'submitted' to 'working'
 * try {
 *   const updatedTask = await taskUpdater.transitionTask('task-123', 'working');
 *   console.log(`Task is now ${updatedTask.status}`);
 * } catch (error) {
 *   console.error('Failed to transition task:', error.message);
 * }
 * ```
 */
export class TaskUpdater {
  /** The task manager used to retrieve and update tasks */
  private readonly taskManager: TaskManager;
  
  /** Map of valid state transitions for the task state machine */
  private readonly transitions: Map<TaskState, Set<TaskState>>;

  /**
   * Creates a new TaskUpdater
   * 
   * @param taskManager - The task manager to use for retrieving and updating tasks
   */
  constructor(taskManager: TaskManager) {
    this.taskManager = taskManager;
    this.transitions = this.buildStateTransitionMap();
  }

  /**
   * Builds the state transition map for the task state machine
   * 
   * This defines the valid transitions between task states:
   * - submitted → working, failed
   * - working → completed, failed, canceled
   * - input_required → working, failed, canceled
   * - failed → (terminal state, no transitions)
   * - completed → (terminal state, no transitions)
   * - canceled → (terminal state, no transitions)
   * 
   * @returns A map of valid state transitions
   * @internal
   */
  private buildStateTransitionMap(): Map<TaskState, Set<TaskState>> {
    const transitions = new Map<TaskState, Set<TaskState>>();
    
    // Define valid state transitions
    transitions.set('submitted', new Set(['working', 'failed']));
    transitions.set('working', new Set(['completed', 'failed', 'canceled']));
    transitions.set('input_required', new Set(['working', 'failed', 'canceled']));
    transitions.set('failed', new Set([]));
    transitions.set('completed', new Set([]));
    transitions.set('canceled', new Set([]));

    return transitions;
  }

  /**
   * Transitions a task to a new state
   * 
   * This method validates the state transition against the state machine rules,
   * creates a transition record, and updates the task with the new state and
   * transition history.
   * 
   * @param taskId - ID of the task to transition
   * @param newState - New state to transition the task to
   * @returns Promise resolving to the updated task
   * @throws InvalidTaskStateError if the transition is not allowed
   * 
   * @example
   * ```typescript
   * // Transition a task from 'submitted' to 'working'
   * try {
   *   const task = await taskUpdater.transitionTask('task-123', 'working');
   *   console.log('Task transitioned successfully');
   * } catch (error) {
   *   if (error instanceof InvalidTaskStateError) {
   *     console.error('Invalid state transition:', error.message);
   *   } else {
   *     console.error('Failed to transition task:', error);
   *   }
   * }
   * ```
   */
  async transitionTask(taskId: string, newState: TaskState): Promise<Task> {
    const currentTask = await this.taskManager.getTask(taskId);
    
    // Validate state transition
    if (!this.isValidTransition(currentTask.status, newState)) {
      throw new InvalidTaskStateError(
        `Invalid transition from ${currentTask.status} to ${newState}`
      );
    }

    // Create transition record
    const transition: TaskTransition = {
      from: currentTask.status,
      to: newState,
      timestamp: new Date().toISOString()
    };

    // Update task with new state and history
    return this.taskManager.updateTask(taskId, {
      status: newState,
      transitions: [...(currentTask.transitions || []), transition]
    });
  }

  /**
   * Checks if a state transition is valid
   * 
   * Validates whether a transition from one state to another is allowed
   * according to the state machine rules.
   * 
   * @param from - Current state
   * @param to - Target state
   * @returns True if the transition is valid, false otherwise
   * @internal
   */
  private isValidTransition(from: TaskState, to: TaskState): boolean {
    const allowedTransitions = this.transitions.get(from);
    return allowedTransitions ? allowedTransitions.has(to) : false;
  }

  /**
   * Gets the transition history for a task
   * 
   * Retrieves the complete history of state transitions for a task,
   * including the from state, to state, and timestamp for each transition.
   * 
   * @param taskId - ID of the task
   * @returns Promise resolving to an array of task transitions
   * 
   * @example
   * ```typescript
   * // Get the transition history for a task
   * const history = await taskUpdater.getTransitionHistory('task-123');
   * console.log(`Task has undergone ${history.length} transitions`);
   * 
   * // Log each transition
   * history.forEach(transition => {
   *   console.log(
   *     `${new Date(transition.timestamp).toLocaleString()}: ` +
   *     `${transition.from} → ${transition.to}`
   *   );
   * });
   * ```
   */
  async getTransitionHistory(taskId: string): Promise<TaskTransition[]> {
    const task = await this.taskManager.getTask(taskId);
    return task.transitions || [];
  }
}
