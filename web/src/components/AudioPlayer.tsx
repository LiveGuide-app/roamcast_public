'use client';

import { useEffect, useState } from 'react';

interface AudioPlayerProps {
  isConnected: boolean;
  onDisconnect: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  hideUI?: boolean;
}

export function AudioPlayer({ 
  isConnected, 
  onDisconnect, 
  isMuted, 
  onToggleMute,
  hideUI = false
}: AudioPlayerProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect platform
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  if (!isConnected) return null;
  
  // If hideUI is true, we still want to keep the component mounted
  // but not render the UI elements
  if (hideUI) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4 border-t border-gray-200">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-full bg-primary-light bg-opacity-20 text-primary hover:bg-primary-light hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <div>
            <h3 className="font-medium text-gray-900">Roamcast Tour</h3>
            <p className="text-sm text-gray-500">Live audio streaming</p>
            {(isIOS && isSafari) && (
              <p className="text-xs text-primary mt-1">
                Keep Safari open to continue listening
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="text-sm text-danger hover:text-red-800 focus:outline-none"
        >
          Leave Tour
        </button>
      </div>
    </div>
  );
} 