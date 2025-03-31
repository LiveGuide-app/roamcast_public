export type Tour = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  unique_code: string;
  created_at: string;
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
export type CreateTourInput = Omit<Tour, 'id' | 'created_at' | 'unique_code'>;

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