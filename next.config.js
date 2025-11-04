/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Enable CSS modules if needed
  // Experimental features
  experimental: {
    // Add any experimental features here
  },
}

module.exports = nextConfig

