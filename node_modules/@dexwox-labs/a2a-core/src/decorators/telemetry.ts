/**
 * @module TelemetryDecorators
 * @description Method decorators for OpenTelemetry tracing
 * 
 * This module re-exports telemetry decorators from the telemetry module for
 * backward compatibility. New code should import directly from the telemetry
 * module instead.
 * 
 * @deprecated Import from '../telemetry' directly instead
 */

// This file is maintained for backward compatibility
// New code should import from '../telemetry' directly

/**
 * Method decorator for tracing method execution
 * 
 * @deprecated Import from '../telemetry/decorators' directly instead
 */
export { Trace, TraceClass } from '../telemetry/decorators';

/**
 * Status codes for OpenTelemetry spans
 * 
 * @deprecated Import from '@opentelemetry/api' directly instead
 */
// Re-export OpenTelemetry types for backward compatibility
export { SpanStatusCode } from '@opentelemetry/api';
