/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Enable WebAssembly support (required for @xmtp/wasm-bindings)
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
      'rpudlgqqgutfumiihqhb.supabase.co'
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
