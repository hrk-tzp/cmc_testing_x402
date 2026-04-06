# x402 Protocol Testing Report — CoinMarketCap API

**Date:** 2026-04-06
**Repo:** https://github.com/hrk-tzp/cmc_testing_x402

---

## Overview

This report documents a successful end-to-end test of the x402 payment protocol (version 2) against the CoinMarketCap cryptocurrency quotes API. The test implemented the full x402 flow from scratch in TypeScript using viem for EIP-712 signing.

---

## API Under Test

| Field | Value |
|---|---|
| Endpoint | `https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest` |
| Method | `GET` |
| Query params | `id=1,1027&convert=USD` |
| Protocol | x402 v2 |
| Network | Base mainnet (`eip155:8453`) |

---

## Payment Details

| Field | Value |
|---|---|
| Asset | USDC on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |
| Amount | 10000 raw units (0.01 USDC) |
| Pay-to address | `0x271189c860DB25bC43173B0335784aD68a680908` |
| Signing wallet | `0x74365d929A4841e13C39EABb287De60c2113296C` |
| Wallet USDC balance | 0.99 USDC |
| Max timeout | 30 seconds |
| Payment config ID | `699dbab79f32ffde650104aa` |

---

## Flow

### Step 1 — Probe (no payment)

A `GET` request was sent to the endpoint with no payment headers. The server responded with HTTP `402 Payment Required` and a `PAYMENT-REQUIRED` header containing the payment requirements (base64-encoded JSON):

```json
{
  "scheme": "exact",
  "network": "eip155:8453",
  "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "payTo": "0x271189c860DB25bC43173B0335784aD68a680908",
  "maxTimeoutSeconds": 30,
  "extra": {
    "name": "USD Coin",
    "version": "2",
    "x402PaymentConfigId": "699dbab79f32ffde650104aa"
  },
  "amount": "10000"
}
```

### Step 2 — Sign

An EIP-712 `TransferWithAuthorization` (ERC-3009) signature was constructed from the 402 requirements and signed with the wallet private key:

- **EIP-712 domain:** USDC on Base mainnet (name: "USD Coin", version: "2", chainId: 8453)
- **Primary type:** `TransferWithAuthorization`
- **Valid window:** `validAfter = now - 600`, `validBefore = now + 30`
- **Nonce:** random 32-byte hex

The signed payload was base64-encoded and sent in the `PAYMENT-SIGNATURE` header on retry.

**EIP-712 Signature:**
```
0xad027783ab2efe1b5747bcb42513b1a2c0c58913e65d35e4f58b339aa2af7f222c9690f570611444b866370f02d325e9533675d90e1068c4487b1ae4f22418181b
```

### Step 3 — Authenticated Request

The original request was retried with the `PAYMENT-SIGNATURE` header. The server responded with HTTP `200 OK`.

---

## Response from CoinMarketCap

Timestamp: `2026-04-06T02:30:55.191Z` | Elapsed: 1025ms

### Bitcoin (BTC) — CMC Rank #1

| Metric | Value |
|---|---|
| Price (USD) | $69,190.54 |
| Market cap | $1,384,644,308,848 |
| 24h volume | $26,852,571,612 |
| 24h change | +3.10% |
| 7d change | +3.77% |
| Circulating supply | 20,012,046 BTC |
| Max supply | 21,000,000 BTC |
| Dominance | 58.44% |

### Ethereum (ETH) — CMC Rank #2

| Metric | Value |
|---|---|
| Price (USD) | $2,130.34 |
| Market cap | $257,113,684,780 |
| 24h volume | $11,938,808,637 |
| 24h change | +3.51% |
| 7d change | +5.85% |
| Circulating supply | 120,691,214 ETH |
| Max supply | Unlimited |
| Dominance | 10.85% |

---

## Technical Notes

- **Protocol version:** x402 v2 — uses `PAYMENT-SIGNATURE` header (v1 used `X-PAYMENT`)
- **Signing standard:** ERC-3009 `TransferWithAuthorization` via EIP-712
- **v2 payload structure:** includes `resource`, `accepted`, and `extensions` fields at the top level alongside `payload`
- **`validAfter`:** set to `now - 600` (10 minutes in the past) per the reference implementation, not `0`
- **Authorization values:** serialized as decimal strings in JSON
- **Nonce:** cryptographically random 32-byte hex value per request

---

## Implementation

Built in TypeScript using:
- `viem` — EIP-712 signing and on-chain USDC balance check
- `dotenv` — private key loading
- `tsx` — TypeScript execution

Source: [`sign.ts`](./sign.ts)
