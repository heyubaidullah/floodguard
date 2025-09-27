/**
 * @module Core
 * @description Core types, utilities, and validation for the A2A protocol
 * 
 * This package provides the foundational types and utilities for working with the
 * Agent-to-Agent (A2A) protocol. It includes JSON-RPC implementations, protocol-specific
 * types, validation utilities, and error handling.
 */

/**
 * JSON-RPC types for request/response handling
 */
export * from './types/jsonrpc';

/**
 * Core A2A protocol types and interfaces
 */
export * from './types/a2a-protocol';

/**
 * Re-export Zod for schema validation
 * @remarks Exported explicitly to avoid conflicts
 */
export { z } from 'zod';

/**
 * Schema validation utilities
 */
export { validateWithSchema, createValidator } from './validation/schema-utils';
/**
 * Validators and type guards for A2A protocol objects
 * 
 * These functions validate that objects conform to the A2A protocol specifications
 * and provide type guards for TypeScript type narrowing.
 */
export {
  /** Validates a message object against the protocol schema */
  validateMessage,
  /** Validates a task object against the protocol schema */
  validateTask,
  /** Validates an agent card object against the protocol schema */
  validateAgentCard,
  /** Validates a push notification config against the protocol schema */
  validatePushNotificationConfig,
  /** Validates a discover request against the protocol schema */
  validateDiscoverRequest,
  /** Validates a discover response against the protocol schema */
  validateDiscoverResponse,
  /** Type guard for Message objects */
  isMessage,
  /** Type guard for Task objects */
  isTask,
  /** Type guard for AgentCard objects */
  isAgentCard,
  /** Type guard for PushNotificationConfig objects */
  isPushNotificationConfig,
  /** Formats validation errors into human-readable messages */
  formatValidationError,
  /** Raw Zod schemas for all protocol objects */
  schemas,
} from './validation/validators';
/**
 * Type conversion utilities
 */
export * from './conversion/type-converters';

/**
 * Message handling utilities
 */
export * from './utils/message';

/**
 * Task management utilities
 */
export * from './utils/task';

/**
 * Artifact handling utilities
 */
export * from './utils/artifact';

/**
 * Core A2A protocol type exports
 * 
 * These are the main types used throughout the A2A protocol implementation.
 */
export type { 
  /** Task representation in the A2A protocol */
  Task, 
  /** Message part (text, image, etc.) in the A2A protocol */
  MessagePart,
  /** Task state enumeration (pending, completed, failed, etc.) */
  TaskState,
  /** Artifact representation (files, data) in the A2A protocol */
  Artifact,
  /** Agent card containing metadata and capabilities */
  AgentCard,
  /** Configuration for push notifications */
  PushNotificationConfig
} from './types/a2a-protocol';

/**
 * JSON-RPC type exports
 */
export type { 
  /** JSON-RPC request format */
  JsonRpcRequest, 
  /** JSON-RPC response format */
  JsonRpcResponse,
  /** JSON-RPC streaming response format */
  JsonRpcStreamResponse
} from './types/jsonrpc';

/**
 * Error classes and error handling
 * 
 * These error classes provide standardized error handling across the A2A SDK.
 */
export {
  /** Base error class for all A2A errors */
  A2AError,
  /** Type definition for A2AError */
  type A2AError as A2AErrorType,
  /** Standard error codes used throughout the A2A protocol */
  ERROR_CODES,
  /** Error thrown when attempting to transition a task to an invalid state */
  InvalidTaskStateError,
  /** Error thrown when a task cannot be found */
  TaskNotFoundError,
  /** Error thrown when attempting to modify a completed task */
  TaskAlreadyCompletedError,
  /** Error thrown when a task has been canceled */
  TaskCanceledError,
  /** Error thrown when a task has failed */
  TaskFailedError
} from './errors';

/**
 * Telemetry and tracing decorators
 * 
 * These decorators provide instrumentation for classes and methods to enable
 * monitoring, debugging, and performance analysis.
 */
export { 
  /** Class decorator for adding telemetry to all methods */
  TraceClass, 
  /** Method decorator for adding telemetry to specific methods */
  Trace 
} from './decorators/telemetry';
