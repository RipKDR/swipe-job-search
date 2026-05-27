// Supabase Database types (stub for U3 - will be generated from schema in later units)
// Per BACKEND.md schema - minimal types needed for auth
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          email: string | null;
          role: 'candidate' | 'employer' | null;
          onboarding_completed_at: string | null;
          full_name: string | null;
          suburb: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          role?: 'candidate' | 'employer' | null;
          onboarding_completed_at?: string | null;
          full_name?: string | null;
          suburb?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          role?: 'candidate' | 'employer' | null;
          onboarding_completed_at?: string | null;
          full_name?: string | null;
          suburb?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
