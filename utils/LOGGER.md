# Production-Ready Logging

This document explains how to use the `appLogger` utility for environment-aware logging in both native and web apps.

## Why Use `appLogger`?

- **Environment Awareness**: Automatically filters logs based on the current environment (development, test, production)
- **Consistent Format**: All logs include timestamps and can include contextual data
- **Avoid Conflicts**: Uses namespaced function names to avoid conflicts with Expo or other native functions
- **Type Safety**: Fully typed for TypeScript support

## Basic Usage

Import the logger in any file:

```typescript
import appLogger from '../utils/appLogger';

// Log at different levels
appLogger.logError('Something went wrong', error, { userId: '123' });
appLogger.logWarning('Deprecated method used', { method: 'oldMethod' });
appLogger.logInfo('User action completed', { action: 'signup' });
appLogger.logDebug('Component rendered', { props: componentProps });
```

## Log Levels and Environments

The logger automatically manages which logs appear based on the environment:

| Log Level | Development | Test | Production |
|-----------|-------------|------|------------|
| ERROR     | ✅          | ✅   | ✅         |
| WARNING   | ✅          | ✅   | ❌         |
| INFO      | ✅          | ❌   | ❌         |
| DEBUG     | ✅          | ❌   | ❌         |

## Migration Guide

To convert existing console logs:

1. Replace `console.log(message)` with `appLogger.logInfo(message)`
2. Replace `console.error(message, error)` with `appLogger.logError(message, error)`
3. Replace `console.warn(message)` with `appLogger.logWarning(message)`
4. Replace `console.debug(message)` with `appLogger.logDebug(message)`

## Adding Context

You can add contextual data to any log:

```typescript
appLogger.logInfo('API call successful', {
  endpoint: '/api/users',
  responseTime: '120ms',
  status: 200
});
```

## Configuration

The log level is controlled by the `EXPO_PUBLIC_ENV` environment variable:

- Set to `development` for all logs (default in dev environment)
- Set to `test` for errors and warnings only
- Set to `production` for errors only

These values are already set in the respective `.env` files.

## Future Enhancements

For more advanced logging needs, consider:

1. Adding remote logging capabilities
2. Implementing log storage for offline mode
3. Adding application-specific context to all logs
4. Integrating with a monitoring service 