export type Decision = "Approved" | "Human Review" | "Declined";

export type Assessment = {
  decision: Decision;
  confidence: number;
  credit_score: number;
  factors: Record<string, number>;
  fairness_flags: string[];
  explanation: string;
  recommended_amount: number;
};

export type ApplicationInput = {
  applicant_name: string;
  business_type: string;
  location: string;
  loan_amount_kes: number;
  mpesa_summary: string;
  seasonal_pattern: string;
};

export type AssessmentResponse = {
  application_id?: string;
  reference?: string;
  status?: string;
  created_at?: string;
  assessment: Assessment;
};

export type ApplicationStatus = {
  id: string;
  reference: string;
  applicant_name: string;
  loan_amount_kes: number;
  decision: Decision | null;
  confidence: number | null;
  recommended_amount: number | null;
  status: string;
  created_at: string;
};

export type AuditRecord = {
  id: string;
  timestamp: string;
  event: string;
  application_id: string;
  agent: string;
  status: "completed" | "escalated" | "pending" | "failed";
  metadata: Record<string, string | number | boolean>;
};
