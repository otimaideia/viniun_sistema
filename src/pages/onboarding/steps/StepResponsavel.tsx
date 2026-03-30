import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DadosResponsavel } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosResponsavel>;
  onUpdate: (data: Partial<DadosResponsavel>) => void;
}

export default function StepResponsavel({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Responsável Legal</h2>
        <p className="text-sm text-muted-foreground">
          Informe os dados do responsável pela empresa
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="responsavel_nome">Nome Completo *</Label>
          <Input
            id="responsavel_nome"
            placeholder="Nome do responsável"
            value={data.responsavel_nome || ''}
            onChange={(e) => onUpdate({ responsavel_nome: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_cpf">CPF *</Label>
          <Input
            id="responsavel_cpf"
            placeholder="000.000.000-00"
            value={data.responsavel_cpf || ''}
            onChange={(e) => onUpdate({ responsavel_cpf: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_cargo">Cargo *</Label>
          <Input
            id="responsavel_cargo"
            placeholder="Ex: Diretor, Sócio"
            value={data.responsavel_cargo || ''}
            onChange={(e) => onUpdate({ responsavel_cargo: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_telefone">Telefone *</Label>
          <Input
            id="responsavel_telefone"
            placeholder="(00) 00000-0000"
            value={data.responsavel_telefone || ''}
            onChange={(e) => onUpdate({ responsavel_telefone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsavel_email">E-mail *</Label>
          <Input
            id="responsavel_email"
            type="email"
            placeholder="responsavel@empresa.com.br"
            value={data.responsavel_email || ''}
            onChange={(e) => onUpdate({ responsavel_email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
