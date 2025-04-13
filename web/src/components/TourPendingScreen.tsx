import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tour } from '@/types/tour';
import Image from 'next/image';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

type TourPendingScreenProps = {
  tour: Tour;
  onLeaveTour: () => void;
  onStartListening?: () => void;
  isActive?: boolean;
};

export const TourPendingScreen = ({ 
  tour, 
  onLeaveTour,
  onStartListening,
  isActive = false
}: TourPendingScreenProps) => {
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
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
        {tour.title}
      </h1>
      
      <div className={`${isActive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} px-4 py-2 rounded-full mb-6`}>
        <span className="font-semibold">{isActive ? 'Tour Started!' : 'Tour Starting Soon'}</span>
      </div>
      
      <div className="flex items-center bg-gray-50 p-4 rounded-lg shadow-sm mb-8 w-full">
        {guideInfo?.avatar_url ? (
          <div className="relative w-10 h-10 mr-4">
            <Image 
              src={guideInfo.avatar_url} 
              alt={guideInfo.full_name}
              fill
              className="rounded-full bg-[#00615F] object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#00615F] mr-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{guideInfo?.full_name || 'Loading...'}</p>
          <p className="text-sm text-gray-500">Your Tour Guide</p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-8 rounded-lg shadow-sm mb-8 w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[#00615F] mx-auto mb-6 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {isActive ? 'Tour has started!' : 'Waiting for tour to start'}
        </h2>
        <p className="text-gray-600 mb-6">
          {isActive 
            ? 'Click the button below to start listening to the audio tour.'
            : 'Your Guide will begin the audio tour shortly. Please make sure your volume is turned up.'
          }
        </p>

        {isActive && onStartListening && (
          <button
            onClick={onStartListening}
            className="py-2 px-6 bg-[#00615F] text-white rounded-md hover:bg-[#004140] focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:ring-offset-2 flex items-center justify-center mx-auto mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            Start Listening
          </button>
        )}
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