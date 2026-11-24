"use client";

import { useState, useEffect } from "react";
import SecurityRing from "./components/SecurityRing";
import Assistant from "./components/Assistant";
import Transactions from "./components/Transactions";
import Contacts from "./components/Contacts";

type View = "overview" | "assistant" | "transactions" | "contacts" | "security";

interface WalletData {
  address: string;
  qorBalance: number;
  balances: { denom: string; amount: string }[];
  network: { name: string; chainId: string; evmChainId: number; healthy: boolean };
  security: { classicalKey: string; classicalStatus: string; pqcAlgorithm: string; pqcStatus: string; hybridRequired: boolean };
  policy: { maxPerTx: number; dailyLimit: number; dailySpent: number; cooldownSeconds: number; allowListEnabled: boolean; velocity: string; anomalyMultiplier: number; ruleCount: number };
  activity: { contacts: number; sent: number; blocked: number; pending: number };
}

const NAV = [
  { id: "overview" as View, icon: GridIcon, label: "Overview" },
  { id: "assistant" as View, icon: BoltIcon, label: "AI Assistant" },
  { id: "transactions" as View, icon: ListIcon, label: "Transactions" },
  { id: "contacts" as View, icon: UsersIcon, label: "Contacts" },
  { id: "security" as View, icon: ShieldIcon, label: "Security" },
];

const TITLES: Record<View, string> = {
  overview: "Quantum-Safe Security",
  assistant: "AI Assistant",
  transactions: "Transactions",
  contacts: "Contacts",
  security: "Security Details",
};

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    fetch("/api/wallet").then((r) => r.json()).then(setWallet).catch(() => {});
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-14 shrink-0 flex flex-col items-center py-4 gap-1 border-r"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
          style={{ background: "var(--cyan-glow)", border: "1px solid rgba(0,180,216,0.25)" }}>
          <span className="text-sm">🔑</span>
        </div>

        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => setView(n.id)} title={n.label}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group"
              style={{
                background: active ? "var(--bg-surface-3)" : "transparent",
                color: active ? "var(--cyan)" : "var(--text-3)",
                border: active ? "1px solid var(--border-light)" : "1px solid transparent",
              }}>
              <n.icon />
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ background: "var(--cyan)" }} />}
              {/* Tooltip */}
              <div className="absolute left-12 px-2 py-1 rounded text-[10px] font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap"
                style={{ background: "var(--bg-surface-3)", color: "var(--text)", border: "1px solid var(--border-light)" }}>
                {n.label}
              </div>
            </button>
          );
        })}

        <div className="flex-1" />
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--bg-surface-3)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
          A
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 h-11 flex items-center justify-between px-5 border-b"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              {TITLES[view]}
            </h2>
            <div className="flex gap-1">
              {["Overview", "Details"].map((t, i) => (
                <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium cursor-default"
                  style={{
                    background: i === 0 ? "var(--bg-surface-3)" : "transparent",
                    color: i === 0 ? "var(--text)" : "var(--text-3)",
                    border: i === 0 ? "1px solid var(--border-light)" : "1px solid transparent",
                  }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-medium"
              style={{ color: wallet?.network.healthy ? "var(--green)" : "var(--text-3)" }}>
              <span className="relative flex h-1.5 w-1.5">
                {wallet?.network.healthy && <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--green)", animation: "ping-sm 2s infinite" }} />}
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: wallet?.network.healthy ? "var(--green)" : "var(--text-3)" }} />
              </span>
              {wallet?.network.healthy ? "Connected" : "Connecting..."}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
              {wallet?.network.chainId ?? "—"}
            </span>
          </div>
        </div>

        {/* View */}
        <div className="flex-1 overflow-hidden">
          {view === "overview" && <OverviewDashboard wallet={wallet} />}
          {view === "assistant" && <Assistant onActivity={refresh} />}
          {view === "transactions" && <Transactions refreshKey={refreshKey} />}
          {view === "contacts" && <Contacts onChange={refresh} />}
          {view === "security" && <SecurityView wallet={wallet} />}
        </div>
      </main>
    </div>
  );
}

/* ==================== OVERVIEW DASHBOARD ==================== */

function OverviewDashboard({ wallet }: { wallet: WalletData | null }) {
  const stats = [
    { label: "Balance", value: wallet ? `${wallet.qorBalance.toFixed(2)} QOR` : "—", color: "var(--cyan)" },
    { label: "Network", value: wallet?.network.healthy ? "Diana Testnet" : "Offline", color: "var(--green)" },
    { label: "PQC Keys", value: wallet?.security.pqcStatus === "registered" ? "ML-DSA-87" : "None", color: "var(--amber)" },
    { label: "Spent today", value: wallet ? `${wallet.policy.dailySpent} / ${wallet.policy.dailyLimit} QOR` : "—", color: "var(--text-2)" },
    { label: "Policy", value: wallet ? `${wallet.policy.ruleCount} rules · ${wallet.activity.blocked} blocked` : "—", color: "var(--text-2)" },
  ];

  return (
    <div className="h-full flex">
      {/* Center: stats bar + ring */}
      <div className="flex-1 flex flex-col items-center overflow-hidden">
        {/* Compact stats bar */}
        <div className="shrink-0 w-full flex items-center justify-center gap-6 px-6 py-3 border-b stagger"
          style={{ borderColor: "var(--border)" }}>
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-3)" }}>
                {s.label}
              </span>
              <span className="text-[12px] font-mono font-semibold" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Ring visualization — dominant */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
          <div className="h-full w-full">
            <SecurityRing
              qorBalance={wallet?.qorBalance ?? 0}
              networkHealthy={wallet?.network.healthy ?? false}
              pqcStatus={wallet?.security.pqcStatus ?? "unknown"}
              classicalStatus={wallet?.security.classicalStatus ?? "unknown"}
              dailySpent={wallet?.policy.dailySpent ?? 0}
              dailyLimit={wallet?.policy.dailyLimit ?? 200}
              ruleCount={wallet?.policy.ruleCount ?? 7}
            />
          </div>
        </div>
      </div>

      {/* Right panels */}
      <div className="w-56 shrink-0 p-3 space-y-2.5 border-l overflow-y-auto scroll-thin stagger"
        style={{ borderColor: "var(--border)" }}>
        <Panel title="QUANTUM SECURITY" icon={<ShieldIcon />} color="var(--green)">
          <PanelRow label="Algorithm" value="ML-DSA-87" color="var(--amber)" />
          <PanelRow label="Key Status" value={wallet?.security.pqcStatus ?? "—"} color="var(--green)" />
          <PanelRow label="Hybrid Mode" value={wallet?.security.hybridRequired ? "Required" : "—"} color="var(--green)" />
          <div className="mt-2 px-2 py-1.5 rounded-md text-[10px]"
            style={{ background: "var(--green-glow)", border: "1px solid rgba(0,230,167,0.15)", color: "var(--green)" }}>
            Both signatures required for every tx
          </div>
        </Panel>

        <Panel title="POLICY CONFIG" icon={<GridIcon />} color="var(--cyan)">
          <PanelRow label="Max / tx" value={`${wallet?.policy.maxPerTx ?? 50} QOR`} color="var(--text)" />
          <PanelRow label="Daily limit" value={`${wallet?.policy.dailyLimit ?? 200} QOR`} color="var(--text)" />
          <PanelRow label="Spent today" value={wallet ? `${wallet.policy.dailySpent} QOR` : "—"} color="var(--cyan)" />
          <PanelRow label="Velocity" value={wallet?.policy.velocity ?? "—"} color="var(--text-2)" />
          <PanelRow label="Anomaly" value={wallet ? `>${wallet.policy.anomalyMultiplier}x avg` : "—"} color="var(--text-2)" />
          <PanelRow label="Cooldown" value={!wallet || wallet.policy.cooldownSeconds === 0 ? "None" : `${wallet.policy.cooldownSeconds}s`} color="var(--text-2)" />
          <PanelRow label="Allowlist" value={wallet?.policy.allowListEnabled ? "On" : "Off"} color="var(--text-2)" />
        </Panel>

        <Panel title="CRYPTO KEYS" icon={<KeyIcon />} color="var(--amber)">
          <PanelRow label="Classical" value="secp256k1" color="var(--text)" />
          <PanelRow label="Status" value={wallet?.security.classicalStatus ?? "—"} color="var(--green)" />
          <div className="my-1.5 h-px" style={{ background: "var(--border)" }} />
          <PanelRow label="Post-Quantum" value="ML-DSA-87" color="var(--text)" />
          <PanelRow label="Status" value={wallet?.security.pqcStatus ?? "—"} color="var(--green)" />
        </Panel>

        <Panel title="WALLET" icon={<WalletIcon />} color="var(--text-2)">
          <div className="text-[10px] font-mono break-all leading-relaxed" style={{ color: "var(--text-3)" }}>
            {wallet?.address ?? "—"}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ==================== SECURITY VIEW ==================== */

function SecurityView({ wallet }: { wallet: WalletData | null }) {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4 overflow-y-auto h-full scroll-thin stagger">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Security Architecture</h3>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        AfterKey uses three independent security layers. The AI agent never authorizes transactions.
        The deterministic policy engine has final say. Hybrid cryptographic signing ensures quantum resistance.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { title: "AI Intelligence", color: "var(--cyan)", items: ["Qwen 27B on Groq", "Intent parsing only", "Never authorizes tx", "Latency < 500ms"] },
          { title: "Policy Engine", color: "var(--green)", items: ["No AI involved", "50 QOR max per tx", "200 QOR daily limit", "4 rules active"] },
          { title: "Hybrid Signing", color: "var(--amber)", items: ["secp256k1 classical", "ML-DSA-87 post-quantum", "Both required by chain", "Quantum resistant"] },
        ].map((s) => (
          <div key={s.title} className="rounded-lg p-3" style={{ background: "var(--bg-surface)", border: `1px solid var(--border)` }}>
            <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: s.color }}>{s.title}</div>
            <div className="space-y-1.5">
              {s.items.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-2)" }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: s.color, opacity: 0.6 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: "var(--text-2)" }}>TRANSACTION FLOW</div>
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          {["User Input", "AI Parse", "Policy Check", "Hybrid Sign", "Broadcast"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md font-medium"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                {step}
              </span>
              {i < 4 && <span style={{ color: "var(--text-4)" }}>→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== SHARED COMPONENTS ==================== */

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="text-[9px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold" style={{ color }}>{value}</span>
        <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{unit}</span>
      </div>
    </div>
  );
}

function Panel({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: "var(--text-3)" }}>{title}</span>
      </div>
      <div className="px-3 py-2.5 space-y-1">{children}</div>
    </div>
  );
}

function PanelRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

/* ==================== ICONS ==================== */

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 010-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" /><path d="M3 5v14a2 2 0 002 2h16v-5" /><path d="M18 12a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}
