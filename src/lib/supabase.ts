import { createClient } from "@supabase/supabase-js";
import type { ApplicationInput, ApplicationStatus, AssessmentResponse } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export async function invokeAssessment(payload: ApplicationInput): Promise<AssessmentResponse> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.functions.invoke("assess-application", { body: payload });
  if (error) throw error;
  return data;
}

export async function getApplicationStatus(application_id: string): Promise<ApplicationStatus> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("application-status", { body: { application_id } });
  if (error) throw error;
  return data;
}

export async function listApplications(payload: { status?: string; limit?: number } = {}): Promise<{ applications: ApplicationStatus[] }> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("list-applications", { body: payload });
  if (error) throw error;
  return data;
}

export async function submitAppeal(payload: { application_id: string; reason: string }) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("submit-appeal", { body: payload });
  if (error) throw error;
  return data;
}

export async function updateConsent(payload: {
  research_data_sharing: boolean;
  credit_bureau_exchange: boolean;
  ethics_board_oversight: boolean;
}) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.functions.invoke("update-consent", { body: payload });
  if (error) throw error;
  return data;
}
