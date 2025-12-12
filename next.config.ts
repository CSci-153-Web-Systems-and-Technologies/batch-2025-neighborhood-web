import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oybcpyomhbhqulrzzfg.supabase.co', // Your Supabase project domain
        port: '',
        pathname: '/storage/v1/object/public/**',    // Path to public storage buckets
      },
    ],
  },
};

export default nextConfig;