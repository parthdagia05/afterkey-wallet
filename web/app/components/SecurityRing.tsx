"use client";

import { useState, useId } from "react";

interface SecurityRingProps {
  qorBalance: number;
  networkHealthy: boolean;
  pqcStatus: string;
  classicalStatus: string;
  dailySpent: number;
  dailyLimit: number;
  ruleCount: number;
}

const CX = 300, CY = 300;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: Math.round((CX + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((CY + r * Math.sin(rad)) * 100) / 100,
  };
}

function sectorPath(innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const s1 = polar(outerR, startDeg);
  const e1 = polar(outerR, endDeg);
  const s2 = polar(innerR, endDeg);
  const e2 = polar(innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function arcPath(r: number, startDeg: number, endDeg: number) {
  const s = polar(r, startDeg);
  const e = polar(r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const SEGMENTS = [
  {
    id: "ai", label: "AI INTELLIGENCE", labelAngle: 60,
    start: 4, end: 116, innerR: 130, outerR: 220,
    color: "#0097b2", fill: "#0097b2", fillOpacity: 0.18, strokeColor: "#00c4e6",
    dataLabel: "Intent Parsing", dataValue: "Qwen 27B",
    desc: "Natural language → structured intent. Never authorizes transactions independently.",
    stats: ["Model: Qwen 3.8-27B", "Provider: Groq", "Latency: <500ms", "Role: Parse only"],
  },
  {
    id: "policy", label: "POLICY ENGINE", labelAngle: 180,
    start: 124, end: 236, innerR: 130, outerR: 220,
    color: "#00b37e", fill: "#00b37e", fillOpacity: 0.15, strokeColor: "#00e6a7",
    dataLabel: "Deterministic Rules", dataValue: "4 Active",
    desc: "Pure code, zero AI. Checks every transaction against hard limits before signing.",
    stats: ["Max/tx: 50 QOR", "Daily: 200 QOR", "Cooldown: none", "Allowlist: off"],
  },
  {
    id: "crypto", label: "HYBRID SIGNING", labelAngle: 300,
    start: 244, end: 356, innerR: 130, outerR: 220,
    color: "#c47a1a", fill: "#c47a1a", fillOpacity: 0.18, strokeColor: "#ffa726",
    dataLabel: "Dual Signatures", dataValue: "Required",
    desc: "secp256k1 + ML-DSA-87. Both signatures must be present for chain acceptance.",
    stats: ["Classical: secp256k1", "Post-quantum: ML-DSA-87", "Chain enforced", "Quantum safe"],
  },
];

export default function SecurityRing({ qorBalance, networkHealthy, pqcStatus, classicalStatus, dailySpent, dailyLimit, ruleCount }: SecurityRingProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const uid = useId();
  const active = SEGMENTS.find((s) => s.id === activeId);

  return (
    <div className="relative select-none h-full w-full flex items-center justify-center">
      <svg viewBox="0 0 600 600" className="h-full w-auto max-w-full aspect-square" style={{ filter: "drop-shadow(0 0 40px rgba(0,180,216,0.06))" }}>
        <defs>
          {SEGMENTS.map((s) => (
            <radialGradient key={`rg-${s.id}`} id={`${uid}-rg-${s.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor={s.fill} stopOpacity={s.fillOpacity * 1.2} />
              <stop offset="100%" stopColor={s.fill} stopOpacity={s.fillOpacity * 0.3} />
            </radialGradient>
          ))}
          <radialGradient id={`${uid}-center`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#122a20" />
            <stop offset="100%" stopColor="#0a1210" />
          </radialGradient>
          <filter id={`${uid}-glow`}>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background rings */}
        <circle cx={CX} cy={CY} r={260} fill="none" stroke="#1a2535" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={240} fill="none" stroke="#141e2a" strokeWidth="0.3" />
        <circle cx={CX} cy={CY} r={220} fill="none" stroke="#1a2535" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={130} fill="none" stroke="#1a2535" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={110} fill="none" stroke="#141e2a" strokeWidth="0.3" />

        {/* Rotating orbital ring 1 */}
        <g className="animate-spin-slow" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <circle cx={CX} cy={CY} r={250} fill="none" stroke="#1e3040" strokeWidth="0.6" strokeDasharray="2 6" />
          {/* Orbital dots */}
          {[0, 90, 180, 270].map((a) => {
            const p = polar(250, a);
            return <circle key={a} cx={p.x} cy={p.y} r="2" fill="#1e3040" />;
          })}
        </g>

        {/* Rotating orbital ring 2 */}
        <g className="animate-spin-reverse" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <circle cx={CX} cy={CY} r={120} fill="none" stroke="#1a2838" strokeWidth="0.5" strokeDasharray="1 10" />
          {[45, 135, 225, 315].map((a) => {
            const p = polar(120, a);
            return <circle key={a} cx={p.x} cy={p.y} r="1.5" fill="#1a2838" />;
          })}
        </g>

        {/* Outer tick marks */}
        {Array.from({ length: 120 }).map((_, i) => {
          const angle = i * 3;
          const isMajor = i % 10 === 0;
          const isMid = i % 5 === 0;
          const inner = polar(224, angle);
          const outer = polar(isMajor ? 234 : isMid ? 230 : 227, angle);
          return (
            <line key={`t-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={isMajor ? "#2a3a50" : "#1a2535"} strokeWidth={isMajor ? 1 : 0.4} />
          );
        })}

        {/* Inner tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = i * 6;
          const inner = polar(126, angle);
          const outer = polar(130, angle);
          return (
            <line key={`ti-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="#1a2535" strokeWidth="0.4" />
          );
        })}

        {/* ===== FILLED SECTORS ===== */}
        {SEGMENTS.map((s) => {
          const isActive = activeId === s.id;
          return (
            <g key={s.id} onClick={() => setActiveId(isActive ? null : s.id)} style={{ cursor: "pointer" }}>
              {/* Filled sector */}
              <path d={sectorPath(s.innerR, s.outerR, s.start, s.end)}
                fill={`url(#${uid}-rg-${s.id})`}
                stroke={s.strokeColor}
                strokeWidth={isActive ? 1.5 : 0.5}
                strokeOpacity={isActive ? 0.8 : 0.3}
                style={{ transition: "all 0.4s ease" }} />

              {/* Bright outer edge arc */}
              <path d={arcPath(s.outerR, s.start, s.end)}
                fill="none" stroke={s.strokeColor}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeOpacity={isActive ? 0.9 : 0.5}
                filter={isActive ? `url(#${uid}-glow)` : undefined}
                style={{ transition: "all 0.4s ease" }} />

              {/* Inner edge arc */}
              <path d={arcPath(s.innerR, s.start, s.end)}
                fill="none" stroke={s.strokeColor} strokeWidth="0.5" strokeOpacity="0.2" />

              {/* Sector label (curved text position) */}
              {(() => {
                const lp = polar(175, s.labelAngle);
                return (
                  <text x={lp.x} y={lp.y - 12} textAnchor="middle" dominantBaseline="central"
                    fill={isActive ? s.strokeColor : "#4a6070"} fontSize="8" fontWeight="800"
                    letterSpacing="3" style={{ transition: "fill 0.3s", fontFamily: "var(--font-mono), monospace" }}>
                    {s.label}
                  </text>
                );
              })()}

              {/* Data inside sector */}
              {(() => {
                const dp = polar(175, s.labelAngle);
                return (
                  <>
                    <text x={dp.x} y={dp.y + 6} textAnchor="middle" fill={s.strokeColor} fontSize="13" fontWeight="700"
                      style={{ transition: "fill 0.3s" }}>
                      {s.id === "policy" ? `${ruleCount} Active` : s.dataValue}
                    </text>
                    <text x={dp.x} y={dp.y + 22} textAnchor="middle" fill="#5a7080" fontSize="8" fontWeight="500">
                      {s.dataLabel}
                    </text>
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* Radial divider lines between sectors */}
        {[0, 120, 240].map((a) => {
          const inner = polar(130, a);
          const outer = polar(220, a);
          return (
            <line key={`div-${a}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="#1a2535" strokeWidth="0.5" strokeDasharray="4 4" />
          );
        })}

        {/* ===== OUTER DATA NODES ===== */}
        {[
          { angle: 30, label: "AI Agent", value: "Online", color: "#00c4e6" },
          { angle: 90, label: "Balance", value: `${qorBalance.toFixed(1)} QOR`, color: "#00c4e6" },
          { angle: 150, label: "Policy", value: `${ruleCount} rules`, color: "#00e6a7" },
          { angle: 210, label: "Daily Used", value: `${dailySpent} / ${dailyLimit}`, color: "#00e6a7" },
          { angle: 270, label: "Classical", value: classicalStatus, color: "#ffa726" },
          { angle: 330, label: "PQC Key", value: pqcStatus, color: "#ffa726" },
        ].map((n, i) => {
          const p = polar(260, n.angle);
          const inner = polar(224, n.angle);
          return (
            <g key={i}>
              <line x1={inner.x} y1={inner.y} x2={p.x} y2={p.y}
                stroke="#1e2a3a" strokeWidth="0.5" strokeDasharray="3 3" />
              <circle cx={p.x} cy={p.y} r="16" fill="#0d1219" stroke="#1e2a3a" strokeWidth="0.5" />
              <circle cx={p.x} cy={p.y} r="3" fill={n.color} opacity="0.5">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </circle>
              <text x={p.x} y={p.y - 24} textAnchor="middle" fill="#5a7080" fontSize="7" fontWeight="600" letterSpacing="0.5">
                {n.label}
              </text>
              <text x={p.x} y={p.y + 28} textAnchor="middle" fill={n.color} fontSize="7.5" fontWeight="600">
                {n.value}
              </text>
            </g>
          );
        })}

        {/* ===== CENTER ===== */}
        <circle cx={CX} cy={CY} r={90} fill={`url(#${uid}-center)`} stroke="#1e2a3a" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={70} fill="#0c1618" stroke="#1a2838" strokeWidth="0.5" />

        {/* Center pulse ring */}
        <circle cx={CX} cy={CY} r={72} fill="none" stroke="#00e6a7" strokeWidth="0.8" opacity="0.2">
          <animate attributeName="r" values="68;78;68" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.05;0.25" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r={80} fill="none" stroke="#00b4d8" strokeWidth="0.4" opacity="0.1">
          <animate attributeName="r" values="78;88;78" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.03;0.12" dur="5s" repeatCount="indefinite" />
        </circle>

        {/* Center text */}
        <text x={CX} y={CY - 22} textAnchor="middle" fill="#4a6070" fontSize="7" fontWeight="700" letterSpacing="3"
          style={{ fontFamily: "var(--font-mono), monospace" }}>
          TOTAL DATA
        </text>
        <text x={CX} y={CY + 2} textAnchor="middle" fill="#d8e0ea" fontSize="18" fontWeight="800">
          {qorBalance.toFixed(2)}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fill="#6b7a8d" fontSize="8" fontWeight="500">
          QOR Balance
        </text>
        <text x={CX} y={CY + 34} textAnchor="middle" fill={networkHealthy ? "#00e6a7" : "#ff4d6a"} fontSize="7" fontWeight="600" letterSpacing="1">
          {"●"} {networkHealthy ? "SECURE" : "OFFLINE"}
        </text>
      </svg>

      {/* Detail panel */}
      {active && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-72 rounded-lg p-3.5 animate-fade-up"
          style={{
            background: "var(--bg-surface-2)",
            border: `1px solid ${active.strokeColor}40`,
            boxShadow: `0 0 30px ${active.fill}15`,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider font-mono" style={{ color: active.strokeColor }}>
              {active.label}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setActiveId(null); }}
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] hover:bg-[var(--bg-surface-3)]"
              style={{ color: "var(--text-3)" }}>
              ✕
            </button>
          </div>
          <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: "var(--text-2)" }}>{active.desc}</p>
          <div className="space-y-1">
            {active.stats.map((s, i) => {
              const [k, v] = s.split(": ");
              return (
                <div key={i} className="flex justify-between text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>{k}</span>
                  <span className="font-mono font-medium" style={{ color: "var(--text-2)" }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
