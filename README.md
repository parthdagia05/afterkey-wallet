# AfterKey

a quantum-safe wallet that thinks before it signs

## what is this

afterkey is a post-quantum wallet on qorechain. it uses hybrid ml-dsa-87 signatures so even if your classical key gets leaked your funds stay safe. theres also an ai agent built in where you can just type what you want to do in plain english like "send 5 qor to alice" and it checks your safety rules first (spending limits, allowed addresses etc) before signing and sending. basically the wallet thinks before it moves your money.

## how it works

1. you type a request in plain english
2. the ai agent (claude) parses your intent
3. the policy engine checks it against your safety rules
4. if approved, the wallet hybrid-signs with both classical + post-quantum keys
5. transaction is broadcast to qorechain
6. every step is logged with full reasoning

## setup

```bash
npm install
```

create a `.env` file:
```
MAIN_MNEMONIC=your twelve words here
GROQ_API_KEY=your-groq-key
```

get a free groq api key at console.groq.com

## usage

### interactive wallet (ai agent)
```bash
npm run wallet
```

type things like:
- "check my balance"
- "send 1 qor to qor1abc..."
- "log" to see reasoning history
- "quit" to exit and save the log

### web dashboard

live at https://afterkey.mrsmoreapp.workers.dev

the web app lives in `web/`. its a nextjs command center with the ai assistant, a live security ring showing the three layers, transactions history and a contact book. sends go through the same policy engine, then you get a preview and have to click approve before anything gets signed. signing is real hybrid secp256k1 + ml-dsa-87 and you get the tx hash back.

```bash
cd web
npm install
cp .dev.vars.example .dev.vars   # add GROQ_API_KEY and MAIN_MNEMONIC
npm run dev                      # local
npx opennextjs-cloudflare build && npx wrangler deploy   # cloudflare
```

secrets on cloudflare go in with `npx wrangler secret put GROQ_API_KEY` and `npx wrangler secret put MAIN_MNEMONIC`. history and contacts are stored in cloudflare kv.

policy rules in the web app (7 total): max per tx, daily limit, allowlist, cooldown, velocity (max 3 sends per 5 min), anomaly (warns if > 3x your average send), new recipient (warns).

### drill scripts
```bash
npm run setup-drill    # generate a fresh drill account
npm run register-pqc   # register the pq key (after funding from faucet)
npm run drill-tx       # send a hybrid-signed tx during the drill
npm run check-balance  # check any address balance
```

## project structure

```
src/
  keys/          key generation (classical + pq from mnemonic)
  signing/       hybrid signing via qorechain sdk
  policy/        rules engine (spend limits, allowlists, cooldowns)
  agent/         ai layer (claude parses intent, checks policy, signs)
  scripts/       drill and utility scripts
contracts/       pq-gated vault (solidity)
```

## built with

- qorechain typescript sdk
- qorechain-pqc for hybrid ml-dsa-87 signing
- llama 3.3 70b on groq for natural language intent parsing (free)
- policy engine for transaction safety rules

## license

MIT
