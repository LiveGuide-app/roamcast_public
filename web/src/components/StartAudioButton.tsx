'use client';

import { Button } from '@/components/ui/button';

interface StartAudioButtonProps {
  onStart: () => void;
  isLoading: boolean;
}

export function StartAudioButton({ onStart, isLoading }: StartAudioButtonProps) {
  return (
    <Button
      onClick={onStart}
      disabled={isLoading}
      className="w-full max-w-sm mx-auto bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg shadow-md"
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
          Connecting...
        </div>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 inline-block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          Start Audio
        </>
      )}
    </Button>
  );
} 