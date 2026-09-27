import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  // The k8s ingress serves the dev server under pet.local; without this Next blocks /_next/hmr and the app never hydrates.
  allowedDevOrigins: ["pet.local"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
