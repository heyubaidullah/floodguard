/**
 * @module AgentClient
 * @description Client for interacting with A2A agents and their capabilities
 */

import { AgentCard } from '@dexwox-labs/a2a-core';
import { DiscoverRequest, DiscoverResponse } from './types';
import { MessageClientOptions } from './types';
import { 
  normalizeError,
  A2ANetworkError,
  A2AValidationError,
  A2ATimeoutError
} from './utils/error-handler';
import { sendRequest } from './utils/http-utils';

/**
 * Internal interface for caching agent resolution results
 * @internal
 */
interface AgentResolutionCache {
  /** List of agent cards from the last resolution */
  agents: AgentCard[];
  /** Timestamp when the cache expires */
  expiresAt: number;
  /** Timestamp when the cache was last updated */
  lastUpdated: number;
}

/**
 * Client for discovering and interacting with A2A agents
 * 
 * @example
 * ```typescript
 * const agentClient = new AgentClient({ baseUrl: 'https://a2a-server.example.com' });
 * 
 * // Get all available agents
 * const agents = await agentClient.resolveAgents();
 * 
 * // Get a specific agent by ID
 * const agent = await agentClient.getAgentCard('weather-agent');
 * ```
 */
export class AgentClient {
  /** @private Cache for agent resolution results */
  private agentCache: AgentResolutionCache | null = null;
  /** @private Time-to-live for the agent cache in milliseconds */
  private cacheTTL = 300000; // 5 minutes

  /**
   * Creates a new AgentClient instance
   * @param options - Configuration options for the client
   */
  constructor(private options: MessageClientOptions) {}

  /**
   * Resolves agent cards with caching
   * 
   * This method discovers available agents from the A2A server. Results are cached
   * to improve performance and reduce network traffic. The cache can be bypassed
   * by setting forceRefresh to true.
   * 
   * @param capability - Optional capability filter to find agents with specific capabilities
   * @param forceRefresh - Whether to bypass the cache and force a fresh request (default: false)
   * @returns Promise resolving to an array of matching AgentCards
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2AValidationError} If the server response is invalid
   * @throws {A2ATimeoutError} If the request times out
   * 
   * @example
   * ```typescript
   * // Get all agents
   * const allAgents = await agentClient.resolveAgents();
   * 
   * // Get only agents with a specific capability
   * const weatherAgents = await agentClient.resolveAgents('weather-forecasting');
   * 
   * // Force a fresh request bypassing the cache
   * const freshAgents = await agentClient.resolveAgents(undefined, true);
   * ```
   */
  async resolveAgents(capability?: string, forceRefresh = false): Promise<AgentCard[]> {
    // Return cached results if valid and not forcing refresh
    if (!forceRefresh && this.agentCache && Date.now() < this.agentCache.expiresAt) {
      return capability 
        ? this.agentCache.agents.filter(a => a.capabilities.includes(capability))
        : this.agentCache.agents;
    }

    const request: DiscoverRequest = {
      jsonrpc: '2.0',
      method: 'discover',
      params: capability ? { capability } : undefined
    };

    try {
      const response = await sendRequest<DiscoverResponse>(this.options, request);
      this.agentCache = {
        agents: response.result.agents,
        expiresAt: Date.now() + this.cacheTTL,
        lastUpdated: Date.now()
      };
      return response.result.agents;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network')) {
        // Return stale cache if available when network fails
        if (this.agentCache) {
          return capability
            ? this.agentCache.agents.filter(a => a.capabilities.includes(capability))
            : this.agentCache.agents;
        }
        throw new A2ANetworkError('Failed to resolve agents', {
          originalError: err,
          capability
        });
      }
      throw normalizeError(err);
    }
  }

  /**
   * Gets a specific agent's card by ID
   * 
   * This method retrieves information about a specific agent by its ID. It uses
   * the resolveAgents method internally and filters the results to find the
   * requested agent.
   * 
   * @param agentId - The ID of the agent to look up
   * @param forceRefresh - Whether to bypass the cache and force a fresh request (default: false)
   * @returns Promise resolving to the requested AgentCard
   * @throws {A2AValidationError} If the agent with the specified ID is not found
   * @throws {A2ANetworkError} If there's a network issue contacting the server
   * @throws {A2ATimeoutError} If the request times out
   * 
   * @example
   * ```typescript
   * try {
   *   const weatherAgent = await agentClient.getAgentCard('weather-agent');
   *   console.log(`Found agent: ${weatherAgent.name}`);
   * } catch (error) {
   *   if (error.code === 'VALIDATION_ERROR') {
   *     console.error('Agent not found');
   *   } else {
   *     console.error('Error fetching agent:', error.message);
   *   }
   * }
   * ```
   */
  async getAgentCard(agentId: string, forceRefresh = false): Promise<AgentCard> {
    try {
      const agents = await this.resolveAgents(undefined, forceRefresh);
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new A2AValidationError('Agent not found', {
          agentId,
          availableAgents: agents.map(a => a.id)
        });
      }
      return agent;
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        throw new A2ATimeoutError('Agent resolution timed out', {
          originalError: err,
          agentId
        });
      }
      throw normalizeError(err);
    }
  }
}
