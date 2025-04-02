import { supabase } from '@/lib/supabase';
import type { Tour, TourStatus, CreateTourInput, TourParticipant } from '../types/tour';

export type { Tour, TourStatus, CreateTourInput, TourParticipant };

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

export async function createTour(input: CreateTourInput): Promise<Tour> {
  console.log('Starting tour creation...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log('Auth state:', { user, authError });
  
  if (!user) {
    console.log('No user found in auth state');
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
    console.error('Tour creation error:', error);
    throw new TourError('Failed to create tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function getTour(tourId: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
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

export async function getGuideTours(): Promise<Tour[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User must be authenticated to fetch tours', TourErrorCode.UNAUTHORIZED);
  }

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guide tours:', error);
    throw new TourError('Failed to fetch tours', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

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
  console.log('Input values:', {
    tourId: tourId,
    deviceId: deviceId,
    tourIdType: typeof tourId,
    deviceIdType: typeof deviceId
  });
  const { data, error } = await supabase
    .from('tour_participants')
    .insert({
      tour_id: tourId,
      device_id: deviceId
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23503') { // Foreign key violation
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to join tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
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