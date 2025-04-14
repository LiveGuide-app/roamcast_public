/**
 * Example usage of the appLogger in the web app
 * This file is for demonstration purposes only and should not be included in production
 */

import appLogger from './appLogger';

// Example of how to use the logger in your web components/services

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
function userInteraction(action: string) {
  appLogger.logInfo(`User performed action: ${action}`, {
    timestamp: new Date().toISOString()
  });
}

// Debug logging (only in development)
function componentRender(componentName: string, props: any) {
  appLogger.logDebug(`Component ${componentName} rendered`, {
    props,
    renderCount: props.renderCount || 1
  });
}

/**
 * Example in a React component:
 * 
 * import { useEffect } from 'react';
 * import appLogger from '@/utils/appLogger';
 * 
 * export default function MyComponent({ user }) {
 *   useEffect(() => {
 *     appLogger.logInfo('Component mounted', { userId: user.id });
 *     
 *     return () => {
 *       appLogger.logDebug('Component unmounted');
 *     };
 *   }, [user.id]);
 *   
 *   const handleClick = () => {
 *     try {
 *       // Do something
 *       appLogger.logInfo('Action completed');
 *     } catch (error) {
 *       appLogger.logError('Action failed', error);
 *     }
 *   };
 *   
 *   // ...
 * }
 */ 