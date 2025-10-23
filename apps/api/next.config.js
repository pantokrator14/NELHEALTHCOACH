/** @type {import('next').NextConfig} */
const nextConfig = {
   serverExternalPackages: ['mongodb', 'mongoose'],
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
    responseLimit: false,
  },
  env: {
    PORT: '3001'
  }
};

module.exports = nextConfig;