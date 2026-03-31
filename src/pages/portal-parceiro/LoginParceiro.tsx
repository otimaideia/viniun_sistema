import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useParceriaAuthContext } from '@/contexts/ParceriaAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Building2, Loader2, MessageCircle, Mail, ArrowLeft } from 'lucide-react';
import { VerificationMethod } from '@/hooks/useParceriaAuth';

type Step = 'identifier' | 'method' | 'code';

export default function LoginParceiro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isAuthenticated,
    isLoading,
    isSendingCode,
    isVerifying,
    error,
    codeSentTo,
    codeSentMethod,
    requestCode,
    verifyCode,
    clearError,
  } = useParceriaAuthContext();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState(searchParams.get('codigo') || '');
  const [verificationCode, setVerificationCode] = useState('');

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/parceiro/portal');
    }
  }, [isAuthenticated, navigate]);

  const handleIdentifierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    clearError();
    setStep('method');
  };

  const handleMethodSelect = async (method: VerificationMethod) => {
    clearError();
    const success = await requestCode(identifier, method);
    if (success) {
      setStep('code');
    }
  };

  const handleCodeSubmit = async () => {
    if (verificationCode.length !== 6) return;
    clearError();
    const success = await verifyCode(verificationCode);
    if (success) {
      navigate('/parceiro/portal');
    }
  };

  const handleBack = () => {
    clearError();
    if (step === 'method') {
      setStep('identifier');
    } else if (step === 'code') {
      setStep('method');
      setVerificationCode('');
    }
  };

  const formatDestination = (dest: string, method: VerificationMethod | null) => {
    if (method === 'email' && dest.includes('@')) {
      const [user, domain] = dest.split('@');
      const maskedUser = user.slice(0, 2) + '***';
      return `${maskedUser}@${domain}`;
    }
    if (dest.length >= 8) {
      return dest.slice(0, 4) + '****' + dest.slice(-2);
    }
    return dest;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600/5 to-emerald-500/5">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600/5 via-white to-emerald-500/5 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Parceiro</h1>
          <p className="text-gray-500 mt-1">Viniun</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            {step === 'identifier' && (
              <>
                <CardTitle>Acesse sua conta</CardTitle>
                <CardDescription>
                  Digite seu CNPJ, código de indicação, telefone ou email
                </CardDescription>
              </>
            )}
            {step === 'method' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="absolute left-4 top-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <CardTitle>Como deseja receber o código?</CardTitle>
                <CardDescription>
                  Escolha o método de verificação
                </CardDescription>
              </>
            )}
            {step === 'code' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="absolute left-4 top-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <CardTitle>Digite o código</CardTitle>
                <CardDescription>
                  Enviamos um código de 6 dígitos para{' '}
                  <span className="font-medium text-blue-600">
                    {formatDestination(codeSentTo || '', codeSentMethod)}
                  </span>
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Step 1: Identifier */}
            {step === 'identifier' && (
              <form onSubmit={handleIdentifierSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">CNPJ, Código, Telefone ou Email</Label>
                  <Input
                    id="identifier"
                    placeholder="Digite aqui..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  disabled={!identifier.trim()}
                >
                  Continuar
                </Button>
              </form>
            )}

            {/* Step 2: Method Selection */}
            {step === 'method' && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-14 justify-start gap-3 hover:bg-blue-600/5 hover:border-blue-600"
                  onClick={() => handleMethodSelect('whatsapp')}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-xs text-gray-500">Receba o código via WhatsApp</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-14 justify-start gap-3 hover:bg-blue-600/5 hover:border-blue-600"
                  onClick={() => handleMethodSelect('email')}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium">Email</p>
                    <p className="text-xs text-gray-500">Receba o código por email</p>
                  </div>
                </Button>
              </div>
            )}

            {/* Step 3: Code Verification */}
            {step === 'code' && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleCodeSubmit}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  disabled={verificationCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar'
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-sm text-gray-500"
                    onClick={() => handleMethodSelect(codeSentMethod!)}
                    disabled={isSendingCode}
                  >
                    {isSendingCode ? 'Enviando...' : 'Reenviar código'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500">
            Quer se tornar um parceiro?{' '}
            <a
              href="mailto:parcerias@viniun.com.br"
              className="text-blue-600 font-medium hover:underline"
            >
              Entre em contato
            </a>
          </p>
          <p className="text-xs text-gray-400">
            Precisa de ajuda?{' '}
            <a
              href="mailto:contato@viniun.com.br"
              className="text-blue-600 hover:underline"
            >
              Suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
