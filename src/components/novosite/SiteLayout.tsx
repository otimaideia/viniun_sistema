import { Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from '@/contexts/CartContext';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { MessageCircle } from 'lucide-react';

export function SiteLayout() {
  return (
    <HelmetProvider>
      <CartProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader />

        <main className="flex-1">
          <Outlet />
        </main>

        <SiteFooter />

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/5513991888100?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20servi%C3%A7os%20da%20YESlaser."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          aria-label="Fale conosco pelo WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      </div>
      </CartProvider>
    </HelmetProvider>
  );
}
