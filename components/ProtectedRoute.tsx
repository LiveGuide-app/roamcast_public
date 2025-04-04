import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './auth/AuthContext';

// This component will protect routes that require authentication
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inGuideGroup = segments[0] === '(guide)';
    const inTourGroup = segments[0] === '(tour)';
    const isRootRoute = segments.length <= 0;

    if (isRootRoute) {
      return;
    }

    if (inTourGroup) {
      return;
    }

    // Only redirect to login if we're in a protected route (guide group) and not authenticated
    if (!session && inGuideGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(guide)/tours');
    } else if (session && !inGuideGroup) {
      router.replace('/(guide)/tours');
    }
  }, [session, loading, segments]);

  // Show loading state while checking authentication
  if (loading) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
} 