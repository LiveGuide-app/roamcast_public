import { supabase } from '@/lib/supabase';

export interface Tour {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  unique_code: string;
  created_at: string;
  total_participants?: number;
  total_tips?: number;
}

export interface GuideStats {
  totalTours: number;
  totalGuests: number;
  totalEarnings: number;
}

export enum TourErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_STATUS = 'INVALID_STATUS',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class TourError extends Error {
  constructor(message: string, public code: TourErrorCode) {
    super(message);
    this.name = 'TourError';
  }
}

export const getGuideStats = async (): Promise<GuideStats> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch stats', TourErrorCode.UNAUTHORIZED);
  }

  // Get all completed tours for this guide
  const { data: tourStats, error: tourError } = await supabase
    .rpc('calculate_guide_stats', { guide_id: user.id });

  if (tourError) {
    console.error('Error fetching guide stats:', tourError);
    throw new TourError('Failed to fetch guide stats', TourErrorCode.NETWORK_ERROR);
  }

  return {
    totalTours: tourStats.total_tours || 0,
    totalGuests: tourStats.total_guests || 0,
    totalEarnings: tourStats.total_earnings || 0
  };
};

export const getGuideTours = async (): Promise<Tour[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch tours', TourErrorCode.UNAUTHORIZED);
  }

  const { data, error } = await supabase
    .from('tours')
    .select(`
      *,
      total_participants:tour_participants(count),
      total_tips:tour_tips(sum(amount))
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guide tours:', error);
    throw new TourError('Failed to fetch tours', TourErrorCode.NETWORK_ERROR);
  }

  return data.map(tour => ({
    ...tour,
    total_participants: tour.total_participants?.[0]?.count || 0,
    total_tips: tour.total_tips?.[0]?.sum || 0
  }));
};

const tourService = {
  getGuideStats,
  getGuideTours
};

export default tourService; 