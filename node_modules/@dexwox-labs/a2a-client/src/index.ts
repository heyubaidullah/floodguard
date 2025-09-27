/**
 * @module Client
 * @description Client SDK for interacting with A2A protocol servers
 * 
 * This package provides client classes for interacting with Agent-to-Agent (A2A) protocol servers.
 * It includes clients for sending messages, managing tasks, and discovering agents, along with
 * utilities for error handling and stream management.
 * 
 * @example
 * ```typescript
 * import { MessageClient, TaskClient, AgentClient } from '@dexwox-labs/a2a-client';
 * 
 * // Create clients
 * const messageClient = new MessageClient({ baseUrl: 'https://a2a-server.example.com' });
 * const taskClient = new TaskClient({ baseUrl: 'https://a2a-server.example.com' });
 * const agentClient = new AgentClient({ baseUrl: 'https://a2a-server.example.com' });
 * 
 * // Use clients
 * const agents = await agentClient.resolveAgents();
 * console.log('Available agents:', agents);
 * 
 * const messageId = await messageClient.sendMessage(
 *   [{ type: 'text', content: 'Hello, agent!' }],
 *   agents[0].id
 * );
 * console.log('Message sent with ID:', messageId);
 * ```
 */

/**
 * Client for sending messages to agents
 * 
 * The MessageClient handles sending messages to agents and streaming real-time
 * communication with agents.
 */
export { MessageClient } from './message-client';

/**
 * Client for managing tasks
 * 
 * The TaskClient handles task creation, status updates, and push notification
 * configurations for task events.
 */
export { TaskClient } from './task-client';

/**
 * Client for discovering and interacting with agents
 * 
 * The AgentClient handles resolving agent cards and retrieving agent information.
 */
export { AgentClient } from './agent-client';

/**
 * Utility for normalizing different error types into A2AError instances
 */
export { normalizeError } from './utils/error-handler';

/**
 * Type definitions for client configuration and streaming
 */
export type { MessageClientOptions, StreamOptions } from './types';
