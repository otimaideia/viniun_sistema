import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Palette } from 'lucide-react';
import type { DadosBranding } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosBranding>;
  onUpdate: (data: Partial<DadosBranding>) => void;
}

// Cores predefinidas sugeridas
const PRESET_COLORS = [
  { name: 'Rosa', primary: '#E91E63', hover: '#C2185B' },
  { name: 'Azul', primary: '#2196F3', hover: '#1976D2' },
  { name: 'Verde', primary: '#4CAF50', hover: '#388E3C' },
  { name: 'Roxo', primary: '#9C27B0', hover: '#7B1FA2' },
  { name: 'Laranja', primary: '#FF9800', hover: '#F57C00' },
  { name: 'Vermelho', primary: '#F44336', hover: '#D32F2F' },
  { name: 'Teal', primary: '#009688', hover: '#00796B' },
  { name: 'Índigo', primary: '#3F51B5', hover: '#303F9F' },
];

export default function StepBranding({ data, onUpdate }: Props) {
  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    onUpdate({
      cor_primaria: preset.primary,
      cor_primaria_hover: preset.hover,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Identidade Visual</h2>
        <p className="text-sm text-muted-foreground">
          Configure as cores e logos da empresa
        </p>
      </div>

      {/* Logos */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="logo_url">Logo Principal (URL)</Label>
          <Input
            id="logo_url"
            placeholder="https://..."
            value={data.logo_url || ''}
            onChange={(e) => onUpdate({ logo_url: e.target.value })}
          />
          {data.logo_url && (
            <div className="mt-2 p-4 bg-muted rounded-lg flex items-center justify-center">
              <img
                src={data.logo_url}
                alt="Logo"
                className="max-h-16 object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="favicon_url">Favicon (URL)</Label>
          <Input
            id="favicon_url"
            placeholder="https://..."
            value={data.favicon_url || ''}
            onChange={(e) => onUpdate({ favicon_url: e.target.value })}
          />
        </div>
      </div>

      {/* Cores Predefinidas */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Paleta de Cores
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_COLORS.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => applyPreset(preset)}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: preset.primary }}
              />
              {preset.name}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="cor_primaria">Cor Primária *</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="cor_primaria"
                value={data.cor_primaria || '#E91E63'}
                onChange={(e) => onUpdate({ cor_primaria: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={data.cor_primaria || '#E91E63'}
                onChange={(e) => onUpdate({ cor_primaria: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor_primaria_hover">Cor Primária (Hover)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="cor_primaria_hover"
                value={data.cor_primaria_hover || '#C2185B'}
                onChange={(e) => onUpdate({ cor_primaria_hover: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={data.cor_primaria_hover || '#C2185B'}
                onChange={(e) => onUpdate({ cor_primaria_hover: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor_secundaria">Cor Secundária *</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="cor_secundaria"
                value={data.cor_secundaria || '#3F51B5'}
                onChange={(e) => onUpdate({ cor_secundaria: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={data.cor_secundaria || '#3F51B5'}
                onChange={(e) => onUpdate({ cor_secundaria: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor_secundaria_hover">Cor Secundária (Hover)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="cor_secundaria_hover"
                value={data.cor_secundaria_hover || '#303F9F'}
                onChange={(e) => onUpdate({ cor_secundaria_hover: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={data.cor_secundaria_hover || '#303F9F'}
                onChange={(e) => onUpdate({ cor_secundaria_hover: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Preview</h3>
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex gap-2">
            <Button
              style={{ backgroundColor: data.cor_primaria, color: 'white' }}
            >
              Botão Primário
            </Button>
            <Button
              style={{ backgroundColor: data.cor_secundaria, color: 'white' }}
            >
              Botão Secundário
            </Button>
          </div>
          <p className="text-sm" style={{ color: data.cor_primaria }}>
            Texto com cor primária
          </p>
        </div>
      </div>

      {/* Tipografia */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Tipografia</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fonte_primaria">Fonte Principal</Label>
            <Input
              id="fonte_primaria"
              placeholder="Inter, sans-serif"
              value={data.fonte_primaria || 'Inter, sans-serif'}
              onChange={(e) => onUpdate({ fonte_primaria: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="border_radius">Border Radius</Label>
            <Input
              id="border_radius"
              placeholder="8px"
              value={data.border_radius || '8px'}
              onChange={(e) => onUpdate({ border_radius: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
