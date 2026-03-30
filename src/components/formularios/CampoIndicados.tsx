// Componente especial para indicação de amigos em formulários

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, UserPlus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampoIndicadoConfig } from '@/types/formulario';

interface Indicado {
  id: string;
  [key: string]: string;
}

interface CampoIndicadosProps {
  config: CampoIndicadoConfig;
  value: Indicado[];
  onChange: (value: Indicado[]) => void;
  error?: string;
  disabled?: boolean;
}

const DEFAULT_CONFIG: CampoIndicadoConfig = {
  min_indicados: 1,
  max_indicados: 5,
  campos_por_indicado: [
    {
      nome: 'nome_amigo',
      label: 'Nome do Amigo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Nome completo',
    },
    {
      nome: 'whatsapp_amigo',
      label: 'WhatsApp',
      tipo: 'tel',
      obrigatorio: true,
      placeholder: '(00) 00000-0000',
      mascara: '(99) 99999-9999',
    },
  ],
};

// Função para aplicar máscara
const applyMask = (value: string, mask?: string): string => {
  if (!mask) return value;

  const cleanValue = value.replace(/\D/g, '');
  let result = '';
  let maskIndex = 0;

  for (let i = 0; i < cleanValue.length && maskIndex < mask.length; i++) {
    // Pular caracteres não numéricos da máscara
    while (maskIndex < mask.length && mask[maskIndex] !== '9') {
      result += mask[maskIndex];
      maskIndex++;
    }

    if (maskIndex < mask.length) {
      result += cleanValue[i];
      maskIndex++;
    }
  }

  return result;
};

export const CampoIndicados: React.FC<CampoIndicadosProps> = ({
  config = DEFAULT_CONFIG,
  value = [],
  onChange,
  error,
  disabled = false,
}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { min_indicados = 1, max_indicados = 5, campos_por_indicado } = mergedConfig;

  // Estado para erros de validação por indicado
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});

  const addIndicado = () => {
    if (value.length >= max_indicados) return;

    const newIndicado: Indicado = {
      id: crypto.randomUUID(),
    };

    // Inicializar campos vazios
    campos_por_indicado.forEach((campo) => {
      newIndicado[campo.nome] = '';
    });

    onChange([...value, newIndicado]);
  };

  const removeIndicado = (id: string) => {
    if (value.length <= min_indicados) return;
    onChange(value.filter((ind) => ind.id !== id));

    // Limpar erros do indicado removido
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  const updateIndicado = (id: string, campo: string, newValue: string, mascara?: string) => {
    const maskedValue = mascara ? applyMask(newValue, mascara) : newValue;

    onChange(
      value.map((ind) =>
        ind.id === id ? { ...ind, [campo]: maskedValue } : ind
      )
    );

    // Limpar erro do campo quando o usuário digita
    setFieldErrors((prev) => {
      const indicadoErrors = prev[id] || {};
      const { [campo]: _, ...rest } = indicadoErrors;
      return {
        ...prev,
        [id]: rest,
      };
    });
  };

  const validateIndicado = (indicado: Indicado): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    campos_por_indicado.forEach((campo) => {
      const fieldValue = indicado[campo.nome] || '';

      if (campo.obrigatorio && !fieldValue.trim()) {
        errors[campo.nome] = `${campo.label} é obrigatório`;
        isValid = false;
      }

      // Validação específica por tipo
      if (fieldValue && campo.tipo === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fieldValue)) {
          errors[campo.nome] = 'Email inválido';
          isValid = false;
        }
      }

      if (fieldValue && campo.tipo === 'tel') {
        const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
        if (!phoneRegex.test(fieldValue)) {
          errors[campo.nome] = 'Telefone inválido';
          isValid = false;
        }
      }
    });

    setFieldErrors((prev) => ({
      ...prev,
      [indicado.id]: errors,
    }));

    return isValid;
  };

  // Validar todos os indicados (chamado externamente)
  const validateAll = (): boolean => {
    let allValid = true;
    value.forEach((indicado) => {
      if (!validateIndicado(indicado)) {
        allValid = false;
      }
    });

    if (value.length < min_indicados) {
      allValid = false;
    }

    return allValid;
  };

  // Inicializar com mínimo de indicados se vazio
  React.useEffect(() => {
    if (value.length === 0 && min_indicados > 0) {
      const initialIndicados: Indicado[] = [];
      for (let i = 0; i < min_indicados; i++) {
        const newIndicado: Indicado = {
          id: crypto.randomUUID(),
        };
        campos_por_indicado.forEach((campo) => {
          newIndicado[campo.nome] = '';
        });
        initialIndicados.push(newIndicado);
      }
      onChange(initialIndicados);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Indique seus amigos</span>
          <Badge variant="secondary">
            {value.length} / {max_indicados}
          </Badge>
        </div>

        {value.length < max_indicados && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIndicado}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Amigo
          </Button>
        )}
      </div>

      {/* Erro geral */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Mínimo de indicados */}
      {min_indicados > 0 && value.length < min_indicados && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Você precisa indicar pelo menos {min_indicados} amigo(s)
        </div>
      )}

      {/* Lista de indicados */}
      <div className="space-y-3">
        {value.map((indicado, index) => {
          const indicadoErrors = fieldErrors[indicado.id] || {};

          return (
            <Card
              key={indicado.id}
              className={cn(
                'relative transition-all',
                Object.keys(indicadoErrors).length > 0 && 'border-destructive'
              )}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    Amigo {index + 1}
                  </CardTitle>

                  {value.length > min_indicados && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIndicado(indicado.id)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {campos_por_indicado.map((campo) => {
                    const fieldError = indicadoErrors[campo.nome];

                    return (
                      <div key={campo.nome} className="space-y-1">
                        <Label
                          htmlFor={`${indicado.id}-${campo.nome}`}
                          className={cn(
                            'text-sm',
                            campo.obrigatorio && "after:content-['*'] after:ml-0.5 after:text-destructive"
                          )}
                        >
                          {campo.label}
                        </Label>
                        <Input
                          id={`${indicado.id}-${campo.nome}`}
                          type={campo.tipo === 'tel' ? 'tel' : campo.tipo === 'email' ? 'email' : 'text'}
                          value={indicado[campo.nome] || ''}
                          onChange={(e) =>
                            updateIndicado(indicado.id, campo.nome, e.target.value, campo.mascara)
                          }
                          onBlur={() => validateIndicado(indicado)}
                          placeholder={campo.placeholder}
                          disabled={disabled}
                          className={cn(fieldError && 'border-destructive')}
                        />
                        {fieldError && (
                          <p className="text-xs text-destructive">{fieldError}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botão adicionar no final */}
      {value.length > 0 && value.length < max_indicados && !disabled && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addIndicado}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar mais um amigo
        </Button>
      )}

      {/* Mensagem de limite */}
      {value.length >= max_indicados && (
        <p className="text-sm text-muted-foreground text-center">
          Você atingiu o limite de {max_indicados} indicações
        </p>
      )}
    </div>
  );
};

export default CampoIndicados;
