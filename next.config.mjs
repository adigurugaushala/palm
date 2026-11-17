/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Express API (server/) runs in the same process and is not part of the Next build.
  outputFileTracingExcludes: { '*': ['./data/**'] },
};
export default nextConfig;
