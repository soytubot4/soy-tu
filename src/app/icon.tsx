import { ImageResponse } from "next/og";

/**
 * El favicon: el ladrillo de la marca simplificado a 32 px (a ese tamaño los
 * tetones y el texto no se leen; queda la silueta Luz sobre Void con el halo
 * azul, que es lo que identifica).
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07071A",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 100 100">
          {/* tapa */}
          <polygon points="14,40 74,30 92,20 32,30" fill="#F4F6FF" stroke="#1F5BFF" strokeWidth="4" strokeLinejoin="round" />
          {/* lateral */}
          <polygon points="74,31 92,21 92,66 74,76" fill="#07071A" stroke="#1F5BFF" strokeWidth="4" strokeLinejoin="round" />
          {/* frente */}
          <polygon points="14,41 74,31 74,76 14,86" fill="#F4F6FF" stroke="#1F5BFF" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
