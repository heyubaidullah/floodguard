/**
 * @module ResponseHelpers
 * @description Helper functions for generating standardized JSON-RPC responses
 */

import { 
  JsonRpcResponse,
  A2AError,
  MessagePart,
  Task
} from '@dexwox-labs/a2a-core';

/**
 * Union type of all possible success response types
 * 
 * This type represents all the valid response types that can be returned
 * from A2A protocol method handlers.
 * 
 * @internal
 */
type SuccessResponseTypes = 
  | Task            // Task response
  | MessagePart     // Message part response
  | string          // Simple string response (e.g., task ID)
  | Record<string, unknown>; // Generic object response

/**
 * Builds a successful JSON-RPC response
 * 
 * This function creates a properly formatted JSON-RPC 2.0 success response
 * with the provided result data.
 * 
 * @param id - The request ID from the original JSON-RPC request
 * @param result - The result data to include in the response
 * @returns A properly formatted JSON-RPC success response
 * 
 * @example
 * ```typescript
 * // Create a success response with a task result
 * const response = buildSuccessResponse('request-123', {
 *   id: 'task-456',
 *   state: 'completed',
 *   result: { data: 'Task output' }
 * });
 * ```
 */
export function buildSuccessResponse<T extends SuccessResponseTypes>(
  id: string | number | undefined,
  result: T
): JsonRpcResponse<T> {
  return {
    jsonrpc: '2.0',
    id: id ?? undefined,
    result
  };
}

/**
 * Builds an error JSON-RPC response
 * 
 * This function creates a properly formatted JSON-RPC 2.0 error response
 * with the provided error object.
 * 
 * @param id - The request ID from the original JSON-RPC request
 * @param error - The error object to include in the response
 * @returns A properly formatted JSON-RPC error response
 * 
 * @example
 * ```typescript
 * // Create an error response
 * const error = new A2AError('Task not found', -32011);
 * const response = buildErrorResponse('request-123', error);
 * ```
 */
export function buildErrorResponse(
  id: string | number | undefined,
  error: A2AError
): JsonRpcResponse<null> {
  return {
    jsonrpc: '2.0',
    id: id ?? undefined,
    error
  };
}

/**
 * Validates that a response matches one of the expected types
 * 
 * This function checks if a response object has a type that matches
 * one of the expected types. For string responses, it checks if 'string'
 * is in the expected types array.
 * 
 * @param response - The response object to validate
 * @param expectedTypes - Array of valid type strings
 * @returns True if the response type is valid, false otherwise
 * 
 * @example
 * ```typescript
 * // Check if a response is a valid message part
 * const isValid = validateResponseType(
 *   { type: 'text', content: 'Hello' },
 *   ['text', 'image']
 * );
 * ```
 */
export function validateResponseType(
  response: unknown,
  expectedTypes: string[]
): boolean {
  if (!response) {
    return false;
  }
  
  if (typeof response === 'string') {
    return expectedTypes.includes('string');
  }

  if (typeof response === 'object') {
    const type = (response as any).type;
    return expectedTypes.includes(type);
  }

  return false;
}

/**
 * Prepares a JSON-RPC response with validation
 * 
 * This function handles both success and error cases, validating that
 * success responses match the expected types. If validation fails,
 * it automatically generates an appropriate error response.
 * 
 * @param id - The request ID from the original JSON-RPC request
 * @param response - The response object or error to include
 * @param expectedTypes - Array of valid response types
 * @returns A properly formatted JSON-RPC response
 * 
 * @example
 * ```typescript
 * // Prepare a response with validation
 * const result = await handleRequest();
 * const response = prepareResponse(
 *   'request-123',
 *   result,
 *   ['text', 'image']
 * );
 * ```
 */
export function prepareResponse<T extends Exclude<SuccessResponseTypes, string>>(
  id: string | number | undefined,
  response: T | A2AError,
  expectedTypes: string[]
): JsonRpcResponse<T> {
  // If the response is already an error, return an error response
  if (response instanceof A2AError) {
    return buildErrorResponse(id, response);
  }

  // Validate that the response type matches one of the expected types
  if (!validateResponseType(response, expectedTypes)) {
    return buildErrorResponse(id, new A2AError(
      'Invalid response type from agent',
      -32602,
      { 
        receivedType: typeof response === 'object' ? (response as any).type : typeof response 
      }
    ));
  }

  // Return a success response with the validated result
  return buildSuccessResponse(id, response as T);
}
