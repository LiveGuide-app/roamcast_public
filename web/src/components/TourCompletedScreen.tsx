import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { Tour } from '@/types/tour';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/currency';
import { TipPayment } from '@/components/TipPayment';
import { DeviceIdService } from '@/services/deviceId';
import { useRouter } from 'next/navigation';

// Initialize Stripe outside of component to avoid recreating it
const initializeStripe = (accountId: string) => loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  { stripeAccount: accountId }
);

// Default promise that resolves to null when no account is available
const nullStripePromise: Promise<Stripe | null> = Promise.resolve(null);

interface GuideInfo {
  full_name: string;
  avatar_url: string | null;
  stripe_default_currency: string | null;
}

interface TourCompletedScreenProps {
  tour: Tour;
  onRatingSubmit: (rating: number) => Promise<void>;
  onLeaveTour: () => void;
}

export const TourCompletedScreen = forwardRef<{
  handlePayment: () => Promise<void>;
  handlePaymentComplete: (rating: number) => Promise<void>;
}, TourCompletedScreenProps>(({ tour, onRatingSubmit, onLeaveTour }, ref) => {
  const router = useRouter();
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null>>(nullStripePromise);
  const [isLoading, setIsLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [guideId, setGuideId] = useState<string | null>(null);
  const tipPaymentRef = useRef<{
    handlePayment: () => Promise<void>;
    handlePaymentComplete: (rating: number) => Promise<void>;
  }>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const deviceId = await DeviceIdService.getDatabaseId();
        
        // Fetch both tour participant and guide info in parallel
        const [participantResult, tourResult] = await Promise.all([
          supabase
            .from('tour_participants')
            .select('id')
            .filter('tour_id', 'eq', tour.id)
            .filter('device_id', 'eq', deviceId)
            .single(),
          supabase
            .from('tours')
            .select('guide_id')
            .eq('id', tour.id)
            .single()
        ]);

        if (participantResult.error) {
          if (participantResult.error.code === 'PGRST116') {
            console.warn('No participant found for this tour');
            return;
          }
          throw participantResult.error;
        }
        if (tourResult.error) throw tourResult.error;
        
        // Set participant ID if found
        if (participantResult.data) {
          setParticipantId(participantResult.data.id);
        }

        // Set guide ID
        setGuideId(tourResult.data.guide_id);

        // Fetch guide info
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url, stripe_account_id, stripe_default_currency')
          .eq('id', tourResult.data.guide_id)
          .single();

        if (userError) throw userError;
        
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url,
          stripe_default_currency: userData.stripe_default_currency
        });

        if (userData?.stripe_account_id) {
          setStripeAccountId(userData.stripe_account_id);
          setStripePromise(initializeStripe(userData.stripe_account_id));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tour.id]);

  useImperativeHandle(ref, () => ({
    handlePayment: async () => {
      if (selectedTipAmount && isPaymentReady && tipPaymentRef.current) {
        await tipPaymentRef.current.handlePayment();
      }
    },
    handlePaymentComplete: async (rating: number) => {
      try {
        await onRatingSubmit(rating);
        setSelectedTipAmount(null);
        setIsPaymentReady(false);
        // Redirect to thank you page
        if (guideId) {
          router.push(`/tour/thank-you?tourId=${tour.id}&guideId=${guideId}`);
        }
      } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating.');
      }
    }
  }), [selectedTipAmount, isPaymentReady, tipPaymentRef, onRatingSubmit, tour.id, guideId, router]);

  // Check for return from Stripe Checkout and handle rating submission
  useEffect(() => {
    const submitStoredRating = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('session_id');
      
      if (sessionId) {
        // Clear the URL parameters
        window.history.replaceState({}, '', window.location.pathname);
        
        // Get stored rating and submit it
        const storedRating = localStorage.getItem('pendingTourRating');
        if (storedRating) {
          const rating = parseInt(storedRating, 10);
          try {
            await onRatingSubmit(rating);
            setSelectedTipAmount(null);
            setIsPaymentReady(false);
            // Clear stored rating
            localStorage.removeItem('pendingTourRating');
            // Redirect to thank you page
            if (guideId) {
              router.push(`/tour/thank-you?tourId=${tour.id}&guideId=${guideId}`);
            }
          } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating.');
          }
        }
      }
    };

    submitStoredRating();
  }, [onRatingSubmit, tour.id, guideId, router]);

  const handleRating = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleTipAmountChange = (amount: number | null) => {
    setSelectedTipAmount(amount);
    // Only update payment ready state if we have a valid amount
    setIsPaymentReady(amount !== null);
  };

  const handlePaymentReady = (ready: boolean) => {
    setIsPaymentReady(ready);
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      alert('Please select a rating before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedTipAmount && isPaymentReady && tipPaymentRef.current) {
        // Store rating before redirecting to Stripe
        localStorage.setItem('pendingTourRating', selectedRating.toString());
        await tipPaymentRef.current.handlePayment();
      } else {
        await onRatingSubmit(selectedRating);
        // Redirect to thank you page
        if (guideId) {
          router.push(`/tour/thank-you?tourId=${tour.id}&guideId=${guideId}`);
        }
      }
    } catch (error) {
      console.error('Error during submission:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTipAmount = (amount: number | null) => {
    if (!amount) return formatCurrency(0, guideInfo?.stripe_default_currency || 'gbp');
    return formatCurrency(amount, guideInfo?.stripe_default_currency || 'gbp');
  };

  const getButtonTitle = () => {
    if (isSubmitting) return "Processing...";
    if (selectedRating === 0) return "Select a Rating";
    if (!selectedTipAmount) return `Submit Rating`;
    return `Submit Rating & Tip ${formatTipAmount(selectedTipAmount)}`;
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-medium text-center mb-4 text-gray-900">
              How was your experience?
            </h3>
            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                >
                  <svg
                    className={`w-8 h-8 ${
                      star <= selectedRating ? 'text-amber-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-medium text-center mb-4 text-gray-900">
              Would you like to leave a tip for {guideInfo?.full_name || 'Your Guide'}?
            </h3>
            {participantId && stripeAccountId && !isLoading ? (
              <TipPayment 
                ref={tipPaymentRef}
                tourParticipantId={participantId}
                onAmountChange={handleTipAmountChange}
                onPaymentReady={handlePaymentReady}
                onPaymentComplete={async () => {
                  const storedRating = localStorage.getItem('pendingTourRating');
                  if (storedRating) {
                    const rating = parseInt(storedRating, 10);
                    try {
                      await onRatingSubmit(rating);
                      setSelectedTipAmount(null);
                      setIsPaymentReady(false);
                      localStorage.removeItem('pendingTourRating');
                      // Redirect to thank you page
                      if (guideId) {
                        router.push(`/tour/thank-you?tourId=${tour.id}&guideId=${guideId}`);
                      }
                    } catch (error) {
                      console.error('Error submitting rating:', error);
                      alert('Failed to submit rating.');
                    }
                  }
                }}
                currency={guideInfo?.stripe_default_currency || 'gbp'}
                stripePromise={stripePromise}
                stripeAccountId={stripeAccountId}
              />
            ) : participantId && !stripeAccountId && !isLoading ? (
              <p className="text-center text-gray-600">
                Tipping is not available for this guide.
              </p>
            ) : isLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selectedRating === 0 || isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200
              ${selectedRating === 0 || isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary-hover'}`}
          >
            {getButtonTitle()}
          </button>
          
          <button
            onClick={onLeaveTour}
            className="w-full mt-3 py-2 px-4 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
          >
            Leave Tour
          </button>
        </div>
      </div>
    </div>
  );
});

TourCompletedScreen.displayName = 'TourCompletedScreen'; 