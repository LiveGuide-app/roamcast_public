/**
 * Application logger with environment-aware logging
 * Uses namespaced functions to avoid conflicts with native modules
 */

// Log levels
enum LogLevel {
  ERROR = 0,
  WARN = 1, 
  INFO = 2,
  DEBUG = 3,
}

// Determine current environment
const getEnvironment = (): 'development' | 'test' | 'production' => {
  // Check for Next.js/Vercel environment variables
  if (process.env.NEXT_PUBLIC_ENV) {
    return process.env.NEXT_PUBLIC_ENV as 'development' | 'test' | 'production';
  }
  
  // Check for NODE_ENV (used by Vercel and other environments)
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV as 'development' | 'test' | 'production';
  }
  
  // Default to development if nothing else is specified
  return 'development';
};

// Get appropriate log level based on environment
const getLogLevel = (): LogLevel => {
  const env = getEnvironment();
  
  switch (env) {
    case 'production':
      return LogLevel.ERROR; // Only errors in production
    case 'test':
      return LogLevel.WARN; // Errors and warnings in test
    case 'development':
    default:
      return LogLevel.DEBUG; // All logs in development
  }
};

// Current log level
const currentLogLevel = getLogLevel();

/**
 * Formats the log message with timestamp and additional context
 */
const formatLogMessage = (message: string, context?: Record<string, any>): string => {
  const timestamp = new Date().toISOString();
  const contextString = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}]${contextString} ${message}`;
};

/**
 * Application logger interface
 */
const appLogger = {
  /**
   * Log error messages (always shown in all environments)
   */
  logError: (message: string, error?: Error, context?: Record<string, any>) => {
    if (currentLogLevel >= LogLevel.ERROR) {
      const formattedMessage = formatLogMessage(message, context);
      console.error(formattedMessage, error || '');
    }
  },

  /**
   * Log warning messages (shown in development and test)
   */
  logWarning: (message: string, context?: Record<string, any>) => {
    if (currentLogLevel >= LogLevel.WARN) {
      const formattedMessage = formatLogMessage(message, context);
      console.warn(formattedMessage);
    }
  },

  /**
   * Log info messages (shown in development, may be shown in test)
   */
  logInfo: (message: string, context?: Record<string, any>) => {
    if (currentLogLevel >= LogLevel.INFO) {
      const formattedMessage = formatLogMessage(message, context);
      console.info(formattedMessage);
    }
  },

  /**
   * Log debug messages (only shown in development)
   */
  logDebug: (message: string, context?: Record<string, any>) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      const formattedMessage = formatLogMessage(message, context);
      console.debug(formattedMessage);
    }
  },
};

export default appLogger; 