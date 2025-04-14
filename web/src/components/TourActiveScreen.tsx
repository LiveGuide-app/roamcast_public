'use client';

import { Tour } from '@/types/tour';
import { AudioPlayer } from './AudioPlayer';
import { StartAudioButton } from './StartAudioButton';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import appLogger from '@/utils/appLogger';

type TourActiveScreenProps = {
  tour: Tour;
  isConnected: boolean;
  isAudioReady: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  onStartAudio: () => void;
  onToggleMute: () => void;
  onLeaveTour: () => void;
};

export function TourActiveScreen({
  tour,
  isConnected,
  isAudioReady,
  isMuted,
  isConnecting,
  onStartAudio,
  onToggleMute,
  onLeaveTour
}: TourActiveScreenProps) {
  // Set up proper guide info state with fetch from supabase
  const [guideInfo, setGuideInfo] = useState<{ full_name: string; avatar_url: string | null }>({
    full_name: 'Tour Guide',
    avatar_url: null
  });

  // Fetch guide info when tour changes
  useEffect(() => {
    const fetchGuideInfo = async () => {
      try {
        if (!tour || !tour.guide_id) return;
        
        // Fetch guide information using the tour's guide_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url')
          .eq('id', tour.guide_id)
          .single();

        if (userError) throw userError;
        
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url
        });
      } catch (error) {
        appLogger.logError('Error fetching guide info:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    fetchGuideInfo();
  }, [tour]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Tour Header */}
          <div className="bg-[#00615F] text-white rounded-lg px-4 py-3 mb-3">
            <h1 className="text-xl font-semibold">{tour.title || tour.name || 'Tour'}</h1>
          </div>
          
          {/* Status Badges */}
          <div className="flex items-center justify-center gap-2 mb-6 mt-3">
            <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Live
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${isConnected ? 'bg-green-600' : 'bg-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* Guide Info */}
          <div className="flex items-center bg-white p-4 rounded-lg shadow-sm mb-8">
            <div className="w-10 h-10 rounded-full bg-[#00615F] flex items-center justify-center text-white mr-3">
              {guideInfo?.avatar_url ? (
                <Image 
                  src={guideInfo.avatar_url} 
                  alt="Guide" 
                  width={40} 
                  height={40} 
                  className="rounded-full"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{guideInfo?.full_name || 'Tour Guide'}</p>
              <p className="text-sm text-gray-500">Your Tour Guide</p>
            </div>
          </div>

          {/* Audio Content */}
          <div className="flex flex-col items-center justify-center mb-8">
            {/* Audio Visualization - only show when connected */}
            {isAudioReady && (
              <div className="mb-6">
                <Image 
                  src="/audio-wave.gif" 
                  alt="Audio visualization" 
                  width={120} 
                  height={120} 
                  className="mb-4"
                  onError={(e) => {
                    // Fallback if the GIF is not available
                    const target = e.target as HTMLImageElement;
                    target.src = '/audio-wave-static.svg';
                    target.onerror = null;
                  }}
                />
              </div>
            )}
            
            {!isAudioReady ? (
              <div className="mt-4 w-full flex flex-col items-center">
                <p className="text-gray-600 text-center mb-4">
                  Click the button below to start listening to the tour
                </p>
                <StartAudioButton
                  onStart={onStartAudio}
                  isLoading={isConnecting}
                />
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <button
                  onClick={onToggleMute}
                  className="flex items-center justify-center gap-2 py-2 px-6 bg-[#00615F] text-white rounded-md hover:bg-[#004140] focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:ring-offset-2 mx-auto"
                >
                  {isMuted ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                      Unmute Audio
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      Mute Audio
                    </>
                  )}
                </button>
                
                <button
                  onClick={onLeaveTour}
                  className="w-full py-2 px-4 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Leave Tour
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* We're keeping the AudioPlayer for backward compatibility but only using it for background processing */}
      <AudioPlayer
        isConnected={isConnected && isAudioReady}
        onDisconnect={onLeaveTour}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        hideUI={true} // This is a new prop we'll add to hide the UI
      />
    </div>
  );
} 