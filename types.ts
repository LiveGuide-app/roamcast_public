export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          deleted_at: string | null
          device_id: string
          has_tipped: boolean | null
          id: string
          rating: number
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id: string
          has_tipped?: boolean | null
          id?: string
          rating: number
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string
          has_tipped?: boolean | null
          id?: string
          rating?: number
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_participants: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          device_id: string | null
          id: string
          join_time: string | null
          leave_time: string | null
          livekit_joined_room: string | null
          livekit_left_room: string | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          livekit_joined_room?: string | null
          livekit_left_room?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          livekit_joined_room?: string | null
          livekit_left_room?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_participants_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_tips: {
        Row: {
          amount: number
          application_fee_amount: number | null
          created_at: string | null
          currency: string
          deleted_at: string | null
          id: string
          payment_intent_id: string | null
          status: string
          stripe_account_id: string | null
          tour_participant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          application_fee_amount?: number | null
          created_at?: string | null
          currency: string
          deleted_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status: string
          stripe_account_id?: string | null
          tour_participant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          application_fee_amount?: number | null
          created_at?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status?: string
          stripe_account_id?: string | null
          tour_participant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_tips_tour_participant_id_fkey"
            columns: ["tour_participant_id"]
            isOneToOne: false
            referencedRelation: "tour_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_participants: number | null
          deleted_at: string | null
          guide_id: string | null
          id: string
          livekit_guide_joined: string | null
          livekit_guide_left: string | null
          livekit_room_id: string | null
          livekit_room_status: string | null
          name: string | null
          room_finished_at: string | null
          room_started_at: string | null
          status: string | null
          total_participants: number | null
          unique_code: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_participants?: number | null
          deleted_at?: string | null
          guide_id?: string | null
          id?: string
          livekit_guide_joined?: string | null
          livekit_guide_left?: string | null
          livekit_room_id?: string | null
          livekit_room_status?: string | null
          name?: string | null
          room_finished_at?: string | null
          room_started_at?: string | null
          status?: string | null
          total_participants?: number | null
          unique_code?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_participants?: number | null
          deleted_at?: string | null
          guide_id?: string | null
          id?: string
          livekit_guide_joined?: string | null
          livekit_guide_left?: string | null
          livekit_room_id?: string | null
          livekit_room_status?: string | null
          name?: string | null
          room_finished_at?: string | null
          room_started_at?: string | null
          status?: string | null
          total_participants?: number | null
          unique_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          profile_image_url: string | null
          recommendations_link: string | null
          stripe_account_created_at: string | null
          stripe_account_enabled: boolean | null
          stripe_account_id: string | null
          stripe_account_updated_at: string | null
          stripe_default_currency: string | null
          stripe_details_submitted: boolean | null
          stripe_payouts_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          profile_image_url?: string | null
          recommendations_link?: string | null
          stripe_account_created_at?: string | null
          stripe_account_enabled?: boolean | null
          stripe_account_id?: string | null
          stripe_account_updated_at?: string | null
          stripe_default_currency?: string | null
          stripe_details_submitted?: boolean | null
          stripe_payouts_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          profile_image_url?: string | null
          recommendations_link?: string | null
          stripe_account_created_at?: string | null
          stripe_account_enabled?: boolean | null
          stripe_account_id?: string | null
          stripe_account_updated_at?: string | null
          stripe_default_currency?: string | null
          stripe_details_submitted?: boolean | null
          stripe_payouts_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_guide_ratings: {
        Args: {
          input_guide_id: string
        }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
      calculate_guide_stats: {
        Args: {
          guide_id: string
        }
        Returns: {
          total_tours: number
          total_guests: number
          total_earnings: number
        }[]
      }
      create_tour: {
        Args: {
          p_guide_id: string
          p_name: string
        }
        Returns: {
          completed_at: string | null
          created_at: string | null
          current_participants: number | null
          deleted_at: string | null
          guide_id: string | null
          id: string
          livekit_guide_joined: string | null
          livekit_guide_left: string | null
          livekit_room_id: string | null
          livekit_room_status: string | null
          name: string | null
          room_finished_at: string | null
          room_started_at: string | null
          status: string | null
          total_participants: number | null
          unique_code: string | null
          updated_at: string | null
        }
      }
      generate_unique_tour_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
