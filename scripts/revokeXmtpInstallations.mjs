// scripts/revokeXmtpInstallations.mjs
//
// Lists all XMTP installations registered to your wallet on the dev network,
// then revokes all installations except ONE (the current/newest if no keeper
// is specified). Frees slots when you hit the 10/10 installations-per-inbox
// limit.
//
// Prereq (one-time):
//   cd xao-cult
//   npm install --save-dev @xmtp/node-sdk viem
//
// Usage:
//   PRIVATE_KEY=0x... node scripts/revokeXmtpInstallations.mjs
//   PRIVATE_KEY=0x... node scripts/revokeXmtpInstallations.mjs --list-only
//   PRIVATE_KEY=0x... node scripts/revokeXmtpInstallations.mjs --keep <installationId>

import "dotenv/config";
import { Client } from "@xmtp/node-sdk";
import { privateKeyToAccount } from "viem/accounts";

const XMTP_ENV = process.env.XMTP_ENV || "dev"; // must match the app's env: "dev"

function parseArgs(argv) {
  const args = { listOnly: false, keep: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list-only") args.listOnly = true;
    else if (a === "--keep") args.keep = argv[++i];
  }
  return args;
}

async function main() {
  const argv = parseArgs(process.argv);
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Set PRIVATE_KEY=0x... (same wallet you use in the app).");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  console.log("Wallet:", account.address);
  console.log("Env:   ", XMTP_ENV);

  // node-sdk signer shape
  const signer = {
    type: "EOA",
    getIdentifier: async () => ({
      identifier: account.address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message) => {
      const sig = await account.signMessage({ message });
      // Hex string → Uint8Array
      return new Uint8Array(Buffer.from(sig.slice(2), "hex"));
    },
  };

  console.log("\nCreating XMTP client (this uses a fresh installation slot too)…");
  const client = await Client.create(signer, { env: XMTP_ENV });
  console.log("InboxId:        ", client.inboxId);
  console.log("Installation:   ", client.installationId);

  // Fetch the current installation state for this inbox.
  const inboxState = await client.preferences.inboxState(true);
  const installations = inboxState.installations || [];
  console.log(`\nInstallations on network: ${installations.length}\n`);
  for (const inst of installations) {
    const mark = inst.id === client.installationId ? "  (this one)" : "";
    const ts = inst.clientTimestampNs ? new Date(Number(inst.clientTimestampNs / 1_000_000n)).toISOString() : "?";
    console.log(`  - ${inst.id}   ts=${ts}${mark}`);
  }

  if (argv.listOnly) {
    console.log("\n--list-only: not revoking anything.");
    return;
  }

  const keeper = argv.keep || client.installationId;
  const toRevoke = installations.filter((i) => i.id !== keeper).map((i) => i.id);

  if (toRevoke.length === 0) {
    console.log("\nNothing to revoke — only one installation on this inbox.");
    return;
  }

  console.log(`\nRevoking ${toRevoke.length} installation(s), keeping ${keeper}`);

  // node-sdk exposes revokeAllOtherInstallations on the client.
  await client.revokeAllOtherInstallations();

  console.log("Done. Re-fetching state for verification…");
  const after = await client.preferences.inboxState(true);
  console.log(`Remaining installations: ${(after.installations || []).length}`);
  for (const inst of (after.installations || [])) {
    console.log(`  - ${inst.id}`);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err?.message || err);
  process.exit(1);
});
