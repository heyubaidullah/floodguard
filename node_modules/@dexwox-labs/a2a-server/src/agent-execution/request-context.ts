/**
 * @module RequestContext
 * @description Context management for A2A protocol requests
 * 
 * This module provides utilities for creating, accessing, and managing request
 * contexts in the A2A protocol server. It uses AsyncLocalStorage to maintain
 * context across asynchronous operations.
 */

import { 
  type TaskState,
  type Artifact, 
  type TaskTransition,
  type A2AError,
  MessageSendConfiguration, 
  type MessagePart 
} from '@dexwox-labs/a2a-core';
import { AsyncLocalStorage } from 'async_hooks';

/** Storage for the current request context, accessible across async boundaries */
const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Represents a message in the A2A protocol
 * 
 * This interface defines the structure of messages exchanged between agents
 * in the A2A protocol. Messages consist of one or more parts and can be
 * associated with a task and context.
 */
export interface Message {
  /** The parts that make up the message (text, file, data, etc.) */
  parts: MessagePart[];
  /** Optional ID of the task associated with this message */
  taskId?: string;
  /** Optional ID of the context this message belongs to */
  contextId?: string;
}

/**
 * Represents a task in the A2A protocol
 * 
 * This interface defines the structure of tasks in the A2A protocol.
 * Tasks represent units of work that agents can perform, and they
 * have a lifecycle represented by their status.
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Human-readable name of the task */
  name: string;
  /** Current state of the task (submitted, working, completed, etc.) */
  status: TaskState;
  /** Optional ID of the agent assigned to this task */
  agentId?: string;
  /** Optional message parts associated with this task */
  parts?: MessagePart[];
  /** Optional expected number of parts for this task */
  expectedParts?: number;
  /** Optional artifacts produced by or associated with this task */
  artifacts?: Artifact[];
  /** Optional history of state transitions for this task */
  transitions?: TaskTransition[];
  /** ISO timestamp when the task was created */
  createdAt: string;
  /** ISO timestamp when the task was last updated */
  updatedAt: string;
  /** Optional error information if the task failed */
  error?: {
    /** Error code */
    code: number;
    /** Error message */
    message: string;
    /** Optional additional error data */
    data?: Record<string, any>;
  };
  /** Optional additional metadata for the task */
  metadata?: Record<string, unknown>;
  /** Optional ID of the context this task belongs to */
  contextId?: string;
}

/**
 * Context for an A2A protocol request
 * 
 * The RequestContext provides all the information needed to process a request
 * in the A2A protocol. It includes the task being processed, the agent handling
 * the request, and various metadata about the request.
 * 
 * @example
 * ```typescript
 * // Create a request context
 * const context = createRequestContext(
 *   task,
 *   'weather-agent',
 *   { parts: [{ type: 'text', content: 'What is the weather?' }] }
 * );
 * 
 * // Run a function with this context
 * runInContext(context, async () => {
 *   // Inside this function, getCurrentContext() will return the context
 *   const currentContext = getCurrentContext();
 *   console.log(`Processing task: ${currentContext.task.id}`);
 *   
 *   // Process the request
 *   await processRequest();
 * });
 * ```
 */
export interface RequestContext {
  /**
   * The task being processed
   */
  task: Task;

  /**
   * The agent ID handling this request
   */
  agentId: string;

  /**
   * Unique request ID
   */
  requestId: string;

  /**
   * Context ID for grouping related requests
   */
  contextId: string;

  /**
   * Timestamp when request was received
   */
  timestamp: number;

  /**
   * Original message (for message requests)
   */
  message?: Message;

  /**
   * Message configuration
   */
  configuration?: MessageSendConfiguration;

  /**
   * Related tasks in this context
   */
  relatedTasks: Task[];

  /**
   * Additional context data
   */
  metadata?: Record<string, any>;
}

/**
 * Creates a new request context
 * 
 * This function creates a new RequestContext object with the provided task,
 * agent ID, and optional message, configuration, and metadata. It generates
 * a unique request ID and uses the task's context ID if available, or generates
 * a new one if not.
 * 
 * @param task - The task being processed
 * @param agentId - The ID of the agent handling the request
 * @param message - Optional message associated with the request
 * @param configuration - Optional message configuration
 * @param metadata - Optional additional metadata
 * @returns A new RequestContext object
 * 
 * @example
 * ```typescript
 * const context = createRequestContext(
 *   {
 *     id: 'task-123',
 *     name: 'Weather Request',
 *     status: 'submitted',
 *     createdAt: new Date().toISOString(),
 *     updatedAt: new Date().toISOString()
 *   },
 *   'weather-agent',
 *   {
 *     parts: [{ type: 'text', content: 'What is the weather in New York?' }]
 *   }
 * );
 * ```
 */
export function createRequestContext(
  task: Task,
  agentId: string,
  message?: Message,
  configuration?: MessageSendConfiguration,
  metadata?: Record<string, any>
): RequestContext {
  return {
    task,
    agentId,
    requestId: crypto.randomUUID(),
    contextId: task.contextId || crypto.randomUUID(),
    timestamp: Date.now(),
    message,
    configuration,
    relatedTasks: [],
    metadata
  };
}

/**
 * Gets the current request context
 * 
 * This function retrieves the RequestContext from the AsyncLocalStorage
 * for the current asynchronous execution context. It returns undefined
 * if called outside of a context established by runInContext.
 * 
 * @returns The current RequestContext, or undefined if not in a context
 * 
 * @example
 * ```typescript
 * // Inside a function that's run with runInContext
 * function processRequest() {
 *   const context = getCurrentContext();
 *   if (!context) {
 *     throw new Error('Not in a request context');
 *   }
 *   console.log(`Processing task: ${context.task.id}`);
 * }
 * ```
 */
export function getCurrentContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Runs a function within a request context
 * 
 * This function establishes a RequestContext for the duration of the provided
 * function's execution, including any asynchronous operations. The context
 * can be accessed using getCurrentContext() from anywhere within the function
 * or its asynchronous continuations.
 * 
 * @param context - The RequestContext to establish
 * @param fn - The function to run within the context
 * @returns The result of the function
 * 
 * @example
 * ```typescript
 * // Run a function with a request context
 * const result = runInContext(context, async () => {
 *   // Access the context from anywhere in this function
 *   const currentContext = getCurrentContext();
 *   
 *   // Even in nested async functions
 *   await someAsyncOperation();
 *   
 *   return 'result';
 * });
 * ```
 */
export function runInContext<T>(context: RequestContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

/**
 * Attaches a related task to the current request context
 * 
 * This function adds a task to the relatedTasks array of the current
 * RequestContext. It throws an error if called outside of a context
 * established by runInContext.
 * 
 * @param task - The task to attach to the current context
 * @throws Error if called outside of a request context
 * 
 * @example
 * ```typescript
 * runInContext(context, () => {
 *   // Create a subtask
 *   const subtask = createTask({
 *     name: 'Subtask',
 *     status: 'submitted'
 *   });
 *   
 *   // Attach it to the current context
 *   attachRelatedTask(subtask);
 * });
 * ```
 */
export function attachRelatedTask(task: Task): void {
  const context = getCurrentContext();
  if (!context) {
    throw new Error('Cannot attach task outside of request context');
  }
  context.relatedTasks.push(task);
}

/**
 * Gets the text content of the current request's message
 * 
 * This function extracts and concatenates all text parts from the message
 * in the current RequestContext. It returns an empty string if called
 * outside of a context or if the context has no message.
 * 
 * @param delimiter - The delimiter to use when joining text parts (default: '\n')
 * @returns The concatenated text content of the message
 * 
 * @example
 * ```typescript
 * runInContext(context, () => {
 *   // Get the text content of the message
 *   const text = getMessageText();
 *   console.log(`Message text: ${text}`);
 *   
 *   // Get the text content with a custom delimiter
 *   const textWithSpaces = getMessageText(' ');
 *   console.log(`Message text with spaces: ${textWithSpaces}`);
 * });
 * ```
 */
export function getMessageText(delimiter = '\n'): string {
  const context = getCurrentContext();
  if (!context || !context.message) {
    return '';
  }
  
  return context.message.parts
    .filter(part => part.type === 'text')
    .map(part => part.content as string)
    .join(delimiter);
}
