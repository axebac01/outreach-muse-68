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
      campaigns: {
        Row: {
          created_at: string
          id: string
          name: string
          offer: string | null
          product: string | null
          status: string
          target_audience: string | null
          tone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          offer?: string | null
          product?: string | null
          status?: string
          target_audience?: string | null
          tone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          offer?: string | null
          product?: string | null
          status?: string
          target_audience?: string | null
          tone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          access_token_enc: string | null
          auth_type: string
          created_at: string
          display_name: string | null
          email: string
          history_id: string | null
          id: string
          imap_host: string | null
          imap_last_uid: number | null
          imap_password_enc: string | null
          imap_port: number | null
          imap_secure: boolean | null
          imap_username: string | null
          last_synced_at: string | null
          oauth_scopes: string | null
          provider: string
          provider_account_id: string | null
          provider_delta_link: string | null
          refresh_token_enc: string | null
          sender_name: string | null
          signature: string | null
          smtp_host: string | null
          smtp_password_enc: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_username: string | null
          status: string
          status_message: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          auth_type: string
          created_at?: string
          display_name?: string | null
          email: string
          history_id?: string | null
          id?: string
          imap_host?: string | null
          imap_last_uid?: number | null
          imap_password_enc?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          oauth_scopes?: string | null
          provider: string
          provider_account_id?: string | null
          provider_delta_link?: string | null
          refresh_token_enc?: string | null
          sender_name?: string | null
          signature?: string | null
          smtp_host?: string | null
          smtp_password_enc?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          status?: string
          status_message?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          auth_type?: string
          created_at?: string
          display_name?: string | null
          email?: string
          history_id?: string | null
          id?: string
          imap_host?: string | null
          imap_last_uid?: number | null
          imap_password_enc?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          oauth_scopes?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_delta_link?: string | null
          refresh_token_enc?: string | null
          sender_name?: string | null
          signature?: string | null
          smtp_host?: string | null
          smtp_password_enc?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          status?: string
          status_message?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          direction: string
          email_account_id: string
          error_message: string | null
          from_address: string
          id: string
          in_reply_to: string | null
          lead_id: string | null
          provider_message_id: string | null
          received_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          thread_id: string | null
          to_address: string
          user_id: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction: string
          email_account_id: string
          error_message?: string | null
          from_address: string
          id?: string
          in_reply_to?: string | null
          lead_id?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id?: string | null
          to_address: string
          user_id: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: string
          email_account_id?: string
          error_message?: string | null
          from_address?: string
          id?: string
          in_reply_to?: string | null
          lead_id?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id?: string | null
          to_address?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_outreach: {
        Row: {
          cold_email: string | null
          created_at: string
          follow_up_1: string | null
          follow_up_2: string | null
          id: string
          lead_id: string
          opener: string | null
          status: string
          subject_line: string | null
          user_id: string
        }
        Insert: {
          cold_email?: string | null
          created_at?: string
          follow_up_1?: string | null
          follow_up_2?: string | null
          id?: string
          lead_id: string
          opener?: string | null
          status?: string
          subject_line?: string | null
          user_id: string
        }
        Update: {
          cold_email?: string | null
          created_at?: string
          follow_up_1?: string | null
          follow_up_2?: string | null
          id?: string
          lead_id?: string
          opener?: string | null
          status?: string
          subject_line?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_outreach_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string
          company: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          notes: string | null
          role: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          campaign_id: string
          company: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          role?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          campaign_id?: string
          company?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          role?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_description: string | null
          company_name: string | null
          company_scrape_status: string | null
          company_target_audience: string | null
          company_url: string | null
          company_value_prop: string | null
          created_at: string
          experience: string | null
          full_name: string | null
          goal: string | null
          id: string
          monthly_volume: string | null
          onboarding_completed: boolean
          plan: string
          role: string | null
          sender_count: string | null
        }
        Insert: {
          company_description?: string | null
          company_name?: string | null
          company_scrape_status?: string | null
          company_target_audience?: string | null
          company_url?: string | null
          company_value_prop?: string | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id: string
          monthly_volume?: string | null
          onboarding_completed?: boolean
          plan?: string
          role?: string | null
          sender_count?: string | null
        }
        Update: {
          company_description?: string | null
          company_name?: string | null
          company_scrape_status?: string | null
          company_target_audience?: string | null
          company_url?: string | null
          company_value_prop?: string | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          monthly_volume?: string | null
          onboarding_completed?: boolean
          plan?: string
          role?: string | null
          sender_count?: string | null
        }
        Relationships: []
      }
      scheduled_sends: {
        Row: {
          created_at: string
          email_account_id: string
          error_message: string | null
          id: string
          lead_id: string
          scheduled_for: string
          sent_message_id: string | null
          sequence_id: string
          status: string
          step_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_account_id: string
          error_message?: string | null
          id?: string
          lead_id: string
          scheduled_for: string
          sent_message_id?: string | null
          sequence_id: string
          status?: string
          step_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          scheduled_for?: string
          sent_message_id?: string | null
          sequence_id?: string
          status?: string
          step_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sends_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sequence_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sends_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_leads: {
        Row: {
          company: string | null
          created_at: string
          current_step: number
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          sequence_id: string
          status: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          current_step?: number
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          sequence_id: string
          status?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          current_step?: number
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          sequence_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_leads_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_senders: {
        Row: {
          created_at: string
          email_account_id: string
          id: string
          sequence_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_account_id: string
          id?: string
          sequence_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string
          id?: string
          sequence_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_senders_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_senders_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_senders_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          body: string
          created_at: string
          id: string
          sequence_id: string
          step_order: number
          subject: string | null
          updated_at: string
          user_id: string
          wait_days: number
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          sequence_id: string
          step_order: number
          subject?: string | null
          updated_at?: string
          user_id: string
          wait_days?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sequence_id?: string
          step_order?: number
          subject?: string | null
          updated_at?: string
          user_id?: string
          wait_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string
          daily_limit_per_account: number
          id: string
          name: string
          pause_on_reply: boolean
          sending_days: Json
          sending_window_end: string
          sending_window_start: string
          start_at: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit_per_account?: number
          id?: string
          name?: string
          pause_on_reply?: boolean
          sending_days?: Json
          sending_window_end?: string
          sending_window_start?: string
          start_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit_per_account?: number
          id?: string
          name?: string
          pause_on_reply?: boolean
          sending_days?: Json
          sending_window_end?: string
          sending_window_start?: string
          start_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unsubscribes: {
        Row: {
          created_at: string
          email: string
          id: string
          sequence_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          sequence_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          sequence_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_accounts_safe: {
        Row: {
          auth_type: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          imap_host: string | null
          imap_port: number | null
          imap_secure: boolean | null
          imap_username: string | null
          last_synced_at: string | null
          provider: string | null
          sender_name: string | null
          signature: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_username: string | null
          status: string | null
          status_message: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_type?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          provider?: string | null
          sender_name?: string | null
          signature?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_type?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          provider?: string | null
          sender_name?: string | null
          signature?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_secret: {
        Args: { ciphertext: string; key: string }
        Returns: string
      }
      encrypt_secret: {
        Args: { key: string; plaintext: string }
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
