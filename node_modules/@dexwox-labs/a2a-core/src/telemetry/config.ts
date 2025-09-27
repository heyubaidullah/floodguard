/**
 * Telemetry configuration options
 */
export interface TelemetryConfig {
  /**
   * Whether telemetry is enabled
   * @default true
   */
  enabled: boolean;
  
  /**
   * Service name for telemetry
   * @default '@dexwox-labs/a2a-node'
   */
  serviceName: string;
  
  /**
   * Service version
   * @default '0.1.0'
   */
  serviceVersion: string;
  
  /**
   * Telemetry collection level
   * - 'off': No telemetry collected
   * - 'basic': Basic metrics and errors only
   * - 'detailed': Includes detailed performance metrics
   * @default 'basic'
   */
  collectionLevel: 'off' | 'basic' | 'detailed';
  
  /**
   * Endpoint for telemetry data export
   * If not provided, uses default OpenTelemetry collector
   */
  endpoint?: string;
  
  /**
   * Additional attributes to include with all telemetry
   */
  attributes?: Record<string, unknown>;
}

/**
 * Default telemetry configuration
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: true,
  serviceName: '@dexwox-labs/a2a-node',
  serviceVersion: '0.1.0',
  collectionLevel: 'basic',
  attributes: {},
};
