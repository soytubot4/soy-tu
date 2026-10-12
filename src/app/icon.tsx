import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * El favicon: el ladrillo OFICIAL de la marca sobre Void.
 *
 * Es el mismo `/public/marca/soy-tu.svg` que usa toda la web, embebido como
 * data URI. Antes acá había tres polígonos dibujados a mano que imitaban un
 * ladrillo: a 32 px pasaba por una caja azul cualquiera y, peor, no era el
 * ladrillo — si se retoca la marca, un dibujo aparte queda desfasado y nadie
 * se acuerda de que existe.
 *
 * Sin fondo: el PNG sale transparente y el ladrillo se apoya en el color de la
 * barra, sea clara u oscura. Se banca las dos porque no es blanco plano — las
 * caras laterales y la leyenda son Void, así que sobre fondo claro lo que se
 * ve es ese contraste, y sobre oscuro, la cara Luz y el halo.
 *
 * Va a 1,4x del lienzo y se le recortan las puntas. El ladrillo es ancho y
 * bajo, y centrado entero en un cuadrado usaba el 98% del ancho pero solo el
 * 66% del alto: en la pestaña se veía diminuto. Agrandarlo hasta que las dos
 * esquinas se vayan de cuadro es lo único que lo hace crecer, porque el límite
 * es la forma del ladrillo y no el encuadre. Más de esto empieza a comerse el
 * "TU" de la leyenda.
 */
const LADRILLO = readFileSync(join(process.cwd(), "public", "marca", "soy-tu.svg"));
const LADRILLO_URI = `data:image/svg+xml;base64,${LADRILLO.toString("base64")}`;

// 128 y no 32: el navegador lo baja a 16/32 con un filtro mucho mejor que el
// rasterizado directo a 32, donde los tetones y el borde se hacían puré.
export const size = { width: 128, height: 128 };
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
          // Lo que se sale por las puntas se recorta: ver abajo por qué.
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LADRILLO_URI} width={179} height={123} alt="" />
      </div>
    ),
    size,
  );
}
