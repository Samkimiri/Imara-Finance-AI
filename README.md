# Imara Finance AI

Production-ready responsible AI microloan platform for East Africa, designed for ethical underwriting, transparent governance, auditability, and Kenya Data Protection Act (2019) compliance.

## What Is Included

- React + TypeScript + Vite frontend
- Tailwind design system using the requested color tokens and Plus Jakarta Sans
- Framer Motion page transitions and micro-interactions
- Recharts borrower segment visualization
- AI underwriting workflow with secure Supabase Edge Functions
- Claude assessment engine with JSON validation, retries, and deterministic fallback scoring
- Supabase PostgreSQL schema, RLS policies, and seed audit data
- Consent controls, governance dashboard, agent pipeline, kill-switch monitoring, appeals flow, audit center, application status API, and application listing API

## Architecture

```text
React Frontend
  -> Supabase Edge Function: assess-application
      -> Anthropic Claude API when configured
      -> deterministic backend fallback when Claude is unavailable
      -> JSON validation
      -> applications insert
      -> audit_logs insert
  -> Supabase Edge Function: application-status
      -> latest application status, reference, and decision data
  -> Supabase Edge Function: list-applications
      -> recent operational application queue
  -> Supabase PostgreSQL
      -> applications
      -> audit_logs
      -> consent_settings
      -> appeals
```

The frontend includes an offline local assessment fallback so reviewers can explore the product before connecting Supabase. In production, configure Supabase and Claude so every assessment is persisted and audited server-side.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add these values to `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Add these Supabase Edge Function secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=your-key
supabase secrets set ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

## Database

Run migrations:

```bash
supabase db push
```

The schema creates:

- `applications`
- `audit_logs`
- `consent_settings`
- `appeals`

RLS is enabled on all tables. Application and audit writes are restricted to the service role, while authenticated users can read operational data and manage their own consent settings. The `african_jurisdiction_only` consent control is enforced as true.

## Deploy Edge Functions

```bash
supabase functions deploy assess-application
supabase functions deploy submit-appeal
supabase functions deploy update-consent
supabase functions deploy application-status
supabase functions deploy list-applications
```

The assessment function:

1. Validates applicant input.
2. Calls Claude with a responsible lending system prompt when an API key is configured.
3. Retries transient AI failures.
4. Validates Claude JSON.
5. Falls back to a deterministic backend score if AI is unavailable.
6. Writes an audit log.
7. Returns the assessment, application id, reference, created time, and status.

`submit-appeal` verifies the application exists, saves appeal evidence, updates application status, and logs the appeal event. `update-consent` enforces African jurisdiction data sovereignty, upserts authenticated user consent, and logs the update. `application-status` and `list-applications` support status refreshes and operational dashboards.

## Production Notes

- Keep `ANTHROPIC_API_KEY` only in Supabase function secrets.
- Use Supabase Auth before exposing production dashboards.
- Add IP/user rate limiting at the edge gateway for public application intake.
- Run regular fairness monitoring by borrower segment, county, gender proxy review, approval rate, escalation rate, and appeal outcome.
- Review all policies with Kenyan legal counsel before regulated deployment.

## Verification

Run:

```bash
npm run build
```

Then deploy the Vite frontend and Supabase backend to your production projects.
