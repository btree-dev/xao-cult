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
      const node = await createLightNode({ defaultBootstrap: true, lightPush: { numPeersToUse: 3 } });
      await node.start();
      await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter], 30_000);
      return node;
    })();
  }
  return nodeP;
}

/** Publish raw bytes (UTF-8 JSON in our case) on the given content topic. */
export async function publishToTopic(contentTopic: string, payload: Uint8Array): Promise<void> {
  const node = await getWakuClient();
  const encoder = createEncoder({ contentTopic });
  const result = await node.lightPush.send(encoder, { payload });
  // `successes`/`failures` are independent: light-push can (and does, e.g.
  // when a peer requires an RLN proof this client never generates) fail on
  // some peers while succeeding on others. Only a total failure — no peer
  // accepted the message — should throw; a partial failure alongside at
  // least one success means the message genuinely reached the network.
  if (!result.successes || result.successes.length === 0) {
    throw new Error(`Waku light-push failed: ${JSON.stringify(result.failures)}`);
  }
  if (result.failures && result.failures.length > 0) {
    console.warn('[xaomsg] light-push partially failed (message still delivered to at least one peer):', result.failures);
  }
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
  const node = await getWakuClient();
  try {
    // Store peers connect after the LightPush/Filter ones getWakuClient waits
    // for; give them a brief window rather than failing outright.
    await waitForRemotePeer(node, [Protocols.Store], 15_000);
  } catch {
    console.warn('[xaomsg] no Waku store peer available; skipping history backfill');
    return;
  }
  try {
    const decoder = createDecoder(contentTopic);
    await node.store.queryWithOrderedCallback([decoder], async (wakuMessage) => {
      if (wakuMessage.payload) await onMessage(wakuMessage.payload, wakuMessage.timestamp);
    });
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
  const node = await getWakuClient();
  const decoder = createDecoder(contentTopic);
  const { subscription, error } = await node.filter.subscribe([decoder], (wakuMessage) => {
    if (wakuMessage.payload) onMessage(wakuMessage.payload);
  });
  if (error || !subscription) {
    throw new Error(`Waku filter subscribe failed: ${String(error)}`);
  }
  return async () => {
    try {
      await subscription.unsubscribe([contentTopic]);
    } catch {
      // ignore — node may already be torn down
    }
  };
}

/** Tear down the singleton. Call from a global "logout" or `beforeunload`. */
export async function shutdownWakuClient(): Promise<void> {
  if (!nodeP) return;
  const node = await nodeP;
  await node.stop();
  nodeP = null;
}
