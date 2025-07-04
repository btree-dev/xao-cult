/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
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
};

module.exports = nextConfig;
