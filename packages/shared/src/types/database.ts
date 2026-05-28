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
    };
    Views: Record<string, never>;
    Functions: {
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
