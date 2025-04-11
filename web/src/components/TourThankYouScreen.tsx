import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface TourThankYouScreenProps {
  guideName: string;
  tourName: string;
  recommendationsLink: string | null;
}

export const TourThankYouScreen = ({
  guideName,
  tourName,
  recommendationsLink,
}: TourThankYouScreenProps) => {
  const router = useRouter();

  useEffect(() => {
    // Shoot confetti when component mounts
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 100);
  }, []);

  const handleViewRecommendations = () => {
    if (recommendationsLink) {
      window.open(recommendationsLink, '_blank');
    }
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Thank you for joining {tourName}!
        </h1>
        
        {recommendationsLink && (
          <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
            Your guide, {guideName}, has put together some recommendations of things to do. Click
            the button below to explore
          </p>
        )}

        {recommendationsLink && (
          <div className="mb-8 w-full max-w-xs">
            <button
              onClick={handleViewRecommendations}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              View recommendations
            </button>
          </div>
        )}
      </div>

      <div className="p-8 bg-white border-t border-gray-200">
        <button
          onClick={handleReturnHome}
          className="w-full max-w-xs mx-auto block py-3 px-4 border border-blue-700 text-blue-700 hover:bg-blue-50 font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}; 