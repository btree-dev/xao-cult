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
      const node = await createLightNode({ defaultBootstrap: true });
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
  if (result.failures && result.failures.length > 0) {
    throw new Error(`Waku light-push failed: ${JSON.stringify(result.failures)}`);
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
