"use client";

import { useEffect, useState } from "react";

interface Check { rule: string; passed: boolean; severity: string; detail: string }
interface Entry {
  id: string; timestamp: string; input: string; kind: string; status: string;
  to?: string; toName?: string; amount?: number; checks?: Check[]; txHash?: string; error?: string;
}
interface Summary { total: number; sent: number; blocked: number; rejected: number; dailySpent: number; dailyLimit: number }

const STATUS_COLOR: Record<string, string> = {
  sent: "var(--green)", blocked: "var(--red)", rejected: "var(--text-3)",
  failed: "var(--red)", pending: "var(--amber)", answered: "var(--text-3)",
};

export default function Transactions({ refreshKey }: { refreshKey: number }) {
  const [history, setHistory] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "send">("send");

  useEffect(() => {
    fetch("/api/history").then((r) => r.json()).then((d) => { setHistory(d.history ?? []); setSummary(d.summary ?? null); }).catch(() => {});
  }, [refreshKey]);

  const rows = filter === "send" ? history.filter((h) => h.kind === "send") : history;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 grid grid-cols-5 gap-3 px-5 py-4 border-b stagger" style={{ borderColor: "var(--border)" }}>
        <Stat label="Sent" value={summary?.sent ?? 0} color="var(--green)" />
        <Stat label="Blocked" value={summary?.blocked ?? 0} color="var(--red)" />
        <Stat label="Rejected" value={summary?.rejected ?? 0} color="var(--text-2)" />
        <Stat label="Spent today" value={`${summary?.dailySpent ?? 0} / ${summary?.dailyLimit ?? 200}`} color="var(--cyan)" unit="QOR" />
        <Stat label="All events" value={summary?.total ?? 0} color="var(--text-2)" />
      </div>

      <div className="shrink-0 flex items-center gap-1 px-5 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {(["send", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded text-[10px] font-medium"
            style={{
              background: filter === f ? "var(--bg-surface-3)" : "transparent",
              color: filter === f ? "var(--text)" : "var(--text-3)",
              border: filter === f ? "1px solid var(--border-light)" : "1px solid transparent",
            }}>
            {f === "send" ? "Transactions" : "All activity"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px]" style={{ color: "var(--text-3)" }}>
            Nothing yet. Ask the assistant to send something.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0" style={{ background: "var(--bg-surface)" }}>
              <tr style={{ color: "var(--text-3)" }}>
                <th className="text-left font-semibold tracking-wider px-5 py-2 text-[9px]">TIME</th>
                <th className="text-left font-semibold tracking-wider px-3 py-2 text-[9px]">STATUS</th>
                <th className="text-left font-semibold tracking-wider px-3 py-2 text-[9px]">REQUEST</th>
                <th className="text-right font-semibold tracking-wider px-3 py-2 text-[9px]">AMOUNT</th>
                <th className="text-left font-semibold tracking-wider px-3 py-2 text-[9px]">RECIPIENT</th>
                <th className="text-left font-semibold tracking-wider px-5 py-2 text-[9px]">TX HASH</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <RowGroup key={h.id} h={h} open={open === h.id} onToggle={() => setOpen(open === h.id ? null : h.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RowGroup({ h, open, onToggle }: { h: Entry; open: boolean; onToggle: () => void }) {
  const color = STATUS_COLOR[h.status] ?? "var(--text-3)";
  const t = new Date(h.timestamp);
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer transition-colors hover:bg-[var(--bg-surface-2)]"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-2)" }}>
        <td className="px-5 py-2.5 font-mono whitespace-nowrap" style={{ color: "var(--text-3)" }}>
          {t.toLocaleDateString(undefined, { month: "short", day: "numeric" })} {t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </td>
        <td className="px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 font-bold text-[9px] tracking-wider" style={{ color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {h.status.toUpperCase()}
          </span>
        </td>
        <td className="px-3 py-2.5 max-w-[260px] truncate" style={{ color: "var(--text)" }}>{h.input}</td>
        <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: h.amount ? "var(--text)" : "var(--text-4)" }}>
          {h.amount != null ? `${h.amount} QOR` : "—"}
        </td>
        <td className="px-3 py-2.5 font-mono">{h.toName ?? (h.to ? h.to.slice(0, 14) + "…" : "—")}</td>
        <td className="px-5 py-2.5 font-mono">
          {h.txHash ? (
            <a href={`https://scan-testnet.qore.host/tx/${h.txHash}`} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: "var(--cyan)" }}>
              {h.txHash.slice(0, 12)}…
            </a>
          ) : <span style={{ color: "var(--text-4)" }}>—</span>}
        </td>
      </tr>
      {open && h.checks && (
        <tr style={{ background: "var(--bg-surface)" }}>
          <td colSpan={6} className="px-5 py-3">
            <div className="grid grid-cols-2 gap-1.5 steps-stagger">
              {h.checks.map((c) => {
                const cc = c.passed ? "var(--green)" : c.severity === "block" ? "var(--red)" : "var(--amber)";
                return (
                  <div key={c.rule} className="flex items-start gap-2 px-2.5 py-1.5 rounded-md text-[10px]"
                    style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: cc }} />
                    <div><span className="font-mono font-bold" style={{ color: cc }}>{c.rule}</span>
                      <span style={{ color: "var(--text-2)" }}> · {c.detail}</span></div>
                  </div>
                );
              })}
              {h.error && <div className="col-span-2 text-[10px]" style={{ color: "var(--red)" }}>{h.error}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({ label, value, color, unit }: { label: string; value: string | number; color: string; unit?: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="text-[9px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold font-mono" style={{ color }}>{value}</span>
        {unit && <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{unit}</span>}
      </div>
    </div>
  );
}
