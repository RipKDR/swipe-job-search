// Supabase Database types matching BACKEND.md schema
// Updated in U4 with full profiles + employer_profiles columns
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'candidate' | 'employer' | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'candidate' | 'employer' | null;
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
          role?: 'candidate' | 'employer' | null;
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
          description: string | null;
          photo_url: string | null;
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
          description?: string | null;
          photo_url?: string | null;
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
          description?: string | null;
          photo_url?: string | null;
          status?: 'active' | 'hired' | 'expired' | 'paused';
          expires_at?: string;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      swipes: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left';
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          job_id: string;
          direction: 'right' | 'left';
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          job_id?: string;
          direction?: 'right' | 'left';
          created_at?: string;
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_match: {
        Args: {
          p_job_id: string;
          p_candidate_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: 'candidate' | 'employer';
      job_type: 'casual' | 'part_time' | 'permanent';
      job_status: 'active' | 'hired' | 'expired' | 'paused';
      swipe_direction: 'right' | 'left';
      match_status: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived';
    };
  };
};
