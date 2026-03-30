import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Languages, Coins } from 'lucide-react';
import type { DadosConfiguracoes } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosConfiguracoes>;
  onUpdate: (data: Partial<DadosConfiguracoes>) => void;
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
];

const IDIOMAS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
];

const MOEDAS = [
  { value: 'BRL', label: 'Real Brasileiro (R$)' },
  { value: 'USD', label: 'Dólar Americano ($)' },
  { value: 'EUR', label: 'Euro (€)' },
];

export default function StepConfiguracoes({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações Gerais</h2>
        <p className="text-sm text-muted-foreground">
          Defina as preferências regionais da empresa
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Fuso Horário *
          </Label>
          <Select
            value={data.timezone || 'America/Sao_Paulo'}
            onValueChange={(value) => onUpdate({ timezone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o fuso horário" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Usado para agendamentos e relatórios
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Idioma *
          </Label>
          <Select
            value={data.idioma || 'pt-BR'}
            onValueChange={(value) => onUpdate({ idioma: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              {IDIOMAS.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Idioma padrão do sistema
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Moeda *
          </Label>
          <Select
            value={data.moeda || 'BRL'}
            onValueChange={(value) => onUpdate({ moeda: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a moeda" />
            </SelectTrigger>
            <SelectContent>
              {MOEDAS.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Moeda para valores financeiros
          </p>
        </div>
      </div>
    </div>
  );
}
