import { useState, useRef, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/currency';
import { ConnectedStripeProvider } from '@/components/ConnectedStripeProvider';
import { TipPayment } from '@/components/TipPayment';
import { DeviceIdService } from '@/services/deviceId';

interface GuideInfo {
  full_name: string;
  avatar_url: string | null;
  stripe_default_currency: string | null;
}

type TourCompletedScreenProps = {
  tour: Tour;
  onRatingSubmit: (rating: number) => Promise<void>;
  onLeaveTour: () => void;
};

export const TourCompletedScreen = ({ tour, onRatingSubmit, onLeaveTour }: TourCompletedScreenProps) => {
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const tipPaymentRef = useRef<any>(null);
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
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tour.id]);

  const handleRating = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleTipAmountChange = (amount: number | null) => {
    setSelectedTipAmount(amount);
  };

  const handlePaymentReady = (ready: boolean) => {
    setIsPaymentReady(ready);
  };

  const handlePaymentComplete = async () => {
    try {
      await onRatingSubmit(selectedRating);
      setSelectedTipAmount(null);
      setIsPaymentReady(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating.');
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

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      alert('Please select a rating before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedTipAmount && isPaymentReady && tipPaymentRef.current) {
        await tipPaymentRef.current.handlePayment();
      } else {
        await onRatingSubmit(selectedRating);
      }
    } catch (error) {
      console.error('Error during submission:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
          <h1 className="text-xl font-semibold">Tour Complete</h1>
        </div>

        <div className="space-y-6">
          <div className="flex items-center bg-white p-4 rounded-lg shadow">
            {guideInfo?.avatar_url ? (
              <img 
                src={guideInfo.avatar_url} 
                alt={guideInfo.full_name}
                className="w-10 h-10 rounded-full mr-4 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">{tour.name}</h2>
              <p className="text-gray-600">With {guideInfo?.full_name || 'Tour Guide'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-center mb-4">How was your experience?</h3>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-2 focus:outline-none transition-colors duration-200"
                >
                  <svg
                    className={`w-8 h-8 ${star <= selectedRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-center mb-4">
              Would you like to leave a tip for {guideInfo?.full_name || 'Your Guide'}?
            </h3>
            {participantId && stripeAccountId ? (
              <ConnectedStripeProvider stripeAccountId={stripeAccountId}>
                <TipPayment 
                  ref={tipPaymentRef}
                  tourParticipantId={participantId}
                  onAmountChange={handleTipAmountChange}
                  onPaymentReady={handlePaymentReady}
                  onPaymentComplete={handlePaymentComplete}
                  currency={guideInfo?.stripe_default_currency || 'gbp'}
                />
              </ConnectedStripeProvider>
            ) : participantId && !stripeAccountId && !isLoading ? (
              <p className="text-center text-gray-600">
                Tipping is not available for this guide.
              </p>
            ) : isLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selectedRating === 0 || isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
              ${selectedRating === 0 || isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {getButtonTitle()}
          </button>
        </div>
      </div>
    </div>
  );
}; 