'use client';

import Image from 'next/image';
import { ErrorMessage } from './ErrorMessage';
import { LoadingSpinner } from './LoadingSpinner';

interface JoinTourFormProps {
  tourCode: string;
  setTourCode: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
}

export function JoinTourForm({
  tourCode,
  setTourCode,
  onSubmit,
  isLoading,
  error,
  onDismissError
}: JoinTourFormProps) {
  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col items-center mb-6">
        <Image 
          src="/icon-512x512.png" 
          alt="Roamcast Logo" 
          width={96}
          height={96}
          className="mb-4 rounded-lg"
        />
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Welcome to Your Roamcast Tour
        </h1>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={onDismissError} 
        />
      )}
      
      {isLoading ? (
        <div className="py-8 text-center">
          <LoadingSpinner size="large" className="mb-4" />
          <p className="text-gray-600">Connecting to tour...</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="tourCode" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Tour Code
            </label>
            <input
              type="text"
              id="tourCode"
              value={tourCode}
              onChange={(e) => setTourCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:border-transparent"
              placeholder="Enter code"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!tourCode.trim() || isLoading}
            className="w-full py-2 px-4 bg-[#00615F] text-white rounded-md hover:bg-[#004140] focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Tour
          </button>
        </form>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Enter your tour code, or it&apos;s pre-filled if you joined via QR code.</li>
          <li>Click &quot;Join Tour&quot; to connect</li>
          <li>Keep this page open to continue listening</li>
          <li>Audio will play in the background</li>
        </ul>
      </div>
    </div>
  );
} 