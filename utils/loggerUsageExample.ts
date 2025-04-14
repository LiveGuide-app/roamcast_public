/**
 * Example usage of the appLogger
 * This file is for demonstration purposes only and should not be included in production
 */

import appLogger from './appLogger';

// Example of how to use the logger in your components/services

// Error logging (shows in all environments)
function handleApiError(error: Error) {
  appLogger.logError('API request failed', error, { 
    endpoint: '/api/users',
    method: 'GET'
  });
}

// Warning logging (shows in development and test)
function deprecatedMethodWarning(methodName: string) {
  appLogger.logWarning(`The method ${methodName} is deprecated and will be removed soon`, {
    alternative: 'newMethodName'
  });
}

// Info logging (shows in development)
function userLoginSuccess(userId: string) {
  appLogger.logInfo('User logged in successfully', {
    userId,
    timestamp: new Date().toISOString()
  });
}

// Debug logging (only in development)
function renderDebugInfo(componentName: string, props: any) {
  appLogger.logDebug(`${componentName} rendered`, {
    props,
    renderTime: performance.now()
  });
}

/**
 * Migration guide:
 * 
 * Replace:
 *   console.log('message') 
 * With:
 *   appLogger.logInfo('message')
 * 
 * Replace:
 *   console.error('error', error)
 * With:
 *   appLogger.logError('error', error)
 * 
 * Replace:
 *   console.warn('warning')
 * With:
 *   appLogger.logWarning('warning')
 * 
 * Replace:
 *   console.debug('debug info')
 * With:
 *   appLogger.logDebug('debug info')
 */ 