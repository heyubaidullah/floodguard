/**
 * @module AgentCardResolver
 * @description Provides functionality to resolve and cache agent cards from agent servers
 */

import type { AgentCard } from '@dexwox-labs/a2a-core';
import { CircuitBreaker } from './utils/circuit-breaker';

/**
 * Configuration options for the agent card resolver
 * 
 * These options control how agent cards are fetched, cached, and timed out.
 * 
 * @example
 * ```typescript
 * const options: AgentCardResolverOptions = {
 *   agentCardPath: '/.well-known/custom-agent.json',
 *   cacheTtl: 600000, // 10 minutes
 *   timeout: 3000     // 3 seconds
 * };
 * ```
 */
export interface AgentCardResolverOptions {
  /**
   * Path to agent card (default: '/.well-known/agent.json')
   * 
   * This is the endpoint path where the agent card is hosted on the agent server.
   * By default, it follows the well-known URI pattern for agent discovery.
   */
  agentCardPath?: string;
  
  /**
   * Cache TTL in milliseconds (default: 300000 - 5 minutes)
   * 
   * Controls how long a fetched agent card remains valid in the cache
   * before a new fetch is required.
   */
  cacheTtl?: number;
  
  /**
   * Request timeout in milliseconds (default: 5000)
   * 
   * Maximum time to wait for an agent card fetch operation before timing out.
   */
  timeout?: number;
}

/**
 * Internal interface for cached agent card entries
 * 
 * @internal
 */
interface CachedAgentCard {
  /** The cached agent card */
  card: AgentCard;
  
  /** Timestamp when this cache entry expires */
  expiresAt: number;
}

/**
 * Resolves and caches agent cards from agent servers
 * 
 * This class handles fetching agent cards from agent servers with built-in
 * caching and timeout handling. It follows the A2A protocol for agent discovery.
 * 
 * @example
 * ```typescript
 * const resolver = new AgentCardResolver('https://agent.example.com');
 * 
 * // Resolve the agent card
 * const agentCard = await resolver.resolve();
 * console.log('Agent name:', agentCard.name);
 * console.log('Agent capabilities:', agentCard.capabilities);
 * ```
 */
export class AgentCardResolver {
  /** @private Base URL of the agent server */
  private readonly baseUrl: string;
  
  /** @private Path to the agent card endpoint */
  private readonly agentCardPath: string;
  
  /** @private Cache time-to-live in milliseconds */
  private readonly cacheTtl: number;
  
  /** @private Request timeout in milliseconds */
  private readonly timeout: number;
  
  /** @private Circuit breaker for handling failures */
  private readonly circuitBreaker: CircuitBreaker;
  
  /** @private Currently cached agent card, if any */
  private cache: CachedAgentCard | null = null;

  /**
   * Creates a new agent card resolver
   * 
   * @param baseUrl - Base URL of the agent server
   * @param options - Configuration options
   */
  constructor(baseUrl: string, options: AgentCardResolverOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.agentCardPath = options.agentCardPath || '/.well-known/agent.json';
    this.cacheTtl = options.cacheTtl || 300000; // 5 minutes
    this.timeout = options.timeout || 5000;
    
    // Initialize circuit breaker for reliability
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 10000
    });
  }

  /**
   * Resolves agent card, using cache if available and not expired
   * 
   * This method first checks if there is a valid cached agent card.
   * If the cache is valid, it returns the cached card immediately.
   * Otherwise, it fetches a fresh agent card from the server and
   * updates the cache.
   * 
   * @returns Promise resolving to the agent card
   * @throws Error if fetching the agent card fails
   * 
   * @example
   * ```typescript
   * const agentCard = await resolver.resolve();
   * console.log('Agent name:', agentCard.name);
   * ```
   */
  async resolve(): Promise<AgentCard> {
    // Use cache if available and not expired
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.card;
    }

    // Fetch fresh card and update cache
    const card = await this.fetchAgentCard();
    this.cache = {
      card,
      expiresAt: Date.now() + this.cacheTtl
    };
    return card;
  }

  /**
   * Force fresh fetch of agent card, bypassing cache
   * 
   * This method always fetches a fresh agent card from the server,
   * regardless of whether there is a valid cached card. It then
   * updates the cache with the new card.
   * 
   * @returns Promise resolving to the fresh agent card
   * @throws Error if fetching the agent card fails
   * 
   * @example
   * ```typescript
   * // Force a refresh of the agent card
   * const freshCard = await resolver.refresh();
   * console.log('Updated capabilities:', freshCard.capabilities);
   * ```
   */
  async refresh(): Promise<AgentCard> {
    // Fetch fresh card and update cache
    const card = await this.fetchAgentCard();
    this.cache = {
      card,
      expiresAt: Date.now() + this.cacheTtl
    };
    return card;
  }

  /**
   * Fetches an agent card from the server
   * 
   * This private method handles the actual HTTP request to fetch the agent card.
   * It uses the circuit breaker pattern to prevent cascading failures and
   * implements timeout handling for reliability.
   * 
   * @returns Promise resolving to the fetched agent card
   * @throws Error if the HTTP request fails or times out
   * @private
   */
  private async fetchAgentCard(): Promise<AgentCard> {
    const url = `${this.baseUrl}${this.agentCardPath}`;
    
    // Use circuit breaker to prevent cascading failures
    return this.circuitBreaker.execute(async () => {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status}`);
      }

      return response.json();
    });
  }
}
