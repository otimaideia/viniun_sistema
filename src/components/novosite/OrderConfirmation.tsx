import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, MessageCircle, ShoppingBag, User } from 'lucide-react';

interface OrderConfirmationProps {
  orderNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartao de Credito',
  recorrencia: 'Cartao Recorrente',
};

export function OrderConfirmation({
  orderNumber,
  customerName,
  total,
  paymentMethod,
}: OrderConfirmationProps) {
  const whatsappMessage = encodeURIComponent(
    `Ola! Acabei de realizar o pedido ${orderNumber} pelo site. Gostaria de agendar meu procedimento.`
  );

  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-8">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Pedido realizado com sucesso!</h2>
        <p className="text-muted-foreground">
          Obrigado, <span className="font-medium text-foreground">{customerName}</span>!
        </p>
      </div>

      {/* Order Details */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Numero do pedido</span>
            <span className="font-mono font-bold text-[#6B2D8B]">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-lg">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Forma de pagamento</span>
            <span className="font-medium">{PAYMENT_LABELS[paymentMethod] || paymentMethod}</span>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp notice */}
      <div className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-700">
        <MessageCircle className="w-5 h-5 inline-block mr-2 -mt-0.5" />
        Voce recebera uma confirmacao por WhatsApp em breve.
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <a
          href={`https://wa.me/5513991888100?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white gap-2 h-12 text-base">
            <MessageCircle className="w-5 h-5" />
            Agendar via WhatsApp
          </Button>
        </a>

        <Link to="/novosite" className="block">
          <Button variant="outline" className="w-full gap-2 h-11 border-[#6B2D8B] text-[#6B2D8B] hover:bg-[#6B2D8B] hover:text-white">
            <ShoppingBag className="w-4 h-4" />
            Continuar comprando
          </Button>
        </Link>

        <Link to="/cliente" className="block">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground">
            <User className="w-4 h-4" />
            Minha conta
          </Button>
        </Link>
      </div>
    </div>
  );
}
