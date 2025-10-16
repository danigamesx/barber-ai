
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string | null
          barber_name: string | null
          barbershop_id: string
          cancellation_fee: number | null
          client_id: string
          client_name: string | null
          commission_amount: number | null
          created_at: string | null
          end_time: string
          google_event_id: string | null
          id: string
          is_reward: boolean | null
          mp_preference_id: string | null
          notes: string | null
          package_usage_id: string | null
          price: number | null
          review_id: string | null
          service_id: string | null
          service_name: string | null
          start_time: string
          status: string
          subscription_usage_id: string | null
        }
        Insert: {
          barber_id?: string | null
          barber_name?: string | null
          barbershop_id: string
          cancellation_fee?: number | null
          client_id: string
          client_name?: string | null
          commission_amount?: number | null
          created_at?: string | null
          end_time: string
          google_event_id?: string | null
          id?: string
          is_reward?: boolean | null
          mp_preference_id?: string | null
          notes?: string | null
          package_usage_id?: string | null
          price?: number | null
          review_id?: string | null
          service_id?: string | null
          service_name?: string | null
          start_time: string
          status?: string
          subscription_usage_id?: string | null
        }
        Update: {
          barber_id?: string | null
          barber_name?: string | null
          barbershop_id?: string
          cancellation_fee?: number | null
          client_id?: string
          client_name?: string | null
          commission_amount?: number | null
          created_at?: string | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          is_reward?: boolean | null
          mp_preference_id?: string | null
          notes?: string | null
          package_usage_id?: string | null
          price?: number | null
          review_id?: string | null
          service_id?: string | null
          service_name?: string | null
          start_time?: string
          status?: string
          subscription_usage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: Json | null
          barbers: Json | null
          blocked_dates: string[] | null
          blocked_time_slots: Json | null
          cancellation_policy: Json | null
          client_records: Json | null
          created_at: string | null
          description: string | null
          gallery_images: string[] | null
          has_completed_setup: boolean | null
          id: string
          image_url: string | null
          integrations: Json | null
          loyalty_program: Json | null
          name: string
          opening_hours: Json | null
          owner_id: string
          packages: Json | null
          phone: string | null
          promotions: Json | null
          rating: number | null
          services: Json | null
          slug: string | null
          social_media: Json | null
          subscriptions: Json | null
          trial_ends_at: string | null
          waiting_list: Json | null
        }
        Insert: {
          address?: Json | null
          barbers?: Json | null
          blocked_dates?: string[] | null
          blocked_time_slots?: Json | null
          cancellation_policy?: Json | null
          client_records?: Json | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          has_completed_setup?: boolean | null
          id?: string
          image_url?: string | null
          integrations?: Json | null
          loyalty_program?: Json | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          packages?: Json | null
          phone?: string | null
          promotions?: Json | null
          rating?: number | null
          services?: Json | null
          slug?: string | null
          social_media?: Json | null
          subscriptions?: Json | null
          trial_ends_at?: string | null
          waiting_list?: Json | null
        }
        Update: {
          address?: Json | null
          barbers?: Json | null
          blocked_dates?: string[] | null
          blocked_time_slots?: Json | null
          cancellation_policy?: Json | null
          client_records?: Json | null
          created_at?: string | null
          description?: string | null
          gallery_images?: string[] | null
          has_completed_setup?: boolean | null
          id?: string
          image_url?: string | null
          integrations?: Json | null
          loyalty_program?: Json | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          packages?: Json | null
          phone?: string | null
          promotions?: Json | null
          rating?: number | null
          services?: Json | null
          slug?: string | null
          social_media?: Json | null
          subscriptions?: Json | null
          trial_ends_at?: string | null
          waiting_list?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: number
          config: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          config?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_subscriptions: Json | null
          birth_date: string | null
          email: string | null
          favorite_barbershop_ids: string[] | null
          id: string
          loyalty_stamps: Json | null
          name: string
          notifications: Json | null
          outstanding_debts: Json | null
          phone: string | null
          purchased_packages: Json | null
          rewards: Json | null
          store_credits: Json | null
          user_type: string
        }
        Insert: {
          active_subscriptions?: Json | null
          birth_date?: string | null
          email?: string | null
          favorite_barbershop_ids?: string[] | null
          id: string
          loyalty_stamps?: Json | null
          name: string
          notifications?: Json | null
          outstanding_debts?: Json | null
          phone?: string | null
          purchased_packages?: Json | null
          rewards?: Json | null
          store_credits?: Json | null
          user_type: string
        }
        Update: {
          active_subscriptions?: Json | null
          birth_date?: string | null
          email?: string | null
          favorite_barbershop_ids?: string[] | null
          id?: string
          loyalty_stamps?: Json | null
          name?: string
          notifications?: Json | null
          outstanding_debts?: Json | null
          phone?: string | null
          purchased_packages?: Json | null
          rewards?: Json | null
          store_credits?: Json | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          barber_id: string | null
          barbershop_id: string
          client_id: string
          client_name: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          appointment_id: string
          barber_id?: string | null
          barbershop_id: string
          client_id: string
          client_name?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          appointment_id?: string
          barber_id?: string | null
          barbershop_id?: string
          client_id?: string
          client_name?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          aud: string
          role: string
          email: string
          email_confirmed_at: string
          phone: string
          phone_confirmed_at: string
          confirmation_sent_at: string
          recovery_sent_at: string
          last_sign_in_at: string
          raw_app_meta_data: Json
          raw_user_meta_data: Json
          is_super_admin: boolean
          created_at: string
          updated_at: string
          banned_until: string
          email_change: string
          email_change_sent_at: string
          reauthentication_token: string
          reauthentication_sent_at: string
        }
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
