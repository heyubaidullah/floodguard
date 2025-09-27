# @dexwox-labs/a2a-server

A TypeScript server implementation for the Agent-to-Agent (A2A) protocol, enabling agent execution and task management.

This package provides a robust server implementation of the A2A protocol specification. Developed by [Dexwox Innovations Pvt Ltd](https://dexwox.com) to deliver a production-ready TypeScript solution for hosting and managing A2A-compatible agents.

## Features

- Express-based HTTP server
- WebSocket support for streaming
- Request context management
- Task lifecycle management
- Error handling middleware
- Configurable CORS and security

## Installation

```bash
npm install @dexwox-labs/a2a-server
# or
pnpm add @dexwox-labs/a2a-server
# or use the unified package
npm install @dexwox-labs/a2a-node
```

## Quick Start

```typescript
// Import from the server package
import { A2AServer } from '@dexwox-labs/a2a-server';
import { AgentCard } from '@dexwox-labs/a2a-core';
import { RequestHandler } from './request-handler';

// Or import everything from the unified package
// import { A2AServer, AgentCard } from '@dexwox-labs/a2a-node';

const agentCard: AgentCard = {
  id: 'my-agent',
  name: 'My Agent',
  capabilities: ['task-processing'],
  endpoint: 'http://localhost:3000'
};

const requestHandler = new RequestHandler();
const server = new A2AServer(agentCard, requestHandler);

server.start(3000);
```

## Configuration

### A2AServer Options

| Parameter | Type | Description |
|-----------|------|-------------|
| agentCard | `AgentCard` | Required agent metadata |
| requestHandler | `RequestHandler` | Handles incoming requests |
| contextMiddleware | `Function` | Optional custom middleware |

### Environment Variables

- `NODE_ENV`: 'production' or 'development'
- `CORS_ORIGIN`: Allowed origins (default: '*')
- `PORT`: Server port (default: 3000)

## API Reference

### A2AServer Class

#### Methods

- `start(port: number)`: Starts the HTTP/WebSocket server
- `configureMiddleware()`: Sets up Express middleware
- `configureRoutes()`: Defines API routes
- `configureErrorHandling()`: Error handler setup

### RequestHandler

Handles all incoming requests with these key methods:

- `handleStreamMessage()`: WebSocket message processing
- `normalizeError()`: Standard error formatting
- `handleCreateTask()`: Task creation endpoint
- `handleUpdateTask()`: Task status updates

## Examples

### Custom Middleware

```typescript
const customMiddleware = (req, res, next) => {
  // Add custom request processing
  next();
};

new A2AServer(agentCard, requestHandler, customMiddleware);
```

### WebSocket Handling

```typescript
server.start(3000); // Automatically starts WebSocket server

// Client connection example:
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Error Handling

The server provides standardized error responses:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal server error"
  }
}
```

## Testing

Run tests with:
```bash
cd packages/server
pnpm test
```

Generate coverage report:
```bash
pnpm test -- --coverage
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
