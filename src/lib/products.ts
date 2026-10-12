/**
 * Los productos que se cobran, con el nombre que usa `tenants.enabled_products`.
 *
 * Es una lista aparte de la de `components/productos.ts` a propósito: aquella
 * es la de la landing (texto de venta, colores, features) y esta es la del
 * panel, donde la `key` TIENE que coincidir con lo que guarda la base. Un
 * producto nuevo va en las dos, y si entra solo en una queda mal de un lado:
 * sin su tarjeta en la home, o sin poder marcárselo a un comercio.
 *
 * soytubot no está: no se cobra por acá (se factura aparte, por volumen de
 * mensajes).
 */
export const PRODUCTS = [
  { key: 'soytuadmin', nombre: 'Gestión', sitio: 'https://soytuadmin.com' },
  { key: 'soytubar', nombre: 'Bar', sitio: 'https://soytubar.com' },
  { key: 'soytucanje', nombre: 'Fidelidad', sitio: 'https://soytucanje.com' },
  { key: 'soytuturno', nombre: 'Turnos', sitio: 'https://soytuturno.com' },
  { key: 'soytucine', nombre: 'Contenido', sitio: 'https://soytucine.com' },
  { key: 'soytucontador', nombre: 'Contador', sitio: 'https://soytucontador.com' },
  { key: 'soytuinmobiliaria', nombre: 'Inmobiliaria', sitio: 'https://soytuinmobiliaria.com' },
] as const;

export type ProductKey = (typeof PRODUCTS)[number]['key'];
