"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Step {
  step: string;
  detail: string;
  passed?: boolean;
  severity?: "block" | "warn" | "info";
}

interface Preview {
  to: string;
  toName?: string;
  amount: number;
  network?: string;
  fee?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "chat" | "balance" | "pending" | "blocked" | "sent" | "rejected" | "failed" | "error";
  steps?: Step[];
  balances?: { denom: string; amount: string }[];
  preview?: Preview;
  pendingId?: string;
  txHash?: string;
  explorer?: string;
  displayedText?: string;
  resolved?: boolean;
}

const SUGGESTIONS = [
  "Check my balance",
  "Send 0.5 QOR to myself",
  "Send 999 QOR to myself",
  "What is ML-DSA-87?",
  "Show my contacts",
];

export default function Assistant({ onActivity }: { onActivity?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const typewriter = useCallback((id: string, text: string) => {
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setMessages((p) => p.map((m) => (m.id === id ? { ...m, displayedText: text.slice(0, i) } : m)));
        i += 2;
        setTimeout(tick, 8);
      } else {
        setMessages((p) => p.map((m) => (m.id === id ? { ...m, displayedText: text } : m)));
      }
    };
    tick();
  }, []);

  const pushAssistant = useCallback((data: any) => {
    const id = crypto.randomUUID();
    const content: string = data.error || data.message || "";
    const msg: Message = {
      id,
      role: "assistant",
      content,
      type: data.error ? "error" : data.type,
      steps: data.steps,
      balances: data.balances,
      preview: data.preview,
      pendingId: data.type === "pending" ? data.id : undefined,
      txHash: data.txHash,
      explorer: data.explorer,
      displayedText: "",
    };
    setMessages((p) => [...p, msg]);
    typewriter(id, content);
  }, [typewriter]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((p) => [...p, { id: crypto.randomUUID(), role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      pushAssistant(await res.json());
    } catch {
      pushAssistant({ error: "Connection failed." });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const decide = async (msgId: string, pendingId: string, decision: "approve" | "reject") => {
    setMessages((p) => p.map((m) => (m.id === msgId ? { ...m, resolved: true } : m)));
    setLoading(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingId, decision }),
      });
      pushAssistant(await res.json());
      onActivity?.();
    } catch {
      pushAssistant({ error: "Connection failed." });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll-thin px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: "var(--cyan-glow)", border: "1px solid rgba(0,180,216,0.3)" }}>
              <BoltIcon />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Talk to your wallet</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                AI parses · policy engine decides · you approve · hybrid signed
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:border-[var(--cyan)] hover:text-[var(--text)]"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageRow key={m.id} message={m} onDecide={decide} busy={loading} />
        ))}
        {loading && <TypingRow />}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 px-5 pb-5 pt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
          style={{ background: "var(--bg-surface-2)", border: `1px solid ${loading ? "var(--border)" : "var(--border-active)"}` }}>
          <input ref={inputRef} type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder='Try "send 2 qor to alice" or "save alice as qor1..."'
            disabled={loading}
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "var(--text)", caretColor: "var(--cyan)" }} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0"
            style={{
              background: loading || !input.trim() ? "var(--bg-surface-3)" : "var(--cyan)",
              color: loading || !input.trim() ? "var(--text-3)" : "#000",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= message ================= */

const BADGE: Record<string, { label: string; color: string; glow: string }> = {
  blocked:  { label: "BLOCKED BY POLICY", color: "var(--red)",   glow: "var(--red-glow)" },
  pending:  { label: "AWAITING APPROVAL", color: "var(--amber)", glow: "var(--amber-glow)" },
  sent:     { label: "SIGNED & BROADCAST", color: "var(--green)", glow: "var(--green-glow)" },
  rejected: { label: "CANCELLED",          color: "var(--text-2)", glow: "var(--bg-surface-3)" },
  failed:   { label: "BROADCAST FAILED",   color: "var(--red)",   glow: "var(--red-glow)" },
  error:    { label: "ERROR",              color: "var(--red)",   glow: "var(--red-glow)" },
};

function MessageRow({ message: m, onDecide, busy }: {
  message: Message;
  onDecide: (msgId: string, pendingId: string, d: "approve" | "reject") => void;
  busy: boolean;
}) {
  const isTx = ["pending", "blocked", "sent", "failed"].includes(m.type ?? "");
  const [showSteps, setShowSteps] = useState(isTx);
  const text = m.displayedText ?? m.content;
  const typing = text !== m.content;

  if (m.role === "user") {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[70%] px-4 py-2.5 rounded-xl rounded-br-sm text-[13px]"
          style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border-light)", color: "var(--text)" }}>
          {m.content}
        </div>
      </div>
    );
  }

  const badge = m.type ? BADGE[m.type] : undefined;
  const borderColor = badge ? `${badge.color}30` : "var(--border)";

  return (
    <div className="flex justify-start animate-fade-up">
      <div className="max-w-[88%] w-full">
        {badge && (
          <div className="inline-flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider"
            style={{ background: badge.glow, color: badge.color, border: `1px solid ${badge.color}30` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.color }} />
            {badge.label}
          </div>
        )}

        <div className="px-4 py-3 rounded-xl rounded-bl-sm text-[13px] leading-relaxed"
          style={{ background: "var(--bg-surface)", border: `1px solid ${borderColor}`, color: "var(--text)" }}>
          <span className="whitespace-pre-wrap">{text}</span>
          {typing && <span className="inline-block w-[2px] h-3.5 ml-0.5 align-middle" style={{ background: "var(--cyan)", animation: "pulse-soft 0.6s infinite" }} />}

          {m.balances && !typing && (
            <div className="mt-3 space-y-1.5 stagger">
              {m.balances.map((b) => (
                <div key={b.denom} className="flex justify-between items-center px-3 py-1.5 rounded-lg text-[11px]"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-3)" }}>
                    {b.denom === "uqor" ? "QOR" : b.denom.replace("erc20:", "").slice(0, 10) + "…"}
                  </span>
                  <span className="font-mono font-semibold" style={{ color: b.denom === "uqor" ? "var(--cyan)" : "var(--text)" }}>
                    {b.denom === "uqor" ? (parseInt(b.amount) / 1_000_000).toFixed(2) : parseInt(b.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {m.preview && !typing && (m.type === "pending" || m.type === "blocked") && (
            <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
              <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest" style={{ background: "var(--bg-surface-2)", color: "var(--text-3)" }}>
                TRANSACTION PREVIEW
              </div>
              <div className="px-3 py-2 space-y-1 text-[11px]" style={{ background: "var(--bg-surface)" }}>
                <Row k="Amount" v={`${m.preview.amount} QOR`} c="var(--text)" />
                <Row k="To" v={m.preview.toName ? `${m.preview.toName} · ${m.preview.to.slice(0, 14)}…` : m.preview.to} c="var(--text)" mono />
                {m.preview.network && <Row k="Network" v={m.preview.network} c="var(--text-2)" mono />}
                {m.preview.fee && <Row k="Fee" v={m.preview.fee} c="var(--text-2)" />}
                <Row k="Signatures" v="secp256k1 + ML-DSA-87" c="var(--amber)" mono />
              </div>
            </div>
          )}

          {m.type === "pending" && m.pendingId && !typing && (
            <div className="mt-3 flex items-center gap-2">
              {m.resolved ? (
                <span className="text-[10px]" style={{ color: "var(--text-3)" }}>decision submitted</span>
              ) : (
                <>
                  <button onClick={() => onDecide(m.id, m.pendingId!, "approve")} disabled={busy}
                    className="px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all disabled:opacity-40"
                    style={{ background: "var(--green)", color: "#000" }}>
                    APPROVE & SIGN
                  </button>
                  <button onClick={() => onDecide(m.id, m.pendingId!, "reject")} disabled={busy}
                    className="px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 hover:border-[var(--red)]"
                    style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border-light)" }}>
                    Reject
                  </button>
                  <span className="text-[10px] ml-1" style={{ color: "var(--text-3)" }}>expires in 5m</span>
                </>
              )}
            </div>
          )}

          {m.txHash && !typing && (
            <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: "var(--green-glow)", border: "1px solid rgba(0,230,167,0.2)" }}>
              <div className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "var(--green)" }}>TX HASH</div>
              <a href={m.explorer} target="_blank" rel="noreferrer"
                className="font-mono text-[10px] break-all hover:underline" style={{ color: "var(--text)" }}>
                {m.txHash}
              </a>
            </div>
          )}
        </div>

        {m.steps && m.steps.length > 0 && !typing && (
          <>
            <button onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1 mt-1.5 ml-1 text-[10px] font-medium transition-colors hover:text-[var(--cyan)]"
              style={{ color: "var(--text-3)" }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showSteps ? "rotate-90" : ""}`}><path d="M9 18l6-6-6-6" /></svg>
              {isTx ? "execution pipeline" : "reasoning"} · {m.steps.length} steps
            </button>
            {showSteps && (
              <div className="mt-2 ml-1 space-y-1 steps-stagger">
                {m.steps.map((s, i) => <StepRow key={i} s={s} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StepRow({ s }: { s: Step }) {
  const state = s.passed === undefined ? "info" : s.passed ? "pass" : s.severity === "block" ? "fail" : "warn";
  const color = state === "pass" ? "var(--green)" : state === "fail" ? "var(--red)" : state === "warn" ? "var(--amber)" : "var(--cyan)";
  const glow = state === "pass" ? "var(--green-glow)" : state === "fail" ? "var(--red-glow)" : state === "warn" ? "var(--amber-glow)" : "var(--cyan-glow)";
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center mt-0.5"
        style={{ background: glow, border: `1px solid ${color}40` }}>
        {state === "pass" && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>}
        {state === "fail" && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>}
        {state === "warn" && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M12 9v4m0 4h.01" /></svg>}
        {state === "info" && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
      </div>
      <div className="min-w-0">
        <span className="font-mono font-bold text-[10px]" style={{ color }}>{s.step}</span>
        <span className="mx-1" style={{ color: "var(--text-4)" }}>→</span>
        <span className="break-words" style={{ color: "var(--text-2)" }}>{s.detail}</span>
      </div>
    </div>
  );
}

function Row({ k, v, c, mono }: { k: string; v: string; c: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: "var(--text-3)" }}>{k}</span>
      <span className={`${mono ? "font-mono" : ""} font-medium text-right break-all`} style={{ color: c }}>{v}</span>
    </div>
  );
}

function TypingRow() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="px-4 py-3 rounded-xl rounded-bl-sm" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cyan)", animation: `typing-dot 1.4s infinite ${i * 0.15}s` }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>processing</span>
        </div>
      </div>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
