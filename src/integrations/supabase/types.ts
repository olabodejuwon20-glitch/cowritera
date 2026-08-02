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
      ai_generations: {
        Row: {
          created_at: string
          id: string
          kind: string
          model: string | null
          output: string | null
          paper_id: string | null
          prompt: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          model?: string | null
          output?: string | null
          paper_id?: string | null
          prompt?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          model?: string | null
          output?: string | null
          paper_id?: string | null
          prompt?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          campaign_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          campaign_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          campaign_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_invites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_payouts: {
        Row: {
          ambassador_id: string
          amount_kobo: number
          created_at: string
          id: string
          note: string | null
          paid_at: string
          status: string
        }
        Insert: {
          ambassador_id: string
          amount_kobo: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          status?: string
        }
        Update: {
          ambassador_id?: string
          amount_kobo?: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_payouts_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          referral_code: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          referral_code: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassadors_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_announcements: {
        Row: {
          body: string
          campaign_id: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_announcements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          commission_kobo: number
          created_at: string
          created_by: string | null
          description: string | null
          eligibility: string | null
          ends_at: string | null
          id: string
          name: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_kobo?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility?: string | null
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_kobo?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          eligibility?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount_discount_kobo: number
          coupon_id: string
          created_at: string
          id: string
          paper_id: string | null
          user_id: string
        }
        Insert: {
          amount_discount_kobo?: number
          coupon_id: string
          created_at?: string
          id?: string
          paper_id?: string | null
          user_id: string
        }
        Update: {
          amount_discount_kobo?: number
          coupon_id?: string
          created_at?: string
          id?: string
          paper_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          discount_amount_kobo: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          notes: string | null
          type: string
          updated_at: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          discount_amount_kobo?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          type: string
          updated_at?: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          discount_amount_kobo?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          type?: string
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      marketing_resources: {
        Row: {
          body: string | null
          campaign_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          storage_path: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          storage_path?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_resources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          course_code: string
          created_at: string
          id: string
          paid: boolean
          project: Json
          sections: Json
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_code: string
          created_at?: string
          id?: string
          paid?: boolean
          project?: Json
          sections?: Json
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_code?: string
          created_at?: string
          id?: string
          paid?: boolean
          project?: Json
          sections?: Json
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          paper_id: string | null
          paystack_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paper_id?: string | null
          paystack_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paper_id?: string | null
          paystack_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          university: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          ambassador_id: string
          created_at: string
          id: string
          referral_code: string
        }
        Insert: {
          ambassador_id: string
          created_at?: string
          id?: string
          referral_code: string
        }
        Update: {
          ambassador_id?: string
          created_at?: string
          id?: string
          referral_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          ambassador_id: string
          campaign_id: string | null
          commission_kobo: number
          created_at: string
          credited_at: string | null
          id: string
          payment_id: string | null
          referred_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ambassador_id: string
          campaign_id?: string | null
          commission_kobo?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          payment_id?: string | null
          referred_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ambassador_id?: string
          campaign_id?: string | null
          commission_kobo?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          payment_id?: string | null
          referred_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_ambassador_invite: {
        Args: { _email: string; _token: string }
        Returns: Json
      }
      attach_referral: { Args: { _code: string }; Returns: Json }
      coupon_quote: { Args: { _code: string }; Returns: Json }
      credit_referral_for_user: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_coupon: {
        Args: { _code: string; _paper_id: string }
        Returns: Json
      }
      track_referral_click: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "ambassador"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "ambassador"],
    },
  },
} as const
