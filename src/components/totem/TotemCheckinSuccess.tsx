import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TotemCheckinSuccessProps {
  nomeCliente: string;
  onReset: () => void;
  autoResetSeconds?: number;
}

export function TotemCheckinSuccess({
  nomeCliente,
  onReset,
  autoResetSeconds = 10,
}: TotemCheckinSuccessProps) {
  const [countdown, setCountdown] = useState(autoResetSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReset]);

  return (
    <Card className="bg-white shadow-xl overflow-hidden">
      <CardContent className="p-8 text-center">
        {/* Ícone de sucesso animado */}
        <div className="mb-6">
          <div
            className={cn(
              'w-24 h-24 mx-auto rounded-full',
              'bg-green-100 flex items-center justify-center',
              'animate-bounce'
            )}
          >
            <CheckCircle className="h-14 w-14 text-green-500" />
          </div>
        </div>

        {/* Mensagem */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Check-in Confirmado!
        </h2>

        <p className="text-xl text-gray-600 mb-2">
          Olá, <span className="font-semibold text-[#662E8E]">{nomeCliente}</span>!
        </p>

        <p className="text-gray-500 mb-8">
          Sua presença foi registrada com sucesso.
          <br />
          Aguarde ser chamado(a).
        </p>

        {/* Contador de auto-reset */}
        <div className="mb-6">
          <p className="text-sm text-gray-400">
            Voltando à tela inicial em{' '}
            <span className="font-bold text-[#662E8E]">{countdown}</span> segundos...
          </p>
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#662E8E] transition-all duration-1000 ease-linear"
              style={{
                width: `${(countdown / autoResetSeconds) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Botão para voltar manualmente */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Novo Check-in
        </Button>
      </CardContent>
    </Card>
  );
}
