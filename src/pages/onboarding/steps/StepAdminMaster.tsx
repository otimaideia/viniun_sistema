import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DadosAdminMaster } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosAdminMaster>;
  onUpdate: (data: Partial<DadosAdminMaster>) => void;
}

export default function StepAdminMaster({ data, onUpdate }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validação de senha
  const passwordErrors = [];
  if (data.admin_senha) {
    if (data.admin_senha.length < 8) {
      passwordErrors.push('Mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(data.admin_senha)) {
      passwordErrors.push('Uma letra maiúscula');
    }
    if (!/[a-z]/.test(data.admin_senha)) {
      passwordErrors.push('Uma letra minúscula');
    }
    if (!/[0-9]/.test(data.admin_senha)) {
      passwordErrors.push('Um número');
    }
  }

  const passwordsMatch = data.admin_senha === confirmPassword;
  const isPasswordValid = passwordErrors.length === 0 && passwordsMatch;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Administrador Master</h2>
        <p className="text-sm text-muted-foreground">
          Configure o primeiro usuário administrador da empresa
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Este usuário terá acesso total às configurações da empresa e poderá
          criar outros usuários e gerenciar permissões.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="admin_nome">Nome Completo *</Label>
          <Input
            id="admin_nome"
            placeholder="Nome do administrador"
            value={data.admin_nome || ''}
            onChange={(e) => onUpdate({ admin_nome: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin_email">E-mail *</Label>
          <Input
            id="admin_email"
            type="email"
            placeholder="admin@empresa.com.br"
            value={data.admin_email || ''}
            onChange={(e) => onUpdate({ admin_email: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Será usado para login no sistema
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin_telefone">Telefone</Label>
          <Input
            id="admin_telefone"
            placeholder="(00) 00000-0000"
            value={data.admin_telefone || ''}
            onChange={(e) => onUpdate({ admin_telefone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin_senha">Senha *</Label>
          <div className="relative">
            <Input
              id="admin_senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={data.admin_senha || ''}
              onChange={(e) => onUpdate({ admin_senha: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {data.admin_senha && passwordErrors.length > 0 && (
            <div className="text-xs text-destructive mt-1">
              Faltando: {passwordErrors.join(', ')}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar Senha *</Label>
          <Input
            id="confirm_password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword && !passwordsMatch && (
            <div className="text-xs text-destructive mt-1">
              As senhas não coincidem
            </div>
          )}
        </div>
      </div>

      {/* Requisitos de senha */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Requisitos de Senha</h3>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li className={data.admin_senha && data.admin_senha.length >= 8 ? 'text-green-600' : ''}>
            ✓ Mínimo 8 caracteres
          </li>
          <li className={data.admin_senha && /[A-Z]/.test(data.admin_senha) ? 'text-green-600' : ''}>
            ✓ Pelo menos uma letra maiúscula
          </li>
          <li className={data.admin_senha && /[a-z]/.test(data.admin_senha) ? 'text-green-600' : ''}>
            ✓ Pelo menos uma letra minúscula
          </li>
          <li className={data.admin_senha && /[0-9]/.test(data.admin_senha) ? 'text-green-600' : ''}>
            ✓ Pelo menos um número
          </li>
          <li className={passwordsMatch && confirmPassword ? 'text-green-600' : ''}>
            ✓ Senhas coincidem
          </li>
        </ul>
      </div>
    </div>
  );
}
