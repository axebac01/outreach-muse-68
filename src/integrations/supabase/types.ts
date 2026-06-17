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
      audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bounces: {
        Row: {
          bounced_at: string
          email: string
          hard: boolean
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          bounced_at?: string
          email: string
          hard?: boolean
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          bounced_at?: string
          email?: string
          hard?: boolean
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      credit_buckets: {
        Row: {
          amount_initial: number
          amount_remaining: number
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          kind: string
          metadata: Json
          source_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_initial: number
          amount_remaining: number
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind: string
          metadata?: Json
          source_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_initial?: number
          amount_remaining?: number
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind?: string
          metadata?: Json
          source_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          lead_id: string | null
          metadata: Json
          reason: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          lead_id?: string | null
          metadata?: Json
          reason: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          lead_id?: string | null
          metadata?: Json
          reason?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dsr_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          email: string
          id: string
          ip_address: string | null
          notes: string | null
          request_type: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          email: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          request_type: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      email_account_sending_limits: {
        Row: {
          created_at: string
          daily_cap_override: number | null
          email_account_id: string
          id: string
          updated_at: string
          user_id: string
          warmup_enabled: boolean
          warmup_started_at: string
        }
        Insert: {
          created_at?: string
          daily_cap_override?: number | null
          email_account_id: string
          id?: string
          updated_at?: string
          user_id: string
          warmup_enabled?: boolean
          warmup_started_at?: string
        }
        Update: {
          created_at?: string
          daily_cap_override?: number | null
          email_account_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          warmup_enabled?: boolean
          warmup_started_at?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          access_token_enc: string | null
          auth_type: string
          created_at: string
          deliverability_check: Json | null
          deliverability_checked_at: string | null
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
          last_send_at: string | null
          last_synced_at: string | null
          oauth_scopes: string | null
          paused_at: string | null
          paused_reason: string | null
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
          deliverability_check?: Json | null
          deliverability_checked_at?: string | null
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
          last_send_at?: string | null
          last_synced_at?: string | null
          oauth_scopes?: string | null
          paused_at?: string | null
          paused_reason?: string | null
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
          deliverability_check?: Json | null
          deliverability_checked_at?: string | null
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
          last_send_at?: string | null
          last_synced_at?: string | null
          oauth_scopes?: string | null
          paused_at?: string | null
          paused_reason?: string | null
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
          ai_analysis_error: string | null
          ai_analyzed_at: string | null
          body_html: string | null
          body_text: string | null
          category: string | null
          created_at: string
          direction: string
          email_account_id: string
          error_message: string | null
          from_address: string
          id: string
          in_reply_to: string | null
          is_archived: boolean
          is_lead_related: boolean
          is_read: boolean
          language: string | null
          lead_id: string | null
          message_id_header: string | null
          provider_message_id: string | null
          received_at: string | null
          sent_at: string | null
          sentiment: string | null
          sequence_id: string | null
          snippet: string | null
          status: string
          subject: string | null
          suggested_reply: string | null
          thread_id: string | null
          thread_key: string | null
          to_address: string
          user_id: string
        }
        Insert: {
          ai_analysis_error?: string | null
          ai_analyzed_at?: string | null
          body_html?: string | null
          body_text?: string | null
          category?: string | null
          created_at?: string
          direction: string
          email_account_id: string
          error_message?: string | null
          from_address: string
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_lead_related?: boolean
          is_read?: boolean
          language?: string | null
          lead_id?: string | null
          message_id_header?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          sentiment?: string | null
          sequence_id?: string | null
          snippet?: string | null
          status?: string
          subject?: string | null
          suggested_reply?: string | null
          thread_id?: string | null
          thread_key?: string | null
          to_address: string
          user_id: string
        }
        Update: {
          ai_analysis_error?: string | null
          ai_analyzed_at?: string | null
          body_html?: string | null
          body_text?: string | null
          category?: string | null
          created_at?: string
          direction?: string
          email_account_id?: string
          error_message?: string | null
          from_address?: string
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_lead_related?: boolean
          is_read?: boolean
          language?: string | null
          lead_id?: string | null
          message_id_header?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          sentiment?: string | null
          sequence_id?: string | null
          snippet?: string | null
          status?: string
          subject?: string | null
          suggested_reply?: string | null
          thread_id?: string | null
          thread_key?: string | null
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
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          email_account_id: string
          id: string
          is_archived: boolean
          is_lead_related: boolean
          last_category: string | null
          last_direction: string | null
          last_message_at: string
          last_sentiment: string | null
          last_snippet: string | null
          lead_id: string | null
          message_count: number
          participants: string[]
          sequence_id: string | null
          subject: string | null
          thread_key: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_account_id: string
          id?: string
          is_archived?: boolean
          is_lead_related?: boolean
          last_category?: string | null
          last_direction?: string | null
          last_message_at?: string
          last_sentiment?: string | null
          last_snippet?: string | null
          lead_id?: string | null
          message_count?: number
          participants?: string[]
          sequence_id?: string | null
          subject?: string | null
          thread_key: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string
          id?: string
          is_archived?: boolean
          is_lead_related?: boolean
          last_category?: string | null
          last_direction?: string | null
          last_message_at?: string
          last_sentiment?: string | null
          last_snippet?: string | null
          lead_id?: string | null
          message_count?: number
          participants?: string[]
          sequence_id?: string | null
          subject?: string | null
          thread_key?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbound_companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          domain: string
          first_seen_at: string
          id: string
          industry: string | null
          is_known_lead: boolean
          last_seen_at: string
          logo_url: string | null
          matched_lead_id: string | null
          name: string | null
          size: string | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          domain: string
          first_seen_at?: string
          id?: string
          industry?: string | null
          is_known_lead?: boolean
          last_seen_at?: string
          logo_url?: string | null
          matched_lead_id?: string | null
          name?: string | null
          size?: string | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string
          first_seen_at?: string
          id?: string
          industry?: string | null
          is_known_lead?: boolean
          last_seen_at?: string
          logo_url?: string | null
          matched_lead_id?: string | null
          name?: string | null
          size?: string | null
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      inbound_notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          message: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      launch_interest: {
        Row: {
          company: string | null
          created_at: string
          email: string
          feature: string
          full_name: string | null
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          feature: string
          full_name?: string | null
          id?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          feature?: string
          full_name?: string | null
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_import_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          error: string | null
          id: string
          inserted_count: number
          payload_count: number
          skipped_count: number
          source: string | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inserted_count?: number
          payload_count?: number
          skipped_count?: number
          source?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          inserted_count?: number
          payload_count?: number
          skipped_count?: number
          source?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_import_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "integration_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_searches: {
        Row: {
          created_at: string
          filters: Json
          filters_hash: string
          id: string
          total_results: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          filters_hash: string
          id?: string
          total_results?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          filters_hash?: string
          id?: string
          total_results?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_leads: {
        Row: {
          city: string | null
          company: string | null
          company_domain: string | null
          cost_credits: number
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          phone: string | null
          provider: string
          provider_id: string
          raw: Json
          revealed_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          company_domain?: string | null
          cost_credits?: number
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          provider: string
          provider_id: string
          raw?: Json
          revealed_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          company?: string | null
          company_domain?: string | null
          cost_credits?: number
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          provider?: string
          provider_id?: string
          raw?: Json
          revealed_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_credit_grants: {
        Row: {
          billing_interval: string
          created_at: string
          credits_per_month: number
          price_id: string
        }
        Insert: {
          billing_interval: string
          created_at?: string
          credits_per_month: number
          price_id: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          credits_per_month?: number
          price_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_description: string | null
          company_industry: string | null
          company_key_offerings: string[] | null
          company_name: string | null
          company_pain_points: string[] | null
          company_proof_points: string[] | null
          company_raw_markdown: string | null
          company_scrape_status: string | null
          company_target_audience: string | null
          company_tone: string | null
          company_url: string | null
          company_value_prop: string | null
          created_at: string
          experience: string | null
          full_name: string | null
          goal: string | null
          id: string
          monthly_volume: string | null
          onboarding_completed: boolean
          onboarding_plan_choice: string | null
          plan: string
          role: string | null
          sender_count: string | null
        }
        Insert: {
          company_description?: string | null
          company_industry?: string | null
          company_key_offerings?: string[] | null
          company_name?: string | null
          company_pain_points?: string[] | null
          company_proof_points?: string[] | null
          company_raw_markdown?: string | null
          company_scrape_status?: string | null
          company_target_audience?: string | null
          company_tone?: string | null
          company_url?: string | null
          company_value_prop?: string | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id: string
          monthly_volume?: string | null
          onboarding_completed?: boolean
          onboarding_plan_choice?: string | null
          plan?: string
          role?: string | null
          sender_count?: string | null
        }
        Update: {
          company_description?: string | null
          company_industry?: string | null
          company_key_offerings?: string[] | null
          company_name?: string | null
          company_pain_points?: string[] | null
          company_proof_points?: string[] | null
          company_raw_markdown?: string | null
          company_scrape_status?: string | null
          company_target_audience?: string | null
          company_tone?: string | null
          company_url?: string | null
          company_value_prop?: string | null
          created_at?: string
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          monthly_volume?: string | null
          onboarding_completed?: boolean
          onboarding_plan_choice?: string | null
          plan?: string
          role?: string | null
          sender_count?: string | null
        }
        Relationships: []
      }
      scheduled_sends: {
        Row: {
          attempts: number
          cancelled_reason: string | null
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
          attempts?: number
          cancelled_reason?: string | null
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
          attempts?: number
          cancelled_reason?: string | null
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
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_credit_grants: {
        Row: {
          amount: number
          granted_at: string
          id: string
          period_start: string
          source: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          granted_at?: string
          id?: string
          period_start: string
          source: string
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          granted_at?: string
          id?: string
          period_start?: string
          source?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_grants_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_sites: {
        Row: {
          auto_tag_email_links: boolean
          created_at: string
          domain: string
          id: string
          is_active: boolean
          last_ping_at: string | null
          last_ping_url: string | null
          name: string | null
          require_consent: boolean
          site_key: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          auto_tag_email_links?: boolean
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          last_ping_at?: string | null
          last_ping_url?: string | null
          name?: string | null
          require_consent?: boolean
          site_key: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          auto_tag_email_links?: boolean
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          last_ping_at?: string | null
          last_ping_url?: string | null
          name?: string | null
          require_consent?: boolean
          site_key?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
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
      visitors: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          lead_id: string | null
          site_id: string
          updated_at: string
          user_id: string
          visit_count: number
          visitor_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lead_id?: string | null
          site_id: string
          updated_at?: string
          user_id: string
          visit_count?: number
          visitor_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lead_id?: string | null
          site_id?: string
          updated_at?: string
          user_id?: string
          visit_count?: number
          visitor_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          id: string
          path: string | null
          referrer: string | null
          scroll_depth: number | null
          session_id: string | null
          site_id: string
          url: string
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          path?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          site_id: string
          url: string
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          path?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          site_id?: string
          url?: string
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_accounts_safe: {
        Row: {
          auth_type: string | null
          created_at: string | null
          deliverability_check: Json | null
          deliverability_checked_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          imap_host: string | null
          imap_port: number | null
          imap_secure: boolean | null
          imap_username: string | null
          last_synced_at: string | null
          paused_at: string | null
          paused_reason: string | null
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
          deliverability_check?: Json | null
          deliverability_checked_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          paused_at?: string | null
          paused_reason?: string | null
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
          deliverability_check?: Json | null
          deliverability_checked_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          imap_username?: string | null
          last_synced_at?: string | null
          paused_at?: string | null
          paused_reason?: string | null
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
      add_credits: {
        Args: {
          _amount: number
          _expires_in_days?: number
          _kind?: string
          _metadata?: Json
          _reason: string
          _source_ref?: string
          _stripe_session_id?: string
          _user_id: string
        }
        Returns: number
      }
      decrypt_secret: {
        Args: { ciphertext: string; key: string }
        Returns: string
      }
      encrypt_secret: {
        Args: { key: string; plaintext: string }
        Returns: string
      }
      expire_credit_buckets: { Args: never; Returns: number }
      get_plan_limit: {
        Args: { resource: string; user_uuid: string }
        Returns: number
      }
      get_sent_today_by_account: {
        Args: { account_ids: string[] }
        Returns: {
          email_account_id: string
          sent_count: number
        }[]
      }
      get_user_plan: { Args: { user_uuid: string }; Returns: string }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      recalc_wallet_balance: { Args: { _user_id: string }; Returns: number }
      spend_credits: {
        Args: {
          _amount: number
          _lead_id?: string
          _metadata?: Json
          _reason: string
          _user_id: string
        }
        Returns: number
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
