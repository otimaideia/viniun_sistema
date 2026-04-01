import { useState, useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/integrations/supabase/client';
import { useStorageBucketUpload } from '@/hooks/useStorageBucketUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Upload, Loader2, Save, X } from 'lucide-react';

export default function MinhaEmpresa() {
  const { tenant, branding, isLoading: tenantLoading, refreshTenant } = useTenantContext();
  const { logoUrl } = useBranding();

  const [nomeFantasia, setNomeFantasia] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#1E3A5F');
  const [corSecundaria, setCorSecundaria] = useState('#2E86C1');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { upload, isUploading } = useStorageBucketUpload({
    bucket: 'logos',
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    upsert: true,
  });

  // Load current data
  useEffect(() => {
    if (tenant) {
      setNomeFantasia(tenant.nome_fantasia || '');
    }
    if (branding) {
      setCorPrimaria(branding.cor_primaria || '#1E3A5F');
      setCorSecundaria(branding.cor_secundaria || '#2E86C1');
      setCurrentLogoUrl(branding.logo_url || null);
    }
  }, [tenant, branding]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 2MB');
      return;
    }

    setPendingLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setPendingLogoFile(null);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    try {
      // 1. Update tenant name
      const { error: tenantError } = await supabase
        .from('mt_tenants')
        .update({
          nome_fantasia: nomeFantasia,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (tenantError) throw tenantError;

      // 2. Upload logo if new file selected
      let newLogoUrl = currentLogoUrl;
      if (pendingLogoFile) {
        const ext = pendingLogoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const result = await upload(pendingLogoFile, `${tenant.id}/logo.${ext}`);
        if (result) {
          newLogoUrl = result.publicUrl;
        }
      }

      // 3. Update branding
      const { error: brandingError } = await supabase
        .from('mt_tenant_branding')
        .update({
          cor_primaria: corPrimaria,
          cor_secundaria: corSecundaria,
          ...(newLogoUrl !== currentLogoUrl ? { logo_url: newLogoUrl } : {}),
        })
        .eq('tenant_id', tenant.id);

      if (brandingError) throw brandingError;

      // Reset pending state
      setPendingLogoFile(null);
      setLogoPreview(null);
      setCurrentLogoUrl(newLogoUrl);

      // Refresh tenant context so branding updates globally
      if (refreshTenant) {
        await refreshTenant();
      }

      toast.success('Dados da empresa atualizados com sucesso');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Tenant não encontrado.
      </div>
    );
  }

  const displayLogo = logoPreview || currentLogoUrl || logoUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Minha Empresa
        </h1>
        <p className="text-muted-foreground">
          Personalize a aparência e dados da sua empresa
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Gerais</CardTitle>
            <CardDescription>Informações básicas da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={tenant.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identificador único, não pode ser alterado.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Logo principal da empresa (PNG, JPG ou SVG, máx. 2MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayLogo ? (
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border bg-white p-2 flex items-center justify-center">
                  <img
                    src={displayLogo}
                    alt="Logo da empresa"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-1" />
                        Trocar logo
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoSelect}
                    />
                  </label>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para enviar o logo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoSelect}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Cores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cores da Marca</CardTitle>
            <CardDescription>Personalize as cores do sistema para sua empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cor_primaria">Cor Primária</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    id="cor_primaria"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="font-mono w-32"
                    maxLength={7}
                  />
                  <div
                    className="h-10 flex-1 rounded-md border"
                    style={{ backgroundColor: corPrimaria }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cor_secundaria">Cor Secundária</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    id="cor_secundaria"
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="font-mono w-32"
                    maxLength={7}
                  />
                  <div
                    className="h-10 flex-1 rounded-md border"
                    style={{ backgroundColor: corSecundaria }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="min-w-[160px]"
        >
          {isSaving || isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
