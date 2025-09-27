# @dexwox-labs/a2a-client

A TypeScript client library for interacting with agents implementing the Agent-to-Agent (A2A) protocol.

This package implements the A2A protocol specification, enabling seamless agent communication. Developed by [Dexwox Innovations Pvt Ltd](https://dexwox.com) to provide developers with a robust TypeScript implementation of the standard.

## Features

- HTTP and WebSocket client implementations
- Circuit breaker pattern for resilient requests
- Error handling and retry mechanisms
- Type-safe API interactions
- Task lifecycle management
- Message streaming support

## Installation

```bash
npm install @dexwox-labs/a2a-client
# or 
pnpm add @dexwox-labs/a2a-client
# or use the unified package
npm install @dexwox-labs/a2a-node
```

## Quick Start

```typescript
// Import from the client package
import { AgentClient, MessageClient, TaskClient } from '@dexwox-labs/a2a-client';

// Or import from the unified package
// import { AgentClient, MessageClient, TaskClient } from '@dexwox-labs/a2a-node';

// Initialize clients
const agentClient = new AgentClient('http://localhost:3000');
const messageClient = new MessageClient('http://localhost:3000');
const taskClient = new TaskClient('http://localhost:3000');

// Example usage
const agent = await agentClient.getAgentCard();
const task = await taskClient.createTask({...});
const messages = await messageClient.getMessages();
```

## Core Components

### AgentClient
- `getAgentCard()`: Retrieves agent metadata
- `getCapabilities()`: Lists agent capabilities

### MessageClient  
- `sendMessage()`: Sends a new message
- `getMessages()`: Retrieves message history
- `streamMessages()`: WebSocket message streaming

### TaskClient
- `createTask()`: Starts a new task
- `getTask()`: Gets task status
- `updateTask()`: Updates task progress
- `cancelTask()`: Cancels a running task

## Configuration

### Client Options

| Parameter | Type | Description |
|-----------|------|-------------|
| baseUrl | string | Agent server URL |
| timeout | number | Request timeout in ms |
| retries | number | Number of retry attempts |
| circuitBreaker | object | Circuit breaker config |

### Environment Variables

- `A2A_API_URL`: Base URL for agent server
- `A2A_API_TIMEOUT`: Request timeout (default: 5000ms)

## Error Handling

The client provides standardized error classes:

- `NetworkError`: Connection issues
- `TimeoutError`: Request timeout
- `CircuitBreakerError`: Circuit open
- `ApiError`: Server-side errors

## Testing

Run tests with:
```bash
cd packages/client
pnpm test
```

Generate coverage report:
```bash
pnpm test -- --coverage
```

## Examples

### Basic Usage
```typescript
const client = new AgentClient('http://localhost:3000', {
  timeout: 10000,
  retries: 3
});

try {
  const agent = await client.getAgentCard();
  console.log(agent);
} catch (err) {
  if (err instanceof TimeoutError) {
    // Handle timeout
  }
}
```

### WebSocket Streaming
```typescript 
const messageClient = new MessageClient('http://localhost:3000');

const unsubscribe = messageClient.streamMessages((message) => {
  console.log('New message:', message);
});

// Later...
unsubscribe();
```

## Contributing
See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
