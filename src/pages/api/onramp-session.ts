// Server-side Coinbase Onramp session-token minting.
//
// CDP projects with "secure initialization" enabled reject the old
// appId + destinationWallets URL params and instead require a short-lived
// sessionToken minted with the project's Secret API Key. The key never leaves
// the server — the browser only ever receives the opaque session token.
//
// Env (server-only, NOT NEXT_PUBLIC):
//   CDP_API_KEY_ID      — the Secret API Key id (e.g. "organizations/.../apiKeys/..."
//                         for ECDSA keys, or a UUID for Ed25519 keys)
//   CDP_API_KEY_SECRET  — the private key: an EC PEM ("-----BEGIN EC PRIVATE KEY-----")
//                         for ECDSA, or a base64 string for Ed25519
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { SignJWT, importPKCS8, type KeyLike } from 'jose';

const CDP_HOST = 'api.developer.coinbase.com';
const TOKEN_PATH = '/onramp/v1/token';

type KeyMaterial = { key: KeyLike | crypto.KeyObject; alg: 'ES256' | 'EdDSA' };

// Coinbase hands the private key out in one of two shapes. Detect which and turn
// it into something jose can sign with.
async function loadKey(secret: string): Promise<KeyMaterial> {
  const pem = secret.includes('\\n') ? secret.replace(/\\n/g, '\n') : secret;
  if (pem.includes('BEGIN')) {
    // ECDSA (ES256). EC keys come as SEC1 ("EC PRIVATE KEY") or PKCS8; Node's
    // createPrivateKey handles both, and jose signs with the resulting KeyObject.
    if (pem.includes('BEGIN EC PRIVATE KEY') || pem.includes('BEGIN PRIVATE KEY')) {
      try {
        return { key: crypto.createPrivateKey(pem), alg: 'ES256' };
      } catch {
        return { key: await importPKCS8(pem, 'ES256'), alg: 'ES256' };
      }
    }
    return { key: await importPKCS8(pem, 'ES256'), alg: 'ES256' };
  }
  // Ed25519 (EdDSA): a base64 seed (32 bytes) or seed+pubkey (64 bytes). Wrap the
  // 32-byte seed in the fixed Ed25519 PKCS8 DER prefix so Node can import it.
  const raw = Buffer.from(secret, 'base64');
  const seed = raw.length >= 32 ? raw.subarray(0, 32) : raw;
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const der = Buffer.concat([pkcs8Prefix, seed]);
  const keyObject = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  return { key: keyObject, alg: 'EdDSA' };
}

async function makeCdpJwt(keyId: string, secret: string): Promise<string> {
  const { key, alg } = await loadKey(secret);
  const now = Math.floor(Date.now() / 1000);
  const uri = `POST ${CDP_HOST}${TOKEN_PATH}`;
  return new SignJWT({ iss: 'cdp', sub: keyId, uri })
    .setProtectedHeader({ alg, kid: keyId, typ: 'JWT', nonce: crypto.randomBytes(16).toString('hex') })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .sign(key as KeyLike);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.CDP_API_KEY_ID;
  const secret = process.env.CDP_API_KEY_SECRET;
  if (!keyId || !secret) {
    return res.status(500).json({ error: 'Onramp is not configured on the server (missing CDP API key).' });
  }

  const { address, network } = req.body as { address?: string; network?: string };
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'A valid wallet address is required.' });
  }
  const chainNetwork = network === 'base' ? 'base' : 'base-sepolia';

  try {
    const jwt = await makeCdpJwt(keyId, secret);
    const cdpRes = await fetch(`https://${CDP_HOST}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address, blockchains: [chainNetwork] }],
        assets: ['USDC'],
      }),
    });

    const rawBody = await cdpRes.text();
    let data: Record<string, unknown> = {};
    try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { /* non-JSON body */ }

    // Surface the real CDP error while debugging (dev only) — it's an error
    // message, never the API key. Set ONRAMP_DEBUG=true to expose it in prod too.
    const debug = process.env.NODE_ENV !== 'production' || process.env.ONRAMP_DEBUG === 'true';

    if (!cdpRes.ok) {
      console.error('[onramp-session] CDP token request failed:', cdpRes.status, rawBody);
      return res.status(502).json({
        error: 'Could not start card payment. Please try again.',
        ...(debug ? { cdpStatus: cdpRes.status, cdpError: data && Object.keys(data).length ? data : rawBody } : {}),
      });
    }

    // CDP returns the session token as `token` (older responses used `sessionToken`).
    const sessionToken = (data.token || data.sessionToken) as string | undefined;
    if (!sessionToken) {
      console.error('[onramp-session] no token in CDP response:', rawBody);
      return res.status(502).json({
        error: 'Could not start card payment. Please try again.',
        ...(debug ? { cdpStatus: cdpRes.status, cdpBody: data && Object.keys(data).length ? data : rawBody } : {}),
      });
    }
    return res.status(200).json({ sessionToken });
  } catch (err) {
    console.error('[onramp-session] error minting session token:', err);
    return res.status(500).json({ error: 'Could not start card payment. Please try again.' });
  }
}
