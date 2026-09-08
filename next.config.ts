import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@keycloak/keycloak-admin-client"],
};

export default nextConfig;
