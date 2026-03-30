import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';
import { CheckoutSteps } from '@/components/novosite/CheckoutSteps';
import { PaymentMethodSelector } from '@/components/novosite/PaymentMethodSelector';
import { InstallmentCalculator } from '@/components/novosite/InstallmentCalculator';
import { OrderConfirmation } from '@/components/novosite/OrderConfirmation';

import { useCart } from '@/hooks/public/useCart';
import { useCheckout } from '@/hooks/public/useCheckout';

// ─── Helpers ──────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function cpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ─── Schemas ──────────────────────────────────────────────────

const step1Schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email invalido'),
  telefone: z.string().min(14, 'Telefone invalido'),
});

const step2Schema = z.object({
  cpf: z.string().optional(),
  data_nascimento: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartao de Credito',
  recorrencia: 'Cartao Recorrente',
};

// ─── Component ────────────────────────────────────────────────

export default function SiteCheckout() {
  const navigate = useNavigate();
  const cart = useCart();
  const { createOrder, isSubmitting } = useCheckout();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'recorrencia'>('pix');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; customerName: string } | null>(null);

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { nome: '', email: '', telefone: '' },
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { cpf: '', data_nascimento: '' },
  });

  // Redirect if cart is empty (unless showing confirmation)
  useEffect(() => {
    if (cart.isEmpty && !orderResult) {
      navigate('/novosite/carrinho');
    }
  }, [cart.isEmpty, orderResult, navigate]);

  // Compute totals based on payment method
  function getTotal(): number {
    switch (paymentMethod) {
      case 'pix':
        return cart.totalPix;
      case 'cartao_credito':
        return cart.totalCartao;
      case 'recorrencia':
        return cart.totalRecorrente;
      default:
        return cart.totalAmount;
    }
  }

  const discountAmount = Math.max(0, cart.totalAmount - getTotal());

  // ─── Step Navigation ──────────────────────────────────────────

  async function handleNextStep() {
    if (currentStep === 1) {
      const valid = await step1Form.trigger();
      if (!valid) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await step2Form.trigger();
      if (!valid) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  }

  function handlePrevStep() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  // ─── Submit ────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!acceptTerms) {
      toast.error('Voce deve aceitar os termos de uso para continuar.');
      return;
    }

    const step1Data = step1Form.getValues();
    const step2Data = step2Form.getValues();
    const telefoneDigits = step1Data.telefone.replace(/\D/g, '');
    const cpfDigits = step2Data.cpf?.replace(/\D/g, '') || undefined;

    const result = await createOrder({
      items: cart.items.map((item) => ({
        service_id: item.service_id,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total,
      })),
      customer: {
        nome: step1Data.nome,
        email: step1Data.email,
        telefone: telefoneDigits,
        cpf: cpfDigits,
        data_nascimento: step2Data.data_nascimento || undefined,
      },
      paymentMethod,
      totalAmount: getTotal(),
      discountAmount,
    });

    if (result.success && result.orderNumber) {
      setOrderResult({ orderNumber: result.orderNumber, customerName: step1Data.nome });
      cart.clearCart();
      setCurrentStep(5); // Shows confirmation
      toast.success('Pedido realizado com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao processar pedido. Tente novamente.');
    }
  }

  // ─── Render: Confirmation ──────────────────────────────────────

  if (orderResult || currentStep === 5) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SEOHead title="Pedido Confirmado" noIndex />
        <OrderConfirmation
          orderNumber={orderResult?.orderNumber || ''}
          customerName={orderResult?.customerName || ''}
          total={getTotal()}
          paymentMethod={paymentMethod}
        />
      </div>
    );
  }

  // ─── Render: Steps ─────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <SEOHead title="Checkout" noIndex />

      <Breadcrumbs
        items={[
          { label: 'Carrinho', href: '/novosite/carrinho' },
          { label: 'Checkout' },
        ]}
      />

      {/* Step indicator */}
      <CheckoutSteps currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Identificacao */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identificacao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
                    {...step1Form.register('nome')}
                  />
                  {step1Form.formState.errors.nome && (
                    <p className="text-xs text-destructive">{step1Form.formState.errors.nome.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...step1Form.register('email')}
                  />
                  {step1Form.formState.errors.email && (
                    <p className="text-xs text-destructive">{step1Form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                  <Input
                    id="telefone"
                    placeholder="(13) 99999-9999"
                    {...step1Form.register('telefone', {
                      onChange: (e) => {
                        e.target.value = phoneMask(e.target.value);
                      },
                    })}
                  />
                  {step1Form.formState.errors.telefone && (
                    <p className="text-xs text-destructive">{step1Form.formState.errors.telefone.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Dados Pessoais */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (opcional)</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    {...step2Form.register('cpf', {
                      onChange: (e) => {
                        e.target.value = cpfMask(e.target.value);
                      },
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de nascimento (opcional)</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    {...step2Form.register('data_nascimento')}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pagamento */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethodSelector
                    selected={paymentMethod}
                    onSelect={setPaymentMethod}
                    totalPix={cart.totalPix}
                    totalCartao={cart.totalCartao}
                    totalRecorrente={cart.totalRecorrente}
                    precoOriginal={cart.totalAmount}
                  />

                  {paymentMethod === 'cartao_credito' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <InstallmentCalculator total={cart.totalCartao} maxInstallments={12} />
                    </div>
                  )}

                  {paymentMethod === 'recorrencia' && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <InstallmentCalculator total={cart.totalRecorrente} maxInstallments={18} />
                    </div>
                  )}

                  {paymentMethod === 'pix' && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2">
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Melhor preco!</Badge>
                      <span className="text-sm text-emerald-700">Pagamento instantaneo com desconto especial</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div key={item.service_id} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{item.nome}</span>
                          {item.quantidade > 1 && (
                            <span className="text-muted-foreground ml-1">x{item.quantidade}</span>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(item.preco_total)}</span>
                      </div>
                    ))}

                    <Separator />

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cart.totalAmount)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Desconto ({PAYMENT_METHOD_LABELS[paymentMethod]})</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-[#6B2D8B]">{formatCurrency(getTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Confirmacao */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Confirmar Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Review customer data */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Seus dados</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome</span>
                      <span className="font-medium">{step1Form.getValues('nome')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail</span>
                      <span className="font-medium">{step1Form.getValues('email')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone</span>
                      <span className="font-medium">{step1Form.getValues('telefone')}</span>
                    </div>
                    {step2Form.getValues('cpf') && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF</span>
                        <span className="font-medium">{step2Form.getValues('cpf')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review items */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Itens</h3>
                  <div className="space-y-2">
                    {cart.items.map((item) => (
                      <div key={item.service_id} className="flex justify-between items-center text-sm bg-muted/50 rounded-lg px-4 py-3">
                        <div>
                          <span className="font-medium">{item.nome}</span>
                          {item.quantidade > 1 && (
                            <span className="text-muted-foreground ml-1">x{item.quantidade}</span>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(item.preco_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review payment */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pagamento</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forma de pagamento</span>
                      <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Desconto</span>
                        <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-[#6B2D8B]">{formatCurrency(getTotal())}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Li e aceito os{' '}
                    <Link
                      to="/novosite/termos-de-uso"
                      target="_blank"
                      className="text-[#6B2D8B] underline hover:text-[#5A2574]"
                    >
                      termos de uso
                    </Link>{' '}
                    e a{' '}
                    <Link
                      to="/novosite/politica-de-privacidade"
                      target="_blank"
                      className="text-[#6B2D8B] underline hover:text-[#5A2574]"
                    >
                      politica de privacidade
                    </Link>
                    .
                  </Label>
                </div>

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!acceptTerms || isSubmitting}
                  className="w-full h-12 text-base bg-[#6B2D8B] hover:bg-[#5A2574] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 mr-2" />
                      Finalizar Pedido
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          {currentStep <= 3 && (
            <div className="flex justify-between">
              {currentStep > 1 ? (
                <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              ) : (
                <Link to="/novosite/carrinho">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Carrinho
                  </Button>
                </Link>
              )}

              <Button
                onClick={handleNextStep}
                className="gap-2 bg-[#6B2D8B] hover:bg-[#5A2574] text-white"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex justify-start">
              <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar: Order Summary (always visible) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seu Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.service_id} className="flex gap-3 text-sm">
                  {item.imagem_url ? (
                    <img
                      src={item.imagem_url}
                      alt={item.nome}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{item.nome.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.quantidade}x {formatCurrency(item.preco_unitario)}
                    </p>
                  </div>
                  <span className="font-medium text-sm">{formatCurrency(item.preco_total)}</span>
                </div>
              ))}

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cart.totalAmount)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-[#6B2D8B]">{formatCurrency(getTotal())}</span>
              </div>

              {paymentMethod === 'pix' && (
                <Badge className="w-full justify-center bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Melhor preco no PIX
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
