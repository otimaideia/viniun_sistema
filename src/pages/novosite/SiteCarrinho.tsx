import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';
import { CouponInput } from '@/components/novosite/CouponInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  QrCode,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ─── Component ────────────────────────────────────────────────

export default function SiteCarrinho() {
  const {
    items,
    coupon,
    itemCount,
    removeItem,
    updateQuantity,
    getSubtotal,
    getDiscount,
    getTotal,
    getTotalPix,
    getTotalCartao,
  } = useCart();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const totalPix = getTotalPix();
  const totalCartao = getTotalCartao();
  const totalRecorrente = getTotal('recorrente');
  const installmentValue = Math.ceil((totalCartao / 12) * 100) / 100;

  // ── Empty State ─────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <>
        <SEOHead title="Carrinho" noIndex />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Carrinho' }]} />
        </div>

        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-20 w-20 text-muted-foreground/20 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Seu carrinho esta vazio</h1>
          <p className="text-muted-foreground mb-8">
            Explore nossos servicos de estetica e depilacao a laser e adicione ao carrinho.
          </p>
          <Link to="/novosite">
            <Button size="lg" className="bg-[#6B2D8B] hover:bg-[#5A2574] text-white gap-2">
              <ArrowLeft className="h-4 w-4" />
              Explorar Servicos
            </Button>
          </Link>
        </div>
      </>
    );
  }

  // ── Cart with Items ─────────────────────────────────────────

  return (
    <>
      <SEOHead title="Carrinho" noIndex />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Carrinho' }]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h1 className="text-2xl font-bold mb-6">
          Meu Carrinho
          <span className="text-base font-normal text-muted-foreground ml-2">
            ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* ── Left Column: Items ───────────────────────────── */}
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      to={item.url_slug ? `/novosite/servico/${item.url_slug}` : '#'}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted shrink-0"
                    >
                      {item.imagem_url ? (
                        <img
                          src={item.imagem_url}
                          alt={item.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                          <span className="text-white/60 text-3xl font-light">
                            {item.nome.charAt(0)}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight line-clamp-2">
                            {item.nome}
                          </h3>
                          {item.sessoes && item.sessoes > 0 && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {item.sessoes} {item.sessoes === 1 ? 'sessao' : 'sessoes'} no protocolo
                            </p>
                          )}
                        </div>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                          onClick={() => removeItem(item.id)}
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Price + Quantity row */}
                      <div className="flex items-end justify-between mt-3 gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-9 text-center font-medium">
                            {item.quantidade}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right">
                          {item.quantidade > 1 && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.preco)} un.
                            </p>
                          )}
                          <p className="text-lg font-bold text-[#6B2D8B]">
                            {formatCurrency(item.preco * item.quantidade)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Continue Shopping */}
            <div className="pt-2">
              <Link
                to="/novosite"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#6B2D8B] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Continuar comprando
              </Link>
            </div>
          </div>

          {/* ── Right Column: Summary ────────────────────────── */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* Coupon */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Cupom de desconto</h3>
                <CouponInput />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Resumo do pedido</h3>

                {/* Subtotal + Discount */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {coupon && discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Desconto ({coupon.codigo})</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Opcoes de pagamento
                  </h4>

                  {/* PIX - Best deal */}
                  <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-emerald-700">PIX</span>
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Melhor preco
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 pl-9">
                      {formatCurrency(totalPix)}
                    </p>
                  </div>

                  {/* Cartao de Credito */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Cartao de credito</span>
                    </div>
                    <div className="pl-9">
                      <p className="text-lg font-bold">{formatCurrency(totalCartao)}</p>
                      <p className="text-xs text-muted-foreground">
                        ou 12x de {formatCurrency(installmentValue)}
                      </p>
                    </div>
                  </div>

                  {/* Recorrente */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Cartao recorrente</span>
                    </div>
                    <div className="pl-9">
                      <p className="text-lg font-bold">{formatCurrency(totalRecorrente)}</p>
                      <p className="text-xs text-muted-foreground">
                        Debito mensal no cartao
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CTA */}
                <Link to="/novosite/checkout" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-[#6B2D8B] hover:bg-[#5A2574] text-white text-base gap-2"
                  >
                    Finalizar Compra
                  </Button>
                </Link>

                {/* Trust signal */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pagamento 100% seguro
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
