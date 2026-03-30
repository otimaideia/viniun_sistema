import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Phone } from 'lucide-react';

interface TotemErrorProps {
  message: string;
  onRetry: () => void;
}

export function TotemError({ message, onRetry }: TotemErrorProps) {
  return (
    <Card className="bg-white shadow-xl overflow-hidden">
      <CardContent className="p-8 text-center">
        {/* Ícone de erro */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        {/* Mensagem */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ops! Algo deu errado
        </h2>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Dicas */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-600 font-medium mb-2">
            Possíveis causas:
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• CPF ou telefone digitado incorretamente</li>
            <li>• Nenhum agendamento para hoje</li>
            <li>• Agendamento em outra unidade</li>
          </ul>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-[#662E8E] hover:bg-[#4a2268]"
            onClick={onRetry}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Phone className="h-4 w-4" />
            <span>Precisa de ajuda? Fale com a recepção</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
