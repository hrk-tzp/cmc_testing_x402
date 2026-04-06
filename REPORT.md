# x402 CoinMarketCap API Test Report

**Date:** 2026-04-06
**Repo:** https://github.com/hrk-tzp/cmc_testing_x402

---

## What Was Tested

The CoinMarketCap cryptocurrency quotes API was accessed using the x402 v2 payment protocol, paying 0.01 USDC on Base mainnet per request.

**Endpoint:** `GET https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest?id=1,1027&convert=USD`

---

## Payment

| Field | Value |
|---|---|
| Protocol | x402 v2 |
| Network | Base mainnet (`eip155:8453`) |
| Token | USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |
| Amount | 0.01 USDC |
| Signing wallet | `0x74365d929A4841e13C39EABb287De60c2113296C` |
| Signature | `0xad027783...18181b` |

The wallet signed an ERC-3009 `TransferWithAuthorization` (EIP-712) and submitted it in the `PAYMENT-SIGNATURE` header. On success the server returned HTTP 200.

---

## Result

| Asset | Price (USD) | 24h Change | Market Cap |
|---|---|---|---|
| Bitcoin (BTC) | $69,190.54 | +3.10% | $1.38T |
| Ethereum (ETH) | $2,130.34 | +3.51% | $257B |

Response timestamp: `2026-04-06T02:30:55Z`
