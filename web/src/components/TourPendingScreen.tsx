import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tour } from '@/services/tour';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

type TourPendingScreenProps = {
  tour: Tour;
  onLeaveTour: () => void;
};

export const TourPendingScreen = ({ tour, onLeaveTour }: TourPendingScreenProps) => {
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
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6">
        {tour.name}
      </h1>
      
      <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full mb-6">
        <span className="font-semibold">Tour Starting Soon</span>
      </div>
      
      <div className="flex items-center bg-white p-4 rounded-lg shadow-sm mb-8 w-full">
        {guideInfo?.avatar_url ? (
          <img 
            src={guideInfo.avatar_url} 
            alt={guideInfo.full_name}
            className="w-10 h-10 rounded-full bg-blue-500 mr-4"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-500 mr-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800">{guideInfo?.full_name || 'Loading...'}</p>
          <p className="text-sm text-gray-500">Your Tour Guide</p>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-sm mb-8 w-full text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 mx-auto mb-6 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Waiting for tour to start</h2>
        <p className="text-gray-600">
          Your Guide will begin the audio tour shortly. Please make sure your volume is turned up.
        </p>
      </div>
      
      <button
        onClick={onLeaveTour}
        className="w-full py-2 px-4 bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Leave Tour
      </button>
    </div>
  );
}; 