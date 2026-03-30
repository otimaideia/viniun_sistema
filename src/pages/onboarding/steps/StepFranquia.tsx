import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Loader2, Search, SkipForward } from 'lucide-react';
import type { DadosFranquia } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosFranquia>;
  onUpdate: (data: Partial<DadosFranquia>) => void;
}

export default function StepFranquia({ data, onUpdate }: Props) {
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  // Buscar endereço pelo CEP
  const fetchAddress = async () => {
    if (!data.franquia_cep || data.franquia_cep.length < 8) return;

    setIsFetchingCep(true);
    try {
      const cepClean = data.franquia_cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const addressData = await response.json();

      if (!addressData.erro) {
        onUpdate({
          franquia_endereco: addressData.logradouro,
          franquia_bairro: addressData.bairro,
          franquia_cidade: addressData.localidade,
          franquia_estado: addressData.uf,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  // Se escolher pular, desabilitar os campos
  const isDisabled = data.pular_franquia;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Primeira Franquia (Matriz)</h2>
        <p className="text-sm text-muted-foreground">
          Configure a unidade matriz ou primeira franquia
        </p>
      </div>

      {/* Opção de pular */}
      <Card className={data.pular_franquia ? 'border-primary bg-primary/5' : ''}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="pular_franquia"
              checked={data.pular_franquia || false}
              onCheckedChange={(checked) =>
                onUpdate({ pular_franquia: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label htmlFor="pular_franquia" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <SkipForward className="w-4 h-4" />
                  <span className="font-medium">Pular esta etapa</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Você pode cadastrar franquias depois nas configurações
                </p>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário da franquia */}
      <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="franquia_codigo">Código da Franquia *</Label>
            <Input
              id="franquia_codigo"
              placeholder="Ex: 001, MTZ, SP01"
              value={data.franquia_codigo || ''}
              onChange={(e) =>
                onUpdate({ franquia_codigo: e.target.value.toUpperCase() })
              }
              disabled={isDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="franquia_nome">Nome da Unidade *</Label>
            <Input
              id="franquia_nome"
              placeholder="Ex: Matriz, Unidade Centro"
              value={data.franquia_nome || ''}
              onChange={(e) => onUpdate({ franquia_nome: e.target.value })}
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="text-md font-medium mb-4 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Endereço da Unidade
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="franquia_cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="franquia_cep"
                  placeholder="00000-000"
                  value={data.franquia_cep || ''}
                  onChange={(e) => onUpdate({ franquia_cep: e.target.value })}
                  onBlur={fetchAddress}
                  disabled={isDisabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchAddress}
                  disabled={isFetchingCep || isDisabled}
                >
                  {isFetchingCep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="franquia_endereco">Endereço</Label>
              <Input
                id="franquia_endereco"
                placeholder="Rua, Avenida..."
                value={data.franquia_endereco || ''}
                onChange={(e) => onUpdate({ franquia_endereco: e.target.value })}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_numero">Número</Label>
              <Input
                id="franquia_numero"
                placeholder="123"
                value={data.franquia_numero || ''}
                onChange={(e) => onUpdate({ franquia_numero: e.target.value })}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_bairro">Bairro</Label>
              <Input
                id="franquia_bairro"
                placeholder="Bairro"
                value={data.franquia_bairro || ''}
                onChange={(e) => onUpdate({ franquia_bairro: e.target.value })}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_cidade">Cidade</Label>
              <Input
                id="franquia_cidade"
                placeholder="Cidade"
                value={data.franquia_cidade || ''}
                onChange={(e) => onUpdate({ franquia_cidade: e.target.value })}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_estado">Estado</Label>
              <Input
                id="franquia_estado"
                placeholder="UF"
                maxLength={2}
                value={data.franquia_estado || ''}
                onChange={(e) =>
                  onUpdate({ franquia_estado: e.target.value.toUpperCase() })
                }
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_telefone">Telefone</Label>
              <Input
                id="franquia_telefone"
                placeholder="(00) 0000-0000"
                value={data.franquia_telefone || ''}
                onChange={(e) => onUpdate({ franquia_telefone: e.target.value })}
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franquia_email">E-mail</Label>
              <Input
                id="franquia_email"
                type="email"
                placeholder="unidade@empresa.com.br"
                value={data.franquia_email || ''}
                onChange={(e) => onUpdate({ franquia_email: e.target.value })}
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
