'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DeviceIdService } from '@/services/deviceId';
import { submitTourRating } from '@/services/tour';

export default function TourPage() {
  const params = useParams();
  const id = params.id as string;
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingSubmit = async (rating: number) => {
    if (!id) return;
    
    console.log('handleRatingSubmit called with:', { rating, tourId: id });
    
    try {
      const deviceId = await DeviceIdService.getDatabaseId();
      console.log('Got device ID:', deviceId);
      
      await submitTourRating(id, deviceId, rating);
      console.log('Rating submitted successfully');
      
      setShowRating(false);
      setHasRated(true);
      setError(null);
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating. Please try again.');
    }
  };

  return (
    <div>
      {/* Tour content will go here */}
      {!hasRated && (
        <button onClick={() => setShowRating(true)}>
          Rate this tour
        </button>
      )}
      
      {showRating && (
        <div>
          <h2>Rate this tour</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div>
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                onClick={() => handleRatingSubmit(star)}
              >
                {star} Star{star !== 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 