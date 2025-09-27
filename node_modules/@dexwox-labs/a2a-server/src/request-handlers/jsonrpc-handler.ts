/**
 * @module JsonRpcRequestHandler
 * @description JSON-RPC specific request handler interface for the A2A protocol
 * 
 * This module extends the base request handler interface with JSON-RPC specific
 * functionality, including methods for building JSON-RPC responses and handling
 * JSON-RPC requests for various A2A protocol operations.
 */

import { Router } from 'express';
import { JsonRpcResponse } from '@dexwox-labs/a2a-core';
import { BaseRequestHandler } from './base-handler';

/**
 * JSON-RPC specific request handler interface
 * 
 * This interface extends the base request handler with JSON-RPC specific
 * functionality, including methods for building JSON-RPC responses and
 * handling JSON-RPC requests for various A2A protocol operations.
 * 
 * @example
 * ```typescript
 * class MyJsonRpcHandler implements JsonRpcRequestHandler {
 *   readonly router = Router();
 *   
 *   constructor() {
 *     this.router.post('/jsonrpc', async (req, res) => {
 *       const { method, params, id } = req.body;
 *       
 *       if (method === 'sendMessage') {
 *         return this.handleJsonRpcSendMessage(req, res);
 *       }
 *       
 *       // Handle other methods...
 *     });
 *   }
 *   
 *   // Implement all required methods...
 * }
 * ```
 */
export interface JsonRpcRequestHandler extends BaseRequestHandler {
  /**
   * Builds a JSON-RPC success response
   * 
   * @param id - Request ID from the original JSON-RPC request
   * @param result - Result data to include in the response
   * @returns Properly formatted JSON-RPC success response
   */
  buildSuccessResponse(id?: string | number, result?: any): JsonRpcResponse;
  
  /**
   * Builds a JSON-RPC error response
   * 
   * @param id - Request ID from the original JSON-RPC request
   * @param error - Error object to include in the response
   * @returns Properly formatted JSON-RPC error response
   */
  buildErrorResponse(id?: string | number, error?: any): JsonRpcResponse;
  
  /**
   * Handles JSON-RPC requests for sending messages to agents
   * 
   * @param req - Express request object containing the JSON-RPC request
   * @param res - Express response object for sending the JSON-RPC response
   * @returns Promise that resolves when the response is sent
   */
  handleJsonRpcSendMessage(req: any, res: any): Promise<void>;
  
  /**
   * Handles JSON-RPC requests for streaming messages to agents
   * 
   * @param req - Express request object containing the JSON-RPC request
   * @param res - Express response object for sending the JSON-RPC response
   * @returns Promise that resolves when the response is sent
   */
  handleJsonRpcStreamMessage(req: any, res: any): Promise<void>;
  
  /**
   * Handles JSON-RPC requests for getting task status
   * 
   * @param req - Express request object containing the JSON-RPC request
   * @param res - Express response object for sending the JSON-RPC response
   * @returns Promise that resolves when the response is sent
   */
  handleJsonRpcGetTaskStatus(req: any, res: any): Promise<void>;
  
  /**
   * Handles JSON-RPC requests for canceling tasks
   * 
   * @param req - Express request object containing the JSON-RPC request
   * @param res - Express response object for sending the JSON-RPC response
   * @returns Promise that resolves when the response is sent
   */
  handleJsonRpcCancelTask(req: any, res: any): Promise<void>;
  
  /**
   * Handles JSON-RPC requests for discovering available agents
   * 
   * @param req - Express request object containing the JSON-RPC request
   * @param res - Express response object for sending the JSON-RPC response
   * @returns Promise that resolves when the response is sent
   */
  handleJsonRpcDiscoverAgents(req: any, res: any): Promise<void>;
}
