# Production-Ready Logging for Web App

This document explains how to use the `appLogger` utility for environment-aware logging in the web application.

## Why Use `appLogger`?

- **Environment Awareness**: Automatically filters logs based on the current environment (development, test, production)
- **Consistent Format**: All logs include timestamps and can include contextual data
- **Avoid Conflicts**: Uses namespaced function names to avoid conflicts with native functions
- **Type Safety**: Fully typed for TypeScript support

## Basic Usage

Import the logger in any file:

```typescript
import appLogger from '@/utils/appLogger';

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

The log level is controlled by the `NEXT_PUBLIC_ENV` environment variable:

- Set to `development` for all logs (default in dev environment)
- Set to `test` for errors and warnings only
- Set to `production` for errors only

These values are already set in the respective `.env.local` files. 