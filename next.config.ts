import type { NextConfig } from "next";

/**
 * Export estático: `next build` deja el sitio listo en `out/`.
 *
 * Es lo mismo que usa la landing de soytubot. En App Platform va con build
 * command `npm run build` y output directory `out`.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
