/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure output for standalone deployment
  output: 'standalone',
  
  // Ensure proper handling of TypeScript
  typescript: {
    // Allow production builds to complete even if there are type errors
    ignoreBuildErrors: true,
  },
  
  // Handle ESLint errors during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Enable React strict mode
  reactStrictMode: true,

  // Configure images if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Webpack configuration for better compatibility
  webpack: (config, { isServer }) => {
    // Fix for socket.io client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
