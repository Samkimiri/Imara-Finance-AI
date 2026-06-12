import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, getSupabaseAdmin, json, methodNotAllowed } from "../_shared/backend.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed();

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const status = url.searchParams.get("status") ?? body.status;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? body.limit ?? 20), 50);

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("applications")
      .select("id, applicant_name, business_type, location, loan_amount_kes, decision, confidence, recommended_amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 20);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return json({
      applications: (data ?? []).map((item) => ({
        ...item,
        reference: `APP-${String(item.id).slice(0, 8).toUpperCase()}`
      }))
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unhandled error" }, 500);
  }
});
