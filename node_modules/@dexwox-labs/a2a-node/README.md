# @dexwox-labs/a2a-node [![npm version](https://img.shields.io/npm/v/@dexwox-labs/a2a-node.svg)](https://www.npmjs.com/package/@dexwox-labs/a2a-node) [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

📖 [Full Documentation](https://dexwox-innovations-org.github.io/a2a-node-sdk/) | 💬 [Report Issues](https://github.com/Dexwox-Innovations-Org/a2a-node-sdk/issues)

The unified TypeScript package for implementing the Agent-to-Agent (A2A) communication protocol, enabling seamless communication between AI agents.

This package provides a complete implementation of the A2A protocol specification, allowing developers to build, connect, and deploy intelligent agents. Developed by [Dexwox Innovations Pvt Ltd](https://dexwox.com) to offer a robust TypeScript solution for agent-based systems.

> **Note**: This is the unified package that combines all A2A components. You can also install individual packages separately if needed:
> - `@dexwox-labs/a2a-core`: Core types and utilities
> - `@dexwox-labs/a2a-client`: Client implementation
> - `@dexwox-labs/a2a-server`: Server implementation

## Overview

The A2A protocol provides a standardized way for AI agents to communicate, share information, and collaborate on tasks. This package implements the protocol specification, making it easy to build, deploy, and connect agents that are compatible with the A2A ecosystem.

This package serves as the unified entry point to the A2A implementation and integrates the following components:

- **@dexwox-labs/a2a-core**: Core types, utilities, and A2A protocol definitions
- **@dexwox-labs/a2a-client**: Client libraries for connecting to A2A protocol servers
- **@dexwox-labs/a2a-server**: Server implementation for hosting A2A protocol-compatible agents

## Installation

```bash
# Install the main package
npm install @dexwox-labs/a2a-node

# Or install individual packages
npm install @dexwox-labs/a2a-core @dexwox-labs/a2a-client @dexwox-labs/a2a-server
```

## Quick Start

```typescript
// Import from the main package
import { createServer, AgentClient, MessageClient } from '@dexwox-labs/a2a-node';

// Or import from individual packages
import { AgentCard, Task } from '@dexwox-labs/a2a-core';
import { AgentClient, MessageClient } from '@dexwox-labs/a2a-client';
import { createServer, InMemoryTaskStore } from '@dexwox-labs/a2a-server';
```

## Documentation

Full documentation is available at:  
[https://dexwox-innovations-org.github.io/a2a-node-sdk/](https://dexwox-innovations-org.github.io/a2a-node-sdk/)

Includes:
- API Reference
- Protocol Specification  
- Development Guide
- Deployment Guide  
- Integration Guide
- Examples and Tutorials

## Examples

This package includes several examples to help you get started:

- [Basic Client](./examples/basic-client/): Simple client implementation
- [Basic Server](./examples/basic-server/): Simple server implementation
- [Weather Agent](./examples/weather-agent/): Example agent implementation
- [Full Stack](./examples/full-stack/): Complete example with client, server, and agent

See the [Examples README](./examples/README.md) for more information.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

## License

This project is licensed under the [Apache 2.0 License](../LICENSE).

## Legal

A2A protocol is a specification for agent communication. This implementation is provided by [Dexwox Innovations Pvt Ltd](https://dexwox.com). Google and A2A are trademarks of Google LLC.
