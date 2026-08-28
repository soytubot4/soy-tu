import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { ProductosGrid } from "@/components/sections/productos-grid";
import { ComoFunciona } from "@/components/sections/como-funciona";
import { Contacto } from "@/components/sections/contacto";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProductosGrid />
        <ComoFunciona />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}
