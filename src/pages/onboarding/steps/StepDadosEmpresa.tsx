import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DadosEmpresa } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosEmpresa>;
  onUpdate: (data: Partial<DadosEmpresa>) => void;
}

export default function StepDadosEmpresa({ data, onUpdate }: Props) {
  // Gerar slug automaticamente a partir do nome fantasia
  useEffect(() => {
    if (data.nome_fantasia && !data.slug) {
      const slug = data.nome_fantasia
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      onUpdate({ slug, subdominio: slug });
    }
  }, [data.nome_fantasia]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dados da Empresa</h2>
        <p className="text-sm text-muted-foreground">
          Informe os dados básicos da empresa
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
          <Input
            id="nome_fantasia"
            placeholder="Ex: Viniun"
            value={data.nome_fantasia || ''}
            onChange={(e) => onUpdate({ nome_fantasia: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="razao_social">Razão Social *</Label>
          <Input
            id="razao_social"
            placeholder="Ex: Viniun Franchising Ltda"
            value={data.razao_social || ''}
            onChange={(e) => onUpdate({ razao_social: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <Input
            id="cnpj"
            placeholder="00.000.000/0000-00"
            value={data.cnpj || ''}
            onChange={(e) => onUpdate({ cnpj: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
          <Input
            id="inscricao_estadual"
            placeholder="Opcional"
            value={data.inscricao_estadual || ''}
            onChange={(e) => onUpdate({ inscricao_estadual: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Configuração de Acesso</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador único) *</Label>
            <Input
              id="slug"
              placeholder="ex: viniun"
              value={data.slug || ''}
              onChange={(e) => onUpdate({
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              })}
            />
            <p className="text-xs text-muted-foreground">
              Usado em URLs e integrações
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdominio">Subdomínio *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdominio"
                placeholder="ex: viniun"
                value={data.subdominio || ''}
                onChange={(e) => onUpdate({
                  subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                .seusite.com.br
              </span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="dominio_customizado">Domínio Customizado (opcional)</Label>
            <Input
              id="dominio_customizado"
              placeholder="ex: painel.minhaempresa.com.br"
              value={data.dominio_customizado || ''}
              onChange={(e) => onUpdate({ dominio_customizado: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Se a empresa tiver um domínio próprio configurado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
