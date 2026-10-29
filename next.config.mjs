const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const suffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;

// The preview proxy serves this dev server on 3000-<suffix> while the sandbox
// host stays 3000-<sandbox id>.e2b.app, so both Next's dev-asset origin check
// and its Server Actions origin check need that public host allowlisted while
// previewing. With the flag unset, both lists stay empty (default behaviour).
const previewHosts = previewMode && suffix ? [`3000-${suffix}`] : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: previewHosts,
  experimental: {
    serverActions: {
      allowedOrigins: previewHosts,
    },
  },
};

export default nextConfig;
