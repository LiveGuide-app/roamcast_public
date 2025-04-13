'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Tour } from '@/types/tour';
import { AudioPlayer } from './AudioPlayer';
import { StartAudioButton } from './StartAudioButton';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

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
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);

  useEffect(() => {
    const fetchGuideInfo = async () => {
      try {
        // First get the tour with guide_id
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('guide_id')
          .eq('id', tour.id)
          .single();

        if (tourError) throw tourError;
        if (!tourData?.guide_id) throw new Error('No guide found for this tour');

        // Then get the guide's information
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url')
          .eq('id', tourData.guide_id)
          .single();

        if (userError) throw userError;
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url
        });
      } catch (error) {
        console.error('Error fetching guide info:', error);
      }
    };

    fetchGuideInfo();
  }, [tour.id]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {tour.title}
          </h1>
          
          {!isAudioReady ? (
            <div className="mt-8">
              <p className="text-gray-600 text-center mb-4">
                Click the button below to start listening to the tour
              </p>
              <StartAudioButton
                onStart={onStartAudio}
                isLoading={isConnecting}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                {isConnected ? 'Connected to live audio' : 'Connecting to live audio...'}
              </p>
              <button
                onClick={onLeaveTour}
                className="w-full py-2 px-4 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Leave Tour
              </button>
            </div>
          )}
        </div>
      </main>

      <AudioPlayer
        isConnected={isConnected && isAudioReady}
        onDisconnect={onLeaveTour}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />
    </div>
  );
} 