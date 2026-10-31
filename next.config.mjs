import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deja clara la raíz del proyecto (evita lockfiles de directorios superiores).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
