import { useMemo, useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Activity, BadgeCheck, Banknote, Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, Gauge, History, IdCard, Landmark, Lock, LogIn, LogOut, Menu, Phone, Scale, Search,
  ShieldCheck, SlidersHorizontal, Smartphone, Users, WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auditRecords, counties, segmentData } from "./lib/data";
import { localAssessment } from "./lib/mockAssessment";
import { invokeAssessment, submitAppeal, updateConsent } from "./lib/supabase";
import type { ApplicationInput, Assessment } from "./lib/types";

type Page = "home" | "apply" | "overview" | "underwriting" | "agents" | "ethics" | "audit";

const pages: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Gauge },
  { id: "apply", label: "Apply for Loan", icon: FileText },
  { id: "overview", label: "Portfolio", icon: Landmark },
  { id: "underwriting", label: "AI Underwriting", icon: Banknote },
  { id: "agents", label: "Operations", icon: Activity },
  { id: "ethics", label: "Compliance", icon: ShieldCheck },
  { id: "audit", label: "Audit Log", icon: History }
];

const initialForm: ApplicationInput = {
  applicant_name: "Amina Wanjiku",
  business_type: "Market Vendor",
  location: "Nairobi",
  loan_amount_kes: 65000,
  mpesa_summary: "Daily M-Pesa sales receipts, repeat supplier payments, and three prior loan repayments completed on time.",
  seasonal_pattern: "Higher sales during school opening periods and December market season."
};

type LoginForm = {
  phone: string;
  nationalId: string;
  password: string;
};

type ApplicationDetails = {
  phone: string;
  national_id: string;
  loan_purpose: string;
  repayment_period: string;
  monthly_income: number;
  business_age: string;
};

const initialDetails: ApplicationDetails = {
  phone: "0712 345 678",
  national_id: "12345678",
  loan_purpose: "Buy stock for my retail business",
  repayment_period: "6 months",
  monthly_income: 118000,
  business_age: "2 - 5 years"
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.section whileHover={{ y: -2 }} className={`rounded-card border border-border bg-surface p-5 shadow-soft ${className}`}>{children}</motion.section>;
}

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "blue" | "amber" | "red" | "ink" }) {
  const tones = {
    green: "bg-primary-light text-primary-dark",
    blue: "bg-blue-light text-blue",
    amber: "bg-amber-light text-amber",
    red: "bg-danger-light text-danger",
    ink: "bg-ink text-white"
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-card bg-ink text-white shadow-soft">
        <div className="absolute inset-1 rounded-[9px] border border-white/15" />
        <span className="text-lg font-semibold">I</span>
        <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
      </div>
      {!compact && (
        <div>
          <p className="font-semibold leading-tight">Imara Capital</p>
          <p className="text-xs text-muted">Kenya loan platform</p>
        </div>
      )}
    </div>
  );
}

function Count({ value, suffix = "" }: { value: number; suffix?: string }) {
  return <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{value.toLocaleString()}{suffix}</motion.span>;
}

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [login, setLogin] = useState<LoginForm>({ phone: "", nationalId: "", password: "" });
  const [page, setPage] = useState<Page>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function signIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthenticated(true);
    setPage("apply");
  }

  if (!authenticated) {
    return <LoginScreen login={login} setLogin={setLogin} onSubmit={signIn} />;
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface p-4 transition-all duration-300 lg:block ${collapsed ? "w-20" : "w-72"}`} aria-label="Primary navigation">
        <div className="mb-8 flex items-center justify-between">
          <Logo compact={collapsed} />
          <button className="rounded-input p-2 hover:bg-surface-secondary" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <Navigation page={page} setPage={setPage} collapsed={collapsed} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/35 lg:hidden" onClick={() => setMobileOpen(false)}>
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="h-full w-72 bg-surface p-4" onClick={(event) => event.stopPropagation()}>
              <div className="mb-8 flex items-center justify-between">
                <Logo />
                <button className="rounded-input p-2" onClick={() => setMobileOpen(false)} aria-label="Close menu"><ChevronLeft size={18} /></button>
              </div>
              <Navigation page={page} setPage={(next) => { setPage(next); setMobileOpen(false); }} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
          <button className="rounded-input p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <p className="text-sm text-muted">Secure credit for Kenyan entrepreneurs</p>
            <h1 className="text-xl font-semibold">{pages.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Badge tone="blue">Kenya DPA 2019 Ready</Badge>
            <button className="inline-flex items-center gap-2 rounded-input border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-secondary" onClick={() => setAuthenticated(false)}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="mx-auto max-w-7xl p-5">
            {page === "home" && <Home setPage={setPage} />}
            {page === "apply" && <LoanApplication />}
            {page === "overview" && <Overview />}
            {page === "underwriting" && <Underwriting title="Officer Assessment Console" description="Run or review an AI-assisted credit recommendation for a Kenyan borrower." />}
            {page === "agents" && <Agents />}
            {page === "ethics" && <Ethics />}
            {page === "audit" && <Audit />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LoginScreen({ login, setLogin, onSubmit }: { login: LoginForm; setLogin: (value: LoginForm) => void; onSubmit: (event: React.FormEvent) => void }) {
  return (
    <main className="min-h-screen bg-surface-secondary">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-8">
          <Logo />
          <div className="max-w-2xl">
            <Badge tone="ink">Professional Kenya lending portal</Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-ink md:text-6xl">Apply, verify, and manage business loans with confidence.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">Imara Capital helps Kenyan entrepreneurs submit loan applications, verify M-Pesa backed cash flow, and receive fair, explainable credit decisions.</p>
          </div>
          <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
            <Feature icon={Smartphone} title="M-Pesa aware" text="Cash-flow summaries support informal businesses." />
            <Feature icon={ShieldCheck} title="Consent led" text="Built around privacy and Kenya DPA controls." />
            <Feature icon={CalendarClock} title="Fast review" text="Human review is available for sensitive cases." />
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-muted">Use your phone and National ID to continue.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-card bg-primary-light text-primary-dark"><Lock size={20} /></div>
          </div>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Phone Number" value={login.phone} onChange={(phone) => setLogin({ ...login, phone })} placeholder="0712 345 678" />
            <Input label="National ID / Passport" value={login.nationalId} onChange={(nationalId) => setLogin({ ...login, nationalId })} placeholder="12345678" />
            <Input label="Password" type="password" value={login.password} onChange={(password) => setLogin({ ...login, password })} placeholder="Enter your password" />
            <motion.button whileTap={{ scale: 0.98 }} className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark">
              <LogIn size={18} /> Sign in to apply
            </motion.button>
          </form>
          <div className="mt-5 rounded-card bg-surface-secondary p-4 text-sm leading-6 text-muted">
            Demo access is enabled for preview. In production this screen connects to Supabase Auth, SMS OTP, and KYC verification.
          </div>
        </Card>
      </div>
    </main>
  );
}

function Navigation({ page, setPage, collapsed = false }: { page: Page; setPage: (page: Page) => void; collapsed?: boolean }) {
  return (
    <nav className="space-y-2">
      {pages.map((item) => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button key={item.id} onClick={() => setPage(item.id)} className={`flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium transition ${active ? "bg-primary-light text-primary-dark" : "text-muted hover:bg-surface-secondary hover:text-ink"}`} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}>
            <Icon size={18} /> {!collapsed && item.label}
          </button>
        );
      })}
    </nav>
  );
}

function Home({ setPage }: { setPage: (page: Page) => void }) {
  const stats = [["Loan Range", "KES 5k - 500k"], ["Coverage", "47 Counties"], ["Review", "Same day"], ["Support", "SMS + Web"]];
  return (
    <div className="space-y-5">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-panel border border-border bg-surface p-6 shadow-soft md:p-8">
          <Badge tone="blue">Kenya based responsible credit</Badge>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">Business loans for traders, farmers, riders, and growing SMEs.</h2>
          <p className="mt-4 max-w-2xl text-muted md:text-lg md:leading-8">Submit a professional application, attach context about your cash flow, and receive a transparent recommendation with appeal rights.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setPage("apply")} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark"><FileText size={18} /> Start application</button>
            <button onClick={() => setPage("ethics")} className="inline-flex items-center gap-2 rounded-input border border-border px-4 py-3 font-semibold hover:bg-surface-secondary"><ShieldCheck size={18} /> View compliance</button>
          </div>
        </div>
        <Card>
          <h3 className="font-semibold">Application checklist</h3>
          <div className="mt-4 space-y-3">
            {["National ID or passport", "Safaricom phone number", "Business location and purpose", "M-Pesa or income summary"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3 text-sm"><CheckCircle2 className="text-primary" size={18} />{item}</div>
            ))}
          </div>
        </Card>
      </section>
      <div className="grid gap-4 md:grid-cols-4">{stats.map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div>
    </div>
  );
}

function LoanApplication() {
  const [form, setForm] = useState<ApplicationInput>(initialForm);
  const [details, setDetails] = useState<ApplicationDetails>(initialDetails);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSubmitted(false);
    try {
      const data = await invokeAssessment(form).catch(() => ({ assessment: localAssessment(form) }));
      setAssessment(data.assessment ?? data);
      setSubmitted(true);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }

  const affordability = Math.min(92, Math.round((details.monthly_income / Math.max(form.loan_amount_kes, 1)) * 48));

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Kenya Loan Application</h2>
            <p className="mt-1 text-sm text-muted">Complete the form below for a fair credit review.</p>
          </div>
          <Badge tone="blue">KES application</Badge>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Full Name" value={form.applicant_name} onChange={(v) => setForm({ ...form, applicant_name: v })} icon={IdCard} />
          <Input label="Phone Number" value={details.phone} onChange={(phone) => setDetails({ ...details, phone })} icon={Phone} />
          <Input label="National ID / Passport" value={details.national_id} onChange={(national_id) => setDetails({ ...details, national_id })} icon={IdCard} />
          <label className="block text-sm font-medium">County<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>{counties.map((county) => <option key={county}>{county}</option>)}</select></label>
          <Input label="Business Type" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} icon={Building2} />
          <label className="block text-sm font-medium">Business Age<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={details.business_age} onChange={(e) => setDetails({ ...details, business_age: e.target.value })}><option>Under 1 year</option><option>1 - 2 years</option><option>2 - 5 years</option><option>Over 5 years</option></select></label>
          <Input label="Loan Amount Requested (KES)" type="number" value={String(form.loan_amount_kes)} onChange={(v) => setForm({ ...form, loan_amount_kes: Number(v) })} icon={WalletCards} />
          <Input label="Average Monthly Income (KES)" type="number" value={String(details.monthly_income)} onChange={(monthly_income) => setDetails({ ...details, monthly_income: Number(monthly_income) })} icon={Banknote} />
          <label className="block text-sm font-medium">Repayment Period<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={details.repayment_period} onChange={(e) => setDetails({ ...details, repayment_period: e.target.value })}><option>3 months</option><option>6 months</option><option>9 months</option><option>12 months</option></select></label>
          <Input label="Loan Purpose" value={details.loan_purpose} onChange={(loan_purpose) => setDetails({ ...details, loan_purpose })} />
          <div className="md:col-span-2"><TextArea label="M-Pesa / Bank Transaction Summary" value={form.mpesa_summary} onChange={(v) => setForm({ ...form, mpesa_summary: v })} /></div>
          <div className="md:col-span-2"><TextArea label="Seasonal Income Pattern" value={form.seasonal_pattern} onChange={(v) => setForm({ ...form, seasonal_pattern: v })} /></div>
          <div className="md:col-span-2 rounded-card bg-blue-light p-4 text-sm leading-6 text-blue">
            By submitting, the applicant consents to credit assessment, fraud checks, and responsible processing under the Kenya Data Protection Act, 2019.
          </div>
          <motion.button whileTap={{ scale: 0.98 }} className="md:col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark">
            <FileText size={18} /> Submit loan application
          </motion.button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card>
          <h2 className="font-semibold">Eligibility Preview</h2>
          <Score label="Affordability Indicator" value={affordability} max={100} suffix="%" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Summary icon={WalletCards} label="Requested" value={`KES ${form.loan_amount_kes.toLocaleString()}`} />
            <Summary icon={CalendarClock} label="Term" value={details.repayment_period} />
            <Summary icon={Building2} label="Business" value={form.business_type} />
            <Summary icon={Landmark} label="County" value={form.location} />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Decision Status</h2>
          {loading && <div className="mt-5 space-y-3">{["Validating identity", "Assessing cash flow", "Checking fairness rules", "Preparing recommendation"].map((stage) => <div key={stage} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3"><Activity className="animate-pulse text-primary" size={18} />{stage}</div>)}</div>}
          {!loading && !assessment && <EmptyState title="No application submitted yet" />}
          {!loading && assessment && <AssessmentResult assessment={assessment} submitted={submitted} />}
        </Card>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="rounded-card border border-border bg-surface p-4"><Icon className="text-primary" size={20} /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>;
}

function Summary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="rounded-card border border-border p-4"><Icon className="text-primary" size={18} /><p className="mt-3 text-xs text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Overview() {
  const metrics = [
    ["Total Applications", 1049, "blue"],
    ["Approved", 712, "green"],
    ["Pending Human Review", 86, "amber"],
    ["Fairness Score", 94, "green"]
  ] as const;
  const impact: [string, string, LucideIcon][] = [
    ["Direct Users", "28,400", Users],
    ["Counties Reached", "47", Scale],
    ["Women-Owned Businesses", "11,860", BadgeCheck],
    ["SME Working Capital", "KES 184M", ShieldCheck]
  ];
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">{metrics.map(([label, value, tone]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold"><Count value={value} suffix={label.includes("Score") ? "%" : ""} /></p><Badge tone={tone}>Live monitored</Badge></Card>)}</div>
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3"><h2 className="font-semibold">Borrower Segment Distribution</h2><div className="mt-4 h-80"><ResponsiveContainer><BarChart data={segmentData} layout="vertical" margin={{ left: 24 }}><CartesianGrid stroke="#eef0f2" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Bar dataKey="applications" fill="#1D9E75" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="lg:col-span-2"><h2 className="font-semibold">Kenya Portfolio Impact</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{impact.map(([label, value, Icon]) => <div key={label} className="rounded-card border border-border p-4"><Icon className="text-primary" size={20} /><p className="mt-4 text-sm text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div></Card>
    </div>
  </div>;
}

function Underwriting({ title = "Applicant Input", description = "Run an AI-assisted credit assessment." }: { title?: string; description?: string }) {
  const [form, setForm] = useState<ApplicationInput>(initialForm);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [appealStatus, setAppealStatus] = useState("");
  const stages = ["Collecting Data", "AI Analysis", "Fairness Verification", "Recommendation Generation"];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await invokeAssessment(form).catch(() => ({ assessment: localAssessment(form) }));
      setAssessment(data.assessment ?? data);
      setApplicationId(data.application_id ?? null);
    } finally {
      setTimeout(() => setLoading(false), 900);
    }
  }

  return <div className="grid gap-5 lg:grid-cols-2">
    <Card><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p><form onSubmit={submit} className="mt-4 space-y-4">
      <Input label="Applicant Name" value={form.applicant_name} onChange={(v) => setForm({ ...form, applicant_name: v })} />
      <Input label="Business Type" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} />
      <label className="block text-sm font-medium">Location<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>{counties.map((county) => <option key={county}>{county}</option>)}</select></label>
      <Input label="Loan Amount" type="number" value={String(form.loan_amount_kes)} onChange={(v) => setForm({ ...form, loan_amount_kes: Number(v) })} />
      <TextArea label="M-Pesa Transaction Summary" value={form.mpesa_summary} onChange={(v) => setForm({ ...form, mpesa_summary: v })} />
      <TextArea label="Seasonal Income Pattern" value={form.seasonal_pattern} onChange={(v) => setForm({ ...form, seasonal_pattern: v })} />
      <motion.button whileTap={{ scale: 0.98 }} className="w-full rounded-input bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark">Run AI Assessment</motion.button>
    </form></Card>
    <Card><h2 className="font-semibold">Assessment Results</h2>
      {loading && <div className="mt-5 space-y-3">{stages.map((stage, index) => <motion.div key={stage} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.15 }} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3"><Activity className="animate-pulse text-primary" size={18} />{stage}</motion.div>)}</div>}
      {!loading && !assessment && <EmptyState title="Ready for responsible assessment" />}
      {!loading && assessment && <AssessmentResult assessment={assessment} applicationId={applicationId} appeal={appeal} setAppeal={setAppeal} appealStatus={appealStatus} setAppealStatus={setAppealStatus} />}
    </Card>
  </div>;
}

function AssessmentResult({ assessment, submitted = false, applicationId, appeal, setAppeal, appealStatus, setAppealStatus }: { assessment: Assessment; submitted?: boolean; applicationId?: string | null; appeal?: string; setAppeal?: (value: string) => void; appealStatus?: string; setAppealStatus?: (value: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
      {submitted && <p className="rounded-card bg-primary-light p-3 text-sm font-semibold text-primary-dark">Application received. Reference: APP-{Math.floor(5000 + assessment.credit_score)}</p>}
      <div className="flex flex-wrap items-center gap-3"><Badge tone={assessment.decision === "Approved" ? "green" : assessment.decision === "Declined" ? "red" : "amber"}>{assessment.decision}</Badge><span className="text-sm text-muted">Recommended KES {assessment.recommended_amount.toLocaleString()}</span></div>
      <div className="grid gap-3 sm:grid-cols-2"><Score label="Credit Score" value={assessment.credit_score} max={850} /><Score label="Confidence" value={assessment.confidence} max={100} suffix="%" /></div>
      <div className="space-y-3">{Object.entries(assessment.factors).map(([label, value]) => <div key={label}><div className="flex justify-between text-sm"><span>{label}</span><span>{value}%</span></div><motion.div className="mt-2 h-2 rounded-full bg-surface-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-2 rounded-full bg-primary" /></motion.div></div>)}</div>
      <div><p className="text-sm font-semibold">Fairness Flags</p><div className="mt-2 flex flex-wrap gap-2">{assessment.fairness_flags.map((flag) => <Badge key={flag} tone="blue">{flag}</Badge>)}</div></div>
      <p className="rounded-card bg-surface-secondary p-4 text-sm leading-6 text-muted">{assessment.explanation}</p>
      {assessment.decision !== "Approved" && setAppeal && setAppealStatus && <div className="rounded-card border border-border p-4"><p className="font-semibold text-primary">File Appeal</p><textarea value={appeal} onChange={(e) => setAppeal(e.target.value)} placeholder="Add contextual repayment evidence or business records." className="mt-3 w-full rounded-input border border-border p-3" /><button type="button" onClick={async () => { if (!applicationId) { setAppealStatus("Demo appeal captured locally. Connect Supabase to save it."); return; } await submitAppeal({ application_id: applicationId, reason: appeal ?? "" }); setAppealStatus("Appeal submitted and logged."); }} className="mt-3 rounded-input bg-ink px-4 py-2 text-white">Submit Appeal</button>{appealStatus && <p className="mt-2 text-sm text-muted">{appealStatus}</p>}</div>}
    </motion.div>
  );
}

function Agents() {
  const steps: [string, string, string, "completed" | "running" | "pending"][] = [
    ["Data Ingestion", "System", "Collecting verified mobile-money and applicant context", "completed"],
    ["Agent 1 - Credit Assessment", "AI Agent", "Creditworthiness reasoning with informal-sector safeguards", "running"],
    ["Agent 2 - Human Review", "Licensed Officer", "Escalation for low-confidence or fairness-sensitive cases", "pending"],
    ["Decision Dispatch", "Service", "Consent-aware notification and audit writeback", "pending"]
  ];
  const killSwitchMetrics: [string, number][] = [["Bias Threshold", 74], ["Model Confidence", 82], ["Compliance Score", 96]];

  return <div className="space-y-5"><Card><h2 className="font-semibold">Decision Orchestration</h2><div className="mt-5 grid gap-4 md:grid-cols-4">{steps.map(([name, authority, role, status]) => <div key={name} className="rounded-card border border-border p-4"><Badge tone={status === "running" ? "amber" : status === "completed" ? "green" : "blue"}>{status}</Badge><h3 className="mt-4 font-semibold">{name}</h3><p className="mt-2 text-sm text-muted">{authority}</p><p className="mt-3 text-sm leading-6">{role}</p></div>)}</div></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><h2 className="font-semibold">TRAIL Memory System</h2><div className="mt-4 space-y-3"><Memory title="Short-Term Memory" text="Current application context, active fairness flags, and staged assessment state." /><Memory title="Long-Term Memory" text="Historical repayment data, fairness audit history, appeal outcomes, and governance reviews." /></div></Card><Card><h2 className="font-semibold">Kill Switch Panel</h2>{killSwitchMetrics.map(([label, value]) => <Score key={label} label={label} value={value} max={100} suffix="%" />)}<p className="mt-4 rounded-card bg-amber-light p-3 text-sm text-amber">Automatic human review activates when bias, confidence, or compliance thresholds are breached.</p></Card></div>
  </div>;
}

function Ethics() {
  const [settings, setSettings] = useState({ research: true, bureau: false, africa: true, board: true });
  const track = ["Transparency", "Responsibility", "Accountability", "Consent", "Knowledge Equity"];
  function saveConsent(next: typeof settings) {
    setSettings(next);
    void updateConsent({
      research_data_sharing: next.research,
      credit_bureau_exchange: next.bureau,
      ethics_board_oversight: next.board
    }).catch(() => undefined);
  }
  return <div className="grid gap-5 lg:grid-cols-2"><Card><h2 className="font-semibold">TRACK Framework</h2><div className="mt-4 space-y-3">{track.map((item) => <div key={item} className="rounded-card border border-border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">{item}</h3><Badge>Compliant</Badge></div><p className="mt-2 text-sm text-muted">Operational control active with evidence capture and accountable owner assigned.</p></div>)}</div></Card>
    <Card><h2 className="font-semibold">OASIS Consent Controls</h2><div className="mt-4 space-y-4"><Toggle label="Research Data Sharing" checked={settings.research} onChange={() => saveConsent({ ...settings, research: !settings.research })} /><Toggle label="Credit Bureau Exchange" checked={settings.bureau} onChange={() => saveConsent({ ...settings, bureau: !settings.bureau })} /><div title="Required by Data Sovereignty Policy"><Toggle label="African Jurisdiction Only" checked={settings.africa} locked onChange={() => undefined} /></div><Toggle label="Ethics Board Oversight" checked={settings.board} onChange={() => saveConsent({ ...settings, board: !settings.board })} /></div><p className="mt-6 rounded-card bg-blue-light p-4 text-sm leading-6 text-blue">This platform operates in compliance with the Kenya Data Protection Act (2019), which requires lawful processing, informed consent, and protection of personal data.</p></Card></div>;
}

function Audit() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => auditRecords.filter((row) => (status === "all" || row.status === status) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [query, status]);
  const auditMetrics: [string, number][] = [["Total Events", auditRecords.length], ["Escalations", 3], ["Appeals Filed", 1], ["Successful Appeals", 1]];

  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">{auditMetrics.map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div><Card><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="relative"><Search className="absolute left-3 top-3 text-muted" size={18} /><input aria-label="Search audit logs" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-input border border-border py-3 pl-10 pr-3 md:w-80" placeholder="Search events" /></div><label className="flex items-center gap-2 text-sm"><SlidersHorizontal size={18} />Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-input border border-border px-3 py-2"><option value="all">All</option><option value="completed">Completed</option><option value="escalated">Escalated</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-muted"><tr><th className="py-3">Time</th><th>Event</th><th>Application</th><th>Agent</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border"><td className="py-4">{new Date(row.timestamp).toLocaleString()}</td><td>{row.event}</td><td>{row.application_id}</td><td>{row.agent}</td><td><Badge tone={row.status === "escalated" ? "amber" : row.status === "failed" ? "red" : "green"}>{row.status}</Badge></td></motion.tr>)}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><button className="rounded-input border border-border px-3 py-2">Previous</button><button className="rounded-input bg-ink px-3 py-2 text-white">Next</button></div></Card></div>;
}

function Input({ label, value, onChange, type = "text", placeholder, icon: Icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; icon?: LucideIcon }) {
  return <label className="block text-sm font-medium">{label}<span className="relative mt-2 block">{Icon && <Icon className="absolute left-3 top-3.5 text-muted" size={18} />}<input required type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full rounded-input border border-border px-3 py-3 focus:border-primary ${Icon ? "pl-10" : ""}`} /></span></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium">{label}<textarea required value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-24 w-full rounded-input border border-border px-3 py-3 focus:border-primary" /></label>;
}

function Score({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  return <div className="mt-4"><div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span>{value}{suffix}</span></div><div className="mt-2 h-2 rounded-full bg-surface-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / max) * 100)}%` }} className="h-2 rounded-full bg-primary" /></div></div>;
}

function Memory({ title, text }: { title: string; text: string }) {
  return <div className="rounded-card bg-surface-secondary p-4"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-muted">{text}</p></div>;
}

function Toggle({ label, checked, onChange, locked = false }: { label: string; checked: boolean; onChange: () => void; locked?: boolean }) {
  return <button type="button" disabled={locked} onClick={onChange} className="flex w-full items-center justify-between rounded-card border border-border p-4 text-left disabled:cursor-not-allowed disabled:bg-surface-secondary" aria-pressed={checked}><span className="flex items-center gap-2">{locked && <Lock size={16} />}{label}</span><span className={`h-7 w-12 rounded-full p-1 transition ${checked ? "bg-primary" : "bg-border"}`}><motion.span animate={{ x: checked ? 20 : 0 }} className="block h-5 w-5 rounded-full bg-white shadow" /></span></button>;
}

function EmptyState({ title }: { title: string }) {
  return <div className="mt-8 grid place-items-center rounded-panel border border-dashed border-border p-10 text-center text-muted"><FileText className="mb-3 text-primary" /><p>{title}</p><p className="mt-2 text-sm">Submit an application to reveal the credit, fairness, and governance assessment.</p></div>;
}
