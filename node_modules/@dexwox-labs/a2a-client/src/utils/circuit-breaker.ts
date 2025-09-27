/**
 * @module CircuitBreaker
 * @description Circuit breaker implementation for improving reliability in network operations
 */

import { A2AError } from '@dexwox-labs/a2a-core';

/**
 * Configuration options for the circuit breaker
 * 
 * These options control the behavior of the circuit breaker, including
 * when it opens, when it attempts to close, and how many successes are
 * required to fully close it again.
 * 
 * @example
 * ```typescript
 * const options: CircuitBreakerOptions = {
 *   failureThreshold: 3,  // Open after 3 consecutive failures
 *   successThreshold: 2,  // Close after 2 consecutive successes
 *   timeout: 10000        // Wait 10 seconds before attempting to close
 * };
 * ```
 */
export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  
  /** Number of consecutive successes required to close the circuit */
  successThreshold: number;
  
  /** Time in milliseconds to wait before attempting to close the circuit */
  timeout: number;
}

/**
 * Circuit breaker implementation for improving reliability
 * 
 * The circuit breaker pattern prevents cascading failures by temporarily disabling
 * operations that are likely to fail.
 * 
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 3,
 *   successThreshold: 2,
 *   timeout: 10000
 * });
 * 
 * const result = await breaker.execute(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * ```
 */
export class CircuitBreaker {
  /** @private Current state of the circuit breaker */
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  /** @private Count of consecutive failures */
  private failureCount = 0;
  /** @private Count of consecutive successes in HALF_OPEN state */
  private successCount = 0;
  /** @private Timestamp of the last failure */
  private lastFailureTime = 0;
  /** @private Configuration options */
  private readonly options: CircuitBreakerOptions;

  /**
   * Creates a new circuit breaker instance
   * 
   * @param options - Configuration options for the circuit breaker
   */
  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  /**
   * Executes a function with circuit breaker protection
   * 
   * This method wraps the provided function with circuit breaker logic.
   * If the circuit is closed, the function executes normally. If the circuit
   * is open, an error is thrown immediately without executing the function.
   * If the circuit is half-open, the function is executed as a test to see
   * if the underlying system has recovered.
   * 
   * @param fn - The async function to execute
   * @returns Promise resolving to the result of the function
   * @throws {A2AError} If the circuit is open
   * @throws Any error thrown by the executed function
   * 
   * @example
   * ```typescript
   * try {
   *   const data = await breaker.execute(async () => {
   *     const response = await fetch('https://api.example.com/data');
   *     return response.json();
   *   });
   *   processData(data);
   * } catch (error) {
   *   if (error.code === -32050) {
   *     console.error('Circuit is open, not attempting request');
   *   } else {
   *     console.error('Request failed:', error);
   *   }
   * }
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, check if timeout has elapsed to transition to half-open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.options.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new A2AError(
          'Circuit breaker is open',
          -32050,
          { state: this.state }
        );
      }
    }

    try {
      // Execute the function and track success
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      // Track failure and re-throw the error
      this.onFailure();
      throw err;
    }
  }

  /**
   * Handles successful operations
   * 
   * Resets the failure count and, if in HALF_OPEN state, increments the success count.
   * If enough consecutive successes occur in HALF_OPEN state, the circuit is closed.
   * 
   * @private
   */
  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * Handles failed operations
   * 
   * Increments the failure count and records the time of failure.
   * If enough consecutive failures occur, the circuit is opened.
   * 
   * @private
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Gets the current state of the circuit breaker
   * 
   * @returns The current state: 'CLOSED', 'OPEN', or 'HALF_OPEN'
   * 
   * @example
   * ```typescript
   * const state = breaker.getState();
   * console.log(`Circuit breaker is currently ${state}`);
   * 
   * if (state === 'OPEN') {
   *   console.log('Circuit is open, requests will be rejected');
   * }
   * ```
   */
  getState(): string {
    return this.state;
  }
}
