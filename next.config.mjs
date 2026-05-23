/** @type {import('next').NextConfig} */
const nextConfig = {};

// Skip prerendering for login page (uses useSearchParams)
// Turbopack ignores dynamic = force-dynamic so we work around at build time
export default nextConfig;
