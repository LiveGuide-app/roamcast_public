/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      enabled: true
    }
  },
  // Configure headers for audio streaming and Stripe
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ],
      }
    ];
  },
  // Configure webpack for audio processing
  webpack: (config, { isServer }) => {
    // Add any webpack configurations here if needed
    return config;
  },
};

module.exports = nextConfig; 