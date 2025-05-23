import { supabase } from '@/lib/supabase';
import type { Tour, TourStatus, CreateTourInput, TourParticipant } from '../types/tour';
import appLogger from '@/utils/appLogger';

export type { Tour, TourStatus, CreateTourInput, TourParticipant };

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
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOUR_LIMIT_EXCEEDED = 'TOUR_LIMIT_EXCEEDED'
}

export class TourError extends Error {
  constructor(message: string, public code: TourErrorCode) {
    super(message);
    this.name = 'TourError';
  }
}

export async function createTour(input: CreateTourInput): Promise<Tour> {
  appLogger.logInfo('Starting tour creation...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  appLogger.logInfo('Auth state:', { user, authError });
  
  if (!user) {
    appLogger.logInfo('No user found in auth state');
    throw new TourError('User must be authenticated to create a tour', TourErrorCode.UNAUTHORIZED);
  }

  const { data: uniqueCode, error: rpcError } = await supabase.rpc('generate_unique_tour_code');
  if (rpcError) {
    throw new TourError('Failed to generate tour code', TourErrorCode.NETWORK_ERROR);
  }

  const { data, error } = await supabase
    .from('tours')
    .insert([{ ...input, guide_id: user.id, unique_code: uniqueCode }])
    .select()
    .single();

  if (error) {
    appLogger.logError('Tour creation error:', error);
    
    // Handle the tour limit error
    if (error.message?.includes('Maximum of 2 tours within 7 days')) {
      throw new TourError(
        'You can create a maximum of 2 tours within 7 days until you complete Stripe onboarding.',
        TourErrorCode.TOUR_LIMIT_EXCEEDED
      );
    }

    // Handle other errors
    if (error.code === '23505') { // Unique violation
      throw new TourError('Tour name already exists', TourErrorCode.INVALID_STATUS);
    }
    
    throw new TourError('Failed to create tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function getTour(tourId: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .select(`
      *,
      total_participants:tour_participants(count),
      users!tours_guide_id_fkey (
        stripe_default_currency
      )
    `)
    .eq('id', tourId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
  }

  // Get the actual participant count
  const { data: participants, error: participantsError } = await supabase
    .from('tour_participants')
    .select('*')
    .eq('tour_id', tourId);

  if (participantsError) {
    appLogger.logError('Error fetching participants:', participantsError);
  }

  return {
    ...data,
    total_participants: participants?.length || 0,
    guide_currency: data.users?.stripe_default_currency || 'gbp'
  };
}

export async function updateTourStatus(tourId: string, status: TourStatus): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .update({ 
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', tourId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    if (error.message?.includes('Guide already has an active tour')) {
      throw new TourError('You already have an active tour. Please end it before starting a new one.', TourErrorCode.INVALID_STATUS);
    }
    throw new TourError('Failed to update tour status', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

interface TourTip {
  amount: number;
  status: string;
}

interface TourParticipantWithTips {
  id: string;
  tour_tips: TourTip[];
}

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
      tour_participants(
        id,
        tour_tips(
          amount,
          status
        )
      )
    `)
    .eq('guide_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    appLogger.logError('Error fetching guide tours:', error);
    throw new TourError('Failed to fetch tours', TourErrorCode.NETWORK_ERROR);
  }

  return data.map(tour => {
    // Calculate total tips by summing up all completed tips
    const totalTips = tour.tour_participants?.reduce((sum: number, participant: TourParticipantWithTips) => {
      const participantTips = participant.tour_tips?.reduce((tipSum: number, tip: TourTip) => {
        // Only count tips that are completed/succeeded
        if (tip.status === 'succeeded') {
          return tipSum + (tip.amount || 0);
        }
        return tipSum;
      }, 0) || 0;
      return sum + participantTips;
    }, 0) || 0;

    return {
      ...tour,
      total_participants: tour.total_participants?.[0]?.count || 0,
      total_tips: totalTips
    };
  });
};

export const getGuideStats = async (): Promise<GuideStats> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch stats', TourErrorCode.UNAUTHORIZED);
  }

  appLogger.logInfo('Fetching stats for guide:', { userId: user.id });

  // Get all completed tours for this guide
  const { data: tourStats, error: tourError } = await supabase
    .rpc('calculate_guide_stats', { guide_id: user.id });

  if (tourError) {
    appLogger.logError('Error fetching guide stats:', tourError);
    throw new TourError('Failed to fetch guide stats', TourErrorCode.NETWORK_ERROR);
  }

  appLogger.logInfo('Guide stats response:', { tourStats });

  // Handle the array response by getting the first row
  const stats = Array.isArray(tourStats) ? tourStats[0] : tourStats;

  return {
    totalTours: stats.total_tours || 0,
    totalGuests: stats.total_guests || 0,
    totalEarnings: stats.total_earnings || 0
  };
};

export async function getTourByCode(code: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('unique_code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function createTourParticipant(tourId: string, deviceId: string): Promise<TourParticipant> {
  appLogger.logInfo('Input values:', {
    tourId: tourId,
    deviceId: deviceId,
    tourIdType: typeof tourId,
    deviceIdType: typeof deviceId
  });

  // First, check if participant already exists
  const { data: existingParticipant, error: checkError } = await supabase
    .from('tour_participants')
    .select('*')
    .eq('tour_id', tourId)
    .eq('device_id', deviceId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new TourError('Failed to check existing participant', TourErrorCode.NETWORK_ERROR);
  }

  if (existingParticipant) {
    // Participant exists, update their record to allow rejoining
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('tour_participants')
      .update({ 
        leave_time: null,
        livekit_left_room: null,
        livekit_joined_room: null
      })
      .eq('id', existingParticipant.id)
      .select()
      .single();

    if (updateError) {
      throw new TourError('Failed to update participant record', TourErrorCode.NETWORK_ERROR);
    }

    return updatedParticipant;
  }

  // No existing participant, create new record
  const { data: newParticipant, error: insertError } = await supabase
    .from('tour_participants')
    .insert({
      tour_id: tourId,
      device_id: deviceId
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23503') { // Foreign key violation
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to join tour', TourErrorCode.NETWORK_ERROR);
  }

  return newParticipant;
}

export async function updateParticipantLeaveTime(tourId: string, deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('tour_participants')
    .update({ 
      leave_time: new Date().toISOString()
    })
    .eq('tour_id', tourId)
    .eq('device_id', deviceId)
    .is('leave_time', null);

  if (error) {
    throw new TourError('Failed to update leave time', TourErrorCode.NETWORK_ERROR);
  }
}

export async function submitTourRating(tourId: string, deviceId: string, rating: number): Promise<void> {
  // Check if a rating already exists
  const { data: existingRating, error: ratingError } = await supabase
    .from('feedback')
    .select('id')
    .eq('tour_id', tourId)
    .eq('device_id', deviceId)
    .single();

  if (ratingError && ratingError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new TourError('Failed to check existing rating', TourErrorCode.NETWORK_ERROR);
  }

  if (existingRating) {
    // Update existing rating
    const { error: updateError } = await supabase
      .from('feedback')
      .update({ rating })
      .eq('id', existingRating.id);

    if (updateError) {
      throw new TourError('Failed to update rating', TourErrorCode.NETWORK_ERROR);
    }
  } else {
    // Create new rating
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        tour_id: tourId,
        device_id: deviceId,
        rating
      });

    if (insertError) {
      throw new TourError('Failed to submit rating', TourErrorCode.NETWORK_ERROR);
    }
  }
}

type TourParticipantWithTour = {
  tours: {
    id: string;
    name: string;
    status: TourStatus;
    unique_code: string;
    created_at: string;
    guide_id: string;
  } | null;
};

export async function getRecentTours(deviceId: string): Promise<Tour[]> {
  try {
    const { data, error } = await supabase
      .from('tour_participants')
      .select(`
        tours (
          id,
          name,
          status,
          unique_code,
          created_at,
          guide_id
        )
      `)
      .eq('device_id', deviceId)
      .eq('tours.status', 'active')
      .order('join_time', { ascending: false })
      .limit(5);

    if (error) {
      appLogger.logError('Error fetching recent tours:', error);
      throw new TourError('Failed to fetch recent tours', TourErrorCode.NETWORK_ERROR);
    }

    if (!data) return [];

    // Transform the data to match the Tour type and filter out null values
    return data
      .filter((participant: any) => participant.tours !== null)
      .map((participant: any) => ({
        id: participant.tours.id,
        name: participant.tours.name,
        status: participant.tours.status,
        unique_code: participant.tours.unique_code,
        created_at: participant.tours.created_at
      } as Tour));
  } catch (error) {
    appLogger.logError('Error in getRecentTours:', error instanceof Error ? error : new Error(String(error)));
    return []; // Return empty array instead of throwing to handle gracefully
  }
}

export interface GuideRatings {
  averageRating: number;
  totalReviews: number;
}

export const getGuideRatings = async (): Promise<GuideRatings> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch ratings', TourErrorCode.UNAUTHORIZED);
  }

  const { data: ratings, error } = await supabase
    .rpc('calculate_guide_ratings', { input_guide_id: user.id });

  if (error) {
    appLogger.logError('Error fetching guide ratings:', error);
    throw new TourError('Failed to fetch guide ratings', TourErrorCode.NETWORK_ERROR);
  }

  // Handle the array response
  const ratingsData = Array.isArray(ratings) ? ratings[0] : ratings;

  return {
    averageRating: Number(ratingsData?.average_rating) || 0,
    totalReviews: Number(ratingsData?.total_reviews) || 0
  };
};

export async function getTourAverageRating(tourId: string): Promise<{ averageRating: number | null; totalReviews: number }> {
  const { data, error } = await supabase
    .from('feedback')
    .select('rating')
    .eq('tour_id', tourId)
    .is('deleted_at', null);

  if (error) {
    appLogger.logError('Error fetching tour ratings:', error);
    return { averageRating: null, totalReviews: 0 };
  }

  if (!data || data.length === 0) {
    return { averageRating: null, totalReviews: 0 };
  }

  const totalReviews = data.length;
  const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
  const average = Number((sum / totalReviews).toFixed(1));

  return { averageRating: average, totalReviews };
}

export const getRecentTourCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch tour count', TourErrorCode.UNAUTHORIZED);
  }

  const { data, error } = await supabase
    .from('tours')
    .select('id')
    .eq('guide_id', user.id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .is('deleted_at', null);

  if (error) {
    appLogger.logError('Error fetching recent tour count:', error);
    throw new TourError('Failed to fetch recent tour count', TourErrorCode.NETWORK_ERROR);
  }

  return data.length;
}; 