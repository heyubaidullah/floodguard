# @dexwox-labs/a2a-core

Shared types, utilities and protocols for implementing the Agent-to-Agent (A2A) communication protocol.

This package provides the foundation for the A2A protocol implementation, delivering essential types and utilities. Developed by [Dexwox Innovations Pvt Ltd](https://dexwox.com) to offer a comprehensive TypeScript implementation of the protocol standard.

## Features

- Common type definitions
- Protocol specifications (A2A, JSON-RPC)
- Validation decorators
- Utility functions
- Error classes
- Message and task utilities

## Installation

```bash
npm install @dexwox-labs/a2a-core
# or
pnpm add @dexwox-labs/a2a-core
# or use the unified package
npm install @dexwox-labs/a2a-node
```

## Core Components

### Types
- `AgentCard`: Agent metadata definition
- `Task`: Task lifecycle structure  
- `Message`: Communication protocol
- `ErrorResponse`: Standard error format

### Protocols
- Google A2A Protocol definitions and interfaces
- JSON-RPC 2.0 types
- WebSocket message formats

### Decorators
- `@ValidateParams`: Parameter validation
- `@ValidateResponse`: Response validation
- `@Trace` and `@TraceClass`: Telemetry and metrics collection

### Utilities
- Type converters
- Schema validation
- Message serialization
- Task state management

## Usage Examples

### Using Core Types
```typescript
import { AgentCard } from '@dexwox-labs/a2a-core';

const agent: AgentCard = {
  id: 'weather-agent',
  name: 'Weather Agent',
  capabilities: ['weather-forecast'],
  endpoint: 'http://weather-agent.example.com'
};
```

### Validation Decorators
```typescript
import { ValidateParams } from '@dexwox-labs/a2a-core';

class WeatherService {
  @ValidateParams(weatherSchema)
  async getForecast(location: string) {
    // implementation
  }
}
```

### Protocol Utilities
```typescript
import { parseMessage, serializeMessage } from '@dexwox-labs/a2a-core';

const message = parseMessage(rawMessage);
const wireFormat = serializeMessage(message);
```

## Testing

Run tests with:
```bash
cd packages/core
pnpm test
```

Generate coverage report:
```bash
pnpm test -- --coverage
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## Versioning

Follows [Semantic Versioning](https://semver.org/). Breaking changes will result in major version bumps.
