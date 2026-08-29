import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rutea por subdominio, igual que el resto de los productos:
 *
 *   soytu.com.ar        → la landing
 *   app.soytu.com.ar    → el superadmin
 *
 * En desarrollo funciona igual con `app.localhost:4600`, así no hace falta
 * probar contra una estructura distinta de la que va a producción.
 *
 * El panel vive en `/app` en el árbol de archivos, pero eso no se ve en la URL:
 * se reescribe. Si alguien entra a soytu.com.ar/app se lo manda a la landing —
 * hay una sola puerta al panel y es el subdominio.
 */
/** Lo que es del panel y no tiene por qué existir en el dominio público. */
const PANEL = ['/app', '/products', '/tenants', '/login'];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const esPanel = host.startsWith('app.');
  const { pathname } = request.nextUrl;

  if (esPanel) {
    if (pathname.startsWith('/api')) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? '/app' : pathname;
    return NextResponse.rewrite(url);
  }

  // Fuera del subdominio, el panel no existe. El gate de superadmin igual lo
  // protege, pero una sola puerta es más fácil de razonar que dos.
  if (PANEL.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
