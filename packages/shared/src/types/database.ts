// Supabase Database types matching BACKEND.md schema
// Updated in U4 with full profiles + employer_profiles columns
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'candidate' | 'employer' | 'provider' | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          suburb: string | null;
          avatar_url: string | null;
          experience_text: string | null;
          skills: string[];
          availability_text: string | null;
          work_rights: string | null;
          onboarding_completed_at: string | null;
          bulk_swipe_consent: boolean;
          consent_granted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'candidate' | 'employer' | 'provider' | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          suburb?: string | null;
          avatar_url?: string | null;
          experience_text?: string | null;
          skills?: string[];
          availability_text?: string | null;
          work_rights?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'candidate' | 'employer' | 'provider' | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          suburb?: string | null;
          avatar_url?: string | null;
          experience_text?: string | null;
          skills?: string[];
          availability_text?: string | null;
          work_rights?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employer_profiles: {
        Row: {
          profile_id: string;
          business_name: string;
          about_text: string | null;
          contact_name: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          business_name: string;
          about_text?: string | null;
          contact_name?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          business_name?: string;
          about_text?: string | null;
          contact_name?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      circle_members: {
        Row: {
          profile_id: string;
          circle_id: string;
          joined_at: string;
        };
        Insert: {
          profile_id: string;
          circle_id: string;
          joined_at?: string;
        };
        Update: {
          profile_id?: string;
          circle_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          employer_id: string;
          circle_id: string;
          title: string;
          job_type: 'casual' | 'part_time' | 'permanent';
          pay_display: string;
          pay_amount: number;
          pay_period: 'hour' | 'week' | 'year';
          hours_text: string;
          suburb: string;
          lat: number | null;
          lng: number | null;
          description: string | null;
          photo_url: string | null;
          source: string | null;
          status: 'active' | 'hired' | 'expired' | 'paused';
          expires_at: string;
          hired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          circle_id: string;
          title: string;
          job_type: 'casual' | 'part_time' | 'permanent';
          pay_display: string;
          pay_amount: number;
          pay_period: 'hour' | 'week' | 'year';
          hours_text: string;
          suburb: string;
          lat?: number | null;
          lng?: number | null;
          description?: string | null;
          photo_url?: string | null;
          source?: string | null;
          status?: 'active' | 'hired' | 'expired' | 'paused';
          expires_at: string;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employer_id?: string;
          circle_id?: string;
          title?: string;
          job_type?: 'casual' | 'part_time' | 'permanent';
          pay_display?: string;
          pay_amount?: number;
          pay_period?: 'hour' | 'week' | 'year';
          hours_text?: string;
          suburb?: string;
          lat?: number | null;
          lng?: number | null;
          description?: string | null;
          photo_url?: string | null;
          source?: string | null;
          status?: 'active' | 'hired' | 'expired' | 'paused';
          expires_at?: string;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      swipes: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left' | 'applied';
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left' | 'applied';
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          direction?: 'right' | 'left' | 'applied';
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          employer_id: string;
          status: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          employer_id: string;
          status?: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_id?: string;
          employer_id?: string;
          status?: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          details: string | null;
          job_id: string | null;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          details?: string | null;
          job_id?: string | null;
          match_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          reason?: string;
          details?: string | null;
          job_id?: string | null;
          match_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      salary_reports: {
        Row: {
          id: string;
          job_id: string;
          hourly_rate: number;
          report_type: 'actual' | 'offer' | 'estimate';
          reported_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          hourly_rate: number;
          report_type: 'actual' | 'offer' | 'estimate';
          reported_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          hourly_rate?: number;
          report_type?: 'actual' | 'offer' | 'estimate';
          reported_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      compliance_reports: {
        Row: {
          id: string;
          candidate_id: string;
          provider_id: string;
          period_start: string;
          period_end: string;
          report_type: Database['public']['Enums']['compliance_report_type'];
          storage_path: string | null;
          report_data: Record<string, unknown> | null;
          status: 'pending' | 'generating' | 'completed' | 'failed';
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          provider_id: string;
          period_start: string;
          period_end: string;
          report_type?: Database['public']['Enums']['compliance_report_type'];
          storage_path?: string | null;
          report_data?: Record<string, unknown> | null;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          provider_id?: string;
          period_start?: string;
          period_end?: string;
          report_type?: Database['public']['Enums']['compliance_report_type'];
          storage_path?: string | null;
          report_data?: Record<string, unknown> | null;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      compliance_report_runs: {
        Row: {
          id: string;
          report_id: string;
          status: 'pending' | 'generating' | 'completed' | 'failed';
          total_candidates: number;
          completed_candidates: number;
          failed_candidates: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          total_candidates?: number;
          completed_candidates?: number;
          failed_candidates?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          total_candidates?: number;
          completed_candidates?: number;
          failed_candidates?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      compliance_report_rows: {
        Row: {
          id: string;
          report_id: string;
          run_id: string;
          candidate_id: string;
          status: 'pending' | 'generating' | 'completed' | 'failed';
          swipe_count: number;
          right_swipe_count: number;
          unique_jobs_interacted: number;
          match_count: number;
          hire_count: number;
          swipes_data: Record<string, unknown> | null;
          matches_data: Record<string, unknown> | null;
          hires_data: Record<string, unknown> | null;
          total_earnings: number | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          run_id: string;
          candidate_id: string;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          swipe_count?: number;
          right_swipe_count?: number;
          unique_jobs_interacted?: number;
          match_count?: number;
          hire_count?: number;
          swipes_data?: Record<string, unknown> | null;
          matches_data?: Record<string, unknown> | null;
          hires_data?: Record<string, unknown> | null;
          total_earnings?: number | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          run_id?: string;
          candidate_id?: string;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          swipe_count?: number;
          right_swipe_count?: number;
          unique_jobs_interacted?: number;
          match_count?: number;
          hire_count?: number;
          swipes_data?: Record<string, unknown> | null;
          matches_data?: Record<string, unknown> | null;
          hires_data?: Record<string, unknown> | null;
          total_earnings?: number | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      device_tokens: {
        Row: {
          profile_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android';
          last_used_at: string;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          expo_push_token: string;
          platform: 'ios' | 'android';
          last_used_at?: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          expo_push_token?: string;
          platform?: 'ios' | 'android';
          last_used_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bulk_swipe_log: {
        Row: {
          id: string;
          provider_id: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left' | 'applied';
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left' | 'applied';
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          candidate_id?: string;
          job_id?: string;
          direction?: 'right' | 'left' | 'applied';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      salary_aggregates: {
        Row: {
          job_id: string;
          avg_hourly_rate: number;
          min_hourly_rate: number;
          max_hourly_rate: number;
          report_count: number;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_match: {
        Args: {
          p_job_id: string;
          p_candidate_id: string;
        };
        Returns: string;
      };
      complete_employer_onboarding: {
        Args: {
          p_suburb: string;
          p_avatar_url: string | null;
          p_business_name: string;
          p_contact_name: string;
          p_about_text?: string | null;
        };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      refresh_salary_aggregates: {
        Args: Record<string, never>;
        Returns: void;
      };
      confirm_hire: {
        Args: {
          p_match_id: string;
        };
        Returns: void;
      };
      unmatch: {
        Args: {
          p_match_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: 'candidate' | 'employer' | 'provider';
      job_type: 'casual' | 'part_time' | 'permanent';
      job_status: 'active' | 'hired' | 'expired' | 'paused';
      swipe_direction: 'right' | 'left' | 'applied';
      match_status: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived';
      compliance_report_type: 'weekly_summary' | 'fortnightly' | 'monthly' | 'bulk_swipe_audit' | 'other';
    };
  };
};
