import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons', '@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  turbopack: {
    root: path.resolve('./'),
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform',
  // Note: allowedDevOrigins is not a standard Next.js config key, keeping it to avoid breaking custom setups.
  allowedDevOrigins: [
    '10.0.0.17',
    'ejmcu-106-222-219-135.run.pinggy-free.link',
    'noncorruptive-elian-unintoxicating.ngrok-free.dev'
  ],
}

export default nextConfig
