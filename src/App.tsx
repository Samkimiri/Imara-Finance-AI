import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Activity, ArrowRight, BadgeCheck, Banknote, Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  FileText, Gauge, History, IdCard, Landmark, Lock, LogIn, LogOut, Mail, Menu, Phone, Scale, Search,
  ShieldCheck, SlidersHorizontal, Smartphone, Users, WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auditRecords, counties, segmentData } from "./lib/data";
import { localAssessment } from "./lib/mockAssessment";
import { getApplicationStatus, invokeAssessment, submitAppeal, updateConsent } from "./lib/supabase";
import type { ApplicationInput, ApplicationStatus, Assessment, AssessmentResponse } from "./lib/types";

type Page = "home" | "apply" | "overview" | "underwriting" | "agents" | "ethics" | "audit";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  password: string;
  confirmPassword: string;
};

type AuthMode = "login" | "signup";

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
  return <motion.section whileHover={{ y: -2 }} className={`rounded-card border border-border bg-surface/95 p-5 shadow-soft ${className}`}>{children}</motion.section>;
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
  const [login, setLogin] = useState<LoginForm>({ fullName: "", email: "", phone: "", nationalId: "", password: "", confirmPassword: "" });
  const [page, setPage] = useState<Page>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("");

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function completeAuth() {
    setAuthenticated(true);
    setPage("home");
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallStatus("Use your browser menu to install Imara Capital on this device.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallStatus(choice.outcome === "accepted" ? "Imara Capital is ready as an app." : "Install dismissed. You can try again from the browser menu.");
    setInstallPrompt(null);
  }

  if (!authenticated) {
    return <LoginScreen login={login} setLogin={setLogin} onSuccess={completeAuth} />;
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface/90 p-4 shadow-soft backdrop-blur-xl transition-all duration-300 lg:block ${collapsed ? "w-20" : "w-72"}`} aria-label="Primary navigation">
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
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/85 px-4 py-3 shadow-sm backdrop-blur-xl md:px-5 md:py-4">
          <button className="rounded-input p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <p className="text-sm text-muted">Secure credit for Kenyan entrepreneurs</p>
            <h1 className="text-xl font-semibold">{pages.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Badge tone="blue">Kenya DPA 2019 Ready</Badge>
            <button className="inline-flex items-center gap-2 rounded-input border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-secondary" onClick={installApp}>
              <Smartphone size={16} /> Install app
            </button>
            <button className="inline-flex items-center gap-2 rounded-input border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-secondary" onClick={() => setAuthenticated(false)}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="mx-auto max-w-7xl p-4 pb-28 md:p-5 md:pb-8">
            {installStatus && <div className="mb-4 rounded-card border border-border bg-surface p-3 text-sm font-semibold text-primary-dark shadow-soft">{installStatus}</div>}
            {page === "home" && <Home setPage={setPage} installApp={installApp} />}
            {page === "apply" && <LoanApplication />}
            {page === "overview" && <Overview />}
            {page === "underwriting" && <Underwriting title="Officer Assessment Console" description="Run or review an AI-assisted credit recommendation for a Kenyan borrower." />}
            {page === "agents" && <Agents />}
            {page === "ethics" && <Ethics />}
            {page === "audit" && <Audit />}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileBottomNav page={page} setPage={setPage} />
    </div>
  );
}

function LoginScreen({ login, setLogin, onSuccess }: { login: LoginForm; setLogin: (value: LoginForm) => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");

  function validate() {
    const phoneDigits = login.phone.replace(/\D/g, "");
    if (mode === "signup" && login.fullName.trim().length < 2) return "Enter your full name to create an account.";
    if (!/^\S+@\S+\.\S+$/.test(login.email.trim())) return "Enter a valid email address.";
    if (phoneDigits.length < 9) return "Enter a valid phone number.";
    if (login.nationalId.trim().length < 6) return "Enter a valid National ID or passport number.";
    if (login.password.length < 6) return "Password must be at least 6 characters.";
    if (mode === "signup" && login.password !== login.confirmPassword) return "Passwords do not match.";
    return "";
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    onSuccess();
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-ink">
      <div className="absolute inset-0 bg-[url('/images/vendor-hero.png')] bg-cover bg-center opacity-65" aria-hidden="true" />
      <div className="absolute inset-0 bg-ink/72" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-ink/35 via-ink/58 to-ink/88" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-panel border border-white/30 bg-white/92 px-3 py-2 shadow-soft backdrop-blur-xl">
          <Logo />
          <Badge tone="green"><BadgeCheck size={14} /> Verified Kenya fintech</Badge>
        </header>

        <section className="flex flex-1 items-center justify-center py-8">
          <Card className="mx-auto w-full max-w-xl border-white/75 bg-white/98 shadow-2xl shadow-ink/30 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge tone="ink">Secure access required</Badge>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-4xl">Login to Imara Capital</h1>
                <p className="mt-2 text-sm leading-6 text-muted">Sign in or create an account before accessing the protected loan dashboard.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-primary-light text-primary-dark"><Lock size={22} /></div>
            </div>
            <div className="mt-6 grid grid-cols-2 rounded-card bg-surface-secondary p-1">
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`rounded-input px-3 py-3 text-sm font-semibold transition ${mode === "login" ? "bg-surface text-primary-dark shadow-sm" : "text-muted hover:text-ink"}`}>Login</button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`rounded-input px-3 py-3 text-sm font-semibold transition ${mode === "signup" ? "bg-surface text-primary-dark shadow-sm" : "text-muted hover:text-ink"}`}>Create Account</button>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && <Input label="Full Name" value={login.fullName} onChange={(fullName) => setLogin({ ...login, fullName })} placeholder="Amina Wanjiku" icon={Users} />}
              <Input label="Email Address" type="email" value={login.email} onChange={(email) => setLogin({ ...login, email })} placeholder="amina@example.com" icon={Mail} />
              <Input label="Phone Number" value={login.phone} onChange={(phone) => setLogin({ ...login, phone })} placeholder="0712 345 678" icon={Phone} />
              <Input label="National ID / Passport" value={login.nationalId} onChange={(nationalId) => setLogin({ ...login, nationalId })} placeholder="12345678" icon={IdCard} />
              <Input label="Password" type="password" value={login.password} onChange={(password) => setLogin({ ...login, password })} placeholder="Enter your password" />
              {mode === "signup" && <Input label="Confirm Password" type="password" value={login.confirmPassword} onChange={(confirmPassword) => setLogin({ ...login, confirmPassword })} placeholder="Confirm your password" />}
              {error && <p className="rounded-card bg-danger-light p-3 text-sm font-semibold text-danger">{error}</p>}
              <motion.button whileTap={{ scale: 0.98 }} className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark">
                <LogIn size={18} /> {mode === "login" ? "Login and continue" : "Create account and continue"}
              </motion.button>
            </form>
            <div className="mt-5 grid gap-3 rounded-card border border-primary/15 bg-primary-light/45 p-4 text-sm leading-6 text-primary-dark sm:grid-cols-3">
              <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> SSL secured</span>
              <span className="inline-flex items-center gap-2 font-semibold"><Scale size={16} /> Kenya DPA aware</span>
              <span className="inline-flex items-center gap-2 font-semibold"><BadgeCheck size={16} /> Verified reviews</span>
            </div>
          </Card>
        </section>
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

function Home({ setPage, installApp }: { setPage: (page: Page) => void; installApp: () => void }) {
  const stats = [["Loan Range", "KES 5k - 500k"], ["Coverage", "47 Counties"], ["Approval Rate", "68%"], ["Review", "Same day"]];
  const flow = [
    ["Apply", "Tell us about the business", FileText],
    ["Verify", "Confirm ID and cash flow", ShieldCheck],
    ["Decide", "Get a fair recommendation", BadgeCheck]
  ] as const;
  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-panel border border-border bg-surface shadow-soft"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.9) 43%, rgba(255,255,255,0.46) 100%), url('/images/vendor-hero.png')",
          backgroundPosition: "center right",
          backgroundSize: "cover"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/70 via-white/10 to-amber-light/50" />
        <div className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 md:p-8 lg:p-10">
            <Badge tone="amber">Friendly finance for Kenyan businesses</Badge>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-5xl">Apply for a loan with clarity, confidence, and human support.</h2>
            <p className="mt-4 max-w-2xl text-muted md:text-lg md:leading-8">Imara Capital gives entrepreneurs a secure way to request funding, verify cash flow, and understand every decision before accepting loan terms.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setPage("apply")} className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white shadow-soft hover:bg-primary-dark"><FileText size={18} /> Start loan application <ArrowRight size={17} /></button>
              <button onClick={() => setPage("overview")} className="inline-flex items-center gap-2 rounded-input border border-border bg-white/85 px-4 py-3 font-semibold backdrop-blur hover:bg-white"><Landmark size={18} /> View portfolio</button>
              <button onClick={installApp} className="inline-flex items-center gap-2 rounded-input border border-border bg-white/85 px-4 py-3 font-semibold backdrop-blur hover:bg-white"><Smartphone size={18} /> Install app</button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {flow.map(([title, text, Icon]) => (
                <div key={title} className="rounded-card border border-border bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="grid h-9 w-9 place-items-center rounded-input bg-primary-light text-primary-dark shadow-sm"><Icon size={18} /></div>
                  <p className="mt-4 font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 md:p-7 lg:p-8">
            <div className="rounded-panel border border-white/70 bg-white/92 p-4 text-ink shadow-soft backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Live application preview</p>
                  <h3 className="mt-1 text-2xl font-semibold">Amina Wanjiku</h3>
                </div>
                <Badge>Eligible</Badge>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <VisualMetric label="Requested" value="KES 65,000" />
                <VisualMetric label="County" value="Nairobi" />
              </div>
              <div className="mt-5 rounded-card bg-white p-4 text-ink">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Cash-flow strength</p>
                  <span className="text-sm text-primary-dark">82%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-secondary">
                  <motion.div initial={{ width: 0 }} animate={{ width: "82%" }} className="h-2 rounded-full bg-primary" />
                </div>
                <div className="mt-4 grid grid-cols-6 items-end gap-2">
                  {[38, 52, 45, 68, 61, 76].map((height, index) => <span key={index} className="rounded-t bg-blue-light" style={{ height }} />)}
                </div>
              </div>
              <div className="mt-4 rounded-card border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-input bg-primary text-white"><Smartphone size={19} /></div>
                  <div>
                    <p className="text-sm font-semibold">M-Pesa receipts verified</p>
                    <p className="text-xs text-muted">Repeat supplier payments detected</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted">
                {["ID check", "Fairness", "Review"].map((item) => <div key={item} className="rounded-input bg-surface-secondary px-2 py-3">{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">{stats.map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="font-semibold">Application checklist</h3>
          <div className="mt-4 space-y-3">
            {["National ID or passport", "Safaricom phone number", "Business location and purpose", "M-Pesa or income summary"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3 text-sm"><CheckCircle2 className="text-primary" size={18} />{item}</div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature icon={Smartphone} title="M-Pesa aware" text="Cash-flow summaries support informal businesses." />
          <Feature icon={ShieldCheck} title="Consent led" text="Built around privacy and Kenya DPA controls." />
          <Feature icon={CalendarClock} title="Fast review" text="Human review is available for sensitive cases." />
        </div>
      </section>
    </div>
  );
}

function MobileBottomNav({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const mobilePages = pages.filter((item) => ["home", "apply", "overview", "audit"].includes(item.id));
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-panel border border-border bg-surface/95 p-2 shadow-soft backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
      {mobilePages.map((item) => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button key={item.id} type="button" onClick={() => setPage(item.id)} className={`grid min-h-14 place-items-center rounded-input px-1 text-[11px] font-semibold transition ${active ? "bg-primary text-white" : "text-muted hover:bg-surface-secondary"}`} aria-current={active ? "page" : undefined}>
            <Icon size={18} />
            <span className="mt-1 truncate">{item.label.replace(" for Loan", "")}</span>
          </button>
        );
      })}
    </nav>
  );
}

function VisualMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-card border border-border bg-surface-secondary p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-lg font-semibold text-ink">{value}</p></div>;
}

function LoanApplication() {
  const [form, setForm] = useState<ApplicationInput>(initialForm);
  const [details, setDetails] = useState<ApplicationDetails>(initialDetails);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationReference, setApplicationReference] = useState("");
  const [backendStatus, setBackendStatus] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const loanAmounts = [25000, 50000, 100000, 250000];
  const purposes = ["Buy stock", "Equipment", "Working capital", "Farm inputs"];
  const completeFields = [
    form.applicant_name,
    details.phone,
    details.national_id,
    form.location,
    form.business_type,
    String(form.loan_amount_kes),
    String(details.monthly_income),
    details.loan_purpose,
    form.mpesa_summary,
    form.seasonal_pattern
  ].filter((value) => value.trim().length > 0).length;
  const completion = Math.round((completeFields / 10) * 100);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSubmitted(false);
    setDraftStatus("");
    setBackendStatus(null);
    try {
      const data = await invokeAssessment(form).catch<AssessmentResponse>(() => ({ assessment: localAssessment(form) }));
      const assessmentResult = data.assessment;
      setAssessment(assessmentResult);
      setApplicationId(data.application_id ?? null);
      setApplicationReference(data.reference ?? `APP-${Math.floor(5000 + assessmentResult.credit_score)}`);
      if (data.application_id) {
        setBackendStatus({
          id: data.application_id,
          reference: data.reference ?? `APP-${String(data.application_id).slice(0, 8).toUpperCase()}`,
          applicant_name: form.applicant_name,
          loan_amount_kes: form.loan_amount_kes,
          decision: assessmentResult.decision,
          confidence: assessmentResult.confidence,
          recommended_amount: assessmentResult.recommended_amount,
          status: data.status ?? "assessed",
          created_at: data.created_at ?? new Date().toISOString()
        });
      }
      setSubmitted(true);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }

  async function refreshStatus() {
    if (!applicationId) {
      setDraftStatus("This demo assessment was completed locally. Connect Supabase to refresh server status.");
      return;
    }
    try {
      const status = await getApplicationStatus(applicationId);
      setBackendStatus(status);
      setDraftStatus(`Latest backend status: ${status.status.replace("_", " ")}.`);
    } catch (error) {
      setDraftStatus(error instanceof Error ? error.message : "Could not refresh application status.");
    }
  }

  const affordability = Math.min(92, Math.round((details.monthly_income / Math.max(form.loan_amount_kes, 1)) * 48));
  const monthlyEstimate = Math.max(1, Math.round((form.loan_amount_kes * 1.12) / Number.parseInt(details.repayment_period, 10)));

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
        <div className="mt-5 rounded-card bg-surface-secondary p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Application progress</span>
            <span className="text-primary-dark">{completion}% complete</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-surface">
            <motion.div animate={{ width: `${completion}%` }} className="h-2 rounded-full bg-primary" />
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Full Name" value={form.applicant_name} onChange={(v) => setForm({ ...form, applicant_name: v })} icon={IdCard} />
          <Input label="Phone Number" value={details.phone} onChange={(phone) => setDetails({ ...details, phone })} icon={Phone} />
          <Input label="National ID / Passport" value={details.national_id} onChange={(national_id) => setDetails({ ...details, national_id })} icon={IdCard} />
          <label className="block text-sm font-medium">County<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>{counties.map((county) => <option key={county}>{county}</option>)}</select></label>
          <Input label="Business Type" value={form.business_type} onChange={(v) => setForm({ ...form, business_type: v })} icon={Building2} />
          <label className="block text-sm font-medium">Business Age<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={details.business_age} onChange={(e) => setDetails({ ...details, business_age: e.target.value })}><option>Under 1 year</option><option>1 - 2 years</option><option>2 - 5 years</option><option>Over 5 years</option></select></label>
          <div>
            <Input label="Loan Amount Requested (KES)" type="number" value={String(form.loan_amount_kes)} onChange={(v) => setForm({ ...form, loan_amount_kes: Number(v) })} icon={WalletCards} />
            <div className="mt-2 flex flex-wrap gap-2">
              {loanAmounts.map((amount) => <button key={amount} type="button" onClick={() => setForm({ ...form, loan_amount_kes: amount })} className={`rounded-input border px-3 py-2 text-xs font-semibold transition ${form.loan_amount_kes === amount ? "border-primary bg-primary-light text-primary-dark" : "border-border hover:bg-surface-secondary"}`}>KES {amount.toLocaleString()}</button>)}
            </div>
          </div>
          <Input label="Average Monthly Income (KES)" type="number" value={String(details.monthly_income)} onChange={(monthly_income) => setDetails({ ...details, monthly_income: Number(monthly_income) })} icon={Banknote} />
          <label className="block text-sm font-medium">Repayment Period<select className="mt-2 w-full rounded-input border border-border px-3 py-3" value={details.repayment_period} onChange={(e) => setDetails({ ...details, repayment_period: e.target.value })}><option>3 months</option><option>6 months</option><option>9 months</option><option>12 months</option></select></label>
          <div>
            <Input label="Loan Purpose" value={details.loan_purpose} onChange={(loan_purpose) => setDetails({ ...details, loan_purpose })} />
            <div className="mt-2 flex flex-wrap gap-2">
              {purposes.map((purpose) => <button key={purpose} type="button" onClick={() => setDetails({ ...details, loan_purpose: purpose })} className={`rounded-input border px-3 py-2 text-xs font-semibold transition ${details.loan_purpose === purpose ? "border-primary bg-primary-light text-primary-dark" : "border-border hover:bg-surface-secondary"}`}>{purpose}</button>)}
            </div>
          </div>
          <div className="md:col-span-2"><TextArea label="M-Pesa / Bank Transaction Summary" value={form.mpesa_summary} onChange={(v) => setForm({ ...form, mpesa_summary: v })} /></div>
          <div className="md:col-span-2"><TextArea label="Seasonal Income Pattern" value={form.seasonal_pattern} onChange={(v) => setForm({ ...form, seasonal_pattern: v })} /></div>
          <div className="md:col-span-2 rounded-card bg-blue-light p-4 text-sm leading-6 text-blue">
            By submitting, the applicant consents to credit assessment, fraud checks, and responsible processing under the Kenya Data Protection Act, 2019.
          </div>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setDraftStatus(`Draft saved for ${form.applicant_name || "applicant"} at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-input border border-border px-4 py-3 font-semibold hover:bg-surface-secondary">
              <CheckCircle2 size={18} /> Save draft
            </button>
            <motion.button disabled={loading} whileTap={{ scale: 0.98 }} className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-input bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70">
              <FileText size={18} /> {loading ? "Reviewing application..." : "Submit loan application"}
            </motion.button>
          </div>
          {draftStatus && <p className="md:col-span-2 rounded-card bg-primary-light p-3 text-sm font-semibold text-primary-dark">{draftStatus}</p>}
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
          <div className="mt-4 rounded-card bg-amber-light p-4 text-sm leading-6 text-amber">
            Estimated monthly repayment is about KES {monthlyEstimate.toLocaleString()}, subject to final review and accepted terms.
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Decision Status</h2>
          {loading && <div className="mt-5 space-y-3">{["Validating identity", "Assessing cash flow", "Checking fairness rules", "Preparing recommendation"].map((stage) => <div key={stage} className="flex items-center gap-3 rounded-card bg-surface-secondary p-3"><Activity className="animate-pulse text-primary" size={18} />{stage}</div>)}</div>}
          {!loading && !assessment && <EmptyState title="No application submitted yet" />}
          {!loading && assessment && <AssessmentResult assessment={assessment} submitted={submitted} reference={applicationReference} backendStatus={backendStatus?.status} />}
          {!loading && assessment && <div className="mt-5 grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => { setAssessment(null); setSubmitted(false); setDraftStatus(""); setApplicationId(null); setBackendStatus(null); }} className="rounded-input border border-border px-4 py-3 font-semibold hover:bg-surface-secondary">Edit application</button><button type="button" onClick={refreshStatus} className="rounded-input border border-border px-4 py-3 font-semibold hover:bg-surface-secondary">Refresh status</button><button type="button" onClick={() => setDraftStatus("Officer callback requested. Our demo team will follow up by SMS.")} className="rounded-input bg-ink px-4 py-3 font-semibold text-white">Request callback</button></div>}
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
      const data = await invokeAssessment(form).catch<AssessmentResponse>(() => ({ assessment: localAssessment(form) }));
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

function AssessmentResult({ assessment, submitted = false, reference, backendStatus, applicationId, appeal, setAppeal, appealStatus, setAppealStatus }: { assessment: Assessment; submitted?: boolean; reference?: string; backendStatus?: string; applicationId?: string | null; appeal?: string; setAppeal?: (value: string) => void; appealStatus?: string; setAppealStatus?: (value: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
      {submitted && <p className="rounded-card bg-primary-light p-3 text-sm font-semibold text-primary-dark">Application received. Reference: {reference ?? `APP-${Math.floor(5000 + assessment.credit_score)}`}{backendStatus ? ` - Status: ${backendStatus.replace("_", " ")}` : ""}</p>}
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
  const [pageIndex, setPageIndex] = useState(0);
  const rows = useMemo(() => auditRecords.filter((row) => (status === "all" || row.status === status) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [query, status]);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const auditMetrics: [string, number][] = [["Total Events", auditRecords.length], ["Escalations", 3], ["Appeals Filed", 1], ["Successful Appeals", 1]];

  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4">{auditMetrics.map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div><Card><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="relative"><Search className="absolute left-3 top-3 text-muted" size={18} /><input aria-label="Search audit logs" value={query} onChange={(e) => { setQuery(e.target.value); setPageIndex(0); }} className="w-full rounded-input border border-border py-3 pl-10 pr-3 md:w-80" placeholder="Search events" /></div><label className="flex items-center gap-2 text-sm"><SlidersHorizontal size={18} />Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPageIndex(0); }} className="rounded-input border border-border px-3 py-2"><option value="all">All</option><option value="completed">Completed</option><option value="escalated">Escalated</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-muted"><tr><th className="py-3">Time</th><th>Event</th><th>Application</th><th>Agent</th><th>Status</th></tr></thead><tbody>{visibleRows.map((row) => <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border"><td className="py-4">{new Date(row.timestamp).toLocaleString()}</td><td>{row.event}</td><td>{row.application_id}</td><td>{row.agent}</td><td><Badge tone={row.status === "escalated" ? "amber" : row.status === "failed" ? "red" : "green"}>{row.status}</Badge></td></motion.tr>)}</tbody></table></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">Page {currentPage + 1} of {pageCount} - {rows.length} events</p><div className="flex justify-end gap-2"><button type="button" disabled={currentPage === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} className="rounded-input border border-border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45">Previous</button><button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} className="rounded-input bg-ink px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></div></Card></div>;
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
