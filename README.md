# AfterKey

a quantum-safe wallet that thinks before it signs

## what is this

afterkey is a post-quantum wallet on qorechain. it uses hybrid ml-dsa-87 signatures so even if your classical key gets leaked your funds stay safe. theres also an ai agent built in where you can just type what you want to do in plain english like "send 5 qor to alice" and it checks your safety rules first (spending limits, allowed addresses etc) before signing and sending. basically the wallet thinks before it moves your money.

## how to run

```bash
npm install
npm run setup-drill    # generate a fresh drill account
npm run register-pqc   # register the pq key (after funding from faucet)
npm run drill-tx       # send a hybrid-signed tx during the drill
npm run check-balance  # check any address balance
```

## built with

- qorechain typescript sdk
- qorechain-pqc for hybrid ml-dsa-87 signing
- policy engine for transaction safety rules
- ai agent layer for natural language transactions

## license

MIT
