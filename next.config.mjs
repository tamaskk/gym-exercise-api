/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mongoose is a server-only dependency; keep it external to the server bundle
  // so its dynamic requires work correctly in route handlers (Next 14 key).
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
};

export default nextConfig;
