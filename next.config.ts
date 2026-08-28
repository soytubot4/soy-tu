import type { NextConfig } from "next";

/**
 * Ya no es export estático.
 *
 * La home (soytu.com.ar) sigue siendo la landing, pero ahora el proyecto también
 * sirve el superadmin en app.soytu.com.ar, que necesita servidor: lee la base
 * compartida y valida la sesión.
 */
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
