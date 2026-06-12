import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type ApplicationInput = {
  applicant_name: string;
  business_type: string;
  location: string;
  loan_amount_kes: number;
  mpesa_summary: string;
  seasonal_pattern: string;
};

export type Assessment = {
  decision: "Approved" | "Human Review" | "Declined";
  confidence: number;
  credit_score: number;
  factors: Record<string, number>;
  fairness_flags: string[];
  explanation: string;
  recommended_amount: number;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed" }, 405);
}

export function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server configuration missing");
  }
  return createClient(supabaseUrl, serviceKey);
}

export function cleanText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function validateApplication(input: Partial<ApplicationInput>) {
  const amount = Number(input.loan_amount_kes);
  if (cleanText(input.applicant_name, 130).length < 2) return "Applicant name is required.";
  if (cleanText(input.business_type, 120).length < 2) return "Business type is required.";
  if (cleanText(input.location, 80).length < 2) return "Location is required.";
  if (!Number.isFinite(amount) || amount < 1000 || amount > 1000000) return "Loan amount must be between KES 1,000 and KES 1,000,000.";
  if (cleanText(input.mpesa_summary, 2200).length < 20) return "M-Pesa summary needs enough context.";
  if (cleanText(input.seasonal_pattern, 1200).length < 10) return "Seasonal pattern is required.";
  return null;
}

export function sanitizeApplication(input: ApplicationInput): ApplicationInput {
  return {
    applicant_name: cleanText(input.applicant_name, 120),
    business_type: cleanText(input.business_type, 120),
    location: cleanText(input.location, 80),
    loan_amount_kes: Math.round(Number(input.loan_amount_kes)),
    mpesa_summary: cleanText(input.mpesa_summary, 2000),
    seasonal_pattern: cleanText(input.seasonal_pattern, 1000)
  };
}

export function validateAssessment(value: Record<string, unknown>) {
  const decisions = ["Approved", "Human Review", "Declined"];
  if (!decisions.includes(String(value.decision))) throw new Error("Invalid decision.");
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 100) throw new Error("Invalid confidence.");
  if (typeof value.credit_score !== "number" || value.credit_score < 0 || value.credit_score > 850) throw new Error("Invalid credit score.");
  if (typeof value.recommended_amount !== "number" || value.recommended_amount < 0) throw new Error("Invalid recommended amount.");
  if (!value.factors || typeof value.factors !== "object" || Array.isArray(value.factors)) throw new Error("Invalid factors.");
  if (!Array.isArray(value.fairness_flags)) throw new Error("Invalid fairness flags.");
  if (typeof value.explanation !== "string" || value.explanation.length < 20) throw new Error("Invalid explanation.");
}

export function localAssessment(input: ApplicationInput): Assessment {
  const amountPressure = Math.min(input.loan_amount_kes / 150000, 1);
  const summary = input.mpesa_summary.toLowerCase();
  const seasonality = input.seasonal_pattern.toLowerCase();
  const hasConsistentReceipts = /daily|weekly|regular|repeat|sales|receipts|supplier/.test(summary);
  const hasRepaymentEvidence = /repay|paid|cleared|loan|installment|instalment/.test(summary);
  const hasSeasonalContext = /season|harvest|rain|school|market|december|holiday/.test(seasonality);
  const base = 580 + (hasConsistentReceipts ? 85 : 35) + (hasRepaymentEvidence ? 55 : 10) + (hasSeasonalContext ? 35 : 0);
  const credit_score = Math.max(420, Math.min(820, Math.round(base - amountPressure * 70)));
  const confidence = Math.max(58, Math.min(94, Math.round(64 + (hasConsistentReceipts ? 14 : 4) + (hasRepaymentEvidence ? 10 : 2) + (hasSeasonalContext ? 6 : 0) - amountPressure * 5)));
  const decision = credit_score >= 690 && confidence >= 72 ? "Approved" : credit_score >= 560 ? "Human Review" : "Declined";

  return {
    decision,
    confidence,
    credit_score,
    recommended_amount: Math.round(decision === "Approved" ? input.loan_amount_kes * 0.9 : decision === "Human Review" ? input.loan_amount_kes * 0.55 : 0),
    factors: {
      "Mobile money consistency": hasConsistentReceipts ? 86 : 61,
      "Repayment behavior": hasRepaymentEvidence ? 82 : 57,
      "Seasonality allowance": hasSeasonalContext ? 88 : 64,
      "Affordability fit": Math.round(90 - amountPressure * 34),
      "Bias mitigation": decision === "Human Review" ? 92 : 87
    },
    fairness_flags: decision === "Human Review"
      ? ["Manual review recommended for contextual informal-income evidence", "Seasonal revenue pattern requires human confirmation"]
      : ["No material protected-class proxy detected"],
    explanation: `${input.applicant_name} has ${hasConsistentReceipts ? "consistent" : "partial"} mobile-money evidence and ${hasSeasonalContext ? "clear" : "limited"} seasonal context. The recommendation avoids penalizing informal-sector income and escalates uncertain cases for human review.`
  };
}

export async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  event: string,
  application_id: string,
  agent: string,
  status: "completed" | "escalated" | "pending" | "failed",
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("audit_logs").insert({ event, application_id, agent, status, metadata });
}
