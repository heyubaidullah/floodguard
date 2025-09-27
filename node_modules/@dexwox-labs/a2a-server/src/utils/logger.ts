/**
 * @module Logger
 * @description Centralized logging utility for the A2A protocol server
 * 
 * This module provides a centralized logger instance for the A2A protocol server,
 * configured with appropriate log levels and formatting based on the environment.
 * It uses Winston as the underlying logging library.
 */

import winston from 'winston';

/**
 * Centralized logger instance for the A2A protocol server
 * 
 * This logger is configured to output to the console with appropriate formatting
 * and log levels based on the environment. In production, it logs at the 'info'
 * level and above, while in development it logs at the 'debug' level and above.
 * 
 * @example
 * ```typescript
 * import logger from './utils/logger';
 * 
 * // Log at different levels
 * logger.debug('Detailed debugging information');
 * logger.info('Something noteworthy happened');
 * logger.warn('Something concerning happened');
 * logger.error('Something went wrong', { error: new Error('Details') });
 * ```
 */
const logger = winston.createLogger({
  // Use 'info' level in production, 'debug' in development
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Configure log formatting
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  // Output to console
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Export the logger instance as the default export
 * 
 * This allows the logger to be imported and used throughout the application
 * with a simple import statement.
 */
export default logger;
