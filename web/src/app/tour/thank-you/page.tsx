'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TourThankYouScreen } from '@/components/TourThankYouScreen';
import { supabase } from '@/lib/supabase';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const [guideInfo, setGuideInfo] = useState<{
    name: string;
    recommendationsLink: string | null;
  } | null>(null);
  const [tourName, setTourName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get tour ID and guide ID from URL parameters
        const tourId = searchParams.get('tourId');
        const guideId = searchParams.get('guideId');
        
        if (!tourId || !guideId) {
          console.error('Missing tourId or guideId in URL parameters');
          return;
        }
        
        // Fetch tour and guide info in parallel
        const [tourResult, guideResult] = await Promise.all([
          supabase
            .from('tours')
            .select('name')
            .eq('id', tourId)
            .single(),
          supabase
            .from('users')
            .select('full_name, recommendations_link')
            .eq('id', guideId)
            .single()
        ]);
        
        if (tourResult.error) throw tourResult.error;
        if (guideResult.error) throw guideResult.error;
        
        setTourName(tourResult.data.name);
        setGuideInfo({
          name: guideResult.data.full_name,
          recommendationsLink: guideResult.data.recommendations_link
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!guideInfo || !tourName) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">We couldn&apos;t find the tour information.</p>
          <Link 
            href="/" 
            className="inline-block py-3 px-4 bg-primary text-white font-medium rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TourThankYouScreen
      guideName={guideInfo.name}
      tourName={tourName}
      recommendationsLink={guideInfo.recommendationsLink}
    />
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
} 