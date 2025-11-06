import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
    responseLimit: '8mb',
  },
  
  env: {
    CUSTOM_PORT: '3001'
  }
};

export default nextConfig;