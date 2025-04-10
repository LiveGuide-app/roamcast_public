export interface Tour {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  unique_code: string;
  created_at: string;
  guide_id: string;
  completed_at?: string | null;
  total_participants?: number;
  total_tips?: number;
  guide_currency?: string;
} 