/**
 * @module A2AServer
 * @description Server implementation for hosting A2A protocol agents
 */

import express from 'express';
import { json } from 'body-parser';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import type {
  Express,
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler
} from 'express';
import { A2AError, AgentCard } from '@dexwox-labs/a2a-core';
import { RequestHandler } from './request-handler';

/**
 * Server implementation for hosting A2A protocol agents
 * 
 * The A2AServer class provides a complete HTTP and WebSocket server implementation
 * for hosting agents that implement the A2A protocol. It handles request routing,
 * error handling, and WebSocket connections for streaming.
 * 
 * @example
 * ```typescript
 * import { A2AServer, DefaultRequestHandler } from '@dexwox-labs/a2a-node';
 * 
 * // Define an agent
 * const agent = {
 *   id: 'weather-agent',
 *   name: 'Weather Agent',
 *   description: 'Provides weather information',
 *   capabilities: ['weather-forecasting'],
 *   endpoint: 'http://localhost:3000'
 * };
 * 
 * // Create a request handler
 * const requestHandler = new DefaultRequestHandler([agent]);
 * 
 * // Create and start the server
 * const server = new A2AServer(agent, requestHandler);
 * server.start(3000);
 * ```
 */
export class A2AServer {
  /** Express application instance */
  private readonly app: ReturnType<typeof express>;
  /** WebSocket server instance */
  private wss: WebSocketServer | null = null;
  /** Agent card for this server */
  private readonly agentCard: AgentCard;
  /** Handler for processing incoming requests */
  private readonly requestHandler: RequestHandler;

  /**
   * Creates a new A2AServer instance
   * 
   * @param agentCard - The agent card describing this server's capabilities
   * @param requestHandler - Handler for processing incoming requests
   * @param contextMiddleware - Optional custom middleware for request context
   */
  constructor(
    agentCard: AgentCard, 
    requestHandler: RequestHandler,
    private readonly contextMiddleware?: (req: Request, res: Response, next: NextFunction) => void
  ) {
    this.app = express();
    this.agentCard = agentCard;
    this.requestHandler = requestHandler;
    
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configures Express middleware for the server
   * 
   * Sets up JSON parsing, CORS, and request context middleware.
   * @private
   */
  private configureMiddleware(): void {
    this.app.use(json() as express.RequestHandler);
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }) as express.RequestHandler);
    
    // Add context middleware if provided, otherwise use default
    if (this.contextMiddleware) {
      this.app.use(this.contextMiddleware);
    } else {
      this.app.use(require('./agent-execution/context-middleware').contextMiddleware(this.agentCard.id));
    }
  }

  /**
   * Configures HTTP routes for the server
   * 
   * Sets up the agent card endpoint and API routes.
   * @private
   */
  private configureRoutes(): void {
    // Agent card endpoint
    this.app.get('/.well-known/agent.json', (_: Request, res: Response) => {
      res.json(this.agentCard);
    });

    // API routes
    this.app.use('/api/v1', this.requestHandler.router);
  }

  /**
   * Configures global error handling for the server
   * 
   * Sets up middleware to catch and format errors according to the A2A protocol.
   * @private
   */
  private configureErrorHandling(): void {
    const errorHandler: ErrorRequestHandler = (
      err: unknown,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (err instanceof Error && 'code' in err && 'message' in err) {
        const a2aError = err as A2AError;
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: a2aError.code,
            message: a2aError.message,
            ...(a2aError.data && { data: a2aError.data })
          }
        });
      }
      console.error(err);
      res.status(500).json({ 
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        }
      });
    };
    this.app.use(errorHandler);
  }

  /**
   * Starts the A2A server on the specified port
   * 
   * This method starts both the HTTP server and WebSocket server for handling
   * A2A protocol requests. The WebSocket server is used for streaming messages.
   * 
   * @param port - The port to listen on (default: 3000)
   * 
   * @example
   * ```typescript
   * // Start on the default port (3000)
   * server.start();
   * 
   * // Start on a specific port
   * server.start(8080);
   * ```
   */
  public start(port: number = 3000): void {
    const server = this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.method === 'streamMessage') {
            for await (const part of this.requestHandler.handleStreamMessage(
              message.params.parts,
              message.params.agentId
            )) {
              ws.send(JSON.stringify(part));
            }
          }
        } catch (err) {
          ws.send(JSON.stringify(
            this.requestHandler.normalizeError(err)
          ));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }
}
