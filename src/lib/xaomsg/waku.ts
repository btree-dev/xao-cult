/**
 * Waku light-client wrapper — lazy singleton, lifecycle, publish, subscribe.
 *
 * One node per browser tab. Connects on first use, stays warm for the rest of
 * the session. Cleans up via `shutdownWakuClient()`.
 */
import {
  createLightNode,
  createEncoder,
  createDecoder,
  waitForRemotePeer,
  Protocols,
  type LightNode,
} from '@waku/sdk';
import { XAOMSG_DEBUG_BUILD, wakuDebugLog, wakuDebugWarn, wakuDebugError } from './debugBuild';

let nodeP: Promise<LightNode> | null = null;

export async function getWakuClient(): Promise<LightNode> {
  if (!nodeP) {
    nodeP = (async () => {
      // Default light-push peer count is 1 — if that one peer enforces an
      // RLN anti-spam proof (which this client doesn't generate), every send
      // fails outright with zero successes ("Proof generation failed"),
      // observed live even though publishToTopic already tolerates *partial*
      // per-peer failure. Asking for more peers means one RLN-requiring peer
      // no longer has to be the single point of failure for every send.
      // Top-level numPeersToUse (SDK default 2) is what Filter's subscribe
      // draws its locked-peer pool from — bump it too, not just lightPush's,
      // so a single dropped peer doesn't transiently zero out Filter's pool.
      wakuDebugLog(`[xaomsg] waku#1 [build ${XAOMSG_DEBUG_BUILD}]: creating light node`);
      const node = await createLightNode({
        defaultBootstrap: true,
        numPeersToUse: 3,
        lightPush: { numPeersToUse: 3 },
      });
      wakuDebugLog('[xaomsg] waku#2: light node created, starting');
      await node.start();
      wakuDebugLog('[xaomsg] waku#3: node started, waiting for LightPush/Filter peers');
      // Best-effort: don't let a slow/absent peer for ONE protocol reject node
      // init and take down every operation. Each op already waits for the peer
      // it needs (publishToTopic → LightPush w/ retry, queryHistory → Store,
      // subscribeToTopic → Filter), so a read/subscribe path can still work even
      // when no LightPush peer is available (the "No peer available" case).
      try {
        await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter], 30_000);
        wakuDebugLog('[xaomsg] waku#4: LightPush/Filter peers ready');
      } catch (err) {
        console.warn('[xaomsg] waku: not all protocol peers ready at startup (continuing):', err);
      }
      return node;
    })();
  }
  return nodeP;
}

/** Publish raw bytes (UTF-8 JSON in our case) on the given content topic. */
export async function publishToTopic(contentTopic: string, payload: Uint8Array): Promise<void> {
  wakuDebugLog('[xaomsg] waku#5: publishToTopic: getting waku client');
  const node = await getWakuClient();
  const encoder = createEncoder({ contentTopic });

  // A light node can momentarily have NO LightPush peer — one dropped, or hasn't
  // reconnected yet — which surfaced to users as "Waku light-push failed: No peer
  // available". Rather than fail the whole send on a transient gap, wait for a
  // LightPush peer and retry a few times before giving up.
  const MAX_ATTEMPTS = 4;
  let lastFailures: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    wakuDebugLog(`[xaomsg] waku#6: publishToTopic: waiting for LightPush peer (attempt ${attempt}/${MAX_ATTEMPTS})`);
    try {
      await waitForRemotePeer(node, [Protocols.LightPush], 8_000);
    } catch {
      // No peer yet within the window — still try the send (and retry below).
      wakuDebugWarn(`[xaomsg] waku#6: no LightPush peer within window (attempt ${attempt}/${MAX_ATTEMPTS}), trying send anyway`);
    }

    wakuDebugLog(`[xaomsg] waku#7: publishToTopic: sending (attempt ${attempt}/${MAX_ATTEMPTS})`);
    const result = await node.lightPush.send(encoder, { payload });
    // `successes`/`failures` are independent: light-push can (and does, e.g.
    // when a peer requires an RLN proof this client never generates) fail on
    // some peers while succeeding on others. At least one success means the
    // message genuinely reached the network.
    if (result.successes && result.successes.length > 0) {
      if (result.failures && result.failures.length > 0) {
        console.warn('[xaomsg] light-push partially failed (delivered to at least one peer):', result.failures);
      }
      wakuDebugLog(`[xaomsg] waku#8: publishToTopic: send succeeded (attempt ${attempt}/${MAX_ATTEMPTS})`);
      return;
    }

    lastFailures = result.failures;
    console.warn(`[xaomsg] light-push attempt ${attempt}/${MAX_ATTEMPTS} failed:`, result.failures);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  wakuDebugError(`[xaomsg] waku#8: publishToTopic: all ${MAX_ATTEMPTS} attempts failed`);
  throw new Error(`Waku light-push failed after ${MAX_ATTEMPTS} attempts: ${JSON.stringify(lastFailures)}`);
}

/**
 * Backfill history from a Waku store node for the given content topic.
 *
 * Best-effort: the light node connects to Store peers lazily, so we wait a
 * short window for one before querying. If no store peer is reachable (some
 * bootstrap nodes don't serve Store), we log and resolve without throwing —
 * the live filter path must never regress just because history is unavailable.
 *
 * `onMessage` receives raw bytes per message — same contract as
 * `subscribeToTopic`, so callers reuse one decode/decrypt/verify pipeline.
 */
export async function queryHistory(
  contentTopic: string,
  onMessage: (bytes: Uint8Array, timestamp?: Date) => void | Promise<void>,
): Promise<void> {
  wakuDebugLog('[xaomsg] waku#9: queryHistory: getting waku client');
  const node = await getWakuClient();
  try {
    // Store peers connect after the LightPush/Filter ones getWakuClient waits
    // for; give them a brief window rather than failing outright.
    wakuDebugLog('[xaomsg] waku#10: queryHistory: waiting for Store peer');
    await waitForRemotePeer(node, [Protocols.Store], 15_000);
  } catch {
    console.warn('[xaomsg] no Waku store peer available; skipping history backfill');
    return;
  }
  try {
    wakuDebugLog('[xaomsg] waku#11: queryHistory: querying store');
    const decoder = createDecoder(contentTopic);
    await node.store.queryWithOrderedCallback([decoder], async (wakuMessage) => {
      if (wakuMessage.payload) await onMessage(wakuMessage.payload, wakuMessage.timestamp);
    });
    wakuDebugLog('[xaomsg] waku#11: queryHistory: store query complete');
  } catch (err) {
    console.warn('[xaomsg] store history query failed:', err);
  }
}

/**
 * Subscribe to a content topic. Returns an unsubscribe function.
 * `onMessage` receives raw bytes — caller is responsible for decode/decrypt.
 */
export async function subscribeToTopic(
  contentTopic: string,
  onMessage: (bytes: Uint8Array) => void,
): Promise<() => Promise<void>> {
  wakuDebugLog('[xaomsg] waku#12: subscribeToTopic: getting waku client');
  const node = await getWakuClient();
  const decoder = createDecoder(contentTopic);

  // Filter draws from the node-wide locked-peer pool (see numPeersToUse
  // above) — a single peer disconnecting can transiently zero it out and
  // fail subscribe with "No peer available" even though the node connected
  // fine at startup. That's transient (the peer manager reconnects in the
  // background), so retry a few times before giving up rather than letting
  // one bad moment permanently kill live delivery + history backfill for
  // this thread (queryHistory only runs after this call succeeds).
  const MAX_ATTEMPTS = 3;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    wakuDebugLog(`[xaomsg] waku#13: subscribeToTopic: waiting for Filter peer (attempt ${attempt}/${MAX_ATTEMPTS})`);
    try {
      await waitForRemotePeer(node, [Protocols.Filter], 8_000);
    } catch {
      // No peer yet within the window — still try to subscribe (and retry below).
      wakuDebugWarn(`[xaomsg] waku#13: no Filter peer within window (attempt ${attempt}/${MAX_ATTEMPTS}), trying subscribe anyway`);
    }

    wakuDebugLog(`[xaomsg] waku#14: subscribeToTopic: calling filter.subscribe (attempt ${attempt}/${MAX_ATTEMPTS})`);
    const { subscription, error } = await node.filter.subscribe([decoder], (wakuMessage) => {
      if (wakuMessage.payload) onMessage(wakuMessage.payload);
    });
    if (!error && subscription) {
      wakuDebugLog(`[xaomsg] waku#15: subscribeToTopic: subscribed (attempt ${attempt}/${MAX_ATTEMPTS})`);
      return async () => {
        try {
          await subscription.unsubscribe([contentTopic]);
        } catch {
          // ignore — node may already be torn down
        }
      };
    }

    lastError = error;
    console.warn(`[xaomsg] filter subscribe attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  wakuDebugError(`[xaomsg] waku#15: subscribeToTopic: all ${MAX_ATTEMPTS} attempts failed`);
  throw new Error(`Waku filter subscribe failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
}

/** Tear down the singleton. Call from a global "logout" or `beforeunload`. */
export async function shutdownWakuClient(): Promise<void> {
  if (!nodeP) return;
  const node = await nodeP;
  await node.stop();
  nodeP = null;
}
