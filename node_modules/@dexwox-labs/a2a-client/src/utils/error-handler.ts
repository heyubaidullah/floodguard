/**
 * @module ErrorHandler
 * @description Utilities for handling and normalizing errors in the A2A SDK
 */

import {
  A2AError,
  A2AClientError,
  A2AServerError,
  A2ANetworkError,
  A2AValidationError,
  A2ATimeoutError
} from './error';

export {
  A2AError,
  A2AClientError,
  A2AServerError,
  A2ANetworkError,
  A2AValidationError,
  A2ATimeoutError
};

/**
 * Normalizes any error into an A2AError
 * 
 * This utility function converts any error or exception into a standardized
 * A2AError object. It handles various error types including:
 * - Existing A2AError instances (returned as-is)
 * - Standard JavaScript Error objects
 * - Server response objects with status codes
 * - Any other unknown error types
 * 
 * @param err - The error to normalize, can be of any type
 * @returns A standardized A2AError instance
 * 
 * @example
 * ```typescript
 * try {
 *   // Some operation that might fail
 *   await fetch('https://a2a-server.example.com');
 * } catch (error) {
 *   // Normalize the error to a standard format
 *   const normalizedError = normalizeError(error);
 *   
 *   // Now we can handle it consistently
 *   console.error(`Error (${normalizedError.code}): ${normalizedError.message}`);
 *   
 *   // And we can check for specific error types
 *   if (normalizedError instanceof A2ANetworkError) {
 *     // Handle network errors specifically
 *   }
 * }
 * ```
 */
export function normalizeError(err: unknown): A2AError {
  // If it's already an A2AError, return it as-is
  if (err instanceof A2AError) {
    return err;
  }

  // Handle standard JavaScript Error objects
  if (err instanceof Error) {
    return new A2AClientError(
      'UNKNOWN_ERROR',
      err.message,
      { stack: err.stack }
    );
  }

  // Handle server response objects with status codes
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;
    if (errorObj.status && typeof errorObj.status === 'number') {
      return new A2AServerError(
        errorObj.status,
        String(errorObj.code || 'SERVER_ERROR'),
        String(errorObj.message || 'Server error occurred'),
        errorObj
      );
    }
  }

  // Handle any other unknown error types
  return new A2AClientError(
    'UNKNOWN_ERROR',
    'Unknown error occurred',
    { originalError: err }
  );
}
