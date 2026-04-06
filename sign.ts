import "dotenv/config";
import { createPublicClient, createWalletClient, http, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { randomBytes } from "crypto";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Hex;
const publicClient = createPublicClient({ chain: base, transport: http() });

const CMC_URL = "https://pro-api.coinmarketcap.com/x402/v3/cryptocurrency/quotes/latest";
const QUERY_PARAMS = { id: "1,1027", convert: "USD" };

const privateKey = process.env.PRIVATE_KEY as Hex;
if (!privateKey || privateKey === "0x_your_private_key_here") {
  console.error("Set PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

// Step 1: Call without payment, expect 402
async function probe(url: URL): Promise<{ x402Version: number; accepts: any[]; resource: any; extensions: any }> {
  console.log("--- Step 1: Probing (no payment) ---");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });

  if (res.status !== 402) {
    console.error(`Expected 402, got ${res.status}`);
    process.exit(1);
  }

  // v2: payment required info is in PAYMENT-REQUIRED header (base64 JSON); fall back to body
  const headerVal = res.headers.get("payment-required");
  const body = headerVal
    ? JSON.parse(Buffer.from(headerVal, "base64").toString("utf8"))
    : await res.json();

  console.log(`Got 402. x402Version: ${body.x402Version}`);
  console.log("Payment required:", JSON.stringify(body.accepts, null, 2));
  return body;
}

// Step 2: Sign payment from 402 response
async function sign(paymentRequired: { x402Version: number; accepts: any[]; resource: any; extensions: any }): Promise<string> {
  const offer = paymentRequired.accepts[0];
  if (!offer) throw new Error("No payment offer in 402 response");

  const { network, asset, payTo, amount, maxTimeoutSeconds, extra } = offer;

  const chainId = parseInt(network.split(":")[1], 10);
  const domain = {
    name: extra.name,
    version: extra.version,
    chainId,
    verifyingContract: asset as Hex,
  } as const;

  const now = Math.floor(Date.now() / 1000);
  const nonce = toHex(randomBytes(32)) as Hex;

  // authorization fields are decimal strings (per x402 reference implementation)
  const authorization = {
    from: account.address,
    to: payTo as string,
    value: amount,                               // decimal string
    validAfter: (now - 600).toString(),          // 10 min in past
    validBefore: (now + maxTimeoutSeconds).toString(),
    nonce,
  };

  console.log("\n--- Step 2: Signing ---");
  console.log("Signer:", account.address);
  console.log(`Amount: ${amount} (${Number(amount) / 1e6} USDC) -> ${payTo}`);
  console.log("Valid until:", new Date((now + maxTimeoutSeconds) * 1000).toISOString());

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "TransferWithAuthorization",
    message: {
      from: account.address,
      to: payTo as Hex,
      value: BigInt(amount),
      validAfter: BigInt(now - 600),
      validBefore: BigInt(now + maxTimeoutSeconds),
      nonce,
    },
  });

  // v2 payload: resource + accepted + extensions at top level
  const paymentPayload = {
    x402Version: paymentRequired.x402Version,
    resource: paymentRequired.resource,
    accepted: offer,
    extensions: paymentRequired.extensions,
    payload: {
      signature,
      authorization,
    },
  };

  const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
  console.log("Signature:", signature);
  return encoded;
}

// Step 3: Retry with PAYMENT-SIGNATURE header (v2)
async function fetchWithPayment(url: URL, paymentSignature: string) {
  console.log("\n--- Step 3: Retrying with PAYMENT-SIGNATURE ---");

  const res = await fetch(url.toString(), {
    headers: {
      "PAYMENT-SIGNATURE": paymentSignature,
      Accept: "application/json",
    },
  });

  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  console.log("Response headers:", JSON.stringify(headers, null, 2));

  const body = await res.json();

  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`HTTP ${res.status} - success`);
  console.log("\n--- CMC Response ---");
  console.log(JSON.stringify(body, null, 2));
}

async function checkUsdcBalance() {
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }],
    functionName: "balanceOf",
    args: [account.address],
  });
  const usdcAmount = Number(balance) / 1e6;
  console.log(`--- USDC Balance: ${usdcAmount} USDC (${balance} raw) ---`);
  if (balance < 10000n) {
    console.error(`Insufficient USDC: need 0.01, have ${usdcAmount}`);
    process.exit(1);
  }
}

async function main() {
  const url = new URL(CMC_URL);
  for (const [k, v] of Object.entries(QUERY_PARAMS)) url.searchParams.set(k, v);

  await checkUsdcBalance();
  const paymentRequired = await probe(url);
  const paymentSignature = await sign(paymentRequired);
  await fetchWithPayment(url, paymentSignature);
}

main().catch(console.error);
