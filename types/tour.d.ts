export type Tour = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  unique_code: string;
  created_at: string;
  participant_id?: string;
  guide_name?: string;
  total_participants: number;
  total_tips?: number;
  room_started_at: string | null;
  room_finished_at: string | null;
  completed_at?: string;
};

export type TourParticipant = {
  id: string;
  tour_id: string;
  device_id: string;
  join_time: string;
  leave_time?: string;
  created_at: string;
  updated_at: string;
};

export type TourStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type CreateTourInput = {
  name: string;
  status: TourStatus;
};

export enum TourErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_STATUS = 'INVALID_STATUS',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class TourError extends Error {
  constructor(message: string, public code: TourErrorCode);
}

export function createTour(input: CreateTourInput): Promise<Tour>;
export function getTour(tourId: string): Promise<Tour>;
export function updateTourStatus(tourId: string, status: TourStatus): Promise<Tour>;

// Hook Return Types
export type UseTourManagementReturn = {
  tour: Tour | null;
  isLoading: boolean;
  error: TourError | null;
  isConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveTour: () => Promise<void>;
  onRatingSubmit: (rating: number) => Promise<void>;
};

export type UseTourPaymentReturn = {
  isPaymentReady: boolean;
  isLoading: boolean;
  error: Error | null;
  onTipSubmit: (amount: TipAmount) => Promise<void>;
};

export type TipAmount = 500 | 1000 | 2000 | 5000; 