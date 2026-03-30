import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { maskPhone } from '@/utils/phone';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

interface ClienteVerifyCodeProps {
  onBack: () => void;
}

export function ClienteVerifyCode({ onBack }: ClienteVerifyCodeProps) {
  const {
    verifyCode,
    isVerifying,
    error,
    clearError,
    codeSentTo,
    codeSentMethod,
    pendingCpfOrPhone,
    requestCode,
    isSendingCode,
  } = useClienteAuthContext();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focar no primeiro input ao montar
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    clearError();

    // Auto-avançar para próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submeter quando completo
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setCode(newCode);

      if (pastedData.length === 6) {
        verifyCode(pastedData);
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const handleResend = async () => {
    if (!pendingCpfOrPhone || !codeSentMethod) {
      return;
    }

    // Limpar o código digitado
    setCode(['', '', '', '', '', '']);
    clearError();

    // Reenviar código usando o mesmo CPF/telefone e método
    await requestCode(pendingCpfOrPhone, codeSentMethod);

    // Focar no primeiro input
    inputRefs.current[0]?.focus();
  };

  const fullCode = code.join('');
  const isComplete = fullCode.length === 6;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-4 top-4 text-gray-600 hover:text-[#662E8E]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <CardTitle className="mt-8 text-2xl text-gray-800">Verificação</CardTitle>
        <CardDescription className="text-gray-500">
          Digite o código de 6 dígitos enviado para
          <br />
          <span className="font-semibold text-[#662E8E]">
            {codeSentMethod === 'whatsapp'
              ? `WhatsApp: ${maskPhone(codeSentTo || '')}`
              : `Email: ${codeSentTo}`}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Inputs do código */}
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-gray-300 focus:border-[#662E8E] focus:ring-[#662E8E]"
                disabled={isVerifying}
              />
            ))}
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Botão verificar */}
          <Button
            className="w-full h-12 text-base font-semibold bg-[#662E8E] hover:bg-[#4a2268]"
            disabled={!isComplete || isVerifying}
            onClick={() => verifyCode(fullCode)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Código'
            )}
          </Button>

          {/* Reenviar */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Não recebeu o código?
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={handleResend}
              disabled={isSendingCode}
              className="text-[#662E8E] hover:text-[#4a2268]"
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reenviar código
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
