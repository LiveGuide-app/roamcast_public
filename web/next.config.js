/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable experimental features needed for audio streaming
  experimental: {
    // Enable server actions
    serverActions: true,
  },
  // Configure headers for audio streaming
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  // Configure webpack for audio processing
  webpack: (config, { isServer }) => {
    // Add any webpack configurations here if needed
    return config;
  },
};

module.exports = nextConfig; 