export interface Tour {
  id: string;
  code: string;
  title: string;
  name?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  guide_id: string;
  unique_code: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  total_participants?: number;
  total_tips?: number;
  guide_currency?: string;
  room_started_at: string | null;
  room_finished_at: string | null;
} 