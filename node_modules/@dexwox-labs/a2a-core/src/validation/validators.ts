/**
 * @module Validators
 * @description Schema validation utilities for A2A protocol types
 * 
 * This module provides schema definitions and validation functions for the A2A protocol.
 * It uses Zod for runtime type validation and provides helper functions for validating
 * various protocol objects.
 */

import { z } from 'zod';
import {
  TaskStateSchema,
  MessagePartSchema,
  ArtifactSchema,
  A2AErrorSchema,
  type TaskTransition,
  type Message,
  type MessageSendConfiguration,
  type Task,
  type AgentCard,
  type PushNotificationConfig,
  type DiscoverRequest,
  type DiscoverResponse,
} from '../types/a2a-protocol';

// Extended schemas with additional validation
const TaskTransitionSchema: z.ZodType<TaskTransition> = z.object({
  from: TaskStateSchema,
  to: TaskStateSchema,
  timestamp: z.string().datetime(),
  reason: z.string().optional(),
});

// Define the message part schemas individually
const TextMessagePartSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  format: z.enum(['plain', 'markdown'] as const).default('plain'),
});

const FileMessagePartSchema = z.object({
  type: z.literal('file'),
  content: z.union([z.string(), z.instanceof(Uint8Array)]),
  mimeType: z.string(),
  name: z.string(),
  size: z.number().optional(),
});

const DataMessagePartSchema = z.object({
  type: z.literal('data'),
  content: z.record(z.any()),
  schema: z.string().optional(),
});

const HeartbeatMessagePartSchema = z.object({
  type: z.literal('heartbeat'),
  content: z.string(),
  format: z.literal('plain').default('plain'),
});

// Create the union type
const StrictMessagePartSchema = z.union([
  TextMessagePartSchema,
  FileMessagePartSchema,
  DataMessagePartSchema,
  HeartbeatMessagePartSchema,
]);

const MessageSchema = z.object({
  parts: z.array(StrictMessagePartSchema).min(1, 'At least one message part is required'),
  taskId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
}) as z.ZodType<Message>;

const MessageSendConfigurationSchema: z.ZodType<MessageSendConfiguration> = z.object({
  priority: z.number().int().min(0).max(100).optional(),
  timeout: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  status: TaskStateSchema,
  agentId: z.string().optional(),
  parts: z.array(StrictMessagePartSchema).optional(),
  expectedParts: z.number().int().positive().optional(),
  artifacts: z.array(ArtifactSchema).optional(),
  transitions: z.array(TaskTransitionSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  error: A2AErrorSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  contextId: z.string().uuid().optional(),
  inputSchema: z.record(z.any()).optional(),
  outputSchema: z.record(z.any()).optional(),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
}) as z.ZodType<Task>;

const AgentCardSchema: z.ZodType<AgentCard> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Agent name is required'),
  capabilities: z.array(z.string().min(1, 'Capability cannot be empty')),
  endpoint: z.string().url('Endpoint must be a valid URL'),
  metadata: z.record(z.unknown()).optional(),
});

const PushNotificationConfigSchema: z.ZodType<PushNotificationConfig> = z.object({
  enabled: z.boolean(),
  endpoint: z.string().url('Endpoint must be a valid URL').optional(),
  authToken: z.string().optional(),
  events: z.array(z.string().min(1, 'Event name cannot be empty')),
  metadata: z.record(z.unknown()).optional(),
});

const DiscoverRequestSchema: z.ZodType<DiscoverRequest> = z.object({
  id: z.string().min(1, 'ID is required'),
  method: z.literal('discover'),
  params: z.record(z.unknown()).optional(),
  jsonrpc: z.literal('2.0').optional(),
});

const DiscoverResponseSchema: z.ZodType<DiscoverResponse> = z.object({
  id: z.string(),
  result: z.array(AgentCardSchema),
  error: A2AErrorSchema.optional(),
});

/**
 * Validation functions for A2A protocol objects
 * 
 * These functions validate objects against their respective schemas and return
 * a SafeParseReturnType that includes either the validated data or validation errors.
 */

/**
 * Validates a message object against the Message schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated Message or validation errors
 * 
 * @example
 * ```typescript
 * const result = validateMessage({
 *   parts: [{ type: 'text', content: 'Hello, world!' }]
 * });
 * 
 * if (result.success) {
 *   // Use the validated message
 *   console.log('Valid message:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid message:', result.error);
 * }
 * ```
 */
export const validateMessage = (data: unknown): z.SafeParseReturnType<unknown, Message> => 
  MessageSchema.safeParse(data);

/**
 * Validates a task object against the Task schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated Task or validation errors
 * 
 * @example
 * ```typescript
 * const result = validateTask({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Process Data',
 *   status: 'submitted',
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * });
 * 
 * if (result.success) {
 *   // Use the validated task
 *   console.log('Valid task:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid task:', result.error);
 * }
 * ```
 */
export const validateTask = (data: unknown): z.SafeParseReturnType<unknown, Task> => 
  TaskSchema.safeParse(data);

/**
 * Validates an agent card object against the AgentCard schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated AgentCard or validation errors
 * 
 * @example
 * ```typescript
 * const result = validateAgentCard({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Weather Agent',
 *   capabilities: ['weather-forecasting', 'location-search'],
 *   endpoint: 'https://example.com/agents/weather'
 * });
 * 
 * if (result.success) {
 *   // Use the validated agent card
 *   console.log('Valid agent card:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid agent card:', result.error);
 * }
 * ```
 */
export const validateAgentCard = (data: unknown): z.SafeParseReturnType<unknown, AgentCard> => 
  AgentCardSchema.safeParse(data);

/**
 * Validates a push notification configuration against the PushNotificationConfig schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated PushNotificationConfig or validation errors
 * 
 * @example
 * ```typescript
 * const result = validatePushNotificationConfig({
 *   enabled: true,
 *   endpoint: 'https://example.com/webhooks/a2a',
 *   authToken: 'secret-token',
 *   events: ['taskCompleted', 'taskFailed']
 * });
 * 
 * if (result.success) {
 *   // Use the validated config
 *   console.log('Valid push config:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid push config:', result.error);
 * }
 * ```
 */
export const validatePushNotificationConfig = (data: unknown): z.SafeParseReturnType<unknown, PushNotificationConfig> => 
  PushNotificationConfigSchema.safeParse(data);

/**
 * Validates a discover request against the DiscoverRequest schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated DiscoverRequest or validation errors
 * 
 * @example
 * ```typescript
 * const result = validateDiscoverRequest({
 *   id: '1',
 *   method: 'discover',
 *   params: { capability: 'weather-forecasting' },
 *   jsonrpc: '2.0'
 * });
 * 
 * if (result.success) {
 *   // Use the validated request
 *   console.log('Valid discover request:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid discover request:', result.error);
 * }
 * ```
 */
export const validateDiscoverRequest = (data: unknown): z.SafeParseReturnType<unknown, DiscoverRequest> => 
  DiscoverRequestSchema.safeParse(data);

/**
 * Validates a discover response against the DiscoverResponse schema
 * 
 * @param data - The data to validate
 * @returns A SafeParseReturnType containing either the validated DiscoverResponse or validation errors
 * 
 * @example
 * ```typescript
 * const result = validateDiscoverResponse({
 *   id: '1',
 *   result: [
 *     {
 *       id: '123e4567-e89b-12d3-a456-426614174000',
 *       name: 'Weather Agent',
 *       capabilities: ['weather-forecasting'],
 *       endpoint: 'https://example.com/agents/weather'
 *     }
 *   ]
 * });
 * 
 * if (result.success) {
 *   // Use the validated response
 *   console.log('Valid discover response:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid discover response:', result.error);
 * }
 * ```
 */
export const validateDiscoverResponse = (data: unknown): z.SafeParseReturnType<unknown, DiscoverResponse> => 
  DiscoverResponseSchema.safeParse(data);

/**
 * Type guards for A2A protocol objects
 * 
 * These functions check if an object conforms to a specific schema and narrow
 * its type if it does. They return a boolean indicating whether the object is
 * of the specified type.
 */

/**
 * Checks if the provided data is a valid Message
 * 
 * @param data - The data to check
 * @returns True if the data is a valid Message, false otherwise
 * 
 * @example
 * ```typescript
 * const data = { parts: [{ type: 'text', content: 'Hello' }] };
 * 
 * if (isMessage(data)) {
 *   // TypeScript now knows that data is a Message
 *   console.log('Message parts:', data.parts.length);
 * }
 * ```
 */
export const isMessage = (data: unknown): data is Message => 
  MessageSchema.safeParse(data).success;

/**
 * Checks if the provided data is a valid Task
 * 
 * @param data - The data to check
 * @returns True if the data is a valid Task, false otherwise
 * 
 * @example
 * ```typescript
 * const data = getTaskFromSomewhere();
 * 
 * if (isTask(data)) {
 *   // TypeScript now knows that data is a Task
 *   console.log('Task status:', data.status);
 * }
 * ```
 */
export const isTask = (data: unknown): data is Task => 
  TaskSchema.safeParse(data).success;

/**
 * Checks if the provided data is a valid AgentCard
 * 
 * @param data - The data to check
 * @returns True if the data is a valid AgentCard, false otherwise
 * 
 * @example
 * ```typescript
 * const data = getAgentFromSomewhere();
 * 
 * if (isAgentCard(data)) {
 *   // TypeScript now knows that data is an AgentCard
 *   console.log('Agent capabilities:', data.capabilities);
 * }
 * ```
 */
export const isAgentCard = (data: unknown): data is AgentCard =>
  AgentCardSchema.safeParse(data).success;

/**
 * Checks if the provided data is a valid PushNotificationConfig
 * 
 * @param data - The data to check
 * @returns True if the data is a valid PushNotificationConfig, false otherwise
 * 
 * @example
 * ```typescript
 * const data = getConfigFromSomewhere();
 * 
 * if (isPushNotificationConfig(data)) {
 *   // TypeScript now knows that data is a PushNotificationConfig
 *   console.log('Push notifications enabled:', data.enabled);
 * }
 * ```
 */
export const isPushNotificationConfig = (data: unknown): data is PushNotificationConfig =>
  PushNotificationConfigSchema.safeParse(data).success;

/**
 * Formats a Zod validation error into a human-readable string
 * 
 * This function takes a Zod error object and converts it into a string
 * representation, with each issue formatted as "path: message" and joined
 * with semicolons.
 * 
 * @param error - The Zod error to format
 * @returns A formatted error string
 * 
 * @example
 * ```typescript
 * const result = validateTask(invalidTask);
 * 
 * if (!result.success) {
 *   const errorMessage = formatValidationError(result.error);
 *   console.error('Validation failed:', errorMessage);
 *   // Example output: "name: Required; status: Invalid enum value"
 * }
 * ```
 */
export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map(issue => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/**
 * Decorator for validating method parameters against a schema
 * 
 * This decorator can be applied to methods to automatically validate their
 * first parameter against the provided schema. If validation fails, an error
 * is thrown with details about the validation issues.
 * 
 * @param schema - The Zod schema to validate against
 * @returns A method decorator function
 * 
 * @example
 * ```typescript
 * class MessageService {
 *   @validate(MessageSchema)
 *   sendMessage(message: Message) {
 *     // This code only runs if message passes validation
 *     console.log('Sending message:', message);
 *   }
 * }
 * 
 * const service = new MessageService();
 * 
 * // This will throw an error because the message is invalid
 * service.sendMessage({ invalid: 'data' });
 * ```
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = schema.safeParse(args[0]);
      if (!result.success) {
        throw new Error(`Validation failed: ${formatValidationError(result.error)}`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Collection of all schema definitions for A2A protocol objects
 * 
 * This object provides access to all the Zod schemas defined in this module,
 * allowing them to be used directly for validation or type inference.
 * 
 * @example
 * ```typescript
 * // Use a schema directly for validation
 * const result = schemas.Message.safeParse(data);
 * 
 * // Create a type from a schema
 * type MessageType = z.infer<typeof schemas.Message>;
 * ```
 */
export const schemas = {
  Message: MessageSchema,
  Task: TaskSchema,
  AgentCard: AgentCardSchema,
  PushNotificationConfig: PushNotificationConfigSchema,
  DiscoverRequest: DiscoverRequestSchema,
  DiscoverResponse: DiscoverResponseSchema,
  MessagePart: MessagePartSchema,
  Artifact: ArtifactSchema,
  A2AError: A2AErrorSchema,
  TaskTransition: TaskTransitionSchema,
  MessageSendConfiguration: MessageSendConfigurationSchema,
};
