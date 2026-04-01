import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { VerificationMethod } from '@/hooks/useClienteAuthAdapter';
import { applyCPFMask, cleanCPF, validateCPF } from '@/utils/cpf';
import { applyPhoneMask, cleanPhone, validatePhone, detectInputType } from '@/utils/phone';
import { MessageSquare, Mail, Loader2 } from 'lucide-react';
const logoViniun = "/images/logo-viniun.svg";

interface ClienteLoginFormProps {
  onCodeSent: () => void;
}

export function ClienteLoginForm({ onCodeSent }: ClienteLoginFormProps) {
  const { requestCode, isSendingCode, error, clearError } = useClienteAuthContext();
  const [inputValue, setInputValue] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('whatsapp');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, '');

    // Limitar a 11 dígitos
    if (cleaned.length > 11) return;

    // Detectar se é CPF ou telefone e aplicar máscara
    const inputType = detectInputType(cleaned);

    if (inputType === 'phone') {
      setInputValue(applyPhoneMask(cleaned));
    } else {
      // CPF ou ainda não determinado
      setInputValue(applyCPFMask(cleaned));
    }

    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = cleanCPF(inputValue) || cleanPhone(inputValue);
    const success = await requestCode(cleaned, method);

    if (success) {
      onCodeSent();
    }
  };

  // Validar entrada usando detectInputType e validação apropriada
  const inputType = detectInputType(inputValue);
  const isValidInput = inputType === 'cpf'
    ? validateCPF(inputValue)
    : inputType === 'phone'
      ? validatePhone(inputValue)
      : false;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center pb-2">
        <img
          src={logoViniun}
          alt="Viniun"
          className="h-14 mx-auto mb-4"
        />
        <CardTitle className="text-2xl text-gray-800">Área do Cliente</CardTitle>
        <CardDescription className="text-gray-500">
          Acesse seus agendamentos e gerencie suas informações
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input CPF/Telefone */}
          <div className="space-y-2">
            <Label htmlFor="cpf-telefone" className="text-gray-700">CPF ou Telefone</Label>
            <Input
              id="cpf-telefone"
              type="text"
              placeholder="000.000.000-00"
              value={inputValue}
              onChange={handleInputChange}
              className="text-center text-lg tracking-wide h-12 border-gray-300 focus:border-[#662E8E] focus:ring-[#662E8E]"
              autoComplete="off"
            />
          </div>

          {/* Método de verificação */}
          <div className="space-y-3">
            <Label className="text-gray-700">Como deseja receber o código?</Label>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as VerificationMethod)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="whatsapp"
                className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors [&:has([data-state=checked])]:border-[#662E8E] [&:has([data-state=checked])]:bg-[#662E8E]/5"
              >
                <RadioGroupItem value="whatsapp" id="whatsapp" className="sr-only" />
                <MessageSquare className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">WhatsApp</span>
              </Label>

              <Label
                htmlFor="email"
                className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors [&:has([data-state=checked])]:border-[#662E8E] [&:has([data-state=checked])]:bg-[#662E8E]/5"
              >
                <RadioGroupItem value="email" id="email" className="sr-only" />
                <Mail className="h-6 w-6 text-[#662E8E]" />
                <span className="text-sm font-medium">Email</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Botão */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-[#662E8E] hover:bg-[#4a2268]"
            disabled={!isValidInput || isSendingCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Código'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
