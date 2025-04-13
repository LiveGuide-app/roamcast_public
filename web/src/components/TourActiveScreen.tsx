'use client';

import { useState, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { AudioPlayer } from './AudioPlayer';
import { StartAudioButton } from './StartAudioButton';

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