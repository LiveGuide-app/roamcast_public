import { supabase } from '@/lib/supabase';

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
  constructor(message: string) {
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
        throw new TourError('Tour not found');
      }
      throw new TourError('Failed to fetch tour');
    }

    return data;
  } catch (error) {
    if (error instanceof TourError) {
      throw error;
    }
    throw new TourError('Failed to fetch tour');
  }
} 