import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import type { DadosEndereco } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosEndereco>;
  onUpdate: (data: Partial<DadosEndereco>) => void;
}

export default function StepEndereco({ data, onUpdate }: Props) {
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  // Buscar endereço pelo CEP
  const fetchAddress = async () => {
    if (!data.cep || data.cep.length < 8) return;

    setIsFetchingCep(true);
    try {
      const cepClean = data.cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const addressData = await response.json();

      if (!addressData.erro) {
        onUpdate({
          endereco: addressData.logradouro,
          bairro: addressData.bairro,
          cidade: addressData.localidade,
          estado: addressData.uf,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Endereço e Contato</h2>
        <p className="text-sm text-muted-foreground">
          Informe a localização e dados de contato
        </p>
      </div>

      {/* Endereço */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP *</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              placeholder="00000-000"
              value={data.cep || ''}
              onChange={(e) => onUpdate({ cep: e.target.value })}
              onBlur={fetchAddress}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchAddress}
              disabled={isFetchingCep}
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
          <Label htmlFor="endereco">Endereço *</Label>
          <Input
            id="endereco"
            placeholder="Rua, Avenida..."
            value={data.endereco || ''}
            onChange={(e) => onUpdate({ endereco: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero">Número *</Label>
          <Input
            id="numero"
            placeholder="123"
            value={data.numero || ''}
            onChange={(e) => onUpdate({ numero: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            placeholder="Sala, Andar..."
            value={data.complemento || ''}
            onChange={(e) => onUpdate({ complemento: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro *</Label>
          <Input
            id="bairro"
            placeholder="Bairro"
            value={data.bairro || ''}
            onChange={(e) => onUpdate({ bairro: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade *</Label>
          <Input
            id="cidade"
            placeholder="Cidade"
            value={data.cidade || ''}
            onChange={(e) => onUpdate({ cidade: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Input
            id="estado"
            placeholder="UF"
            maxLength={2}
            value={data.estado || ''}
            onChange={(e) => onUpdate({ estado: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            value={data.pais || 'Brasil'}
            onChange={(e) => onUpdate({ pais: e.target.value })}
          />
        </div>
      </div>

      {/* Contato */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Contato</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone Principal *</Label>
            <Input
              id="telefone"
              placeholder="(00) 0000-0000"
              value={data.telefone || ''}
              onChange={(e) => onUpdate({ telefone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone_secundario">Telefone Secundário</Label>
            <Input
              id="telefone_secundario"
              placeholder="(00) 0000-0000"
              value={data.telefone_secundario || ''}
              onChange={(e) => onUpdate({ telefone_secundario: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="(00) 00000-0000"
              value={data.whatsapp || ''}
              onChange={(e) => onUpdate({ whatsapp: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://www.site.com.br"
              value={data.website || ''}
              onChange={(e) => onUpdate({ website: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail Principal *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contato@empresa.com.br"
              value={data.email || ''}
              onChange={(e) => onUpdate({ email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_financeiro">E-mail Financeiro</Label>
            <Input
              id="email_financeiro"
              type="email"
              placeholder="financeiro@empresa.com.br"
              value={data.email_financeiro || ''}
              onChange={(e) => onUpdate({ email_financeiro: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
