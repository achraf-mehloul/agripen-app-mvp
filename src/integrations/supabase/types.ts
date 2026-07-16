export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      farm_events: {
        Row: {
          amount: number | null
          created_at: string
          detail: string | null
          farm_id: string | null
          id: string
          kind: string
          occurred_at: string
          title: string
          unit: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          farm_id?: string | null
          id?: string
          kind: string
          occurred_at?: string
          title: string
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          detail?: string | null
          farm_id?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          title?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          area_hectares: number | null
          baladia: string | null
          boundary_geojson: Json | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          map_photo_url: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          wilaya: string | null
        }
        Insert: {
          area_hectares?: number | null
          baladia?: string | null
          boundary_geojson?: Json | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_photo_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          wilaya?: string | null
        }
        Update: {
          area_hectares?: number | null
          baladia?: string | null
          boundary_geojson?: Json | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          map_photo_url?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      pest_reports: {
        Row: {
          baladia: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          pest_name: string
          photo_url: string | null
          plant: string | null
          severity: string
          user_id: string
          wilaya: string | null
        }
        Insert: {
          baladia?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          pest_name: string
          photo_url?: string | null
          plant?: string | null
          severity?: string
          user_id: string
          wilaya?: string | null
        }
        Update: {
          baladia?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          pest_name?: string
          photo_url?: string | null
          plant?: string | null
          severity?: string
          user_id?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dark_mode: boolean
          dialect: string
          email: string | null
          full_name: string | null
          full_name_latin: string | null
          id: string
          language: string
          notifications: boolean
          onboarded: boolean
          show_trees: boolean
          show_weather: boolean
          updated_at: string
          voice_control: boolean
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean
          dialect?: string
          email?: string | null
          full_name?: string | null
          full_name_latin?: string | null
          id: string
          language?: string
          notifications?: boolean
          onboarded?: boolean
          show_trees?: boolean
          show_weather?: boolean
          updated_at?: string
          voice_control?: boolean
        }
        Update: {
          created_at?: string
          dark_mode?: boolean
          dialect?: string
          email?: string | null
          full_name?: string | null
          full_name_latin?: string | null
          id?: string
          language?: string
          notifications?: boolean
          onboarded?: boolean
          show_trees?: boolean
          show_weather?: boolean
          updated_at?: string
          voice_control?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      soil_readings: {
        Row: {
          farm_id: string | null
          id: string
          moisture: number | null
          nitrogen: number | null
          organic: number | null
          ph: number | null
          phosphorus: number | null
          potassium: number | null
          salinity: number | null
          source: string
          taken_at: string
          temperature: number | null
          user_id: string
        }
        Insert: {
          farm_id?: string | null
          id?: string
          moisture?: number | null
          nitrogen?: number | null
          organic?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          salinity?: number | null
          source?: string
          taken_at?: string
          temperature?: number | null
          user_id: string
        }
        Update: {
          farm_id?: string | null
          id?: string
          moisture?: number | null
          nitrogen?: number | null
          organic?: number | null
          ph?: number | null
          phosphorus?: number | null
          potassium?: number | null
          salinity?: number | null
          source?: string
          taken_at?: string
          temperature?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soil_readings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
