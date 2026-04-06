# x402 CoinMarketCap API Test

**Date:** 2026-04-06
**Repo:** https://github.com/hrk-tzp/cmc_testing_x402

Tested the CoinMarketCap quotes API (`/x402/v3/cryptocurrency/quotes/latest`) using the x402 v2 payment protocol. The client paid 0.01 USDC on Base mainnet by signing an ERC-3009 `TransferWithAuthorization` (EIP-712) and submitting it in the `PAYMENT-SIGNATURE` header.

**Signing wallet:** `0x74365d929A4841e13C39EABb287De60c2113296C`

---

## Step 1 — 402 Payment Required

Initial request with no payment header. Server responded with HTTP 402 and the payment requirements.

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "payTo": "0x271189c860DB25bC43173B0335784aD68a680908",
      "maxTimeoutSeconds": 30,
      "amount": "10000",
      "extra": {
        "name": "USD Coin",
        "version": "2",
        "x402PaymentConfigId": "699dbab79f32ffde650104aa"
      }
    }
  ]
}
```

The server specifies it accepts 0.01 USDC (`10000` in 6-decimal units) on Base mainnet, paid to `0x2711...0908` within 30 seconds.

---

## Step 2 — Sign

Signed an EIP-712 `TransferWithAuthorization` using the payment requirements above.

**Signature:**
```
0xad027783ab2efe1b5747bcb42513b1a2c0c58913e65d35e4f58b339aa2af7f22
2c9690f570611444b866370f02d325e9533675d90e1068c4487b1ae4f22418181b
```

The signed payload was base64-encoded and sent as the `PAYMENT-SIGNATURE` header on retry.

**Unique identifier — Authorization Nonce**

Rather than a transaction hash, this payment is uniquely identified by its **nonce**: a random 32-byte hex value included in the signed EIP-712 message. The nonce serves two purposes:

1. **Uniqueness** — it makes every authorization distinct, even if the same wallet pays the same amount to the same address twice.
2. **Replay protection** — when the facilitator submits the `transferWithAuthorization` call on-chain, the USDC contract records `authorizationState[from][nonce] = true`. Any attempt to reuse the same signature is rejected by the contract.

The combination of **`from` address + `nonce`** is the on-chain fingerprint for this specific payment — equivalent in function to a transaction hash for identifying it.

---

## Step 3 — 200 OK with Price Data

Retry with `PAYMENT-SIGNATURE` header. Server responded HTTP 200 with live market data.

```json
{
  "status": {
    "timestamp": "2026-04-06T02:30:55.191Z",
    "error_code": "0",
    "elapsed": 1025,
    "credit_count": 1
  },
  "data": [
    {
      "id": 1,
      "name": "Bitcoin",
      "symbol": "BTC",
      "cmc_rank": 1,
      "circulating_supply": 20012046,
      "max_supply": 21000000,
      "quote": [
        {
          "symbol": "USD",
          "price": 69190.54197898404,
          "volume_24h": 26852571612.40,
          "percent_change_24h": 3.09990908,
          "market_cap": 1384644308848.36,
          "market_cap_dominance": 58.4421,
          "last_updated": "2026-04-06T02:29:00.000Z"
        }
      ]
    },
    {
      "id": 1027,
      "name": "Ethereum",
      "symbol": "ETH",
      "cmc_rank": 2,
      "circulating_supply": 120691214.83,
      "max_supply": null,
      "quote": [
        {
          "symbol": "USD",
          "price": 2130.3430008487708,
          "volume_24h": 11938808637.07,
          "percent_change_24h": 3.51444865,
          "market_cap": 257113684780.74,
          "market_cap_dominance": 10.8521,
          "last_updated": "2026-04-06T02:28:00.000Z"
        }
      ]
    }
  ]
}
```

Live prices at time of request: **BTC $69,190.54** (+3.10% 24h) and **ETH $2,130.34** (+3.51% 24h).
