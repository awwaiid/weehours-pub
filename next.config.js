/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support BASE_PATH environment variable for nginx proxy subpaths
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH || '',
  // No rewrites needed since API and frontend are on same server
}

module.exports = nextConfig