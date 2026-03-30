import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  User,
  Palette,
  Settings,
  Package,
  Grid3X3,
  Shield,
  Building,
  Edit,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { OnboardingData } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: OnboardingData;
  onEdit: (stepId: number) => void;
}

interface ReviewSectionProps {
  title: string;
  icon: React.ReactNode;
  stepId: number;
  onEdit: (stepId: number) => void;
  children: React.ReactNode;
  isComplete?: boolean;
}

function ReviewSection({
  title,
  icon,
  stepId,
  onEdit,
  children,
  isComplete = true,
}: ReviewSectionProps) {
  return (
    <Card className={!isComplete ? 'border-destructive' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
            {isComplete ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(stepId)}
            className="h-7 gap-1"
          >
            <Edit className="w-3 h-3" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function StepRevisao({ data, onEdit }: Props) {
  // Verificar se todas as seções estão completas
  const isEmpresaComplete = !!(data.empresa.nome_fantasia && data.empresa.cnpj && data.empresa.slug);
  const isEnderecoComplete = !!(data.endereco.cep && data.endereco.email && data.endereco.telefone);
  const isResponsavelComplete = !!(data.responsavel.responsavel_nome && data.responsavel.responsavel_cpf);
  const isBrandingComplete = !!(data.branding.cor_primaria && data.branding.cor_secundaria);
  const isConfigComplete = !!(data.configuracoes.timezone && data.configuracoes.idioma);
  const isPlanoComplete = !!(data.plano.plano && data.plano.max_franquias);
  const isModulosComplete = (data.modulos.modulos_selecionados?.length || 0) > 0;
  const isAdminComplete = !!(data.admin.admin_nome && data.admin.admin_email && data.admin.admin_senha);
  const isFranquiaComplete = data.franquia.pular_franquia || !!(data.franquia.franquia_nome);

  const allComplete =
    isEmpresaComplete &&
    isEnderecoComplete &&
    isResponsavelComplete &&
    isBrandingComplete &&
    isConfigComplete &&
    isPlanoComplete &&
    isModulosComplete &&
    isAdminComplete &&
    isFranquiaComplete;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Revisão Final</h2>
        <p className="text-sm text-muted-foreground">
          Revise todas as informações antes de criar a empresa
        </p>
      </div>

      {!allComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informações incompletas</AlertTitle>
          <AlertDescription>
            Algumas seções estão incompletas. Por favor, revise e complete todas as
            informações obrigatórias.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Empresa */}
        <ReviewSection
          title="Dados da Empresa"
          icon={<Building2 className="w-4 h-4" />}
          stepId={1}
          onEdit={onEdit}
          isComplete={isEmpresaComplete}
        >
          <DataRow label="Nome Fantasia" value={data.empresa.nome_fantasia} />
          <DataRow label="Razão Social" value={data.empresa.razao_social} />
          <DataRow label="CNPJ" value={data.empresa.cnpj} />
          <DataRow label="Slug" value={data.empresa.slug} />
          <DataRow label="Subdomínio" value={data.empresa.subdominio} />
        </ReviewSection>

        {/* Endereço */}
        <ReviewSection
          title="Endereço e Contato"
          icon={<MapPin className="w-4 h-4" />}
          stepId={2}
          onEdit={onEdit}
          isComplete={isEnderecoComplete}
        >
          <DataRow
            label="Endereço"
            value={
              data.endereco.endereco
                ? `${data.endereco.endereco}, ${data.endereco.numero}`
                : undefined
            }
          />
          <DataRow
            label="Cidade/UF"
            value={
              data.endereco.cidade
                ? `${data.endereco.cidade}/${data.endereco.estado}`
                : undefined
            }
          />
          <DataRow label="Telefone" value={data.endereco.telefone} />
          <DataRow label="E-mail" value={data.endereco.email} />
        </ReviewSection>

        {/* Responsável */}
        <ReviewSection
          title="Responsável Legal"
          icon={<User className="w-4 h-4" />}
          stepId={3}
          onEdit={onEdit}
          isComplete={isResponsavelComplete}
        >
          <DataRow label="Nome" value={data.responsavel.responsavel_nome} />
          <DataRow label="CPF" value={data.responsavel.responsavel_cpf} />
          <DataRow label="Cargo" value={data.responsavel.responsavel_cargo} />
          <DataRow label="E-mail" value={data.responsavel.responsavel_email} />
        </ReviewSection>

        {/* Branding */}
        <ReviewSection
          title="Identidade Visual"
          icon={<Palette className="w-4 h-4" />}
          stepId={4}
          onEdit={onEdit}
          isComplete={isBrandingComplete}
        >
          <div className="flex items-center gap-2 py-1">
            <span className="text-muted-foreground">Cores:</span>
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: data.branding.cor_primaria }}
              title="Primária"
            />
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: data.branding.cor_secundaria }}
              title="Secundária"
            />
          </div>
          <DataRow label="Fonte" value={data.branding.fonte_primaria} />
        </ReviewSection>

        {/* Configurações */}
        <ReviewSection
          title="Configurações"
          icon={<Settings className="w-4 h-4" />}
          stepId={5}
          onEdit={onEdit}
          isComplete={isConfigComplete}
        >
          <DataRow label="Fuso Horário" value={data.configuracoes.timezone} />
          <DataRow label="Idioma" value={data.configuracoes.idioma} />
          <DataRow label="Moeda" value={data.configuracoes.moeda} />
        </ReviewSection>

        {/* Plano */}
        <ReviewSection
          title="Plano e Limites"
          icon={<Package className="w-4 h-4" />}
          stepId={6}
          onEdit={onEdit}
          isComplete={isPlanoComplete}
        >
          <DataRow label="Plano" value={data.plano.plano?.toUpperCase()} />
          <DataRow label="Máx. Franquias" value={data.plano.max_franquias} />
          <DataRow label="Máx. Usuários" value={data.plano.max_usuarios} />
          <DataRow label="Máx. Leads/mês" value={data.plano.max_leads_mes} />
        </ReviewSection>

        {/* Módulos */}
        <ReviewSection
          title="Módulos"
          icon={<Grid3X3 className="w-4 h-4" />}
          stepId={7}
          onEdit={onEdit}
          isComplete={isModulosComplete}
        >
          <div className="flex flex-wrap gap-1">
            {(data.modulos.modulos_selecionados || []).map((mod) => (
              <Badge key={mod} variant="secondary" className="text-xs">
                {mod}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.modulos.modulos_selecionados?.length || 0} módulo(s) selecionado(s)
          </p>
        </ReviewSection>

        {/* Admin */}
        <ReviewSection
          title="Administrador Master"
          icon={<Shield className="w-4 h-4" />}
          stepId={8}
          onEdit={onEdit}
          isComplete={isAdminComplete}
        >
          <DataRow label="Nome" value={data.admin.admin_nome} />
          <DataRow label="E-mail" value={data.admin.admin_email} />
          <DataRow label="Senha" value={data.admin.admin_senha ? '••••••••' : undefined} />
        </ReviewSection>

        {/* Franquia */}
        <ReviewSection
          title="Primeira Franquia"
          icon={<Building className="w-4 h-4" />}
          stepId={9}
          onEdit={onEdit}
          isComplete={isFranquiaComplete}
        >
          {data.franquia.pular_franquia ? (
            <p className="text-muted-foreground italic">
              Etapa pulada - será configurada depois
            </p>
          ) : (
            <>
              <DataRow label="Código" value={data.franquia.franquia_codigo} />
              <DataRow label="Nome" value={data.franquia.franquia_nome} />
              <DataRow
                label="Cidade/UF"
                value={
                  data.franquia.franquia_cidade
                    ? `${data.franquia.franquia_cidade}/${data.franquia.franquia_estado}`
                    : undefined
                }
              />
            </>
          )}
        </ReviewSection>
      </div>

      {allComplete && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Tudo pronto!</AlertTitle>
          <AlertDescription className="text-green-700">
            Todas as informações foram preenchidas. Clique em "Criar Empresa" para
            finalizar o cadastro.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
