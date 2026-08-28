/**
 * Los seis productos, con su sitio propio.
 *
 * soytu no vende: explica y deriva. Por eso acá no hay precios — cada producto
 * los muestra en su sitio, que es donde se pueden mantener sin que se
 * desactualicen en dos lados.
 *
 * Todos son .com menos soytubot, que es .com.ar.
 */
export type Producto = {
  slug: string;
  nombre: string;
  /** De qué se ocupa, en dos palabras. */
  rubro: string;
  descripcion: string;
  features: string[];
  /** Para quién es. Ayuda al que llega y no sabe cuál le sirve. */
  paraQuien: string;
  sitio: string;
  inicial: string;
};

export const PRODUCTOS: Producto[] = [
  {
    slug: "soytuadmin",
    nombre: "soytuadmin",
    rubro: "Gestión",
    inicial: "A",
    descripcion:
      "Lo que se compra, lo que se vende y lo que queda. El sistema central del negocio.",
    features: [
      "Productos, stock y listas de precios",
      "Ventas, compras y proveedores",
      "Facturación electrónica AFIP",
      "Caja diaria por sucursal",
      "Mercado Libre, Mercado Pago y Tienda Nube",
    ],
    paraQuien: "Para comercios, distribuidoras y mayoristas.",
    sitio: "https://soytuadmin.com",
  },
  {
    slug: "soytubot",
    nombre: "soytubot",
    rubro: "Atención automática",
    inicial: "B",
    descripcion:
      "Un agente de IA que atiende por WhatsApp, responde y agenda a cualquier hora, y te pasa la conversación cuando hace falta.",
    features: [
      "Responde con tu catálogo y tus precios",
      "Toma pedidos y reserva turnos",
      "Deriva a una persona cuando conviene",
      "Saludos de cumpleaños y campañas",
    ],
    paraQuien: "Para el que no da abasto contestando mensajes.",
    sitio: "https://soytubot.com.ar",
  },
  {
    slug: "soytucanje",
    nombre: "soytucanje",
    rubro: "Fidelidad",
    inicial: "C",
    descripcion:
      "Puntos que se ganan comprando y se cambian por premios. Sin tarjetas ni apps: con el teléfono alcanza.",
    features: [
      "Puntos automáticos en cada venta",
      "Premios y canjes con stock reservado",
      "Historial por cliente",
      "Avisos por WhatsApp",
    ],
    paraQuien: "Para que el cliente vuelva.",
    sitio: "https://soytucanje.com",
  },
  {
    slug: "soytuturno",
    nombre: "soytuturno",
    rubro: "Agenda",
    inicial: "T",
    descripcion:
      "Turnos para canchas, consultorios y profesionales. El cliente reserva solo, de la web o del bot.",
    features: [
      "Agenda por cancha o por profesional",
      "Reserva online y por WhatsApp",
      "Turnos fijos y bloqueos de horario",
      "Señas y precios por servicio",
    ],
    paraQuien: "Para clubes, peluquerías y consultorios.",
    sitio: "https://soytuturno.com",
  },
  {
    slug: "soytubar",
    nombre: "soytubar",
    rubro: "Salón",
    inicial: "R",
    descripcion:
      "El mozo toma el pedido parado y con una mano. Anda sin señal y sincroniza solo cuando vuelve.",
    features: [
      "Plano del salón y comandas por mesa",
      "Pantalla de barra y de cocina",
      "Dividir la cuenta entre los que se sentaron",
      "Recetas que descuentan del stock",
      "Caja con cierre a ciegas",
    ],
    paraQuien: "Para bares, restós y canchas con buffet.",
    sitio: "https://soytubar.com",
  },
  {
    slug: "soytucine",
    nombre: "soytucine",
    rubro: "Contenido con IA",
    inicial: "N",
    descripcion:
      "Fotos y videos de tus productos generados con IA, sin sesión de fotos ni edición.",
    features: [
      "Piezas para redes y publicaciones",
      "Tu catálogo como punto de partida",
      "Listo para publicar",
    ],
    paraQuien: "Para el que vende con la foto.",
    sitio: "https://soytucine.com",
  },
];

export const WHATSAPP = "https://wa.me/5493415961504";
export const EMAIL = "soytubot4@gmail.com";
