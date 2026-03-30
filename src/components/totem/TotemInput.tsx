import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TotemNumericKeyboard } from './TotemNumericKeyboard';
import { applyCPFMask, cleanCPF, validateCPF } from '@/utils/cpf';
import { applyPhoneMask, cleanPhone, validatePhone } from '@/utils/phone';
import { Search, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputType = 'cpf' | 'telefone';

interface TotemInputProps {
  onSearch: (value: string, type: InputType) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TotemInput({ onSearch, isLoading, error }: TotemInputProps) {
  const [inputType, setInputType] = useState<InputType>('cpf');
  const [value, setValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');

  // Aplicar máscara ao valor
  useEffect(() => {
    if (inputType === 'cpf') {
      setDisplayValue(applyCPFMask(value));
    } else {
      setDisplayValue(applyPhoneMask(value));
    }
  }, [value, inputType]);

  // Limpar valor ao trocar tipo
  useEffect(() => {
    setValue('');
    setDisplayValue('');
  }, [inputType]);

  const handleKeyPress = useCallback((key: string) => {
    const maxLength = inputType === 'cpf' ? 11 : 11;
    const currentLength = cleanCPF(value).length;

    if (currentLength < maxLength) {
      setValue(prev => prev + key);
    }
  }, [value, inputType]);

  const handleBackspace = useCallback(() => {
    setValue(prev => {
      const cleaned = inputType === 'cpf' ? cleanCPF(prev) : cleanPhone(prev);
      return cleaned.slice(0, -1);
    });
  }, [inputType]);

  const handleConfirm = useCallback(() => {
    const cleaned = inputType === 'cpf' ? cleanCPF(value) : cleanPhone(value);

    if (inputType === 'cpf') {
      if (!validateCPF(value)) {
        return;
      }
    } else {
      if (!validatePhone(value)) {
        return;
      }
    }

    onSearch(cleaned, inputType);
  }, [value, inputType, onSearch]);

  const isValid = inputType === 'cpf'
    ? validateCPF(value)
    : validatePhone(value);

  const placeholder = inputType === 'cpf'
    ? '000.000.000-00'
    : '(00) 00000-0000';

  return (
    <Card className="bg-white/95 backdrop-blur shadow-xl">
      <CardContent className="p-4">
        {/* Tabs para selecionar tipo */}
        <Tabs
          value={inputType}
          onValueChange={(v) => setInputType(v as InputType)}
          className="mb-3"
        >
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="cpf" className="text-sm gap-2">
              <User className="h-3.5 w-3.5" />
              CPF
            </TabsTrigger>
            <TabsTrigger value="telefone" className="text-sm gap-2">
              <Phone className="h-3.5 w-3.5" />
              Telefone
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Campo de exibição */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1 text-center">
            Digite seu {inputType === 'cpf' ? 'CPF' : 'Telefone'}
          </label>
          <div
            className={cn(
              'w-full h-12 flex items-center justify-center',
              'bg-gray-50 border-2 rounded-lg',
              'text-xl md:text-2xl font-mono tracking-wider',
              'transition-colors duration-200',
              error ? 'border-red-400 text-red-600' : 'border-gray-200',
              !displayValue && 'text-gray-400'
            )}
          >
            {displayValue || placeholder}
          </div>

          {/* Erro */}
          {error && (
            <p className="mt-1 text-xs text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Teclado numérico */}
        <TotemNumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onConfirm={handleConfirm}
          disabled={isLoading}
          className="mb-3"
        />

        {/* Botão de buscar */}
        <Button
          size="default"
          className="w-full h-11 text-base font-semibold bg-[#662E8E] hover:bg-[#4a2268]"
          onClick={handleConfirm}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar Agendamento
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
