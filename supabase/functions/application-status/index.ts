import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, getSupabaseAdmin, json, methodNotAllowed } from "../_shared/backend.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const applicationId = url.searchParams.get("application_id") ?? body.application_id;
    if (!applicationId) return json({ error: "application_id is required." }, 422);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("applications")
      .select("id, applicant_name, loan_amount_kes, decision, confidence, recommended_amount, status, created_at")
      .eq("id", applicationId)
      .single();

    if (error || !data) return json({ error: "Application not found." }, 404);

    return json({
      ...data,
      reference: `APP-${String(data.id).slice(0, 8).toUpperCase()}`
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unhandled error" }, 500);
  }
});
