/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Enable WebAssembly support (required for @waku/sdk's WASM bindings)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix WASM file path for production builds on Vercel
    config.output.webassemblyModuleFilename =
      isServer && !dev
        ? "../static/wasm/[modulehash].wasm"
        : "static/wasm/[modulehash].wasm";

    return config;
  },
  images: {
    domains: [
      'images.unsplash.com',
      'unsplash.com',
      'api.qrserver.com',
      'rpudlgqqgutfumiihqhb.supabase.co',
      'gateway.pinata.cloud'
    ],
  },
  // NOTE: The cross-origin isolation headers (COOP: same-origin +
  // COEP: credentialless) that used to be set on /chat-Section/* were removed —
  // COEP breaks the cross-origin Dynamic wallet iframe (app.dynamicauth.com),
  // which needs its own credentials, so the wallet failed to load on
  // /chat-Section/Chat ("iframe load timeout"). Waku's WASM does not require
  // cross-origin isolation; SharedArrayBuffer is only used opportunistically by
  // its libp2p deps and falls back to ArrayBuffer when unavailable. If a Waku
  // feature is later found to genuinely need SharedArrayBuffer, re-add these
  // headers on a route that does NOT host the Dynamic iframe.
};

module.exports = nextConfig;
