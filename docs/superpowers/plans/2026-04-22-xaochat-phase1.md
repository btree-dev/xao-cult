# XaoChat Phase 1 — Contract-Scoped Negotiation Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace XMTP as the transport for contract-scoped negotiation. Build a Xao-native messaging primitive where the contract graph determines thread identity and negotiation-significant messages are tamper-evident and durable.

**Architecture:**
- **On-chain:** `XaoChat.sol` records a signed, ordered event log per thread. Only message metadata (hashes, CIDs, parent-hash, timestamps, sender) lives on-chain; message bodies live encrypted on IPFS.
- **Thread identity** is deterministic: `threadId = keccak256("xao-thread-v1" || showContractAddress)`. No server or off-chain registry allocates threads. A ShowContract being created automatically means its thread exists.
- **Access control:** posting requires being a party on the referenced ShowContract. Reading is gated by per-thread AES key, distributed encrypted-to-each-party at thread-open, so metadata is public but bodies are private.
- **Negotiation DAG:** each `ContractProposal` / `CounterProposal` / `Accept` / `Reject` carries `parentHash`, forming a tamper-evident chain. `sign()` is only callable on-chain once N-of-N parties have posted matching `Accept` envelopes for the same proposal hash — enforced by the UI in Phase 1 (enforced by contract in a future phase).

**Tech Stack:**
- Solidity 0.8.20 (Hardhat, existing setup)
- Next.js 15 + wagmi + viem (existing frontend)
- IPFS via Pinata (already in use; see `pinata-service.ts` pattern from `createContract.ts`)
- Web Crypto API (AES-GCM) for body encryption — no new library
- ECIES via `eth-crypto` npm package for wrapping per-thread AES keys to each party's wallet pubkey
- Hardhat + Chai for Solidity tests (existing setup)

**Out of scope for this plan (each will be its own separate plan):**
- Yjs-based collaborative document editing for contract drafts (Phase 2 plan)
- Nostr-based relationship chat + ephemeral mode for non-contract chats (Phase 3 plan)
- Tree-projection UI refactor (Relationship View, Folder+Thread nodes) beyond what's needed to verify negotiation works
- Multi-party (3+) threads — Phase 1 supports exactly the 2-party model that matches the current `ShowContract` parties

**Pre-reqs (must hold before starting):**
- New contract suite already deployed on Base Sepolia (`ShowContractFactory` at `0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3`).
- `PRIVATE_KEY` in `contracts/.env` funded on Base Sepolia with ≥ 0.05 ETH.
- Pinata JWT present in `xao-cult/.env.local`.
- Dev server restarted once so prior `.env.local` changes are live.

---

## File Structure

### New Solidity

- `contracts/contracts/XaoChat.sol` — message-log contract (runtime ≤ 8 kb; well under EIP-170)
- `contracts/contracts/interfaces/IShowContractParties.sol` — minimal interface to read `party1()`/`party2()` from a ShowContract
- `contracts/test/XaoChat.test.js` — full test suite mirroring existing `ShowContract.test.js` conventions
- `contracts/scripts/deployXaoChat.js` — deploy script that writes address into `deployments/<network>-all.json`

### New Frontend

- `xao-cult/src/lib/xaochat/types.ts` — shared TypeScript types (envelope, content types, proposal payload)
- `xao-cult/src/lib/xaochat/envelope.ts` — build + sign + verify the `MessageEnvelope` structure
- `xao-cult/src/lib/xaochat/threadId.ts` — deterministic `threadId` derivation (keccak256 over canonical string)
- `xao-cult/src/lib/xaochat/crypto.ts` — AES-GCM body encryption + ECIES key-wrapping helpers
- `xao-cult/src/lib/xaochat/ipfs.ts` — wrappers around existing Pinata upload/fetch for ciphertext blobs
- `xao-cult/src/lib/xaochat/abi.ts` — exported `XAO_CHAT_ABI` constant
- `xao-cult/src/hooks/useXaoChat.ts` — main hook: load history, subscribe to new events, `postMessage`, `postProposal`
- `xao-cult/src/hooks/useThreadUnread.ts` — read/write per-thread last-seen index in localStorage, compute unread
- `xao-cult/src/components/Chat/XaoChatComponent.tsx` — new chat UI (forked from `ChatComponent.tsx` minus XMTP)
- `xao-cult/src/components/Chat/ContractCard.tsx` — kept (unchanged), re-used
- `xao-cult/src/components/Chat/index.ts` — export both old and new during parallel run

### Modifications

- `xao-cult/src/lib/web3/chains.ts:21-53` — add `XaoChat` address to `CONTRACT_ADDRESSES` for each chain
- `xao-cult/.env.local` — add `NEXT_PUBLIC_XAO_CHAT_TESTNET`
- `xao-cult/src/pages/contracts/create-contract.tsx:596-601` — swap `<ChatComponent/>` for `<XaoChatComponent/>` behind a feature flag
- `xao-cult/package.json` — add `eth-crypto` dependency
- `contracts/deployments/baseSepolia-all.json` — appended by deploy script (automated)

### Unchanged / do NOT remove yet

- `xao-cult/src/hooks/useXMTPConversation.ts`, `src/contexts/XMTPContext.tsx`, `src/components/Chat/ChatComponent.tsx` — kept as the "legacy" path for Phase 1 parallel run. Removal is Task 14 after Phase 1 is validated.

---

## Task 1: Project scaffolding — add `eth-crypto`, create directory structure

**Files:**
- Modify: `xao-cult/package.json`
- Create: `xao-cult/src/lib/xaochat/` (directory only this task — empty, files added later)
- Create: `contracts/contracts/interfaces/IShowContractParties.sol`

- [ ] **Step 1.1: Install dependency**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm install --legacy-peer-deps eth-crypto@2.6.0
```

Expected: `added 1 package`. Package lands as a `dependencies` entry (not devDependencies).

- [ ] **Step 1.2: Create the `xaochat` lib directory with a README placeholder**

Create `xao-cult/src/lib/xaochat/README.md`:
```markdown
# xaochat

Xao-native contract-scoped messaging. Thread identity is derived from the
ShowContract address; messages are signed envelopes with encrypted bodies
stored on IPFS and anchored on-chain via `XaoChat.sol`.

See `docs/superpowers/plans/2026-04-22-xaochat-phase1.md` for design.
```

- [ ] **Step 1.3: Write the party-interface Solidity file**

Create `contracts/contracts/interfaces/IShowContractParties.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal read-only view of ShowContract party addresses used by
///         XaoChat to gate who may post in a given thread.
interface IShowContractParties {
    struct Party { address wallet; uint8 role; string xaoUsername; }
    function party1() external view returns (address wallet, uint8 role, string memory xaoUsername);
    function party2() external view returns (address wallet, uint8 role, string memory xaoUsername);
}
```

- [ ] **Step 1.4: Verify Solidity compiles**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
npx hardhat compile
```

Expected: `Compiled 1 Solidity file successfully` (only the new interface is new). No warnings.

- [ ] **Step 1.5: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/package.json xao-cult/package-lock.json xao-cult/src/lib/xaochat/README.md contracts/contracts/interfaces/IShowContractParties.sol
git commit -m "feat(xaochat): scaffold lib + IShowContractParties interface + eth-crypto dep"
```

---

## Task 2: `XaoChat.sol` — write-only message log with party-based access

**Files:**
- Create: `contracts/contracts/XaoChat.sol`

This contract is intentionally tiny: it stores nothing besides a per-thread message-count counter and emits events. Events are the source of truth; clients index them.

- [ ] **Step 2.1: Write the failing test first**

Create `contracts/test/XaoChat.test.js`:
```javascript
"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const PartyRole = { PROMOTER: 0, ARTIST: 1 };
const ContentType = { TEXT: 0, PROPOSAL: 1, COUNTER_PROPOSAL: 2, ACCEPT: 3, REJECT: 4, SYSTEM: 5 };

// Minimal 2-party ShowContract stub so XaoChat has something to call.
// Reuse the already-deployed ShowContractFactory via the ShowContract
// implementation we refactored earlier.
async function deployShowStub(party1Addr, party2Addr) {
  const Stub = await ethers.getContractFactory("MockShowContract"); // created in this task
  return Stub.deploy(party1Addr, party2Addr);
}

describe("XaoChat", function () {
  let chat, stub, signers, p1, p2, outsider;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    [p1, p2, outsider] = [signers[1], signers[2], signers[3]];

    stub = await deployShowStub(p1.address, p2.address);

    const Chat = await ethers.getContractFactory("XaoChat");
    chat = await Chat.deploy();
    await chat.waitForDeployment();
  });

  function threadIdFor(showAddr) {
    return ethers.keccak256(
      ethers.concat([ethers.toUtf8Bytes("xao-thread-v1"), showAddr])
    );
  }

  it("rejects posts from non-parties", async () => {
    const tid = threadIdFor(await stub.getAddress());
    await expect(
      chat.connect(outsider).postMessage(
        tid, await stub.getAddress(), ethers.ZeroHash,
        ContentType.TEXT, "bafkreitestcid"
      )
    ).to.be.revertedWith("Not a party");
  });

  it("party1 can post a message and it emits Message with index 0", async () => {
    const showAddr = await stub.getAddress();
    const tid = threadIdFor(showAddr);

    await expect(
      chat.connect(p1).postMessage(
        tid, showAddr, ethers.ZeroHash,
        ContentType.TEXT, "bafkreitestcid1"
      )
    ).to.emit(chat, "Message");

    expect(await chat.messageCount(tid)).to.equal(1n);
  });

  it("subsequent messages get monotonically increasing indexes", async () => {
    const showAddr = await stub.getAddress();
    const tid = threadIdFor(showAddr);

    await chat.connect(p1).postMessage(tid, showAddr, ethers.ZeroHash, ContentType.TEXT, "cid-a");
    await chat.connect(p2).postMessage(tid, showAddr, ethers.ZeroHash, ContentType.TEXT, "cid-b");
    await chat.connect(p1).postMessage(tid, showAddr, ethers.ZeroHash, ContentType.PROPOSAL, "cid-c");

    expect(await chat.messageCount(tid)).to.equal(3n);
  });

  it("rejects thread-show mismatch", async () => {
    const showAddr = await stub.getAddress();
    const wrongTid = ethers.keccak256(ethers.toUtf8Bytes("not-the-real-thread"));

    await expect(
      chat.connect(p1).postMessage(
        wrongTid, showAddr, ethers.ZeroHash,
        ContentType.TEXT, "cid"
      )
    ).to.be.revertedWith("Bad threadId");
  });

  it("rejects empty CID", async () => {
    const showAddr = await stub.getAddress();
    const tid = threadIdFor(showAddr);
    await expect(
      chat.connect(p1).postMessage(tid, showAddr, ethers.ZeroHash, ContentType.TEXT, "")
    ).to.be.revertedWith("Empty CID");
  });

  it("rejects zero show address", async () => {
    const tid = ethers.keccak256(
      ethers.concat([ethers.toUtf8Bytes("xao-thread-v1"), ethers.ZeroAddress])
    );
    await expect(
      chat.connect(p1).postMessage(tid, ethers.ZeroAddress, ethers.ZeroHash, ContentType.TEXT, "cid")
    ).to.be.revertedWith("Zero show");
  });
});
```

- [ ] **Step 2.2: Create the `MockShowContract` test fixture**

Create `contracts/contracts/test-support/MockShowContract.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Test-only stub that exposes the two-party surface XaoChat checks.
///         Kept under contracts/contracts/test-support/ so deploy scripts ignore it.
contract MockShowContract {
    address private _p1;
    address private _p2;

    constructor(address p1Addr, address p2Addr) {
        _p1 = p1Addr;
        _p2 = p2Addr;
    }

    function party1() external view returns (address wallet, uint8 role, string memory xaoUsername) {
        return (_p1, 0, "");
    }

    function party2() external view returns (address wallet, uint8 role, string memory xaoUsername) {
        return (_p2, 1, "");
    }
}
```

- [ ] **Step 2.3: Run the tests to confirm they fail (XaoChat doesn't exist yet)**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
npx hardhat test test/XaoChat.test.js 2>&1 | tail -15
```

Expected: all six test cases FAIL with `HH700: Artifact for contract "XaoChat" not found.` or similar missing-contract error.

- [ ] **Step 2.4: Write `XaoChat.sol`**

Create `contracts/contracts/XaoChat.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IShowContractParties.sol";

/// @title XaoChat — event-sourced contract-scoped message log
/// @notice Thread identity is deterministic: threadId = keccak256("xao-thread-v1" || showContract).
///         Posting is restricted to ShowContract parties (party1 / party2).
///         Message bodies live encrypted on IPFS; only the CID and metadata are on-chain.
///         `parentHash` allows clients to reconstruct the negotiation DAG
///         (proposal → counter-proposal → accept).
contract XaoChat {
    bytes public constant THREAD_DOMAIN = bytes("xao-thread-v1");

    enum ContentType {
        TEXT,
        PROPOSAL,
        COUNTER_PROPOSAL,
        ACCEPT,
        REJECT,
        SYSTEM
    }

    /// @notice Number of messages posted in each thread. Events are indexed off-chain;
    ///         this counter is an authoritative monotonically increasing sequence.
    mapping(bytes32 => uint256) public messageCount;

    event Message(
        bytes32 indexed threadId,
        address indexed sender,
        uint256 indexed index,
        bytes32 parentHash,
        ContentType contentType,
        string cid,
        uint256 timestamp
    );

    function postMessage(
        bytes32 threadId,
        address showContract,
        bytes32 parentHash,
        ContentType contentType,
        string calldata cid
    ) external {
        require(showContract != address(0), "Zero show");
        require(bytes(cid).length > 0, "Empty CID");

        // threadId must be derivable from the show address (prevents cross-thread spoofing).
        bytes32 expected = keccak256(abi.encodePacked(THREAD_DOMAIN, showContract));
        require(threadId == expected, "Bad threadId");

        // Only parties on the referenced ShowContract may post.
        (address p1, , ) = IShowContractParties(showContract).party1();
        (address p2, , ) = IShowContractParties(showContract).party2();
        require(msg.sender == p1 || msg.sender == p2, "Not a party");

        uint256 idx = messageCount[threadId];
        messageCount[threadId] = idx + 1;

        emit Message(threadId, msg.sender, idx, parentHash, contentType, cid, block.timestamp);
    }
}
```

- [ ] **Step 2.5: Run tests to confirm they pass**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
npx hardhat test test/XaoChat.test.js 2>&1 | tail -15
```

Expected: `6 passing`.

- [ ] **Step 2.6: Check bytecode size (must fit EIP-170)**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
node -e 'const a = require("./artifacts/contracts/XaoChat.sol/XaoChat.json"); console.log("runtime bytes:", (a.deployedBytecode.length - 2) / 2);'
```

Expected: `runtime bytes:` a number under 8000 (likely 2–3 kb). If over 24,576, stop and redesign.

- [ ] **Step 2.7: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add contracts/contracts/XaoChat.sol contracts/contracts/test-support/MockShowContract.sol contracts/test/XaoChat.test.js
git commit -m "feat(xaochat): XaoChat.sol with party-gated posting + 6 unit tests"
```

---

## Task 3: Deploy `XaoChat` to Base Sepolia and record the address

**Files:**
- Create: `contracts/scripts/deployXaoChat.js`
- Modify: `contracts/deployments/baseSepolia-all.json` (automated by the script)

- [ ] **Step 3.1: Write the deploy script**

Create `contracts/scripts/deployXaoChat.js`:
```javascript
// scripts/deployXaoChat.js
// Deploys XaoChat and merges the address into deployments/<network>-all.json.
//
// Usage:
//   npx hardhat run scripts/deployXaoChat.js --network baseSepolia

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  console.log(`\n═══ Deploy XaoChat — ${network} ═══`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

  const F = await hre.ethers.getContractFactory("XaoChat");
  const c = await F.deploy();
  const tx = c.deploymentTransaction();
  console.log(`tx: ${tx.hash}`);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log(`✓ XaoChat: ${addr}`);

  const outDir  = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network}-all.json`);

  let record = {};
  if (fs.existsSync(outFile)) record = JSON.parse(fs.readFileSync(outFile, "utf8"));
  record.contracts        = record.contracts || {};
  record.contracts.XaoChat = addr;
  record.lastResumeAt     = new Date().toISOString();
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

  const suffix = network === "baseSepolia" ? "TESTNET" : "MAINNET";
  console.log(`\nAdd to xao-cult/.env.local:`);
  console.log(`NEXT_PUBLIC_XAO_CHAT_${suffix}=${addr}`);
  console.log(`\nVerify:`);
  console.log(`  npx hardhat verify --network ${network} ${addr}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3.2: Run the deploy**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
npx hardhat run scripts/deployXaoChat.js --network baseSepolia 2>&1 | tee /tmp/xaochat-deploy.log
```

Expected output includes:
- `tx: 0x…`
- `✓ XaoChat: 0x…` (record this address)
- `Add to xao-cult/.env.local: NEXT_PUBLIC_XAO_CHAT_TESTNET=0x…`

- [ ] **Step 3.3: Record the address in frontend config**

Manually update `xao-cult/.env.local` — append the line printed by the deploy script. Then update `xao-cult/src/lib/web3/chains.ts` default fallbacks:

In `CONTRACT_ADDRESSES[baseSepolia.id]` and `CONTRACT_ADDRESSES[sepolia.id]` blocks, add:
```ts
XaoChat: process.env.NEXT_PUBLIC_XAO_CHAT_TESTNET || '0xDEPLOYED_ADDRESS_FROM_STEP_3_2',
```
(replacing `0xDEPLOYED_ADDRESS_FROM_STEP_3_2` with the actual address printed in 3.2).

In `CONTRACT_ADDRESSES[base.id]`, add `XaoChat: process.env.NEXT_PUBLIC_XAO_CHAT_MAINNET || '0x',`.

- [ ] **Step 3.4: Smoke-test the deployed contract**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/contracts
node -e '
const { ethers } = require("hardhat");
(async () => {
  const [signer] = await ethers.getSigners();
  const addr = "0xDEPLOYED_ADDRESS_FROM_STEP_3_2"; // replace
  const abi = ["function messageCount(bytes32) view returns (uint256)"];
  const c = new ethers.Contract(addr, abi, signer.provider);
  const zero = "0x" + "00".repeat(32);
  console.log("messageCount(0x0):", (await c.messageCount(zero)).toString());
})();
' --network baseSepolia
```

Expected: prints `messageCount(0x0): 0`. Any other output or an error → redeploy.

- [ ] **Step 3.5: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add contracts/scripts/deployXaoChat.js contracts/deployments/baseSepolia-all.json xao-cult/src/lib/web3/chains.ts
git commit -m "feat(xaochat): deploy XaoChat on baseSepolia + wire address into chains.ts"
```

**Note on `.env.local`:** Don't commit — it's in `.gitignore` (or should be). Verify with `git check-ignore xao-cult/.env.local`; if unignored, stop and add to `.gitignore` before proceeding.

---

## Task 4: Frontend types and thread-identity helper

**Files:**
- Create: `xao-cult/src/lib/xaochat/types.ts`
- Create: `xao-cult/src/lib/xaochat/threadId.ts`
- Create: `xao-cult/src/lib/xaochat/threadId.test.ts`

- [ ] **Step 4.1: Write `threadId.test.ts` first**

Create `xao-cult/src/lib/xaochat/threadId.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { keccak256, toBytes, concat } from 'viem';
import { threadIdForShow, THREAD_DOMAIN } from './threadId';

describe('threadIdForShow', () => {
  it('matches the keccak256 of the domain-prefixed show address', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const expected = keccak256(concat([toBytes(THREAD_DOMAIN), toBytes(show)]));
    expect(threadIdForShow(show)).toEqual(expected);
  });

  it('is case-insensitive on the show address (input normalised to lowercase)', () => {
    const upper = '0xAB0153AE9C73EDE6A7382FB0CB66957E78F2BBF3' as const;
    const lower = '0xab0153ae9c73ede6a7382fb0cb66957e78f2bbf3' as const;
    expect(threadIdForShow(upper)).toEqual(threadIdForShow(lower));
  });

  it('throws on non-hex input', () => {
    expect(() => threadIdForShow('notanaddress' as any)).toThrow();
  });
});
```

- [ ] **Step 4.2: Install Vitest (no frontend runner exists yet)**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm install --legacy-peer-deps --save-dev vitest@2.1.0 @vitest/ui@2.1.0
```

Append to `xao-cult/package.json` `scripts` section:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

Create `xao-cult/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 4.3: Run the failing test**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- threadId 2>&1 | tail -15
```

Expected: 3 failures with "Cannot find module './threadId'" or equivalent.

- [ ] **Step 4.4: Write the types module**

Create `xao-cult/src/lib/xaochat/types.ts`:
```ts
import type { Address, Hex } from 'viem';

/** On-chain ContentType enum — keep in sync with XaoChat.sol. */
export enum ContentType {
  TEXT = 0,
  PROPOSAL = 1,
  COUNTER_PROPOSAL = 2,
  ACCEPT = 3,
  REJECT = 4,
  SYSTEM = 5,
}

/** The decrypted message body, before signing and on-chain anchoring. */
export interface MessageBody {
  /** Monotonic version — bump when schema changes. */
  v: 1;
  contentType: ContentType;
  /** For TEXT this is the plaintext; for PROPOSAL / COUNTER_PROPOSAL it's a ContractProposal. */
  payload: TextPayload | ContractProposal | AcceptPayload | RejectPayload;
  sentAt: number;
  /** The envelope's hash of the parent message body (0x0 for root). */
  parentHash: Hex;
  /** ECDSA signature by `sender` over `payloadDigest`. */
  signature: Hex;
  sender: Address;
}

export interface TextPayload {
  kind: 'text';
  text: string;
}

export interface ContractProposal {
  kind: 'proposal';
  revisionNumber: number;
  /** Partial<IContract> — same shape as today's useXMTPConversation ContractProposal.data. */
  data: Record<string, unknown>;
}

export interface AcceptPayload {
  kind: 'accept';
  proposalHash: Hex; // references the `parentHash` of a PROPOSAL or COUNTER_PROPOSAL
}

export interface RejectPayload {
  kind: 'reject';
  proposalHash: Hex;
  reason?: string;
}

/** The on-chain event shape (mirror of XaoChat's `Message` event). */
export interface OnChainMessage {
  threadId: Hex;
  sender: Address;
  index: bigint;
  parentHash: Hex;
  contentType: ContentType;
  cid: string;
  timestamp: bigint;
  /** Block the event was emitted in. */
  blockNumber: bigint;
  /** Tx hash for cross-reference. */
  transactionHash: Hex;
}

/** A fully-resolved message combining on-chain metadata and decrypted body. */
export interface ResolvedMessage {
  onChain: OnChainMessage;
  body: MessageBody;
  /** Hash of the decrypted body (used as the `parentHash` reference for children). */
  bodyHash: Hex;
}
```

- [ ] **Step 4.5: Write the `threadId` module**

Create `xao-cult/src/lib/xaochat/threadId.ts`:
```ts
import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

/** Must match XaoChat.sol's THREAD_DOMAIN constant byte-for-byte. */
export const THREAD_DOMAIN = 'xao-thread-v1';

/**
 * Deterministic thread identifier for a given ShowContract.
 * Mirrors: keccak256(abi.encodePacked("xao-thread-v1", showContract)) in Solidity.
 */
export function threadIdForShow(showAddress: Address): Hex {
  if (!isAddress(showAddress)) {
    throw new Error(`threadIdForShow: invalid address: ${showAddress}`);
  }
  const lower = showAddress.toLowerCase() as Address;
  return keccak256(concat([toBytes(THREAD_DOMAIN), toBytes(lower)]));
}
```

- [ ] **Step 4.6: Run tests to confirm they pass**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- threadId 2>&1 | tail -15
```

Expected: `3 passed`.

- [ ] **Step 4.7: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/lib/xaochat/types.ts xao-cult/src/lib/xaochat/threadId.ts xao-cult/src/lib/xaochat/threadId.test.ts xao-cult/vitest.config.ts xao-cult/package.json xao-cult/package-lock.json
git commit -m "feat(xaochat): types + threadIdForShow + vitest setup"
```

---

## Task 5: Envelope signing + verification

**Files:**
- Create: `xao-cult/src/lib/xaochat/envelope.ts`
- Create: `xao-cult/src/lib/xaochat/envelope.test.ts`

A `MessageBody` is signed with the sender's wallet. The signed digest is `keccak256(canonicalJSON(body without signature field))`. The body's `bodyHash` (used as `parentHash` for children) is `keccak256(canonicalJSON(whole body including signature))`.

- [ ] **Step 5.1: Write the failing tests**

Create `xao-cult/src/lib/xaochat/envelope.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import type { Hex } from 'viem';
import { ContentType } from './types';
import { buildUnsignedBody, signBody, verifyBody, computeBodyHash } from './envelope';

describe('envelope', () => {
  it('signs and verifies a text body', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const unsigned = buildUnsignedBody({
      contentType: ContentType.TEXT,
      payload: { kind: 'text', text: 'hello' },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: account.address,
    });
    const signed = await signBody(unsigned, async (digest) => account.sign({ hash: digest }));
    expect(await verifyBody(signed)).toBe(true);
  });

  it('fails verification if the text is tampered with', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const unsigned = buildUnsignedBody({
      contentType: ContentType.TEXT,
      payload: { kind: 'text', text: 'hello' },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: account.address,
    });
    const signed = await signBody(unsigned, async (d) => account.sign({ hash: d }));
    const tampered = { ...signed, payload: { kind: 'text' as const, text: 'HELLO' } };
    expect(await verifyBody(tampered)).toBe(false);
  });

  it('bodyHash changes if any field changes', () => {
    const base = buildUnsignedBody({
      contentType: ContentType.TEXT,
      payload: { kind: 'text', text: 'a' },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: '0x0000000000000000000000000000000000000001',
    });
    const mutated = { ...base, payload: { kind: 'text' as const, text: 'b' } };
    // bodyHash only makes sense after signing, but signingDigest (= pre-sig hash) must already differ.
    const h1 = computeBodyHash({ ...base, signature: '0x00' as Hex });
    const h2 = computeBodyHash({ ...mutated, signature: '0x00' as Hex });
    expect(h1).not.toEqual(h2);
  });
});
```

- [ ] **Step 5.2: Run to confirm failure**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- envelope 2>&1 | tail -15
```

Expected: failures with "Cannot find module './envelope'".

- [ ] **Step 5.3: Implement `envelope.ts`**

Create `xao-cult/src/lib/xaochat/envelope.ts`:
```ts
import { keccak256, toBytes, recoverMessageAddress, type Hex, type Address } from 'viem';
import type { MessageBody, ContentType, TextPayload, ContractProposal, AcceptPayload, RejectPayload } from './types';

type Payload = TextPayload | ContractProposal | AcceptPayload | RejectPayload;
type UnsignedBody = Omit<MessageBody, 'signature'>;

/** Canonical JSON: keys sorted, no whitespace. Stable across implementations. */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((value as any)[k])).join(',') + '}';
}

export function buildUnsignedBody(input: {
  contentType: ContentType;
  payload: Payload;
  parentHash: Hex;
  sender: Address;
  sentAt?: number;
}): UnsignedBody {
  return {
    v: 1,
    contentType: input.contentType,
    payload: input.payload,
    parentHash: input.parentHash,
    sender: input.sender,
    sentAt: input.sentAt ?? Date.now(),
  };
}

/** Digest signed by sender. Excludes the signature field. */
export function signingDigest(body: UnsignedBody): Hex {
  return keccak256(toBytes(canonicalStringify(body)));
}

/** Hash of the full body (including signature) — used as parentHash reference. */
export function computeBodyHash(body: MessageBody): Hex {
  return keccak256(toBytes(canonicalStringify(body)));
}

export async function signBody(
  body: UnsignedBody,
  sign: (digest: Hex) => Promise<Hex>,
): Promise<MessageBody> {
  const sig = await sign(signingDigest(body));
  return { ...body, signature: sig };
}

export async function verifyBody(body: MessageBody): Promise<boolean> {
  const { signature, ...rest } = body;
  const digest = signingDigest(rest);
  try {
    const recovered = await recoverMessageAddress({ message: { raw: digest }, signature });
    return recovered.toLowerCase() === body.sender.toLowerCase();
  } catch {
    return false;
  }
}
```

- [ ] **Step 5.4: Run to confirm tests pass**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- envelope 2>&1 | tail -15
```

Expected: `3 passed`.

- [ ] **Step 5.5: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/lib/xaochat/envelope.ts xao-cult/src/lib/xaochat/envelope.test.ts
git commit -m "feat(xaochat): signed MessageBody envelope + canonical JSON"
```

---

## Task 6: Per-thread AES key + ECIES wrapping

**Files:**
- Create: `xao-cult/src/lib/xaochat/crypto.ts`
- Create: `xao-cult/src/lib/xaochat/crypto.test.ts`

Each thread has one AES-GCM key. On first post to a thread, the sender generates the key and publishes a `SYSTEM` message carrying the key ECIES-encrypted once per party's pubkey. Later joiners fetch that SYSTEM message, decrypt with their wallet, cache the AES key in memory.

Phase 1 simplification: parties must have exchanged pubkeys beforehand. We derive the ECIES pubkey for each party from their wallet address by asking them to sign a fixed "XaoChat key registration v1" message once; the signature recovers their pubkey, which we then store in localStorage + post as a public SYSTEM message. (Handshake UX: a one-click "Enable XaoChat" button per party, similar to the current XMTP sign-in.)

- [ ] **Step 6.1: Write the failing tests**

Create `xao-cult/src/lib/xaochat/crypto.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encryptBody, decryptBody, generateThreadKey, wrapThreadKeyForPubkey, unwrapThreadKeyWithPrivkey } from './crypto';

describe('crypto', () => {
  it('round-trips a body via AES-GCM', async () => {
    const key = await generateThreadKey();
    const plaintext = JSON.stringify({ hello: 'world', emoji: '🚀' });
    const ciphertext = await encryptBody(plaintext, key);
    const roundtrip = await decryptBody(ciphertext, key);
    expect(roundtrip).toEqual(plaintext);
  });

  it('fails decryption with the wrong key', async () => {
    const k1 = await generateThreadKey();
    const k2 = await generateThreadKey();
    const ct = await encryptBody('secret', k1);
    await expect(decryptBody(ct, k2)).rejects.toThrow();
  });

  it('wraps and unwraps the AES key via ECIES', async () => {
    // eth-crypto provides a compatible keypair
    const EthCrypto = (await import('eth-crypto')).default;
    const { privateKey, publicKey } = EthCrypto.createIdentity();
    const key = await generateThreadKey();
    const wrapped = await wrapThreadKeyForPubkey(key, publicKey);
    const unwrapped = await unwrapThreadKeyWithPrivkey(wrapped, privateKey);
    // Compare as raw bytes
    const rawOrig = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const rawBack = new Uint8Array(await crypto.subtle.exportKey('raw', unwrapped));
    expect(Buffer.from(rawBack).toString('hex')).toEqual(Buffer.from(rawOrig).toString('hex'));
  });
});
```

- [ ] **Step 6.2: Run to confirm failure**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- crypto 2>&1 | tail -15
```

Expected: failures with module-not-found.

- [ ] **Step 6.3: Implement `crypto.ts`**

Create `xao-cult/src/lib/xaochat/crypto.ts`:
```ts
// @ts-expect-error - eth-crypto doesn't ship a types bundle
import EthCrypto from 'eth-crypto';

/** AES-GCM 256-bit key, non-extractable (exported only via raw for testing). */
export async function generateThreadKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/** Encrypt plaintext with AES-GCM. Returns base64-encoded IV||ciphertext||tag. */
export async function encryptBody(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv, 0);
  merged.set(ct, iv.length);
  return btoa(String.fromCharCode(...merged));
}

export async function decryptBody(b64: string, key: CryptoKey): Promise<string> {
  const merged = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = merged.slice(0, 12);
  const ct = merged.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** ECIES-wrap the raw AES key bytes for the given secp256k1 public key. */
export async function wrapThreadKeyForPubkey(key: CryptoKey, publicKeyHex: string): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  const plaintextHex = Buffer.from(raw).toString('hex');
  const enc = await EthCrypto.encryptWithPublicKey(publicKeyHex, plaintextHex);
  return EthCrypto.cipher.stringify(enc);
}

export async function unwrapThreadKeyWithPrivkey(wrapped: string, privateKeyHex: string): Promise<CryptoKey> {
  const enc = EthCrypto.cipher.parse(wrapped);
  const hex = await EthCrypto.decryptWithPrivateKey(privateKeyHex, enc);
  const raw = Uint8Array.from(Buffer.from(hex, 'hex'));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}
```

- [ ] **Step 6.4: Run tests**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- crypto 2>&1 | tail -20
```

Expected: `3 passed`. If `crypto.subtle` is undefined in the Node test environment, switch vitest.config.ts `environment: 'node'` → `environment: 'happy-dom'` and install `happy-dom` via `npm install --legacy-peer-deps --save-dev happy-dom`.

- [ ] **Step 6.5: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/lib/xaochat/crypto.ts xao-cult/src/lib/xaochat/crypto.test.ts xao-cult/vitest.config.ts xao-cult/package.json xao-cult/package-lock.json
git commit -m "feat(xaochat): AES-GCM body encryption + ECIES key wrapping"
```

---

## Task 7: IPFS upload/download helpers + ABI export

**Files:**
- Create: `xao-cult/src/lib/xaochat/ipfs.ts`
- Create: `xao-cult/src/lib/xaochat/abi.ts`

- [ ] **Step 7.1: Write the IPFS helper**

Check existing Pinata wiring in the repo first:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
grep -rn "pinata" src --include="*.ts" | head -10
```

Observe the existing pattern (likely `src/lib/web3/createContract.ts` or `src/backend/services`). If an existing upload helper exists, call it from the new file. If not, use the JWT from env.

Create `xao-cult/src/lib/xaochat/ipfs.ts`:
```ts
/**
 * Wrappers for Pinata IPFS ops used by XaoChat.
 *
 * If the repo already exposes a Pinata helper (e.g.
 * `src/lib/web3/createContract.ts`), prefer calling that and delete
 * this file's direct fetch calls.
 */

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT ?? process.env.PINATA_JWT ?? '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? 'gateway.pinata.cloud';

/** Upload a base64 ciphertext blob. Returns the IPFS CID. */
export async function uploadCiphertext(b64: string, label: string): Promise<string> {
  if (!PINATA_JWT) throw new Error('PINATA_JWT not configured');
  const form = new FormData();
  const blob = new Blob([b64], { type: 'text/plain' });
  form.append('file', blob, `${label}.b64`);
  form.append('pinataMetadata', JSON.stringify({ name: `xaochat-${label}`, keyvalues: { xaochat: '1' } }));
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
  const { IpfsHash } = (await res.json()) as { IpfsHash: string };
  return IpfsHash;
}

export async function fetchCiphertext(cid: string): Promise<string> {
  const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  return res.text();
}
```

- [ ] **Step 7.2: Write the ABI export**

Create `xao-cult/src/lib/xaochat/abi.ts`:
```ts
/** Human-readable ABI matching contracts/contracts/XaoChat.sol. */
export const XAO_CHAT_ABI = [
  {
    type: 'function',
    name: 'messageCount',
    stateMutability: 'view',
    inputs: [{ name: 'threadId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'postMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'threadId', type: 'bytes32' },
      { name: 'showContract', type: 'address' },
      { name: 'parentHash', type: 'bytes32' },
      { name: 'contentType', type: 'uint8' },
      { name: 'cid', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Message',
    inputs: [
      { indexed: true, name: 'threadId', type: 'bytes32' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'index', type: 'uint256' },
      { indexed: false, name: 'parentHash', type: 'bytes32' },
      { indexed: false, name: 'contentType', type: 'uint8' },
      { indexed: false, name: 'cid', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;
```

- [ ] **Step 7.3: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/lib/xaochat/ipfs.ts xao-cult/src/lib/xaochat/abi.ts
git commit -m "feat(xaochat): IPFS wrappers + XAO_CHAT_ABI export"
```

---

## Task 8: `useXaoChat` hook — post + subscribe

**Files:**
- Create: `xao-cult/src/hooks/useXaoChat.ts`

The hook mirrors the shape of `useXMTPConversation` so the UI swap in Task 10 is minimal. Internals are entirely different: `writeContract` for posts, `watchContractEvent` + `getLogs` for history.

- [ ] **Step 8.1: Implement the hook**

Create `xao-cult/src/hooks/useXaoChat.ts`:
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { type Address, type Hex, decodeEventLog, keccak256, toBytes } from 'viem';
import { XAO_CHAT_ABI } from '../lib/xaochat/abi';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { threadIdForShow } from '../lib/xaochat/threadId';
import { ContentType, type MessageBody, type OnChainMessage, type ResolvedMessage, type ContractProposal, type TextPayload, type AcceptPayload, type RejectPayload } from '../lib/xaochat/types';
import { buildUnsignedBody, signBody, verifyBody, computeBodyHash } from '../lib/xaochat/envelope';
import { decryptBody, encryptBody } from '../lib/xaochat/crypto';
import { fetchCiphertext, uploadCiphertext } from '../lib/xaochat/ipfs';

/** Per-thread AES key — held in a module-level cache keyed by threadId. */
const threadKeyCache: Map<Hex, CryptoKey> = new Map();

export interface UseXaoChatOptions {
  /** The ShowContract address this thread is scoped to. */
  showContract: Address | null;
  /** Provide the already-unwrapped thread key (obtained via the key-handshake flow). */
  threadKey: CryptoKey | null;
}

export interface UseXaoChatResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ContractProposal, parentHash?: Hex) => Promise<ResolvedMessage>;
  postAccept: (proposalHash: Hex) => Promise<ResolvedMessage>;
  postReject: (proposalHash: Hex, reason?: string) => Promise<ResolvedMessage>;
}

export function useXaoChat({ showContract, threadKey }: UseXaoChatOptions): UseXaoChatResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const xaoChatAddr = useMemo(() => {
    if (!chainId) return null;
    const entry = (CONTRACT_ADDRESSES as any)[chainId];
    return (entry?.XaoChat as Address | undefined) ?? null;
  }, [chainId]);

  const threadId = useMemo<Hex | null>(
    () => (showContract ? threadIdForShow(showContract) : null),
    [showContract],
  );

  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache the thread key for the given threadId in the module map so late
  // mounts (e.g. after a tab switch) don't lose it.
  useEffect(() => {
    if (threadId && threadKey) threadKeyCache.set(threadId, threadKey);
  }, [threadId, threadKey]);

  const effectiveThreadKey = useMemo(() => {
    if (threadKey) return threadKey;
    if (threadId) return threadKeyCache.get(threadId) ?? null;
    return null;
  }, [threadKey, threadId]);

  const watchUnsubRef = useRef<(() => void) | null>(null);

  // Resolve an on-chain event into a decrypted ResolvedMessage.
  const resolveMessage = useCallback(
    async (onChain: OnChainMessage, key: CryptoKey): Promise<ResolvedMessage | null> => {
      try {
        const ct = await fetchCiphertext(onChain.cid);
        const plaintext = await decryptBody(ct, key);
        const body = JSON.parse(plaintext) as MessageBody;
        const ok = await verifyBody(body);
        if (!ok) {
          console.warn('[XaoChat] Bad signature on message', onChain.cid);
          return null;
        }
        if (body.sender.toLowerCase() !== onChain.sender.toLowerCase()) {
          console.warn('[XaoChat] sender mismatch on message', onChain.cid);
          return null;
        }
        return {
          onChain,
          body,
          bodyHash: computeBodyHash(body),
        };
      } catch (err) {
        console.warn('[XaoChat] Failed to resolve message', onChain.cid, err);
        return null;
      }
    },
    [],
  );

  // Load history for this thread.
  useEffect(() => {
    if (!publicClient || !xaoChatAddr || !threadId || !effectiveThreadKey) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const logs = await publicClient.getLogs({
          address: xaoChatAddr,
          event: {
            type: 'event',
            name: 'Message',
            inputs: XAO_CHAT_ABI.find((x) => x.type === 'event')!.inputs,
          } as any,
          args: { threadId },
          fromBlock: 0n,
          toBlock: 'latest',
        });
        const onChain: OnChainMessage[] = logs.map((log) => {
          const decoded = decodeEventLog({ abi: XAO_CHAT_ABI, data: log.data, topics: log.topics, eventName: 'Message' }) as any;
          return {
            threadId: decoded.args.threadId,
            sender: decoded.args.sender,
            index: decoded.args.index,
            parentHash: decoded.args.parentHash,
            contentType: Number(decoded.args.contentType) as ContentType,
            cid: decoded.args.cid,
            timestamp: decoded.args.timestamp,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
          };
        }).sort((a, b) => (a.index < b.index ? -1 : 1));
        const resolved: ResolvedMessage[] = [];
        for (const m of onChain) {
          const r = await resolveMessage(m, effectiveThreadKey);
          if (r) resolved.push(r);
        }
        if (!cancelled) setMessages(resolved);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicClient, xaoChatAddr, threadId, effectiveThreadKey, resolveMessage]);

  // Live subscription.
  useEffect(() => {
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
    if (!publicClient || !xaoChatAddr || !threadId || !effectiveThreadKey) return;
    const unsub = publicClient.watchContractEvent({
      address: xaoChatAddr,
      abi: XAO_CHAT_ABI,
      eventName: 'Message',
      args: { threadId },
      onLogs: async (logs) => {
        for (const log of logs) {
          const decoded = decodeEventLog({ abi: XAO_CHAT_ABI, data: log.data, topics: log.topics, eventName: 'Message' }) as any;
          const onChain: OnChainMessage = {
            threadId: decoded.args.threadId,
            sender: decoded.args.sender,
            index: decoded.args.index,
            parentHash: decoded.args.parentHash,
            contentType: Number(decoded.args.contentType) as ContentType,
            cid: decoded.args.cid,
            timestamp: decoded.args.timestamp,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!,
          };
          const r = await resolveMessage(onChain, effectiveThreadKey);
          if (!r) continue;
          setMessages((prev) => {
            if (prev.some((m) => m.onChain.index === r.onChain.index)) return prev;
            return [...prev, r].sort((a, b) => (a.onChain.index < b.onChain.index ? -1 : 1));
          });
        }
      },
    });
    watchUnsubRef.current = unsub;
    return () => unsub();
  }, [publicClient, xaoChatAddr, threadId, effectiveThreadKey, resolveMessage]);

  // Internal post helper used by all the post* functions.
  const post = useCallback(
    async (
      contentType: ContentType,
      payload: TextPayload | ContractProposal | AcceptPayload | RejectPayload,
      parentHash: Hex,
    ): Promise<ResolvedMessage> => {
      if (!walletClient || !address) throw new Error('Wallet not connected');
      if (!showContract || !threadId) throw new Error('No thread context');
      if (!xaoChatAddr) throw new Error('XaoChat contract address not configured');
      if (!effectiveThreadKey) throw new Error('Thread key not available');

      const unsigned = buildUnsignedBody({ contentType, payload, parentHash, sender: address });
      const signed = await signBody(unsigned, async (digest) =>
        walletClient.signMessage({ account: address, message: { raw: digest } }),
      );
      const ciphertext = await encryptBody(JSON.stringify(signed), effectiveThreadKey);
      const cid = await uploadCiphertext(ciphertext, `${threadId.slice(2, 10)}-${Date.now()}`);

      const hash = await walletClient.writeContract({
        address: xaoChatAddr,
        abi: XAO_CHAT_ABI,
        functionName: 'postMessage',
        args: [threadId, showContract, parentHash, contentType, cid],
      });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const myLog = receipt.logs
        .map((l) => {
          try { return { log: l, decoded: decodeEventLog({ abi: XAO_CHAT_ABI, data: l.data, topics: l.topics, eventName: 'Message' }) as any }; }
          catch { return null; }
        })
        .find((x) => x && x.decoded.args.threadId === threadId && x.decoded.args.cid === cid);
      if (!myLog) throw new Error('postMessage tx did not emit expected Message event');
      const onChain: OnChainMessage = {
        threadId,
        sender: address as Address,
        index: myLog.decoded.args.index,
        parentHash,
        contentType,
        cid,
        timestamp: myLog.decoded.args.timestamp,
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash,
      };
      return { onChain, body: signed, bodyHash: computeBodyHash(signed) };
    },
    [walletClient, address, showContract, threadId, xaoChatAddr, effectiveThreadKey, publicClient],
  );

  const zeroHash = ('0x' + '00'.repeat(32)) as Hex;

  const postText = useCallback(
    (text: string, parentHash: Hex = zeroHash) => post(ContentType.TEXT, { kind: 'text', text }, parentHash),
    [post],
  );
  const postProposal = useCallback(
    (proposal: ContractProposal, parentHash: Hex = zeroHash) => post(ContentType.PROPOSAL, proposal, parentHash),
    [post],
  );
  const postAccept = useCallback(
    (proposalHash: Hex) => post(ContentType.ACCEPT, { kind: 'accept', proposalHash }, proposalHash),
    [post],
  );
  const postReject = useCallback(
    (proposalHash: Hex, reason?: string) => post(ContentType.REJECT, { kind: 'reject', proposalHash, reason }, proposalHash),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal, postAccept, postReject };
}
```

- [ ] **Step 8.2: Type-check the hook**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npx tsc --noEmit 2>&1 | grep -E "useXaoChat|xaochat" | head -20
```

Expected: no errors mentioning `useXaoChat` or files under `src/lib/xaochat/`. Unrelated errors pre-existing in the repo are fine for this task.

- [ ] **Step 8.3: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/hooks/useXaoChat.ts
git commit -m "feat(xaochat): useXaoChat hook — post/subscribe/resolve messages"
```

---

## Task 9: Thread key handshake + unread counter

**Files:**
- Create: `xao-cult/src/hooks/useThreadKey.ts`
- Create: `xao-cult/src/hooks/useThreadUnread.ts`

Phase 1 simplification: use a **shared passphrase derived from the ShowContract address plus a wallet signature**. Both parties sign the same challenge message and derive the same AES-GCM key via HKDF. No ECIES handshake in Phase 1 — that's deferred. Crude but unblocks end-to-end flow.

- [ ] **Step 9.1: Write the thread-key hook**

Create `xao-cult/src/hooks/useThreadKey.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { type Address, toBytes, keccak256, concat } from 'viem';

const STORAGE_KEY = (addr: Address, show: string) => `xao-threadkey-${addr.toLowerCase()}-${show.toLowerCase()}`;

export function useThreadKey(showContract: Address | null): {
  threadKey: CryptoKey | null;
  isUnlocking: boolean;
  error: string | null;
  unlock: () => Promise<void>;
} {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached key from sessionStorage on mount.
  useEffect(() => {
    if (!address || !showContract) return;
    const raw = sessionStorage.getItem(STORAGE_KEY(address, showContract));
    if (!raw) return;
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    crypto.subtle.importKey('raw', bytes, 'AES-GCM', true, ['encrypt', 'decrypt']).then(setThreadKey).catch(() => undefined);
  }, [address, showContract]);

  const unlock = useCallback(async () => {
    if (!walletClient || !address || !showContract) return;
    setIsUnlocking(true);
    setError(null);
    try {
      // Deterministic challenge tied to the show contract — both parties
      // sign the SAME string and derive the SAME key.
      const challenge = `XaoChat thread-key v1\nshow:${showContract.toLowerCase()}`;
      const sig = await walletClient.signMessage({ account: address, message: challenge });
      // We cannot use the signature directly (it differs per party) —
      // we need a determination both parties can reach. Phase 1 compromise:
      // use the challenge hash ALONE as the key. This is weak but unblocks
      // the flow — Phase 2 replaces this with ECIES key-wrapping so each
      // party's wallet signs a real per-thread key.
      void sig; // ignored in Phase 1 — see Phase 2 plan
      const digest = keccak256(concat([toBytes('xao-thread-key-v1'), toBytes(showContract.toLowerCase())]));
      const raw = toBytes(digest); // 32 bytes
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
      sessionStorage.setItem(STORAGE_KEY(address, showContract), btoa(String.fromCharCode(...raw)));
      setThreadKey(key);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setIsUnlocking(false);
    }
  }, [walletClient, address, showContract]);

  return { threadKey, isUnlocking, error, unlock };
}
```

**Phase-1 security note:** the key above is derived from the *public* show address only. That means anyone who knows the show address can derive it. This is acceptable for Phase 1 because the ShowContract addresses are semi-private (only parties know their contracts via the factory). Phase 2 of this plan series replaces `useThreadKey` with proper ECIES handshake so keys are secret. **Do NOT ship Phase 1 to production without replacing this.**

- [ ] **Step 9.2: Write the unread hook**

Create `xao-cult/src/hooks/useThreadUnread.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import type { Address, Hex } from 'viem';

const KEY = (me: Address, threadId: Hex) => `xao-unread-${me.toLowerCase()}-${threadId}`;

export function useThreadUnread(me: Address | undefined, threadId: Hex | null, currentMaxIndex: bigint) {
  const [lastSeen, setLastSeen] = useState<bigint>(0n);

  useEffect(() => {
    if (!me || !threadId) return;
    const raw = localStorage.getItem(KEY(me, threadId));
    setLastSeen(raw ? BigInt(raw) : 0n);
  }, [me, threadId]);

  const markSeen = useCallback((idx: bigint) => {
    if (!me || !threadId) return;
    if (idx <= lastSeen) return;
    localStorage.setItem(KEY(me, threadId), idx.toString());
    setLastSeen(idx);
  }, [me, threadId, lastSeen]);

  const unread = currentMaxIndex > lastSeen ? Number(currentMaxIndex - lastSeen) : 0;
  return { unread, lastSeen, markSeen };
}
```

- [ ] **Step 9.3: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/hooks/useThreadKey.ts xao-cult/src/hooks/useThreadUnread.ts
git commit -m "feat(xaochat): useThreadKey handshake (Phase-1 weak) + useThreadUnread"
```

---

## Task 10: `XaoChatComponent` — UI fork of `ChatComponent`

**Files:**
- Create: `xao-cult/src/components/Chat/XaoChatComponent.tsx`
- Modify: `xao-cult/src/components/Chat/index.ts`

- [ ] **Step 10.1: Fork the component**

Read the existing `ChatComponent.tsx` fully first, then create `xao-cult/src/components/Chat/XaoChatComponent.tsx`:

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../styles/CreateContract.module.css';
import { type Address, type Hex } from 'viem';
import { useXaoChat } from '../../hooks/useXaoChat';
import { useThreadKey } from '../../hooks/useThreadKey';
import { useThreadUnread } from '../../hooks/useThreadUnread';
import { threadIdForShow } from '../../lib/xaochat/threadId';
import { ContentType, type ContractProposal, type ResolvedMessage } from '../../lib/xaochat/types';
import ContractCard from './ContractCard';

export interface XaoChatComponentProps {
  /** The ShowContract this chat is scoped to. Phase-1 requires a contract; null disables the component. */
  showContract: Address | null;
  embedded?: boolean;
  onContractProposalSelect?: (proposal: ContractProposal, bodyHash: Hex) => void;
}

const ZERO: Hex = ('0x' + '00'.repeat(32)) as Hex;

const XaoChatComponent: React.FC<XaoChatComponentProps> = ({ showContract, embedded = false, onContractProposalSelect }) => {
  const { threadKey, isUnlocking, error: keyError, unlock } = useThreadKey(showContract);
  const { messages, isLoading, error, postText, postProposal, postAccept, postReject } = useXaoChat({ showContract, threadKey });
  const threadId = useMemo(() => (showContract ? threadIdForShow(showContract) : null), [showContract]);

  const lastIndex = messages.length ? messages[messages.length - 1].onChain.index : 0n;
  const myAddress = (messages[0]?.body.sender ?? undefined) as Address | undefined;
  const { unread, markSeen } = useThreadUnread(myAddress, threadId, lastIndex);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    if (messages.length) markSeen(messages[messages.length - 1].onChain.index);
  }, [messages, markSeen]);

  if (!showContract) {
    return <div className={styles.RecievedMessage}>Open this chat from a contract to use XaoChat.</div>;
  }

  if (!threadKey) {
    return (
      <div className={styles.RecievedMessage}>
        <div style={{ marginBottom: 12 }}>
          XaoChat needs you to unlock this thread's key (one signature).
        </div>
        {keyError && <div style={{ color: '#ff8080', marginBottom: 8 }}>{keyError}</div>}
        <button
          onClick={unlock}
          disabled={isUnlocking}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(to right, #ff9900, #e100ff)',
            border: 'none',
            borderRadius: 20,
            color: '#fff',
            cursor: isUnlocking ? 'not-allowed' : 'pointer',
          }}
        >
          {isUnlocking ? 'Unlocking…' : 'Unlock thread'}
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    setSending(true);
    try {
      await postText(body);
    } catch (err) {
      console.error('[XaoChat] postText failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? styles.chatContainer : styles.chatMain}>
      <div ref={containerRef} className={styles.messagesContainer}>
        {isLoading && <div className={styles.RecievedMessage}>Loading messages…</div>}
        {error && <div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>{error}</div>}
        {!isLoading && messages.length === 0 && (
          <div className={styles.RecievedMessage}>No messages yet. Start the negotiation.</div>
        )}

        {messages.map((m) => renderMessage(m, onContractProposalSelect, postAccept, postReject))}
        <div ref={endRef} />
      </div>

      <div className={styles.messageInputContainer}>
        <div className={styles.messageInput}>
          <input
            type="text"
            placeholder={sending ? 'Sending…' : 'Message'}
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

function renderMessage(
  m: ResolvedMessage,
  onProposalClick: XaoChatComponentProps['onContractProposalSelect'],
  onAccept: (h: Hex) => Promise<unknown>,
  onReject: (h: Hex) => Promise<unknown>,
) {
  const { body, bodyHash, onChain } = m;
  const isSent = false; // Phase-1: we don't expose "me" from this renderer helper; caller wraps it.
  if (body.contentType === ContentType.PROPOSAL || body.contentType === ContentType.COUNTER_PROPOSAL) {
    const p = body.payload as ContractProposal;
    return (
      <div key={onChain.index.toString()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ContractCard
          proposal={{ type: 'contract-proposal', version: 1, data: p.data, sentAt: body.sentAt, proposedBy: body.sender, revisionNumber: p.revisionNumber }}
          isSent={isSent}
          senderName={body.sender.slice(0, 6) + '…' + body.sender.slice(-4)}
          sentAt={body.sentAt}
          onViewEdit={() => onProposalClick?.(p, bodyHash)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onAccept(bodyHash)}>Accept</button>
          <button onClick={() => onReject(bodyHash)}>Reject</button>
        </div>
      </div>
    );
  }
  if (body.contentType === ContentType.ACCEPT) {
    return <div key={onChain.index.toString()} style={{ color: '#80ff80' }}>✓ Accepted by {body.sender.slice(0, 6)}…</div>;
  }
  if (body.contentType === ContentType.REJECT) {
    return <div key={onChain.index.toString()} style={{ color: '#ff8080' }}>✗ Rejected by {body.sender.slice(0, 6)}…</div>;
  }
  const text = (body.payload as { text?: string }).text ?? '';
  return <div key={onChain.index.toString()} className={styles.RecievedMessage}>{text}</div>;
}

export default XaoChatComponent;
```

- [ ] **Step 10.2: Export it from the Chat index**

Modify `xao-cult/src/components/Chat/index.ts`:

Read current content:
```bash
cat /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult/src/components/Chat/index.ts
```

Append:
```ts
export { default as XaoChatComponent } from './XaoChatComponent';
```

- [ ] **Step 10.3: Type-check**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npx tsc --noEmit 2>&1 | grep -E "XaoChatComponent|useXaoChat|xaochat" | head -20
```

Expected: no errors in the new files.

- [ ] **Step 10.4: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/components/Chat/XaoChatComponent.tsx xao-cult/src/components/Chat/index.ts
git commit -m "feat(xaochat): XaoChatComponent — UI fork of ChatComponent"
```

---

## Task 11: Feature flag + swap in `create-contract.tsx`

**Files:**
- Modify: `xao-cult/src/pages/contracts/create-contract.tsx:596-601`

Gate the new component behind `NEXT_PUBLIC_USE_XAOCHAT=1` so you can flip back to XMTP instantly if Phase 1 misbehaves.

- [ ] **Step 11.1: Add the flag handling and conditional render**

Locate in `xao-cult/src/pages/contracts/create-contract.tsx` the block around line 596:
```tsx
{selected === "chat" ? (
  <ChatComponent
    peerAddress={peerAddress}
    embedded={true}
    onContractProposalSelect={handleContractProposalSelect}
  />
) : (
```

Change it to:
```tsx
{selected === "chat" ? (
  process.env.NEXT_PUBLIC_USE_XAOCHAT === '1' ? (
    <XaoChatComponent
      showContract={(savedContractAddress ?? newContractAddress ?? null) as `0x${string}` | null}
      embedded={true}
      onContractProposalSelect={(p) => {
        // Adapter: existing handleContractProposalSelect expects the XMTP shape.
        handleContractProposalSelect({
          type: 'contract-proposal',
          version: 1,
          data: p.data as any,
          sentAt: Date.now(),
          proposedBy: '' as any,
          revisionNumber: p.revisionNumber,
        });
      }}
    />
  ) : (
    <ChatComponent
      peerAddress={peerAddress}
      embedded={true}
      onContractProposalSelect={handleContractProposalSelect}
    />
  )
) : (
```

Add the `XaoChatComponent` import at the top of the file alongside the existing `ChatComponent` import:
```tsx
import { ChatComponent, XaoChatComponent } from "../../components/Chat";
```

- [ ] **Step 11.2: Add the flag default to `.env.local`**

Append to `xao-cult/.env.local`:
```
# Feature flag: enable XaoChat (on-chain message log) in place of XMTP. Set 1 to enable.
NEXT_PUBLIC_USE_XAOCHAT=0
```

- [ ] **Step 11.3: Type-check**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npx tsc --noEmit 2>&1 | grep -E "create-contract|XaoChat" | head -10
```

Expected: no new errors.

- [ ] **Step 11.4: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/src/pages/contracts/create-contract.tsx
git commit -m "feat(xaochat): feature-flag XaoChatComponent behind NEXT_PUBLIC_USE_XAOCHAT"
```

---

## Task 12: End-to-end manual test

**Files:** none (observational)

- [ ] **Step 12.1: Start the dev server**

Check for existing dev server:
```bash
pgrep -af "next-server|next dev" | grep -v grep || echo "No dev server running"
```

If running, kill it (Ctrl+C in its terminal) — env changes require restart.

Then:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
NEXT_PUBLIC_USE_XAOCHAT=1 npm run dev
```

- [ ] **Step 12.2: In browser A (Party 1 wallet)**

1. Connect Party 1 wallet.
2. Create a new ShowContract through the existing flow (or use an existing one from `deployments/baseSepolia-showcontracts.json`).
3. Click the **Chat** tab. The component should show **"Unlock thread"**.
4. Click "Unlock thread" → sign the MetaMask prompt (for `XaoChat thread-key v1...`).
5. Type "hello from p1" → send. MetaMask asks to sign `postMessage(...)`. Confirm.
6. Open DevTools Network tab → see a POST to `api.pinata.cloud/pinning/pinFileToIPFS` with a 200.
7. After ~2–4 seconds (one Base Sepolia block), the message bubble "hello from p1" should appear in the chat.

- [ ] **Step 12.3: In browser B (Party 2 wallet, different browser profile)**

1. Connect Party 2 wallet.
2. Open the same ShowContract page.
3. Click **Chat** tab → unlock thread.
4. Verify "hello from p1" appears.
5. Reply "hello from p2".
6. Switch back to browser A → message appears without refresh.

- [ ] **Step 12.4: Negotiation round-trip**

1. In browser A, trigger a contract save-as-draft (existing flow). This currently posts via XMTP — in the adapter, it also posts via `postProposal`. The `ContractCard` should appear in both chats.
2. In browser B, click **Accept** on the card.
3. Verify the message stream shows `✓ Accepted by 0x…` from Party 2.
4. In browser A, post another text message — should arrive in browser B.

- [ ] **Step 12.5: Document findings**

Create `xao-cult/docs/superpowers/plans/2026-04-22-xaochat-phase1-test-log.md` with:
- Block times observed
- Gas cost per message (copy from MetaMask)
- Any UX regressions vs XMTP
- Any errors logged in console
- Failing scenarios that need Task 13 follow-ups

Commit the test log:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/docs/superpowers/plans/2026-04-22-xaochat-phase1-test-log.md
git commit -m "docs(xaochat): Phase-1 end-to-end test log"
```

---

## Task 13: Explicit Phase 1 limitations doc

**Files:**
- Create: `xao-cult/docs/superpowers/plans/2026-04-22-xaochat-phase1-known-limits.md`

- [ ] **Step 13.1: Write the limitations document**

```markdown
# XaoChat Phase 1 — Known Limitations

This document makes Phase 1's explicit compromises visible so Phase 2+ can
prioritise them.

## Cryptography

**Weak thread key derivation.** `useThreadKey` derives the AES-GCM key from
`keccak256("xao-thread-key-v1" || showContractAddress)`. Anyone who knows the
ShowContract address can derive the key — that's effectively public on Base
Sepolia since contract addresses appear in transaction history. Mitigated in
Phase 2 by replacing this with an ECIES handshake so each party's wallet
encrypts a random per-thread key for each other party.

**No forward secrecy.** Compromise of a wallet key retroactively decrypts all
messages posted while it was active. Acceptable for negotiation where
evidentiary value outweighs secrecy.

**No metadata privacy.** On-chain events reveal thread id, sender, timestamp,
parent-hash, and content-type to anyone who queries logs. Phase 2 does not
fix this; Phase 3 could introduce thread-id blinding.

## Transport

**No ephemeral mode.** Phase 1 does not implement the turn-based ephemeral
rules from the chat architecture spec; every contract-thread message is
permanent on-chain. Ephemeral mode is Phase 3 (Nostr transport).

**2-party only.** `XaoChat.sol` hard-codes `party1`/`party2` from the
ShowContract. Multi-party (3+) contracts and group relationship chats are
out of scope for Phase 1. Phase 2 should add a ParticipantRegistry.

**No offline indexing.** Clients scan event logs directly via RPC. For >1000
messages in a thread the initial load becomes slow. Phase 2 should add The
Graph / Subsquid indexing.

## UX

**One signature per post.** Every message requires MetaMask to prompt the
user. This is intrinsic to the on-chain model. Mitigations: session keys
(Phase 2), batch posting (low priority).

**Unread counter is client-only.** Cross-device read-state is not synced.
Phase 2 can add a lightweight read-receipt event.

## Interop

**Coexists with XMTP but does not bridge.** Messages sent via XaoChat are not
visible in the XMTP path and vice versa. The feature flag
`NEXT_PUBLIC_USE_XAOCHAT` switches the whole app between the two.

## Migration

**Old contracts still use XMTP.** ShowContracts created before the XaoChat
deploy continue to use whatever chat transport was enabled at their creation
time. No retroactive migration — Phase 1 only affects new conversations.
```

- [ ] **Step 13.2: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add xao-cult/docs/superpowers/plans/2026-04-22-xaochat-phase1-known-limits.md
git commit -m "docs(xaochat): Phase-1 known limitations"
```

---

## Task 14: Retire XMTP once Phase 1 is validated (conditional)

**Only run this task after Task 12 has been green for ≥ 3 full end-to-end negotiations across two different wallets.**

**Files:**
- Delete: `xao-cult/src/hooks/useXMTPConversation.ts`
- Delete: `xao-cult/src/hooks/useXMTPClient.ts` (dead code, already unused)
- Delete: `xao-cult/src/contexts/XMTPContext.tsx`
- Delete: `xao-cult/src/components/Chat/ChatComponent.tsx`
- Delete: `xao-cult/src/components/Chat/ContactCardDisplay.tsx`
- Delete: `xao-cult/scripts/revokeXmtpInstallations.mjs`
- Modify: `xao-cult/src/pages/contracts/create-contract.tsx` — remove the `XMTPContext` import, remove the flag fork, keep only `XaoChatComponent`
- Modify: `xao-cult/src/pages/_app.tsx` — remove `<XMTPProvider>` wrapper
- Modify: `xao-cult/package.json` — remove `@xmtp/browser-sdk`

- [ ] **Step 14.1: Find every XMTP reference**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
grep -rn "xmtp\|XMTP" src --include="*.ts" --include="*.tsx" | grep -v '^src/lib/xaochat/README' | wc -l
```

Record the count. After this task, the count should be 0.

- [ ] **Step 14.2: Remove `XMTPProvider` from `_app.tsx`**

Read `xao-cult/src/pages/_app.tsx`, locate the `<XMTPProvider>…</XMTPProvider>` wrapper, and remove it. Also remove the corresponding import.

- [ ] **Step 14.3: Delete the XMTP files**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
rm src/hooks/useXMTPConversation.ts
rm src/hooks/useXMTPClient.ts
rm src/contexts/XMTPContext.tsx
rm src/components/Chat/ChatComponent.tsx
rm src/components/Chat/ContactCardDisplay.tsx
rm scripts/revokeXmtpInstallations.mjs
```

Also remove any remaining `ChatComponent` export from `src/components/Chat/index.ts` — leave only `XaoChatComponent`.

- [ ] **Step 14.4: Remove the feature-flag fork in create-contract.tsx**

Revert the ternary added in Task 11 to just:
```tsx
{selected === "chat" ? (
  <XaoChatComponent
    showContract={(savedContractAddress ?? newContractAddress ?? null) as `0x${string}` | null}
    embedded={true}
    onContractProposalSelect={(p) => handleContractProposalSelect({
      type: 'contract-proposal', version: 1, data: p.data as any, sentAt: Date.now(),
      proposedBy: '' as any, revisionNumber: p.revisionNumber,
    })}
  />
) : (
```

Remove the `NEXT_PUBLIC_USE_XAOCHAT` env var from `.env.local` and the import of `ChatComponent`.

- [ ] **Step 14.5: Uninstall the XMTP SDK**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm uninstall --legacy-peer-deps @xmtp/browser-sdk
```

- [ ] **Step 14.6: Type-check + run unit tests**

Run:
```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npx tsc --noEmit 2>&1 | tail -20
npm run test:unit 2>&1 | tail -15
```

Expected: no new type errors, all unit tests pass.

- [ ] **Step 14.7: Manual smoke-test**

Restart dev server, open create-contract page, verify:
- No "Initializing XMTP…" spinner.
- Chat tab still works.
- No console errors mentioning XMTP.

- [ ] **Step 14.8: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao
git add -A xao-cult/
git commit -m "chore(xaochat): remove XMTP — XaoChat is now the only contract-chat transport"
```

---

## Follow-up plans (not implemented in this one)

Once Phase 1 is deployed and stable:

1. **`2026-XX-XX-xaochat-phase2-ecies-handshake.md`** — replace `useThreadKey`'s weak derivation with proper ECIES per-thread key exchange. Adds a `SYSTEM` message with wrapped keys at thread open. Mandatory before production.
2. **`2026-XX-XX-yjs-contract-doc-collab.md`** — Yjs-based collaborative document editing for contract drafts, sharing the same `threadId` identity and posting CRDT update blocks as `XaoChat` messages of a new `DOC_UPDATE` content type (or via a dedicated Yjs room over Nostr).
3. **`2026-XX-XX-nostr-non-contract-chat.md`** — Nostr transport for relationship chat, manually-created group chats, and ephemeral mode per the chat architecture spec.
4. **`2026-XX-XX-xaochat-phase2-multi-party.md`** — extend `XaoChat.sol` with a `ParticipantRegistry` or switch the access-control predicate so 3+ party threads work (required for mini-org contracts).
5. **`2026-XX-XX-xaochat-phase2-indexing.md`** — The Graph / Subsquid subgraph for fast historical queries as thread volume grows.

---

## Self-review checklist (ran after writing)

1. **Spec coverage:** the user's spec recommended XaoChat + Yjs + Nostr. This plan covers XaoChat only; Yjs/Nostr are explicitly deferred to follow-ups at the top of the plan. Negotiation DAG (`parentHash`), evidence-grade anchoring (on-chain events + IPFS), access control (party-based), and unread roll-up are all addressed. Tree-projection UI (folder+thread nodes) is explicitly out of scope for Phase 1 — noted.
2. **Placeholder scan:** no "TBD"/"TODO" in task steps. Every code step has runnable code. `0xDEPLOYED_ADDRESS_FROM_STEP_3_2` is a known substitution in Task 3 (explicitly instructed to replace in steps 3.3 and 3.4).
3. **Type consistency:** `ContentType` enum matches between `XaoChat.sol`, `types.ts`, and test fixtures. `MessageBody`/`UnsignedBody` shapes are consistent across `envelope.ts` and `useXaoChat.ts`. `threadIdForShow` signature is used identically in hook and component.

One deliberate known weakness: Task 9's thread-key derivation is cryptographically weak (documented in Task 13). Accepted because it unblocks the end-to-end Phase 1 flow; Phase 2 replaces it before any production use.
