import { supabase } from "@/integrations/supabase/client";
import type {
  MarketingTemplate,
  MarketingCampanha,
  MarketingAsset,
  MarketingTemplateFormData,
  MarketingCampanhaFormData,
  MarketingAssetFormData,
} from "@/types/marketing";

export class MarketingService {
  // ============================================
  // TEMPLATES
  // ============================================

  static async getTemplates(unidadeId?: string | null): Promise<MarketingTemplate[]> {
    let query = supabase
      .from('mt_marketing_templates')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `);

    // Se unidadeId for passado, filtra por unidade_id = null OU unidade_id = unidadeId
    // Se não for passado (admin), retorna todos
    if (unidadeId) {
      query = query.or(`unidade_id.is.null,unidade_id.eq.${unidadeId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar templates:', error);
      throw error;
    }

    return (data || []).map((template: any) => ({
      ...template,
      variaveis_disponiveis: Array.isArray(template.variaveis_disponiveis)
        ? template.variaveis_disponiveis
        : [],
    })) as MarketingTemplate[];
  }

  static async getTemplateById(id: string): Promise<MarketingTemplate | null> {
    const { data, error } = await supabase
      .from('mt_marketing_templates')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar template:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      variaveis_disponiveis: Array.isArray(data.variaveis_disponiveis)
        ? data.variaveis_disponiveis
        : [],
    } as MarketingTemplate;
  }

  static async createTemplate(template: MarketingTemplateFormData): Promise<MarketingTemplate> {
    const { data, error } = await supabase
      .from('mt_marketing_templates')
      .insert({
        nome_template: template.nome_template,
        template_content: template.template_content,
        tipo: template.tipo,
        variaveis_disponiveis: template.variaveis_disponiveis || [],
        is_default: template.is_default || false,
        ativo: template.ativo !== false,
        unidade_id: template.unidade_id || null,
      })
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar template:', error);
      throw error;
    }

    return {
      ...data,
      variaveis_disponiveis: Array.isArray(data.variaveis_disponiveis)
        ? data.variaveis_disponiveis
        : [],
    } as MarketingTemplate;
  }

  static async updateTemplate(id: string, template: Partial<MarketingTemplateFormData>): Promise<MarketingTemplate> {
    const { data, error } = await supabase
      .from('mt_marketing_templates')
      .update({
        ...template,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar template:', error);
      throw error;
    }

    return {
      ...data,
      variaveis_disponiveis: Array.isArray(data.variaveis_disponiveis)
        ? data.variaveis_disponiveis
        : [],
    } as MarketingTemplate;
  }

  static async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('mt_marketing_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar template:', error);
      throw error;
    }
  }

  // ============================================
  // CAMPANHAS
  // ============================================

  static async getCampanhas(unidadeId?: string | null): Promise<MarketingCampanha[]> {
    let query = supabase
      .from('mt_campaigns')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `);

    // Se unidadeId for passado, filtra por unidade_id = null OU unidade_id = unidadeId
    // Se não for passado (admin), retorna todos
    if (unidadeId) {
      query = query.or(`unidade_id.is.null,unidade_id.eq.${unidadeId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar campanhas:', error);
      throw error;
    }

    return (data || []).map((campanha: any) => ({
      ...campanha,
      canais: Array.isArray(campanha.canais) ? campanha.canais : [],
      metricas: campanha.metricas || {},
    })) as MarketingCampanha[];
  }

  static async getCampanhaById(id: string): Promise<MarketingCampanha | null> {
    const { data, error } = await supabase
      .from('mt_campaigns')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar campanha:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      canais: Array.isArray(data.canais) ? data.canais : [],
      metricas: data.metricas || {},
    } as MarketingCampanha;
  }

  static async createCampanha(campanha: MarketingCampanhaFormData): Promise<MarketingCampanha> {
    const { data, error } = await supabase
      .from('mt_campaigns')
      .insert({
        nome: campanha.nome,
        descricao: campanha.descricao || null,
        tipo: campanha.tipo,
        status: campanha.status || 'ativa',
        unidade_id: campanha.unidade_id || null,
        data_inicio: campanha.data_inicio || null,
        data_fim: campanha.data_fim || null,
        budget_estimado: campanha.budget_estimado || null,
        objetivo: campanha.objetivo || null,
        publico_alvo: campanha.publico_alvo || null,
        canais: campanha.canais || [],
        utm_source: campanha.utm_source || null,
        utm_medium: campanha.utm_medium || null,
        utm_campaign: campanha.utm_campaign || null,
        utm_term: campanha.utm_term || null,
        utm_content: campanha.utm_content || null,
        ativa: true,
      })
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar campanha:', error);
      throw error;
    }

    return {
      ...data,
      canais: Array.isArray(data.canais) ? data.canais : [],
      metricas: data.metricas || {},
    } as MarketingCampanha;
  }

  static async updateCampanha(id: string, campanha: Partial<MarketingCampanhaFormData>): Promise<MarketingCampanha> {
    const { data, error } = await supabase
      .from('mt_campaigns')
      .update({
        ...campanha,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar campanha:', error);
      throw error;
    }

    return {
      ...data,
      canais: Array.isArray(data.canais) ? data.canais : [],
      metricas: data.metricas || {},
    } as MarketingCampanha;
  }

  static async deleteCampanha(id: string): Promise<void> {
    const { error } = await supabase
      .from('mt_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar campanha:', error);
      throw error;
    }
  }

  // ============================================
  // ASSETS
  // ============================================

  static async getAssets(unidadeId?: string | null): Promise<MarketingAsset[]> {
    let query = supabase
      .from('mt_marketing_assets')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia),
        mt_campaigns:campanha_id (id, nome)
      `);

    // Se unidadeId for passado, filtra por unidade_id = null OU unidade_id = unidadeId
    // Se não for passado (admin), retorna todos
    if (unidadeId) {
      query = query.or(`unidade_id.is.null,unidade_id.eq.${unidadeId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar assets:', error);
      throw error;
    }

    return (data || []).map((asset: any) => ({
      ...asset,
      tags: Array.isArray(asset.tags) ? asset.tags : [],
      dimensoes: asset.dimensoes && typeof asset.dimensoes === 'object' ? asset.dimensoes : {},
    })) as MarketingAsset[];
  }

  static async getAssetById(id: string): Promise<MarketingAsset | null> {
    const { data, error } = await supabase
      .from('mt_marketing_assets')
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia),
        mt_campaigns:campanha_id (id, nome)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar asset:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
      dimensoes: data.dimensoes && typeof data.dimensoes === 'object' ? data.dimensoes : {},
    } as MarketingAsset;
  }

  static async createAsset(asset: MarketingAssetFormData): Promise<MarketingAsset> {
    const { data, error } = await supabase
      .from('mt_marketing_assets')
      .insert({
        nome: asset.nome,
        descricao: asset.descricao || null,
        tipo: asset.tipo,
        categoria: asset.categoria || null,
        unidade_id: asset.unidade_id || null,
        campanha_id: asset.campanha_id || null,
        file_url: asset.file_url,
        file_size: asset.file_size || null,
        file_type: asset.file_type || null,
        tags: asset.tags || [],
        dimensoes: asset.dimensoes || {},
        ativo: asset.ativo !== false,
      })
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia),
        mt_campaigns:campanha_id (id, nome)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar asset:', error);
      throw error;
    }

    return {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
      dimensoes: data.dimensoes && typeof data.dimensoes === 'object' ? data.dimensoes : {},
    } as MarketingAsset;
  }

  static async updateAsset(id: string, asset: Partial<MarketingAssetFormData>): Promise<MarketingAsset> {
    const { data, error } = await supabase
      .from('mt_marketing_assets')
      .update({
        ...asset,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        mt_franchises:unidade_id (id, nome_fantasia),
        mt_campaigns:campanha_id (id, nome)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar asset:', error);
      throw error;
    }

    return {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
      dimensoes: data.dimensoes && typeof data.dimensoes === 'object' ? data.dimensoes : {},
    } as MarketingAsset;
  }

  static async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('mt_marketing_assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar asset:', error);
      throw error;
    }
  }

  // ============================================
  // FILE UPLOAD
  // ============================================

  static async uploadFile(file: File, bucket: string = 'marketing-assets', fileName?: string): Promise<string> {
    const finalFileName = fileName || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(finalFileName);

    return publicUrl;
  }

  static async deleteFile(filePath: string, bucket: string = 'marketing-assets'): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }

  // ============================================
  // UNIDADES (para selects)
  // ============================================

  static async getUnidades(): Promise<{ id: string; nome_fantasia: string }[]> {
    const { data, error } = await supabase
      .from('mt_franchises')
      .select('id, nome_fantasia')
      .order('nome_fantasia');

    if (error) {
      console.error('Erro ao buscar unidades:', error);
      throw error;
    }

    return data || [];
  }

  // ============================================
  // STATS / ANALYTICS
  // ============================================

  // ============================================
  // GOOGLE DRIVE SYNC
  // ============================================

  static extractDriveFolderId(url: string): string | null {
    // Suporta vários formatos de link do Google Drive
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Se o input já for um ID (sem URL)
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    return null;
  }

  static async previewDriveSync(
    driveUrl: string,
    apiKey: string
  ): Promise<{
    totalNew: number;
    totalExisting: number;
    folders: Array<{
      folder: string;
      category: string;
      newImages: Array<{ name: string; url: string; thumbnailLink?: string }>;
      existingImages: number;
      totalImages: number;
    }>;
  }> {
    const folderId = this.extractDriveFolderId(driveUrl);
    if (!folderId) {
      throw new Error("Link do Google Drive inválido");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-sync?action=preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          folder_id: folderId,
          api_key: apiKey,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao visualizar sincronização");
    }

    return response.json();
  }

  static async syncFromDrive(
    driveUrl: string,
    apiKey: string,
    onProgress?: (message: string) => void
  ): Promise<{
    success: boolean;
    summary: {
      totalCreated: number;
      totalSkipped: number;
      totalErrors: number;
      foldersProcessed: number;
    };
    details: Array<{
      folder: string;
      category: string;
      created: number;
      skipped: number;
      errors: string[];
    }>;
  }> {
    const folderId = this.extractDriveFolderId(driveUrl);
    if (!folderId) {
      throw new Error("Link do Google Drive inválido");
    }

    onProgress?.("Conectando ao Google Drive...");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-sync?action=sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          folder_id: folderId,
          api_key: apiKey,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao sincronizar");
    }

    return response.json();
  }

  static async listDriveFolders(
    driveUrl: string,
    apiKey: string
  ): Promise<{
    folders: Array<{
      id: string;
      name: string;
      category: string;
      imageCount: number;
    }>;
    totalImages: number;
  }> {
    const folderId = this.extractDriveFolderId(driveUrl);
    if (!folderId) {
      throw new Error("Link do Google Drive inválido");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-sync?action=list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          folder_id: folderId,
          api_key: apiKey,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao listar pastas");
    }

    return response.json();
  }

  static async getMarketingStats() {
    const [templates, campanhas, assets] = await Promise.all([
      this.getTemplates(),
      this.getCampanhas(),
      this.getAssets(),
    ]);

    const activeCampaigns = campanhas.filter(c => c.status === 'ativa').length;
    const totalBudget = campanhas.reduce((sum, c) => sum + (c.budget_estimado || 0), 0);
    const activeTemplates = templates.filter(t => t.ativo).length;
    const totalAssets = assets.length;

    return {
      templates: {
        total: templates.length,
        active: activeTemplates,
        byType: {
          whatsapp: templates.filter(t => t.tipo === 'whatsapp').length,
          email: templates.filter(t => t.tipo === 'email').length,
          social_media: templates.filter(t => t.tipo === 'social_media').length,
          landing_page: templates.filter(t => t.tipo === 'landing_page').length,
        },
      },
      campanhas: {
        total: campanhas.length,
        active: activeCampaigns,
        totalBudget,
        byStatus: {
          ativa: activeCampaigns,
          pausada: campanhas.filter(c => c.status === 'pausada').length,
          finalizada: campanhas.filter(c => c.status === 'finalizada').length,
        },
      },
      assets: {
        total: totalAssets,
        byType: {
          imagem: assets.filter(a => a.tipo === 'imagem').length,
          video: assets.filter(a => a.tipo === 'video').length,
          banner: assets.filter(a => a.tipo === 'banner').length,
          logo: assets.filter(a => a.tipo === 'logo').length,
          arte_social: assets.filter(a => a.tipo === 'arte_social').length,
        },
      },
    };
  }
}
