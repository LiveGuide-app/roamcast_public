import { supabase } from '@/lib/supabase';
import { Tour } from '../types/tour';

export type TourParticipant = {
  id: string;
  tour_id: string;
  device_id: string;
  join_time: string;
  leave_time?: string;
  livekit_joined_room?: string;
  livekit_left_room?: string;
};

export enum TourErrorCode {
  NOT_FOUND = 'TOUR_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class TourError extends Error {
  constructor(message: string, public code: TourErrorCode) {
    super(message);
    this.name = 'TourError';
  }
}

export async function getTourByCode(code: string): Promise<Tour> {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('unique_code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
      }
      throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
    }

    return data;
  } catch (error) {
    if (error instanceof TourError) {
      throw error;
    }
    throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
  }
}

export async function createTourParticipant(tourId: string, deviceId: string): Promise<TourParticipant> {
  console.log('Input values:', {
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
    .maybeSingle();

  if (checkError) {
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
  console.log('Submitting tour rating:', { tourId, deviceId, rating });

  // Check if a rating already exists
  const { data: existingRating, error: ratingError } = await supabase
    .from('feedback')
    .select('id')
    .eq('tour_id', tourId)
    .eq('device_id', deviceId)
    .maybeSingle();

  console.log('Existing rating check:', { existingRating, ratingError });

  if (ratingError) {
    console.error('Error checking existing rating:', ratingError);
    throw new TourError('Failed to check existing rating', TourErrorCode.NETWORK_ERROR);
  }

  if (existingRating) {
    // Update existing rating
    const { error: updateError } = await supabase
      .from('feedback')
      .update({ rating })
      .eq('id', existingRating.id);

    console.log('Update rating result:', { updateError });

    if (updateError) {
      console.error('Error updating rating:', updateError);
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

    console.log('Insert rating result:', { insertError });

    if (insertError) {
      console.error('Error inserting rating:', insertError);
      throw new TourError('Failed to submit rating', TourErrorCode.NETWORK_ERROR);
    }
  }
}

export async function verifyTourParticipant(tourId: string, deviceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tour_participants')
    .select('id')
    .eq('tour_id', tourId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    throw new TourError('Failed to verify tour participant', TourErrorCode.NETWORK_ERROR);
  }

  return !!data;
} 