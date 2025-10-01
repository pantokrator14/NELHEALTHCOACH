import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Aquí puedes agregar configuraciones experimentales si las necesitas
  },
}

export default nextConfig