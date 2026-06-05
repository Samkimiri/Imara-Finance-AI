import { useMemo, useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Activity, BadgeCheck, Banknote, ChevronLeft, ChevronRight,
  FileText, Gauge, History, Lock, Menu, Scale, Search, ShieldCheck, SlidersHorizontal, Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auditRecords, counties, segmentData } from "./lib/data";
import { localAssessment } from "./lib/mockAssessment";
import { invokeAssessment, submitAppeal, updateConsent } from "./lib/supabase";
import type { ApplicationInput, Assessment } from "./lib/types";

type Page = "overview" | "underwriting" | "agents" | "ethics" | "audit";

const pages: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "underwriting", label: "AI Underwriting", icon: Banknote },
  { id: "agents", label: "Agent Pipeline", icon: Activity },
  { id: "ethics", label: "Ethics & Consent", icon: ShieldCheck },
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.section whileHover={{ y: -2 }} className={`rounded-card border border-border bg-surface p-5 shadow-soft ${className}`}>{children}</motion.section>;
}

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "blue" | "amber" | "red" }) {
  const tones = {
    green: "bg-primary-light text-primary-dark",
    blue: "bg-blue-light text-blue",
    amber: "bg-amber-light text-amber",
    red: "bg-danger-light text-danger"
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Count({ value, suffix = "" }: { value: number; suffix?: string }) {
  return <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{value.toLocaleString()}{suffix}</motion.span>;
}

export function App() {
  const [page, setPage] = useState<Page>("overview");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface-secondary">
      <aside className={`fixed inset-y-0 left-0 z-20 hidden border-r border-border bg-surface p-4 transition-all duration-300 lg:block ${collapsed ? "w-20" : "w-72"}`} aria-label="Primary navigation">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-card bg-primary text-white font-semibold">IF</div>
            {!collapsed && <div><p className="font-semibold">Imara Finance AI</p><p className="text-xs text-muted">Responsible microloans</p></div>}
          </div>
          <button className="rounded-input p-2 hover:bg-surface-secondary" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="space-y-2">
          {pages.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} className={`flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium transition ${active ? "bg-primary-light text-primary-dark" : "text-muted hover:bg-surface-secondary hover:text-ink"}`} aria-current={active ? "page" : undefined}>
                <Icon size={18} /> {!collapsed && item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className={`transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
          <button className="rounded-input p-2 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <p className="text-sm text-muted">Nairobi responsible lending command center</p>
            <h1 className="text-xl font-semibold">{pages.find((item) => item.id === page)?.label}</h1>
          </div>
          <Badge tone="blue">Kenya DPA 2019 Ready</Badge>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="mx-auto max-w-7xl p-5">
            {page === "overview" && <Overview />}
            {page === "underwriting" && <Underwriting />}
            {page === "agents" && <Agents />}
            {page === "ethics" && <Ethics />}
            {page === "audit" && <Audit />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
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
    ["Communities", "143", Scale],
    ["Women-Owned Businesses", "11,860", BadgeCheck],
    ["Environment", "7,200 low-carbon loans", ShieldCheck]
  ];
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">{metrics.map(([label, value, tone]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold"><Count value={value} suffix={label.includes("Score") ? "%" : ""} /></p><Badge tone={tone}>Live monitored</Badge></Card>)}</div>
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3"><h2 className="font-semibold">Borrower Segment Distribution</h2><div className="mt-4 h-80"><ResponsiveContainer><BarChart data={segmentData} layout="vertical" margin={{ left: 24 }}><CartesianGrid stroke="#eef0f2" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Bar dataKey="applications" fill="#1D9E75" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="lg:col-span-2"><h2 className="font-semibold">HORIZON Impact Projection</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{impact.map(([label, value, Icon]) => <div key={label} className="rounded-card border border-border p-4"><Icon className="text-primary" size={20} /><p className="mt-4 text-sm text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div></Card>
    </div>
  </div>;
}

function Underwriting() {
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
    <Card><h2 className="font-semibold">Applicant Input</h2><form onSubmit={submit} className="mt-4 space-y-4">
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
      {!loading && assessment && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
        <div className="flex flex-wrap items-center gap-3"><Badge tone={assessment.decision === "Approved" ? "green" : assessment.decision === "Declined" ? "red" : "amber"}>{assessment.decision}</Badge><span className="text-sm text-muted">Recommended KES {assessment.recommended_amount.toLocaleString()}</span></div>
        <div className="grid gap-3 sm:grid-cols-2"><Score label="Credit Score" value={assessment.credit_score} max={850} /><Score label="Confidence" value={assessment.confidence} max={100} suffix="%" /></div>
        <div className="space-y-3">{Object.entries(assessment.factors).map(([label, value]) => <div key={label}><div className="flex justify-between text-sm"><span>{label}</span><span>{value}%</span></div><motion.div className="mt-2 h-2 rounded-full bg-surface-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-2 rounded-full bg-primary" /></motion.div></div>)}</div>
        <div><p className="text-sm font-semibold">Fairness Flags</p><div className="mt-2 flex flex-wrap gap-2">{assessment.fairness_flags.map((flag) => <Badge key={flag} tone="blue">{flag}</Badge>)}</div></div>
        <p className="rounded-card bg-surface-secondary p-4 text-sm leading-6 text-muted">{assessment.explanation}</p>
        {assessment.decision !== "Approved" && <div className="rounded-card border border-border p-4"><button className="font-semibold text-primary">File Appeal</button><textarea value={appeal} onChange={(e) => setAppeal(e.target.value)} placeholder="Add contextual repayment evidence or business records." className="mt-3 w-full rounded-input border border-border p-3" /><button type="button" onClick={async () => { if (!applicationId) { setAppealStatus("Demo appeal captured locally. Connect Supabase to save it."); return; } await submitAppeal({ application_id: applicationId, reason: appeal }); setAppealStatus("Appeal submitted and logged."); }} className="mt-3 rounded-input bg-ink px-4 py-2 text-white">Submit Appeal</button>{appealStatus && <p className="mt-2 text-sm text-muted">{appealStatus}</p>}</div>}
      </motion.div>}
    </Card>
  </div>;
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

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-medium">{label}<input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-input border border-border px-3 py-3 focus:border-primary" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium">{label}<textarea required value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-24 w-full rounded-input border border-border px-3 py-3 focus:border-primary" /></label>;
}

function Score({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  return <div className="mt-4"><div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span>{value}{suffix}</span></div><div className="mt-2 h-2 rounded-full bg-surface-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }} className="h-2 rounded-full bg-primary" /></div></div>;
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
