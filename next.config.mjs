/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@prisma/client",
    "@qdrant/js-client-rest",
    "@huggingface/transformers",
    "tesseract.js",
    "pdf-parse",
  ],
  experimental: {
    // analyze route runs the agent pipeline — give it room
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
