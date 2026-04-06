# x402 CoinMarketCap API Test

**Date:** 2026-04-06
**Repo:** https://github.com/hrk-tzp/cmc_testing_x402

Tested the CoinMarketCap quotes API (`/x402/v3/cryptocurrency/quotes/latest`) using the x402 v2 payment protocol. The client paid 0.01 USDC on Base mainnet by signing an ERC-3009 `TransferWithAuthorization` (EIP-712) and submitting it in the `PAYMENT-SIGNATURE` header.

**Signing wallet:** `0x74365d929A4841e13C39EABb287De60c2113296C`

The API returned HTTP 200 with live price data:

- **BTC:** $69,190.54 (+3.10% 24h)
- **ETH:** $2,130.34 (+3.51% 24h)
