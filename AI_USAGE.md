# AI Usage

## how ai is used in afterkey

afterkey uses claude (anthropic's api) as the brain of the wallet. instead of clicking buttons or building raw transactions, you just type what you want in plain english.

## the ai agent flow

1. user types something like "send 2 qor to qor1abc..."
2. claude parses the intent into a structured transaction: action, recipient, amount
3. the policy engine checks the transaction against safety rules (spend limits, allowed addresses, rate limits)
4. if approved, the wallet hybrid-signs with both classical (secp256k1) and post-quantum (ml-dsa-87) keys
5. the transaction is broadcast to qorechain testnet
6. every step is logged with full reasoning

## why this matters

the reasoning log is the key part. every decision the agent makes is transparent:
- what the user asked for
- how the ai interpreted it
- which policy rules passed or failed
- whether the transaction was approved or denied
- the final tx hash if it went through

this means you can audit every action the wallet took and understand why.

## ai tools used

- claude haiku 5.5 via anthropic api for intent parsing
- claude code for development assistance during the hackathon

## model choice

we use claude haiku 5.5 for the wallet agent because:
- its fast (wallet interactions should feel instant)
- its cheap (no point using a frontier model for parsing "send 5 qor to alice")
- its accurate enough for structured intent extraction
