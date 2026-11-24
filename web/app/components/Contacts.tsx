"use client";

import { useEffect, useState } from "react";

interface Contact { name: string; address: string; addedAt: string }

export default function Contacts({ onChange }: { onChange?: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts ?? [])).catch(() => {});
  }, []);

  const add = async () => {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { setError(d.error); return; }
    setContacts(d.contacts); setName(""); setAddress(""); onChange?.();
  };

  const remove = async (n: string) => {
    const res = await fetch("/api/contacts", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    const d = await res.json();
    setContacts(d.contacts ?? []); onChange?.();
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin p-5 max-w-3xl">
      <div className="rounded-lg p-4 mb-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "var(--text-3)" }}>ADD CONTACT</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (e.g. alice)"
            className="w-40 px-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-light)", color: "var(--text)" }} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="qor1..."
            className="flex-1 px-3 py-2 rounded-lg text-[12px] font-mono outline-none"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-light)", color: "var(--text)" }} />
          <button onClick={add} disabled={saving || !name || !address}
            className="px-4 py-2 rounded-lg text-[11px] font-bold disabled:opacity-40"
            style={{ background: "var(--cyan)", color: "#000" }}>
            Save
          </button>
        </div>
        {error && <div className="mt-2 text-[10px]" style={{ color: "var(--red)" }}>{error}</div>}
        <div className="mt-2 text-[10px]" style={{ color: "var(--text-3)" }}>
          Saved contacts can be used by name in the assistant: “send 2 qor to alice”. With the allowlist on, only these addresses can receive funds.
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-2 text-[9px] font-bold tracking-widest border-b" style={{ color: "var(--text-3)", borderColor: "var(--border)" }}>
          CONTACTS · {contacts.length}
        </div>
        {contacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px]" style={{ color: "var(--text-3)" }}>No contacts yet.</div>
        ) : (
          <div className="stagger">
            {contacts.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "var(--cyan-glow)", color: "var(--cyan)", border: "1px solid rgba(0,180,216,0.25)" }}>
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{c.name}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: "var(--text-3)" }}>{c.address}</div>
                </div>
                <button onClick={() => remove(c.name)} className="text-[10px] px-2 py-1 rounded hover:text-[var(--red)]" style={{ color: "var(--text-3)" }}>
                  remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
