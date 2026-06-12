import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { cleanText, corsHeaders, getSupabaseAdmin, json, methodNotAllowed, writeAudit } from "../_shared/backend.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return methodNotAllowed();

  try {
    const { application_id, reason } = await req.json();
    const cleanedReason = cleanText(reason, 2000);
    if (!application_id || cleanedReason.length < 10) return json({ error: "Application id and appeal reason are required." }, 422);

    const supabase = getSupabaseAdmin();
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, status")
      .eq("id", application_id)
      .single();
    if (applicationError || !application) return json({ error: "Application not found." }, 404);

    const { data, error } = await supabase
      .from("appeals")
      .insert({ application_id, reason: cleanedReason })
      .select("id, status, created_at")
      .single();
    if (error) throw error;

    await supabase.from("applications").update({ status: "appeal_pending" }).eq("id", application_id);
    await writeAudit(supabase, "Appeal filed", application_id, "Appeals Desk", "pending", { appeal_id: data.id });

    return json({ appeal_id: data.id, status: data.status, created_at: data.created_at }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unhandled error" }, 500);
  }
});
