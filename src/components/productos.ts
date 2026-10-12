/**
 * Los productos de la suite, con su sitio propio.
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
  /** El nombre corto que va en la pill: "SOY TU Admin". */
  marca: string;
  /** De qué se ocupa, en dos palabras. */
  rubro: string;
  descripcion: string;
  features: string[];
  /** Para quién es. Ayuda al que llega y no sabe cuál le sirve. */
  paraQuien: string;
  sitio: string;
  inicial: string;
  /** El color del espectro que identifica al producto (guía de marca). */
  color: string;
  /** El mismo color pero apto para TEXTO sobre Void (Bot usa uno más claro). */
  colorTx: string;
  /**
   * Si ya existe su ladrillo en `/public/marca/<marca>.svg`.
   *
   * En `false` la grilla dibuja un hueco con el nombre y el color del producto
   * en vez de pedir un archivo que no está: una imagen rota en la home de la
   * suite es peor que no tener arte todavía. Cuando entre el SVG, poner `true`
   * y listo — no hay nada más que tocar.
   */
  arte: boolean;
};

export const PRODUCTS: Producto[] = [
  {
    slug: "soytuadmin",
    nombre: "soytuadmin",
    marca: "Admin",
    arte: true,
    color: "#FF7A1F",
    colorTx: "#FF7A1F",
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
    marca: "Bot",
    arte: true,
    color: "#9B3DFF",
    colorTx: "#A55CFF",
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
    marca: "Canje",
    arte: true,
    color: "#00E5A0",
    colorTx: "#00E5A0",
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
    marca: "Turno",
    arte: true,
    color: "#00C8FF",
    colorTx: "#00C8FF",
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
    marca: "Bar",
    arte: true,
    color: "#FF2ED1",
    colorTx: "#FF2ED1",
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
    marca: "Cine",
    arte: true,
    color: "#FF3D6E",
    colorTx: "#FF3D6E",
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
  {
    slug: "soytucontador",
    nombre: "soytucontador",
    marca: "Contador",
    // Todavía sin ladrillo: la grilla le dibuja el hueco.
    arte: false,
    color: "#FFC53D",
    colorTx: "#FFC53D",
    rubro: "Estudios contables",
    inicial: "O",
    descripcion:
      "Todo lo de ARCA de cada cliente en un solo lugar: situación fiscal, comprobantes, VEPs y deudas, sin entrar uno por uno.",
    features: [
      "Perfil fiscal de cada contribuyente",
      "Comprobantes emitidos y recibidos",
      "VEPs y vencimientos",
      "Deuda y cuenta corriente de ARCA",
      "Todos tus clientes en un panel",
    ],
    paraQuien: "Para el estudio que sigue a decenas de contribuyentes.",
    sitio: "https://soytucontador.com",
  },
  {
    slug: "soytuinmobiliaria",
    nombre: "soytuinmobiliaria",
    marca: "Inmobiliaria",
    arte: false,
    color: "#5B8CFF",
    colorTx: "#5B8CFF",
    rubro: "Inmobiliarias",
    inicial: "I",
    descripcion:
      "Las propiedades, las consultas y el seguimiento en un solo lugar. El interesado pregunta y el bot le contesta con lo que hay publicado.",
    features: [
      "Carga de propiedades con fotos",
      "Tu web con el catálogo al día",
      "Consultas, visitas y seguimiento",
      "Bot que filtra por lo que busca cada uno",
      "Qué se consulta y qué no",
    ],
    paraQuien: "Para inmobiliarias y martilleros.",
    sitio: "https://soytuinmobiliaria.com",
  },
];

export const WHATSAPP = "https://wa.me/5493415961504";
export const EMAIL = "soytubot4@gmail.com";
