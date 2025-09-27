/**
 * @module DefaultJsonRpcRequestHandler
 * @description Default implementation of the JSON-RPC request handler for the A2A protocol
 * 
 * This module provides the default implementation of the JSON-RPC request handler
 * interface for the A2A protocol server. It includes middleware for request validation,
 * error handling, and response formatting, as well as methods for handling various
 * JSON-RPC requests.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { JsonRpcRequestHandler } from './jsonrpc-handler';
import { JsonRpcResponse, A2AError } from '@dexwox-labs/a2a-core';
import { z } from 'zod';
import { Middleware } from './base-handler';

/**
 * Default implementation of the JSON-RPC request handler
 * 
 * This class provides a standard implementation of the JSON-RPC request handler
 * interface for the A2A protocol server. It includes middleware for request
 * validation, error handling, and response formatting, as well as methods for
 * handling various JSON-RPC requests.
 * 
 * @example
 * ```typescript
 * // Create a JSON-RPC request handler
 * const jsonRpcHandler = new DefaultJsonRpcRequestHandler();
 * 
 * // Add middleware
 * jsonRpcHandler.use(jsonRpcHandler.handleErrors());
 * jsonRpcHandler.use(jsonRpcHandler.formatResponse());
 * 
 * // Use in an Express app
 * app.use('/jsonrpc', jsonRpcHandler.router);
 * ```
 */
export class DefaultJsonRpcRequestHandler implements JsonRpcRequestHandler {
  /** Express router for handling HTTP requests */
  readonly router = Router();
  
  /** Array of middleware functions to apply to requests */
  private middlewares: Middleware[] = [];

  /**
   * Adds middleware to the request handler
   * 
   * This method adds a middleware function to the request handler's middleware
   * stack. Middleware functions are executed in the order they are added.
   * 
   * @param middleware - Middleware function to add
   * 
   * @example
   * ```typescript
   * // Add error handling middleware
   * jsonRpcHandler.use(jsonRpcHandler.handleErrors());
   * 
   * // Add custom logging middleware
   * jsonRpcHandler.use(async (req, res, next) => {
   *   console.log(`${req.method} ${req.path}`);
   *   await next();
   * });
   * ```
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Creates middleware for validating request body against a schema
   * 
   * This method returns a middleware function that validates the request body
   * against a Zod schema. If validation fails, it responds with a 400 Bad Request
   * and a JSON-RPC error response.
   * 
   * @param schema - Zod schema to validate against
   * @returns Middleware function that validates requests
   * 
   * @example
   * ```typescript
   * // Create a schema for validating sendMessage requests
   * const sendMessageSchema = z.object({
   *   jsonrpc: z.literal('2.0'),
   *   method: z.literal('sendMessage'),
   *   params: z.object({
   *     parts: z.array(z.object({
   *       type: z.string(),
   *       content: z.string()
   *     })),
   *     agentId: z.string()
   *   }),
   *   id: z.string().optional()
   * });
   * 
   * // Add validation middleware
   * jsonRpcHandler.use(jsonRpcHandler.validateRequest(sendMessageSchema));
   * ```
   */
  validateRequest(schema: z.ZodSchema): Middleware {
    return async (req, res, next) => {
      try {
        schema.parse(req.body);
        next();
      } catch (err) {
        res.status(400).json(this.buildErrorResponse(req.body?.id, err));
      }
    };
  }

  /**
   * Creates middleware for handling errors
   * 
   * This method returns a middleware function that catches any errors thrown
   * during request processing and responds with a 500 Internal Server Error
   * and a JSON-RPC error response.
   * 
   * @returns Middleware function that catches and processes errors
   * 
   * @example
   * ```typescript
   * // Add error handling middleware
   * jsonRpcHandler.use(jsonRpcHandler.handleErrors());
   * ```
   */
  handleErrors(): Middleware {
    return async (req, res, next) => {
      try {
        await next();
      } catch (err) {
        res.status(500).json(this.buildErrorResponse(req.body?.id, err));
      }
    };
  }

  /**
   * Creates middleware for formatting responses
   * 
   * This method returns a middleware function that formats responses as JSON-RPC
   * success responses. If the response already has a jsonrpc property, it is
   * left unchanged.
   * 
   * @returns Middleware function that formats responses
   * 
   * @example
   * ```typescript
   * // Add response formatting middleware
   * jsonRpcHandler.use(jsonRpcHandler.formatResponse());
   * ```
   */
  formatResponse(): Middleware {
    return async (req, res, next) => {
      const originalJson = res.json;
      res.json = (body: any) => {
        if (body?.jsonrpc === '2.0') {
          return originalJson.call(res, body);
        }
        return originalJson.call(res, this.buildSuccessResponse(req.body?.id, body));
      };
      next();
    };
  }

  /**
   * Builds a JSON-RPC success response
   * 
   * This method creates a properly formatted JSON-RPC 2.0 success response
   * with the provided result data.
   * 
   * @param id - Request ID from the original JSON-RPC request
   * @param result - Result data to include in the response
   * @returns Properly formatted JSON-RPC success response
   * 
   * @example
   * ```typescript
   * // Create a success response
   * const response = jsonRpcHandler.buildSuccessResponse('request-123', {
   *   taskId: 'task-456'
   * });
   * 
   * // Send the response
   * res.json(response);
   * ```
   */
  buildSuccessResponse(id?: string | number, result?: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  buildErrorResponse(id?: string | number, error?: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: this.normalizeError(error)
    };
  }

  async handleJsonRpcSendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { parts, agentId } = req.body;
      const messageId = await this.handleSendMessage(parts, agentId);
      res.json(this.buildSuccessResponse(req.body.id, messageId));
    } catch (err) {
      res.status(400).json(this.buildErrorResponse(req.body.id, err));
    }
  }

  async handleJsonRpcStreamMessage(req: Request, res: Response): Promise<void> {
    try {
      const { parts, agentId } = req.body;
      const stream = this.handleStreamMessage(parts, agentId);
      // Start consuming the stream in background
      (async () => {
        for await (const _ of stream) {}
      })();
      res.json(this.buildSuccessResponse(req.body.id, 'Stream started'));
    } catch (err) {
      res.status(400).json(this.buildErrorResponse(req.body.id, err));
    }
  }

  async handleJsonRpcGetTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const task = await this.handleGetTaskStatus(req.params.taskId);
      res.json(this.buildSuccessResponse(undefined, { task }));
    } catch (err) {
      res.status(400).json(this.buildErrorResponse(undefined, err));
    }
  }

  async handleJsonRpcCancelTask(req: Request, res: Response): Promise<void> {
    try {
      await this.handleCancelTask(req.params.taskId);
      res.json(this.buildSuccessResponse(undefined, 'Cancellation requested'));
    } catch (err) {
      res.status(400).json(this.buildErrorResponse(undefined, err));
    }
  }

  async handleJsonRpcDiscoverAgents(req: Request, res: Response): Promise<void> {
    try {
      const { capability } = req.query;
      const agents = await this.handleDiscoverAgents(capability);
      res.json(this.buildSuccessResponse(undefined, { agents }));
    } catch (err) {
      res.status(400).json(this.buildErrorResponse(undefined, err));
    }
  }

  // Implement BaseRequestHandler methods
  handleSendMessage(parts: any[], agentId: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  handleStreamMessage(parts: any[], agentId: string): AsyncGenerator<any, void, unknown> {
    throw new Error('Method not implemented.');
  }

  handleGetTaskStatus(taskId: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  handleCancelTask(taskId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  handleTaskResubscription(taskId: string): AsyncGenerator<any, void, unknown> {
    throw new Error('Method not implemented.');
  }

  async handleDiscoverAgents(capability?: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  normalizeError(err: unknown): any {
    throw new Error('Method not implemented.');
  }
}
