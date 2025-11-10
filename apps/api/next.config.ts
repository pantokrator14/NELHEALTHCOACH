import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Paquetes externos para el servidor - FORMA CORRECTA en Next.js 15
  serverExternalPackages: ['mongodb'],
  
  // Configuración experimental (si es necesaria)
  experimental: {
    // Otras configuraciones experimentales si las necesitas
  },
};

export default nextConfig;