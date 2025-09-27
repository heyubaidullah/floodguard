import { z } from 'zod';

/**
 * @module A2AProtocol
 * @description Core types and schemas for the Agent-to-Agent (A2A) protocol
 * 
 * This module defines the core types and schemas used throughout the A2A protocol,
 * including tasks, messages, artifacts, and agent metadata. These types form the
 * foundation of all communication between agents and clients in the protocol.
 * 
 * The module uses Zod schemas for runtime validation of data structures, ensuring
 * that all communication adheres to the protocol specification. Type definitions
 * are derived from these schemas for TypeScript type safety.
 */

/**
 * Schema defining the possible states of a task in the A2A protocol
 * @remarks This is used for validation with Zod
 */
export const TaskStateSchema = z.enum([
  'submitted',  // Task has been submitted but processing hasn't started
  'working',    // Task is currently being processed
  'input_required', // Task requires additional input to continue
  'completed',  // Task has been successfully completed
  'failed',     // Task has failed to complete
  'canceled'    // Task was canceled before completion
]);

/**
 * Schema defining the different types of message parts in the A2A protocol
 * @remarks Uses a discriminated union based on the 'type' field
 */
export const MessagePartSchema = z.discriminatedUnion('type', [
  /**
   * Text message part for plain text or markdown content
   */
  z.object({
    type: z.literal('text'),
    content: z.string(),
    format: z.enum(['plain', 'markdown']).default('plain')
  }),
  /**
   * File message part for binary or base64-encoded file content
   */
  z.object({
    type: z.literal('file'),
    content: z.union([z.string(), z.instanceof(Uint8Array)]),
    mimeType: z.string(),
    name: z.string(),
    size: z.number().optional()
  }),
  /**
   * Data message part for structured data objects
   */
  z.object({
    type: z.literal('data'),
    content: z.record(z.any()),
    schema: z.string().optional()
  }),
  /**
   * Heartbeat message part for connection maintenance
   */
  z.object({
    type: z.literal('heartbeat'),
    content: z.string(),
    format: z.literal('plain').default('plain')
  })
]);

/**
 * Schema defining artifacts produced during task execution
 * @remarks Artifacts are persistent outputs from tasks that can be referenced later
 */
export const ArtifactSchema = z.object({
  /** Unique identifier for the artifact */
  id: z.string(),
  /** The type of content this artifact contains */
  type: z.enum(['text', 'file', 'data']),
  /** The actual content of the artifact */
  content: z.record(z.any()),
  /** ISO timestamp when the artifact was created */
  createdAt: z.string(),
  /** ISO timestamp when the artifact was last updated */
  updatedAt: z.string()
});

/**
 * Schema defining standardized errors in the A2A protocol
 * @remarks Error codes follow JSON-RPC error code conventions
 */
export const A2AErrorSchema = z.object({
  /** Error code in the JSON-RPC reserved range */
  code: z.number().min(-32099).max(-32000),
  /** Human-readable error message */
  message: z.string(),
  /** Optional additional error data */
  data: z.record(z.any()).optional()
});

// Interfaces derived from the schemas

/**
 * Represents a transition between task states
 * @remarks Used to track the history and progression of a task
 */
export interface TaskTransition {
  /** The state the task is transitioning from */
  from: z.infer<typeof TaskStateSchema>;
  /** The state the task is transitioning to */
  to: z.infer<typeof TaskStateSchema>;
  /** ISO timestamp when the transition occurred */
  timestamp: string;
  /** Optional explanation for why the transition occurred */
  reason?: string;
}

/**
 * Represents a complete message in the A2A protocol
 * @remarks Messages are composed of one or more message parts
 */
export interface Message {
  /** Array of message parts that make up this message */
  parts: z.infer<typeof MessagePartSchema>[];
  /** Optional ID of the task this message is associated with */
  taskId?: string;
  /** Optional context ID for grouping related messages */
  contextId?: string;
}

/**
 * Configuration options for sending messages
 * @remarks Used to control message delivery behavior
 */
export interface MessageSendConfiguration {
  /** Optional priority level for message processing (higher numbers = higher priority) */
  priority?: number;
  /** Optional timeout in milliseconds for message delivery */
  timeout?: number;
  /** Optional additional metadata for the message */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a task in the A2A protocol
 * @remarks Tasks are the primary unit of work in the A2A protocol
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Human-readable name of the task */
  name: string;
  /** Optional detailed description of the task */
  description?: string;
  /** Current state of the task */
  status: z.infer<typeof TaskStateSchema>;
  /** Optional ID of the agent assigned to this task */
  agentId?: string;
  /** Optional message parts associated with this task */
  parts?: z.infer<typeof MessagePartSchema>[];
  /** Optional count of expected message parts */
  expectedParts?: number;
  /** Optional artifacts produced by this task */
  artifacts?: z.infer<typeof ArtifactSchema>[];
  /** Optional history of state transitions */
  transitions?: TaskTransition[];
  /** ISO timestamp when the task was created */
  createdAt: string;
  /** ISO timestamp when the task was last updated */
  updatedAt: string;
  /** Optional error information if the task failed */
  error?: z.infer<typeof A2AErrorSchema>;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
  /** Optional context ID for grouping related tasks */
  contextId?: string;
  /** Optional JSON schema defining the expected input format */
  inputSchema?: Record<string, any>;
  /** Optional JSON schema defining the expected output format */
  outputSchema?: Record<string, any>;
  /** Optional input data for the task */
  input?: Record<string, any>;
  /** Optional output data produced by the task */
  output?: Record<string, any>;
}

// Export type aliases for convenience

/** Type representing the possible states of a task */
export type TaskState = z.infer<typeof TaskStateSchema>;

/** Type representing a part of a message */
export type MessagePart = z.infer<typeof MessagePartSchema>;

/** Type representing an artifact produced by a task */
export type Artifact = z.infer<typeof ArtifactSchema>;

/** Type representing a standardized error */
export type A2AError = z.infer<typeof A2AErrorSchema>;

/**
 * Represents the metadata and capabilities of an agent
 * @remarks AgentCards are used for discovery and routing in the A2A protocol
 */
export interface AgentCard {
  /** Unique identifier for the agent */
  id: string;
  /** Human-readable name of the agent */
  name: string;
  /** List of capabilities this agent provides */
  capabilities: string[];
  /** URL endpoint where this agent can be reached */
  endpoint: string;
  /** Optional additional metadata about the agent */
  metadata?: Record<string, unknown>;
  /** Optional detailed description of the agent */
  description?: string;
  /** Optional version string for the agent */
  version?: string;
}

/**
 * Configuration for push notifications
 * @remarks Used to set up event subscriptions for asynchronous updates
 */
export interface PushNotificationConfig {
  /** Whether push notifications are enabled */
  enabled: boolean;
  /** Optional endpoint URL where notifications should be sent */
  endpoint?: string;
  /** Optional authentication token for the notification endpoint */
  authToken?: string;
  /** List of event types to subscribe to */
  events: string[];
  /** Optional additional metadata for the subscription */
  metadata?: Record<string, unknown>;
}

/**
 * Request format for agent discovery
 * @remarks Follows JSON-RPC request format
 */
export interface DiscoverRequest {
  /** Request identifier */
  id: string;
  /** Method name (should be "discover") */
  method: string;
  /** Optional parameters for the discovery request */
  params?: Record<string, unknown>;
  /** JSON-RPC version (typically "2.0") */
  jsonrpc?: string;
}

/**
 * Response format for agent discovery
 * @remarks Follows JSON-RPC response format
 */
export interface DiscoverResponse {
  /** Request identifier (matching the request) */
  id: string;
  /** Array of agent cards found during discovery */
  result: AgentCard[];
  /** Optional error information if discovery failed */
  error?: A2AError;
}
