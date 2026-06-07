import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleComplianceExport, type SupabaseClientLike } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve((req: Request) =>
  handleComplianceExport(
    req,
    createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    ) as unknown as SupabaseClientLike,
  )
);
