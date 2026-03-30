import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreditCard, QrCode, RefreshCw, Tag } from "lucide-react";

interface PricingTableProps {
  preco: number | null;
  precoPromocional: number | null;
  custoPix: number | null;
  custoCartao: number | null;
  numeroSessoes?: number | null;
  precoVolume?: number | null;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

function calcDiscount(original: number, discounted: number): number {
  if (original <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

interface PaymentRow {
  icon: React.ReactNode;
  label: string;
  price: number;
  discountPercent: number;
  installments?: { count: number; value: number };
  isBestPrice?: boolean;
}

export function PricingTable({
  preco,
  precoPromocional,
  custoPix,
  custoCartao,
  numeroSessoes,
  precoVolume,
}: PricingTableProps) {
  const hasAnyPrice = preco || precoPromocional || custoPix || custoCartao;

  if (!hasAnyPrice) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Entre em contato para consultar valores.
          </p>
        </CardContent>
      </Card>
    );
  }

  const basePrice = preco || precoPromocional || 0;
  const hasPromo = precoPromocional != null && preco != null && precoPromocional < preco;
  const referencePrice = hasPromo ? precoPromocional! : basePrice;

  // Build payment rows
  const rows: PaymentRow[] = [];

  // Recurring card (estimate: ~10% off promotional or base)
  if (referencePrice > 0 && custoCartao) {
    const recurringPrice = Math.round(custoCartao * 0.9 * 100) / 100;
    if (recurringPrice < referencePrice) {
      rows.push({
        icon: <RefreshCw className="w-5 h-5" />,
        label: "Cartao recorrente",
        price: recurringPrice,
        discountPercent: calcDiscount(referencePrice, recurringPrice),
      });
    }
  }

  // Credit card
  if (custoCartao && custoCartao > 0) {
    const installmentCount = 12;
    const installmentValue =
      Math.ceil((custoCartao / installmentCount) * 100) / 100;
    rows.push({
      icon: <CreditCard className="w-5 h-5" />,
      label: "Cartao de credito",
      price: custoCartao,
      discountPercent: calcDiscount(referencePrice, custoCartao),
      installments: { count: installmentCount, value: installmentValue },
    });
  }

  // PIX - best deal
  if (custoPix && custoPix > 0) {
    rows.push({
      icon: <QrCode className="w-5 h-5" />,
      label: "PIX",
      price: custoPix,
      discountPercent: calcDiscount(referencePrice, custoPix),
      isBestPrice: true,
    });
  }

  // Sort by price ascending
  rows.sort((a, b) => a.price - b.price);

  // Mark the cheapest as best price
  if (rows.length > 0) {
    rows.forEach((r) => (r.isBestPrice = false));
    rows[rows.length - 1].isBestPrice = false;
    const cheapest = rows.reduce((min, r) => (r.price < min.price ? r : min), rows[0]);
    cheapest.isBestPrice = true;
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-700 text-white pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Valores
          {numeroSessoes && numeroSessoes > 0 && (
            <span className="text-sm font-normal opacity-90">
              ({numeroSessoes} sess{numeroSessoes === 1 ? "ao" : "oes"})
            </span>
          )}
        </CardTitle>

        {/* Original / Promotional prices */}
        {hasPromo && preco && precoPromocional && (
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">De:</span>
              <span className="text-base line-through opacity-70">
                {formatCurrency(preco)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Valor promocional:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(precoPromocional)}
              </span>
              <Badge className="bg-white/20 hover:bg-white/20 text-white text-xs">
                -{calcDiscount(preco, precoPromocional)}%
              </Badge>
            </div>
          </div>
        )}

        {!hasPromo && basePrice > 0 && (
          <div className="pt-2">
            <span className="text-2xl font-bold">
              {formatCurrency(basePrice)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {rows.length > 0 && (
          <div className="divide-y">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between px-5 py-4 transition-colors",
                  row.isBestPrice && "bg-emerald-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      row.isBestPrice
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {row.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{row.label}</span>
                      {row.discountPercent > 0 && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            row.isBestPrice &&
                              "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          {row.discountPercent}% OFF
                        </Badge>
                      )}
                      {row.isBestPrice && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                          Melhor preco
                        </Badge>
                      )}
                    </div>
                    {row.installments && (
                      <span className="text-xs text-muted-foreground">
                        {row.installments.count}x de{" "}
                        {formatCurrency(row.installments.value)}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    "text-lg font-bold",
                    row.isBestPrice ? "text-emerald-700" : "text-foreground"
                  )}
                >
                  {formatCurrency(row.price)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Volume pricing */}
        {precoVolume && precoVolume > 0 && (
          <div className="px-5 py-3 bg-blue-50 border-t flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">
              Pacote promocional
            </span>
            <span className="text-lg font-bold text-blue-700">
              {formatCurrency(precoVolume)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
