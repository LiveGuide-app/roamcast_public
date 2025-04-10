import { Tour } from '@/services/tour';

type TourCompletedScreenProps = {
  tour: Tour;
  onLeaveTour: () => void;
};

export const TourCompletedScreen = ({ tour, onLeaveTour }: TourCompletedScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6">
        {tour.name}
      </h1>
      
      <div className="bg-white p-8 rounded-lg shadow-sm mb-8 w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Tour Completed
        </h2>
        
        <p className="text-gray-600">
          Thank you for joining this tour. The tour has now ended.
        </p>
      </div>
      
      <button
        onClick={onLeaveTour}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Leave Tour
      </button>
    </div>
  );
}; 