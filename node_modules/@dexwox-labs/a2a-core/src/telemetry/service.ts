import { context, trace, metrics, type Span, type Meter, type Attributes, type Context } from '@opentelemetry/api';
import { TelemetryConfig, DEFAULT_TELEMETRY_CONFIG } from './config';

/**
 * Telemetry service for collecting and exporting metrics and traces
 */
export class TelemetryService {
  private static instance: TelemetryService;
  private config: TelemetryConfig;
  private meter: Meter;
  private resource: Record<string, unknown> = {};
  private isInitialized = false;

  private constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.resource = {
      'service.name': this.config.serviceName,
      'service.version': this.config.serviceVersion,
      ...this.config.attributes,
    };
    this.meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
  }

  /**
   * Initialize the telemetry service
   */
  public static initialize(config: Partial<TelemetryConfig> = {}): TelemetryService {
    // Always create a new instance if one doesn't exist
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService(config);
      TelemetryService.instance.isInitialized = true;
    } else if (config.enabled !== undefined) {
      // If instance exists but config has explicit enabled flag, update it
      TelemetryService.instance.updateConfig({ enabled: config.enabled });
    }
    return TelemetryService.instance;
  }

  /**
   * Get the singleton instance of the telemetry service
   */
  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      return TelemetryService.initialize();
    }
    return TelemetryService.instance;
  }

  /**
   * Check if telemetry is enabled
   */
  public isEnabled(): boolean {
    return this.isInitialized && 
           this.config.enabled !== false && 
           this.config.collectionLevel !== 'off';
  }

  /**
   * Create a new span
   */
  public startSpan(name: string, parentContext?: Context): { span: Span; ctx: Context } {
    if (!this.isEnabled()) {
      return { 
        span: {
          end: () => {},
          setStatus: () => {},
          recordException: () => {}
        } as unknown as Span, 
        ctx: context.active() 
      };
    }

    const tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    const ctx = parentContext || context.active();
    const span = tracer.startSpan(name, undefined, ctx);
    const spanContext = trace.setSpan(ctx, span);
    
    // Store the span in the context
    return { span, ctx: spanContext };
  }

  /**
   * End a span
   */
  public endSpan(span: Span, error?: Error): void {
    if (!span || !this.isEnabled()) return;

    if (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR status
    } else {
      span.setStatus({ code: 1 }); // OK status
    }
    
    span.end();
  }

  /**
   * Record a metric
   */
  public recordMetric(
    name: string,
    value: number,
    attributes?: Attributes
  ): void {
    if (!this.isEnabled()) return;

    const counter = this.meter.createCounter(name);
    counter.add(value, attributes);
  }

  /**
   * Record a duration metric
   */
  public recordDuration(
    name: string,
    startTime: number,
    attributes?: Attributes
  ): void {
    if (!this.isEnabled()) return;

    const duration = Date.now() - startTime;
    const histogram = this.meter.createHistogram(name);
    histogram.record(duration, attributes);
  }

  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Shutdown the telemetry service
   */
  public async shutdown(): Promise<void> {
    // TODO: Implement proper shutdown logic when we have exporters
    this.isInitialized = false;
  }
}
