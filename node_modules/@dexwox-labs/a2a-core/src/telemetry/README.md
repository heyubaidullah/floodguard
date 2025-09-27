# Telemetry Module

This module provides comprehensive telemetry capabilities for the A2A Node SDK, enabling collection of metrics, distributed traces, and performance data. Built on OpenTelemetry, it offers a unified API for observability.

## Features

- **Distributed Tracing**: Track requests across service boundaries with context propagation
- **Metrics Collection**: Record and aggregate custom metrics with support for labels/attributes
- **Performance Monitoring**: Automatic instrumentation of method execution times
- **Decorator Support**: Simple method decoration for common telemetry patterns
- **Configurable**: Fine-grained control over collection levels and sampling
- **Extensible**: Supports multiple exporters via OpenTelemetry

## Installation

```bash
npm install @aelus/core
```

## Usage

### Basic Setup

```typescript
import { TelemetryService } from '@aelus/core/telemetry';

// Initialize with configuration
const telemetry = TelemetryService.initialize({
  serviceName: 'my-service',           // Required: Service name
  serviceVersion: '1.0.0',            // Required: Service version
  enabled: process.env.NODE_ENV !== 'test', // Optional: Enable/disable telemetry
  collectionLevel: 'detailed',         // 'off' | 'basic' | 'detailed'
  
  // OpenTelemetry configuration
  otel: {
    // OTLP Exporter (gRPC/HTTP)
    otlp: {
      url: 'http://localhost:4318/v1/traces',
      headers: { /* ... */ },
    },
    
    // Console exporter for development
    console: process.env.NODE_ENV === 'development',
  }
});

// Start a custom span
const { span, ctx } = telemetry.startSpan('operation-name');
try {
  // Your operation here
  span.setAttribute('key', 'value');
  
  // Record a metric
  telemetry.recordMetric('operation.success', 1);
  
  // Set span status to OK
  span.setStatus({ code: 1 }); // OK
} catch (error) {
  // Record error metric
  telemetry.recordMetric('operation.errors', 1, { 
    error: error.message,
    error_type: error.name
  });
  
  // Record exception in span
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message }); // ERROR
  
  throw error;
} finally {
  // Always end the span
  span.end();
}

### Using Decorators

```typescript
import { Trace, Metric } from './telemetry';

class MyService {
  @Trace()
  async performOperation() {
    // This method will be automatically traced
  }

  @Metric('custom.metric.name')
  async recordSomething() {
    // This method will record a metric when called
  }
}
```

## Configuration

### TelemetryConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether telemetry is enabled |
| `serviceName` | `string` | `'@dexwox-labs/a2a-node'` | Name of the service |
| `serviceVersion` | `string` | `'0.1.0'` | Version of the service |
| `collectionLevel` | `'off' | 'basic' | 'detailed'` | `'basic'` | Level of detail for telemetry collection |
| `endpoint` | `string` | `undefined` | Optional endpoint for telemetry data |
| `attributes` | `Record<string, unknown>` | `{}` | Additional attributes to include in telemetry |

## Best Practices

1. **Use Meaningful Names**: Use clear, descriptive names for spans and metrics
2. **Handle Errors**: Always set the span status and record exceptions
3. **Be Mindful of Cardinality**: Avoid high-cardinality values in attributes
4. **Clean Up**: Always end spans in a `finally` block
5. **Respect User Privacy**: Be cautious about collecting sensitive information

## Testing

Run the tests with:

```bash
pnpm test src/telemetry/__tests__
```
