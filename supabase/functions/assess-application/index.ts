import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  type ApplicationInput,
  type Assessment,
  corsHeaders,
  getSupabaseAdmin,
  json,
  localAssessment,
  methodNotAllowed,
  sanitizeApplication,
  validateApplication,
  validateAssessment,
  writeAudit
} from "../_shared/backend.ts";

const systemPrompt = `You are a financial inclusion specialist trained in evaluating informal-sector borrowers across Kenya.

Assess creditworthiness while actively minimizing bias against informal workers.
Use mobile money history, repayment behavior, business type, county, loan amount, and seasonal income patterns.

Rules:
- Never assume formal employment is safer than informal employment.
- Consider seasonal earning patterns and informal cash-flow evidence.
- Escalate uncertain cases to Human Review instead of declining them harshly.
- Keep recommended_amount at or below the requested amount.

Return ONLY JSON:
{"decision":"","confidence":0,"credit_score":0,"factors":{},"fairness_flags":[],"explanation":"","recommended_amount":0}`;

async function aiAssessment(input: ApplicationInput): Promise<Assessment | null> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return null;

  const prompt = `Assess this Kenyan loan application:\n${JSON.stringify(input, null, 2)}`;
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-sonnet-latest",
          max_tokens: 900,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        lastError = await response.text();
        continue;
      }

      const data = await response.json();
      const assessment = JSON.parse(data.content?.[0]?.text ?? "{}") as Record<string, unknown>;
      validateAssessment(assessment);
      return {
        ...(assessment as Assessment),
        recommended_amount: Math.min(Number(assessment.recommended_amount), input.loan_amount_kes)
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Assessment parse failed";
    }
  }

  console.warn("AI assessment failed, falling back to deterministic score", lastError);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return methodNotAllowed();

  try {
    const rawInput = await req.json() as ApplicationInput;
    const validationError = validateApplication(rawInput);
    if (validationError) return json({ error: validationError }, 422);

    const input = sanitizeApplication(rawInput);
    const supabase = getSupabaseAdmin();
    const assessment = await aiAssessment(input) ?? localAssessment(input);
    validateAssessment(assessment as unknown as Record<string, unknown>);

    const { data: application, error: appError } = await supabase.from("applications").insert({
      ...input,
      credit_score: assessment.credit_score,
      decision: assessment.decision,
      confidence: assessment.confidence,
      factors: assessment.factors,
      fairness_flags: assessment.fairness_flags,
      explanation: assessment.explanation,
      recommended_amount: assessment.recommended_amount,
      status: assessment.decision === "Human Review" ? "human_review" : "assessed"
    }).select("id, created_at, status").single();

    if (appError) throw appError;

    await writeAudit(
      supabase,
      "Credit assessment completed",
      application.id,
      "Credit Agent",
      assessment.decision === "Human Review" ? "escalated" : "completed",
      { decision: assessment.decision, confidence: assessment.confidence, credit_score: assessment.credit_score }
    );

    return json({
      application_id: application.id,
      reference: `APP-${String(application.id).slice(0, 8).toUpperCase()}`,
      status: application.status,
      created_at: application.created_at,
      assessment
    }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unhandled error" }, 500);
  }
});
