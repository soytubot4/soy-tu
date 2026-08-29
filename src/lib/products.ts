/** Los cinco productos, con el nombre que usa `tenants.enabled_products`. */
export const PRODUCTS = [
  { key: 'soytuadmin', nombre: 'Gestión', sitio: 'https://soytuadmin.com' },
  { key: 'soytubar', nombre: 'Bar', sitio: 'https://soytubar.com' },
  { key: 'soytucanje', nombre: 'Fidelidad', sitio: 'https://soytucanje.com' },
  { key: 'soytuturno', nombre: 'Turnos', sitio: 'https://soytuturno.com' },
  { key: 'soytucine', nombre: 'Contenido', sitio: 'https://soytucine.com' },
] as const;

export type ProductKey = (typeof PRODUCTS)[number]['key'];
