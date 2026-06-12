import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, getSupabaseAdmin, json, methodNotAllowed, writeAudit } from "../_shared/backend.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return methodNotAllowed();

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const supabase = getSupabaseAdmin();
    const { data: userResult } = await supabase.auth.getUser(authorization.replace("Bearer ", ""));
    const user = userResult.user;
    if (!user) return json({ error: "Authentication required" }, 401);

    const body = await req.json();
    const payload = {
      user_id: user.id,
      research_data_sharing: Boolean(body.research_data_sharing),
      credit_bureau_exchange: Boolean(body.credit_bureau_exchange),
      african_jurisdiction_only: true,
      ethics_board_oversight: Boolean(body.ethics_board_oversight),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("consent_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("id, updated_at")
      .single();
    if (error) throw error;

    await writeAudit(supabase, "Consent updated", `CONS-${String(user.id).slice(0, 8)}`, "Consent Service", "completed", {
      research_data_sharing: payload.research_data_sharing,
      credit_bureau_exchange: payload.credit_bureau_exchange,
      ethics_board_oversight: payload.ethics_board_oversight
    });

    return json({ consent_id: data.id, updated_at: data.updated_at });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unhandled error" }, 500);
  }
});
