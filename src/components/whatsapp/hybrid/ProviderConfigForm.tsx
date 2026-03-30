import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import type { WhatsAppProvider, CreateProviderInput, ProviderType } from '@/types/whatsapp-hybrid';

const providerSchema = z.object({
  provider_type: z.enum(['waha', 'meta_cloud_api']),
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  phone_number: z.string().min(10, 'Telefone obrigatório'),
  franchise_id: z.string().optional(),
  // WAHA
  waha_url: z.string().optional(),
  waha_api_key: z.string().optional(),
  waha_session_name: z.string().optional(),
  waha_session_id: z.string().optional(),
  // Meta
  meta_phone_number_id: z.string().optional(),
  meta_waba_id: z.string().optional(),
  meta_business_account_id: z.string().optional(),
  meta_access_token: z.string().optional(),
  meta_api_version: z.string().optional(),
  // Config
  priority: z.number().optional(),
  is_default: z.boolean().optional(),
  coexistence_enabled: z.boolean().optional(),
  coexistence_partner_id: z.string().optional(),
});

type FormValues = z.infer<typeof providerSchema>;

interface ProviderConfigFormProps {
  provider?: WhatsAppProvider;
  providers?: WhatsAppProvider[];
  franchises?: Array<{ id: string; nome: string }>;
  onSubmit: (data: CreateProviderInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProviderConfigForm({
  provider,
  providers = [],
  franchises = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProviderConfigFormProps) {
  const isEditing = !!provider;

  const form = useForm<FormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      provider_type: provider?.provider_type || 'waha',
      nome: provider?.nome || '',
      descricao: provider?.descricao || '',
      phone_number: provider?.phone_number || '',
      franchise_id: provider?.franchise_id || undefined,
      waha_url: provider?.waha_url || '',
      waha_api_key: provider?.waha_api_key || '',
      waha_session_name: provider?.waha_session_name || '',
      waha_session_id: provider?.waha_session_id || '',
      meta_phone_number_id: provider?.meta_phone_number_id || '',
      meta_waba_id: provider?.meta_waba_id || '',
      meta_business_account_id: provider?.meta_business_account_id || '',
      meta_access_token: provider?.meta_access_token || '',
      meta_api_version: provider?.meta_api_version || 'v21.0',
      priority: provider?.priority || 10,
      is_default: provider?.is_default || false,
      coexistence_enabled: provider?.coexistence_enabled || false,
      coexistence_partner_id: provider?.coexistence_partner_id || undefined,
    },
  });

  const providerType = form.watch('provider_type');
  const coexistenceEnabled = form.watch('coexistence_enabled');
  const isWaha = providerType === 'waha';

  // Partners disponíveis para coexistência (tipo oposto)
  const availablePartners = providers.filter(
    p => p.provider_type !== providerType && p.is_active && p.id !== provider?.id
  );

  const handleSubmit = (values: FormValues) => {
    onSubmit(values as CreateProviderInput);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Dados básicos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dados do Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select
                value={providerType}
                onValueChange={(v) => form.setValue('provider_type', v as ProviderType)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waha">WAHA (Gratuito)</SelectItem>
                  <SelectItem value="meta_cloud_api">Meta Cloud API (Oficial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Franquia</Label>
              <Select
                value={form.watch('franchise_id') || 'global'}
                onValueChange={(v) => form.setValue('franchise_id', v === 'global' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Global (todas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todas)</SelectItem>
                  {franchises.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Nome *</Label>
            <Input {...form.register('nome')} placeholder="Ex: WhatsApp Vendas SP" />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label>Telefone *</Label>
            <Input {...form.register('phone_number')} placeholder="5511999999999" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea {...form.register('descricao')} placeholder="Descrição opcional" rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Configuração específica por tipo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {isWaha ? 'Configuração WAHA' : 'Configuração Meta Cloud API'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isWaha ? (
            <>
              <div>
                <Label>URL do WAHA</Label>
                <Input {...form.register('waha_url')} placeholder="https://waha.exemplo.com.br" />
              </div>
              <div>
                <Label>API Key</Label>
                <Input {...form.register('waha_api_key')} type="password" placeholder="Chave de API do WAHA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Session Name</Label>
                  <Input {...form.register('waha_session_name')} placeholder="vendas_sp" />
                </div>
                <div>
                  <Label>Session ID (banco)</Label>
                  <Input {...form.register('waha_session_id')} placeholder="UUID da sessão" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Phone Number ID *</Label>
                <Input {...form.register('meta_phone_number_id')} placeholder="ID do número no Meta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>WABA ID</Label>
                  <Input {...form.register('meta_waba_id')} placeholder="ID da conta WABA" />
                </div>
                <div>
                  <Label>Business Account ID</Label>
                  <Input {...form.register('meta_business_account_id')} placeholder="ID do negócio" />
                </div>
              </div>
              <div>
                <Label>Access Token *</Label>
                <Input {...form.register('meta_access_token')} type="password" placeholder="Token permanente do Meta" />
              </div>
              <div>
                <Label>Versão da API</Label>
                <Input {...form.register('meta_api_version')} placeholder="v21.0" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coexistência */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Coexistência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar coexistência</Label>
              <p className="text-xs text-muted-foreground">
                Parear com provider do tipo oposto no mesmo número
              </p>
            </div>
            <Switch
              checked={coexistenceEnabled}
              onCheckedChange={(v) => form.setValue('coexistence_enabled', v)}
            />
          </div>

          {coexistenceEnabled && (
            <div>
              <Label>Provider parceiro</Label>
              <Select
                value={form.watch('coexistence_partner_id') || ''}
                onValueChange={(v) => form.setValue('coexistence_partner_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o parceiro" />
                </SelectTrigger>
                <SelectContent>
                  {availablePartners.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.provider_type === 'waha' ? 'WAHA' : 'Meta'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availablePartners.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum provider do tipo {isWaha ? 'Meta' : 'WAHA'} disponível
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Provider padrão</Label>
              <p className="text-xs text-muted-foreground">Usado quando nenhuma regra se aplica</p>
            </div>
            <Switch
              checked={form.watch('is_default')}
              onCheckedChange={(v) => form.setValue('is_default', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Salvar' : 'Criar Provider'}
        </Button>
      </div>
    </form>
  );
}
