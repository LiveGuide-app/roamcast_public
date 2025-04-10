import { supabase } from '@/lib/supabase';

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

export interface Tour {
  id: string;
  guide_id: string;
  name: string;
  unique_code: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
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

// Get device ID from local storage or generate a new one
export async function getDeviceId(): Promise<string> {
  const deviceIdKey = 'device_id';
  let deviceId = localStorage.getItem(deviceIdKey);
  
  if (!deviceId) {
    // Generate a UUID v4 using a more compatible method
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem(deviceIdKey, deviceId);
  }
  
  return deviceId;
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