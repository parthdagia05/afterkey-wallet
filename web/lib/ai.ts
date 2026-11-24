import OpenAI from "openai";
import { getContacts } from "./store";
import { secret } from "./secrets";

export type Intent =
  | { action: "send"; to: string; amount: number }
  | { action: "balance" }
  | { action: "add_contact"; name: string; address: string }
  | { action: "list_contacts" }
  | { action: "history" }
  | { action: "chat"; reply: string };

async function systemPrompt() {
  const contacts = await getContacts();
  const contactList = contacts.length
    ? contacts.map((c) => `- ${c.name}`).join("\n")
    : "(none saved yet)";

  return `You are AfterKey, a post-quantum wallet assistant on QoreChain. You translate what the user says into a JSON intent. You never decide whether a transaction is allowed; a separate policy engine does that.

Respond with EXACTLY one JSON object and nothing else (no markdown, no backticks):

Send tokens:        {"action":"send","to":"<qor1 address OR a saved contact name>","amount":<number in QOR>}
Check balance:      {"action":"balance"}
Save a contact:     {"action":"add_contact","name":"<name>","address":"<qor1 address>"}
List contacts:      {"action":"list_contacts"}
Show history:       {"action":"history"}
Anything else:      {"action":"chat","reply":"<your answer in plain text>"}

Rules:
- Amounts are in QOR. "5 qor" means amount 5. Never convert to uqor.
- Addresses start with qor1. Never invent or guess an address.
- Saved contact names you may use in "to":
${contactList}
- If the user names a recipient that is not a saved contact and gives no address, respond with a chat reply asking for the address.
- For questions about post-quantum cryptography, ML-DSA-87, QoreChain or how this wallet works, answer helpfully in a chat reply (2-4 sentences).`;
}

export async function parseIntent(userInput: string): Promise<Intent> {
  const apiKey = await secret("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  const res = await client.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    max_tokens: 600,
    temperature: 0,
    messages: [
      { role: "system", content: await systemPrompt() },
      { role: "user", content: userInput },
    ],
  });

  const raw = res.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && typeof parsed.action === "string") return parsed as Intent;
  } catch {
    /* fall through */
  }
  return { action: "chat", reply: raw || "I didn't catch that. Try 'check my balance' or 'send 1 qor to <address>'." };
}
