import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { CouponInput } from './CouponInput';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface CartSidebarProps {
  children?: React.ReactNode;
}

export function CartSidebar({ children }: CartSidebarProps) {
  const {
    items,
    itemCount,
    coupon,
    removeItem,
    updateQuantity,
    getSubtotal,
    getDiscount,
    getTotalPix,
    getTotalCartao,
  } = useCart();

  const discount = getDiscount();
  const subtotal = getSubtotal();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative text-gray-600 hover:text-[#6B2D8B]">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#6B2D8B] text-[10px] font-bold text-white flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-[360px] sm:w-[400px] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <ShoppingCart className="h-5 w-5 text-[#6B2D8B]" />
            Meu Carrinho
            {itemCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-1">
              Carrinho vazio
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Explore nossos servicos e adicione ao carrinho.
            </p>
            <SheetClose asChild>
              <Link to="/novosite">
                <Button className="bg-[#6B2D8B] hover:bg-[#5B2378] text-white">
                  Ver Servicos
                </Button>
              </Link>
            </SheetClose>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                    {item.imagem_url ? (
                      <img
                        src={item.imagem_url}
                        alt={item.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <span className="text-white/70 text-lg font-light">
                          {item.nome.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2">
                      {item.nome}
                    </h4>
                    {item.sessoes && item.sessoes > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.sessoes} {item.sessoes === 1 ? 'sessao' : 'sessoes'}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-[#6B2D8B] mt-1">
                      {formatCurrency(item.preco)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium">
                        {item.quantidade}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-muted-foreground hover:text-red-500"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer - Summary */}
            <div className="border-t px-5 py-4 space-y-3 bg-muted/30">
              {/* Coupon */}
              <CouponInput />

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
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

                <Separator />

                <div className="flex justify-between font-semibold text-base">
                  <span>Total no PIX</span>
                  <span className="text-emerald-600">{formatCurrency(getTotalPix())}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>ou no cartao</span>
                  <span>{formatCurrency(getTotalCartao())}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <SheetClose asChild>
                  <Link to="/novosite/carrinho" className="block">
                    <Button variant="outline" className="w-full">
                      Ver Carrinho
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/novosite/checkout" className="block">
                    <Button className="w-full bg-[#6B2D8B] hover:bg-[#5B2378] text-white">
                      Finalizar Compra
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
