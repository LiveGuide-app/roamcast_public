export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tours: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          status: 'pending' | 'active' | 'completed' | 'cancelled'
          room_started_at: string | null
          room_finished_at: string | null
          livekit_guide_joined: string | null
          livekit_guide_left: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          room_started_at?: string | null
          room_finished_at?: string | null
          livekit_guide_joined?: string | null
          livekit_guide_left?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          room_started_at?: string | null
          room_finished_at?: string | null
          livekit_guide_joined?: string | null
          livekit_guide_left?: string | null
        }
      }
      tour_participants: {
        Row: {
          id: string
          created_at: string
          tour_id: string
          device_id: string
          livekit_joined_room: string | null
          livekit_left_room: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          tour_id: string
          device_id: string
          livekit_joined_room?: string | null
          livekit_left_room?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          tour_id?: string
          device_id?: string
          livekit_joined_room?: string | null
          livekit_left_room?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 