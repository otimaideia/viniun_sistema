import { MessageCircle } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Viniun.';

export default function ViniunWhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
    >
      <MessageCircle className="h-6 w-6" />
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-whatsapp/40 animate-ping pointer-events-none" />
    </a>
  );
}
