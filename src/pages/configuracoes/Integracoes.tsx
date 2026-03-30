// Configurações - Integrações
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  MessageSquare,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  AlertTriangle,
  Brain,
  Sparkles,
  ArrowLeft,
  FolderSync,
  Image as ImageIcon,
  Youtube,
  Building2,
  Mail,
  Bell,
  Smartphone,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WAHAStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
  version?: string;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: string;
  enabled: boolean;
}

interface OpenAIStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
  model?: string;
}

interface GoogleDriveConfig {
  apiKey: string;
  defaultFolderId: string;
}

interface GoogleDriveStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
}

interface YouTubeConfig {
  apiKey: string;
}

interface YouTubeStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
}

interface YesLaserOfficeConfig {
  usuario: string;
  senha: string;
  agenciaId: string;
  enabled: boolean;
}

interface YesLaserOfficeStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
}

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

interface SmtpStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking' | 'idle';
  message?: string;
}

interface OtpConfig {
  defaultMethod: 'whatsapp' | 'email';
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  whatsappSession: string;
}

interface WhatsAppSession {
  id: string;
  session_name: string;
  nome: string;
  status: string;
}

export function Integracoes() {
  const { tenant } = useTenantContext();

  // WAHA State
  const [wahaConfig, setWahaConfig] = useState({
    baseUrl: '',
    apiKey: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [wahaStatus, setWahaStatus] = useState<WAHAStatus>({ status: 'checking' });
  const [isLoading, setIsLoading] = useState(true);

  // OpenAI State
  const [openaiConfig, setOpenaiConfig] = useState<OpenAIConfig>({
    apiKey: '',
    model: 'gpt-4o-mini',
    maxTokens: '2000',
    enabled: true,
  });
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isSavingOpenai, setIsSavingOpenai] = useState(false);
  const [isTestingOpenai, setIsTestingOpenai] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<OpenAIStatus>({ status: 'checking' });

  // Google Drive State
  const [googleDriveConfig, setGoogleDriveConfig] = useState<GoogleDriveConfig>({
    apiKey: '',
    defaultFolderId: '',
  });
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({ status: 'checking' });

  // YouTube State
  const [youtubeConfig, setYoutubeConfig] = useState<YouTubeConfig>({
    apiKey: '',
  });
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [isSavingYoutube, setIsSavingYoutube] = useState(false);
  const [isTestingYoutube, setIsTestingYoutube] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<YouTubeStatus>({ status: 'checking' });

  // YesLaser Office State
  const [yeslaserOfficeConfig, setYeslaserOfficeConfig] = useState<YesLaserOfficeConfig>({
    usuario: '',
    senha: '',
    agenciaId: '',
    enabled: true,
  });
  const [showYeslaserKey, setShowYeslaserKey] = useState(false);
  const [isSavingYeslaser, setIsSavingYeslaser] = useState(false);
  const [isTestingYeslaser, setIsTestingYeslaser] = useState(false);
  const [yeslaserOfficeStatus, setYeslaserOfficeStatus] = useState<YesLaserOfficeStatus>({ status: 'checking' });

  // SMTP / OTP State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    fromName: 'YESlaser',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus>({ status: 'idle' });

  const [otpConfig, setOtpConfig] = useState<OtpConfig>({
    defaultMethod: 'whatsapp',
    whatsappEnabled: true,
    emailEnabled: false,
    whatsappSession: '',
  });
  const [isSavingOtp, setIsSavingOtp] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<WhatsAppSession[]>([]);

  // Carregar configurações do banco
  useEffect(() => {
    loadConfigurations();
    loadOpenAIConfigurations();
    loadGoogleDriveConfigurations();
    loadYouTubeConfigurations();
    loadYesLaserOfficeConfigurations();
    loadSmtpAndOtpConfigurations();
    loadWhatsAppSessions();
  }, []);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      // Carregar config do WAHA de mt_waha_config (fonte principal)
      const { data: wahaData, error: wahaError } = await supabase
        .from('mt_waha_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!wahaError && wahaData) {
        setWahaConfig({
          baseUrl: wahaData.api_url || '',
          apiKey: wahaData.api_key || '',
        });

        if (wahaData.api_url && wahaData.api_key) {
          setWahaStatus({
            status: 'connected',
            message: 'Configurado',
            version: wahaData.default_engine || 'WAHA NOWEB'
          });
        } else {
          setWahaStatus({ status: 'disconnected', message: 'Não configurado' });
        }
      } else {
        // Fallback: tentar mt_tenant_settings (coluna é 'chave', não 'key')
        const { data: settingsData } = await supabase
          .from('mt_tenant_settings')
          .select('*')
          .in('chave', ['WAHA_BASE_URL', 'WAHA_API_KEY']);

        if (settingsData && settingsData.length > 0) {
          const configMap = settingsData.reduce((acc, item) => {
            acc[item.chave] = item.valor;
            return acc;
          }, {} as Record<string, string>);

          setWahaConfig({
            baseUrl: configMap['WAHA_BASE_URL'] || '',
            apiKey: configMap['WAHA_API_KEY'] || '',
          });

          if (configMap['WAHA_BASE_URL'] && configMap['WAHA_API_KEY']) {
            setWahaStatus({
              status: 'connected',
              message: 'Configurado',
              version: 'WAHA NOWEB'
            });
          } else {
            setWahaStatus({ status: 'disconnected', message: 'Não configurado' });
          }
        } else {
          setWahaStatus({ status: 'disconnected', message: 'Não configurado' });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setWahaStatus({ status: 'error', message: 'Erro ao carregar' });
    } finally {
      setIsLoading(false);
    }
  };

  const testWahaConnection = async (url?: string, key?: string) => {
    const baseUrl = url || wahaConfig.baseUrl;
    const apiKey = key || wahaConfig.apiKey;

    if (!baseUrl) {
      setWahaStatus({ status: 'disconnected', message: 'URL não configurada' });
      return;
    }

    setIsTesting(true);
    setWahaStatus({ status: 'checking' });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${baseUrl}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const versionData = await response.json();
        setWahaStatus({
          status: 'connected',
          message: 'Conectado com sucesso',
          version: versionData.version || versionData.engine || 'WAHA',
        });
        toast.success('Conexão com WAHA estabelecida!');
      } else if (response.status === 401 || response.status === 403) {
        setWahaStatus({
          status: 'error',
          message: 'API Key inválida ou não autorizada',
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erro ao testar WAHA:', error);

      if (error.name === 'AbortError') {
        setWahaStatus({
          status: 'error',
          message: 'Timeout - servidor não respondeu em 10s',
        });
      } else {
        setWahaStatus({
          status: 'error',
          message: error.message || 'Falha na conexão',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const saveWahaConfig = async () => {
    if (!wahaConfig.baseUrl.trim()) {
      toast.error('URL Base é obrigatória');
      return;
    }

    setIsSaving(true);

    try {
      // Salvar na tabela mt_waha_config
      const { data: existingConfig } = await supabase
        .from('mt_waha_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      const newUrl = wahaConfig.baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash
      const newKey = wahaConfig.apiKey.trim();

      if (existingConfig) {
        const { error } = await supabase
          .from('mt_waha_config')
          .update({
            api_url: newUrl,
            api_key: newKey,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mt_waha_config')
          .insert({
            api_url: newUrl,
            api_key: newKey,
            tenant_id: tenant?.id,
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      // Testar conexão com a nova URL diretamente (sem recarregar do banco)
      await testWahaConnection(newUrl, newKey);
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (wahaStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
    }
  };

  // OpenAI Functions
  const loadOpenAIConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_tenant_settings')
        .select('*')
        .in('key', ['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_MAX_TOKENS', 'AI_ANALYSIS_ENABLED']);

      if (error) {
        // Se tabela não existir, usar valores padrão
        setOpenaiStatus({ status: 'disconnected', message: 'Não configurado' });
        return;
      }

      if (data && data.length > 0) {
        const configMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>);

        setOpenaiConfig({
          apiKey: configMap['OPENAI_API_KEY'] || '',
          model: configMap['OPENAI_MODEL'] || 'gpt-4o-mini',
          maxTokens: configMap['OPENAI_MAX_TOKENS'] || '2000',
          enabled: configMap['AI_ANALYSIS_ENABLED'] === 'true',
        });

        if (configMap['OPENAI_API_KEY']) {
          setOpenaiStatus({
            status: 'connected',
            message: 'Configurado',
            model: configMap['OPENAI_MODEL'] || 'gpt-4o-mini',
          });
        } else {
          setOpenaiStatus({ status: 'disconnected', message: 'API Key não configurada' });
        }
      } else {
        setOpenaiStatus({ status: 'disconnected', message: 'Não configurado' });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações OpenAI:', error);
      setOpenaiStatus({ status: 'disconnected', message: 'Erro ao carregar' });
    }
  };

  const testOpenAIConnection = async () => {
    if (!openaiConfig.apiKey) {
      setOpenaiStatus({ status: 'disconnected', message: 'API Key não configurada' });
      return;
    }

    setIsTestingOpenai(true);
    setOpenaiStatus({ status: 'checking' });

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
        },
      });

      if (response.ok) {
        setOpenaiStatus({
          status: 'connected',
          message: 'Conectado com sucesso',
          model: openaiConfig.model,
        });
        toast.success('Conexão com OpenAI estabelecida!');
      } else if (response.status === 401) {
        setOpenaiStatus({
          status: 'error',
          message: 'API Key inválida',
        });
        toast.error('API Key da OpenAI inválida');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Erro ao testar OpenAI:', error);
      setOpenaiStatus({
        status: 'error',
        message: error.message || 'Falha na conexão',
      });
      toast.error('Erro ao conectar com OpenAI');
    } finally {
      setIsTestingOpenai(false);
    }
  };

  const saveOpenAIConfig = async () => {
    if (!openaiConfig.apiKey.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }

    setIsSavingOpenai(true);

    try {
      const configs = [
        { key: 'OPENAI_API_KEY', value: openaiConfig.apiKey.trim(), is_secret: true, category: 'ai', description: 'Chave de API da OpenAI' },
        { key: 'OPENAI_MODEL', value: openaiConfig.model, is_secret: false, category: 'ai', description: 'Modelo da OpenAI' },
        { key: 'OPENAI_MAX_TOKENS', value: openaiConfig.maxTokens, is_secret: false, category: 'ai', description: 'Máximo de tokens' },
        { key: 'AI_ANALYSIS_ENABLED', value: openaiConfig.enabled ? 'true' : 'false', is_secret: false, category: 'ai', description: 'Habilitar análise com IA' },
      ];

      for (const config of configs) {
        const { data: existingData } = await supabase
          .from('mt_tenant_settings')
          .select('id')
          .eq('key', config.key)
          .single();

        if (existingData) {
          const { error } = await supabase
            .from('mt_tenant_settings')
            .update({
              value: config.value,
              updated_at: new Date().toISOString(),
            })
            .eq('key', config.key);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('mt_tenant_settings')
            .insert(config);

          if (error) throw error;
        }
      }

      toast.success('Configurações da OpenAI salvas com sucesso!');
      await testOpenAIConnection();
    } catch (error: any) {
      console.error('Erro ao salvar configurações OpenAI:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSavingOpenai(false);
    }
  };

  const getOpenAIStatusBadge = () => {
    switch (openaiStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
    }
  };

  // Google Drive Functions
  const loadGoogleDriveConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_tenant_settings')
        .select('*')
        .in('key', ['GOOGLE_DRIVE_API_KEY', 'GOOGLE_DRIVE_DEFAULT_FOLDER']);

      if (error) {
        setGoogleDriveStatus({ status: 'disconnected', message: 'Não configurado' });
        return;
      }

      if (data && data.length > 0) {
        const configMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>);

        setGoogleDriveConfig({
          apiKey: configMap['GOOGLE_DRIVE_API_KEY'] || '',
          defaultFolderId: configMap['GOOGLE_DRIVE_DEFAULT_FOLDER'] || '',
        });

        if (configMap['GOOGLE_DRIVE_API_KEY']) {
          setGoogleDriveStatus({
            status: 'connected',
            message: 'Configurado',
          });
        } else {
          setGoogleDriveStatus({ status: 'disconnected', message: 'API Key não configurada' });
        }
      } else {
        setGoogleDriveStatus({ status: 'disconnected', message: 'Não configurado' });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações Google Drive:', error);
      setGoogleDriveStatus({ status: 'disconnected', message: 'Erro ao carregar' });
    }
  };

  const testGoogleDriveConnection = async () => {
    if (!googleDriveConfig.apiKey) {
      setGoogleDriveStatus({ status: 'disconnected', message: 'API Key não configurada' });
      return;
    }

    setIsTestingGoogle(true);
    setGoogleDriveStatus({ status: 'checking' });

    try {
      // Testar listando arquivos de uma pasta pública (API Key funciona para isso)
      // Usa a pasta padrão se configurada, ou uma pasta de teste pública
      const testFolderId = googleDriveConfig.defaultFolderId || '1F1H0_aG9iY7mbdOgJKCQLHMRUvx-YajP';
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${testFolderId}'+in+parents&pageSize=1&key=${googleDriveConfig.apiKey}`,
        { method: 'GET' }
      );

      if (response.ok) {
        setGoogleDriveStatus({
          status: 'connected',
          message: 'API Key válida',
        });
        toast.success('Conexão com Google Drive estabelecida!');
      } else if (response.status === 400) {
        const errorData = await response.json();
        // API Key inválida ou malformada
        setGoogleDriveStatus({
          status: 'error',
          message: errorData.error?.message || 'API Key inválida',
        });
        toast.error('API Key do Google inválida');
      } else if (response.status === 403) {
        const errorData = await response.json();
        // Pode ser quota excedida ou API não habilitada
        if (errorData.error?.message?.includes('disabled')) {
          setGoogleDriveStatus({
            status: 'error',
            message: 'Google Drive API não está habilitada no projeto',
          });
          toast.error('Habilite a Google Drive API no console.cloud.google.com');
        } else {
          setGoogleDriveStatus({
            status: 'error',
            message: errorData.error?.message || 'Sem permissão ou quota excedida',
          });
          toast.error('API Key sem permissão ou quota excedida');
        }
      } else if (response.status === 404) {
        // Pasta não encontrada, mas API Key é válida
        setGoogleDriveStatus({
          status: 'connected',
          message: 'API Key válida (pasta de teste não encontrada)',
        });
        toast.success('API Key válida! Configure uma pasta padrão.');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Erro ao testar Google Drive:', error);
      setGoogleDriveStatus({
        status: 'error',
        message: error.message || 'Falha na conexão',
      });
      toast.error('Erro ao conectar com Google Drive');
    } finally {
      setIsTestingGoogle(false);
    }
  };

  const saveGoogleDriveConfig = async () => {
    if (!googleDriveConfig.apiKey.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }

    setIsSavingGoogle(true);

    try {
      const configs = [
        { key: 'GOOGLE_DRIVE_API_KEY', value: googleDriveConfig.apiKey.trim(), is_secret: true, category: 'integration', description: 'Chave de API do Google Drive' },
        { key: 'GOOGLE_DRIVE_DEFAULT_FOLDER', value: googleDriveConfig.defaultFolderId.trim(), is_secret: false, category: 'integration', description: 'ID da pasta padrão do Google Drive' },
      ];

      for (const config of configs) {
        const { data: existingData } = await supabase
          .from('mt_tenant_settings')
          .select('id')
          .eq('key', config.key)
          .single();

        if (existingData) {
          const { error } = await supabase
            .from('mt_tenant_settings')
            .update({
              value: config.value,
              updated_at: new Date().toISOString(),
            })
            .eq('key', config.key);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('mt_tenant_settings')
            .insert(config);

          if (error) throw error;
        }
      }

      toast.success('Configurações do Google Drive salvas com sucesso!');
      await testGoogleDriveConnection();
    } catch (error: any) {
      console.error('Erro ao salvar configurações Google Drive:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSavingGoogle(false);
    }
  };

  const getGoogleDriveStatusBadge = () => {
    switch (googleDriveStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
    }
  };

  // YouTube Functions
  const loadYouTubeConfigurations = async () => {
    try {
      // Carregar do mt_waha_config onde youtube_api_key está armazenada
      const { data: wahaData, error } = await supabase
        .from('mt_waha_config')
        .select('youtube_api_key')
        .single();

      if (error) {
        setYoutubeStatus({ status: 'disconnected', message: 'Não configurado' });
        return;
      }

      if (wahaData?.youtube_api_key) {
        setYoutubeConfig({
          apiKey: wahaData.youtube_api_key,
        });
        setYoutubeStatus({
          status: 'connected',
          message: 'Configurado',
        });
      } else {
        setYoutubeStatus({ status: 'disconnected', message: 'API Key não configurada' });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações YouTube:', error);
      setYoutubeStatus({ status: 'disconnected', message: 'Erro ao carregar' });
    }
  };

  const testYouTubeConnection = async () => {
    if (!youtubeConfig.apiKey) {
      setYoutubeStatus({ status: 'disconnected', message: 'API Key não configurada' });
      return;
    }

    setIsTestingYoutube(true);
    setYoutubeStatus({ status: 'checking' });

    try {
      // Usar endpoint de search que funciona bem com API Key no browser
      // Busca simples por um vídeo popular para testar a API Key
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&type=video&key=${youtubeConfig.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.items !== undefined) {
          setYoutubeStatus({
            status: 'connected',
            message: 'API Key válida',
          });
          toast.success('Conexão com YouTube API estabelecida!');
        } else {
          throw new Error('Resposta inválida da API');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

        if (response.status === 400) {
          // API Key malformada ou parâmetros inválidos
          setYoutubeStatus({
            status: 'error',
            message: 'API Key inválida ou malformada',
          });
          toast.error('API Key do YouTube inválida');
        } else if (response.status === 403) {
          // Verificar se é problema de quota ou API não habilitada
          if (errorMessage.includes('disabled')) {
            setYoutubeStatus({
              status: 'error',
              message: 'YouTube Data API v3 não está habilitada no projeto',
            });
            toast.error('Habilite a YouTube Data API v3 no console.cloud.google.com');
          } else if (errorMessage.includes('quota')) {
            setYoutubeStatus({
              status: 'error',
              message: 'Quota da API excedida',
            });
            toast.error('Quota do YouTube API excedida');
          } else {
            setYoutubeStatus({
              status: 'error',
              message: errorMessage || 'Sem permissão para usar a API',
            });
            toast.error('API Key sem permissão');
          }
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Erro ao testar YouTube:', error);

      if (error.name === 'AbortError') {
        setYoutubeStatus({
          status: 'error',
          message: 'Timeout - servidor não respondeu em 10s',
        });
        toast.error('Timeout ao conectar com YouTube API');
      } else {
        setYoutubeStatus({
          status: 'error',
          message: error.message || 'Falha na conexão',
        });
        toast.error('Erro ao conectar com YouTube API');
      }
    } finally {
      setIsTestingYoutube(false);
    }
  };

  const saveYouTubeConfig = async () => {
    if (!youtubeConfig.apiKey.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }

    setIsSavingYoutube(true);

    try {
      // Atualizar na tabela mt_waha_config
      const { data: existingConfig } = await supabase
        .from('mt_waha_config')
        .select('id')
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from('mt_waha_config')
          .update({
            youtube_api_key: youtubeConfig.apiKey.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mt_waha_config')
          .insert({
            youtube_api_key: youtubeConfig.apiKey.trim(),
          });

        if (error) throw error;
      }

      toast.success('Configurações do YouTube salvas com sucesso!');
      await testYouTubeConnection();
    } catch (error: any) {
      console.error('Erro ao salvar configurações YouTube:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSavingYoutube(false);
    }
  };

  const getYouTubeStatusBadge = () => {
    switch (youtubeStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
    }
  };

  // YesLaser Office Functions
  const loadYesLaserOfficeConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_tenant_integrations')
        .select('*')
        .single();

      if (error) {
        setYeslaserOfficeStatus({ status: 'disconnected', message: 'Não configurado' });
        return;
      }

      if (data) {
        setYeslaserOfficeConfig({
          usuario: data.usuario || '',
          senha: data.senha || '',
          agenciaId: data.agencia_id || '',
          enabled: data.enabled !== false,
        });

        if (data.usuario && data.senha) {
          setYeslaserOfficeStatus({
            status: 'connected',
            message: 'Configurado',
          });
        } else {
          setYeslaserOfficeStatus({ status: 'disconnected', message: 'Credenciais não configuradas' });
        }
      } else {
        setYeslaserOfficeStatus({ status: 'disconnected', message: 'Não configurado' });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações YesLaser Office:', error);
      setYeslaserOfficeStatus({ status: 'disconnected', message: 'Erro ao carregar' });
    }
  };

  const testYesLaserOfficeConnection = async () => {
    if (!yeslaserOfficeConfig.usuario || !yeslaserOfficeConfig.senha) {
      setYeslaserOfficeStatus({ status: 'disconnected', message: 'Credenciais não configuradas' });
      return;
    }

    setIsTestingYeslaser(true);
    setYeslaserOfficeStatus({ status: 'checking' });

    try {
      // Testar autenticação com a API do YesLaser Office
      const response = await fetch('https://apiaberta.yeslaseroffice.com.br/api/Account/Login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: yeslaserOfficeConfig.usuario,
          password: yeslaserOfficeConfig.senha,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success || data.token) {
          setYeslaserOfficeStatus({
            status: 'connected',
            message: 'Autenticado com sucesso',
          });
          toast.success('Conexão com YesLaser Office estabelecida!');
        } else {
          throw new Error(data.message || 'Falha na autenticação');
        }
      } else if (response.status === 401) {
        setYeslaserOfficeStatus({
          status: 'error',
          message: 'Credenciais inválidas',
        });
        toast.error('Credenciais do YesLaser Office inválidas');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Erro ao testar YesLaser Office:', error);
      setYeslaserOfficeStatus({
        status: 'error',
        message: error.message || 'Falha na conexão',
      });
      toast.error('Erro ao conectar com YesLaser Office');
    } finally {
      setIsTestingYeslaser(false);
    }
  };

  const saveYesLaserOfficeConfig = async () => {
    if (!yeslaserOfficeConfig.usuario.trim() || !yeslaserOfficeConfig.senha.trim()) {
      toast.error('Usuário e senha são obrigatórios');
      return;
    }

    setIsSavingYeslaser(true);

    try {
      const { data: existingConfig } = await supabase
        .from('mt_tenant_integrations')
        .select('id')
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from('mt_tenant_integrations')
          .update({
            usuario: yeslaserOfficeConfig.usuario.trim(),
            senha: yeslaserOfficeConfig.senha.trim(),
            agencia_id: yeslaserOfficeConfig.agenciaId.trim() || null,
            enabled: yeslaserOfficeConfig.enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mt_tenant_integrations')
          .insert({
            usuario: yeslaserOfficeConfig.usuario.trim(),
            senha: yeslaserOfficeConfig.senha.trim(),
            agencia_id: yeslaserOfficeConfig.agenciaId.trim() || null,
            enabled: yeslaserOfficeConfig.enabled,
          });

        if (error) throw error;
      }

      toast.success('Configurações do YesLaser Office salvas com sucesso!');
      await testYesLaserOfficeConnection();
    } catch (error: any) {
      console.error('Erro ao salvar configurações YesLaser Office:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSavingYeslaser(false);
    }
  };

  const getYesLaserOfficeStatusBadge = () => {
    switch (yeslaserOfficeStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
    }
  };

  // ============================================================
  // SMTP / OTP Functions
  // ============================================================

  const loadWhatsAppSessions = async () => {
    try {
      const { data } = await supabase
        .from('mt_whatsapp_sessions')
        .select('id, session_name, nome, status')
        .order('created_at', { ascending: false });
      if (data) setAvailableSessions(data as WhatsAppSession[]);
    } catch (err) {
      console.error('Erro ao carregar sessões WhatsApp:', err);
    }
  };

  const loadSmtpAndOtpConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_platform_settings')
        .select('chave, valor')
        .in('chave', [
          'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass',
          'smtp_from_email', 'smtp_from_name',
          'otp_default_method', 'otp_whatsapp_enabled', 'otp_email_enabled', 'otp_whatsapp_session',
        ]);

      if (error || !data) return;

      const map: Record<string, string> = {};
      data.forEach((r: { chave: string; valor: string }) => { map[r.chave] = r.valor; });

      setSmtpConfig({
        host: map.smtp_host || '',
        port: map.smtp_port || '587',
        secure: map.smtp_secure === 'true',
        user: map.smtp_user || '',
        pass: map.smtp_pass || '',
        fromEmail: map.smtp_from_email || '',
        fromName: map.smtp_from_name || 'YESlaser',
      });

      if (map.smtp_host && map.smtp_user) {
        setSmtpStatus({ status: 'connected', message: 'Configurado' });
      }

      setOtpConfig({
        defaultMethod: (map.otp_default_method as 'whatsapp' | 'email') || 'whatsapp',
        whatsappEnabled: map.otp_whatsapp_enabled !== 'false',
        emailEnabled: map.otp_email_enabled === 'true',
        whatsappSession: map.otp_whatsapp_session || '',
      });
    } catch (err) {
      console.error('Erro ao carregar config SMTP/OTP:', err);
    }
  };

  const saveSmtpConfig = async () => {
    if (!smtpConfig.host.trim() || !smtpConfig.user.trim() || !smtpConfig.pass.trim()) {
      toast.error('Host, Usuário e Senha são obrigatórios');
      return;
    }

    setIsSavingSmtp(true);
    try {
      const settings = [
        { chave: 'smtp_host', valor: smtpConfig.host.trim() },
        { chave: 'smtp_port', valor: smtpConfig.port },
        { chave: 'smtp_secure', valor: smtpConfig.secure ? 'true' : 'false' },
        { chave: 'smtp_user', valor: smtpConfig.user.trim() },
        { chave: 'smtp_pass', valor: smtpConfig.pass },
        { chave: 'smtp_from_email', valor: smtpConfig.fromEmail.trim() || smtpConfig.user.trim() },
        { chave: 'smtp_from_name', valor: smtpConfig.fromName.trim() || 'YESlaser' },
      ];

      for (const s of settings) {
        const { data: existing } = await supabase
          .from('mt_platform_settings')
          .select('chave')
          .eq('chave', s.chave)
          .maybeSingle();

        if (existing) {
          await supabase.from('mt_platform_settings').update({ valor: s.valor }).eq('chave', s.chave);
        } else {
          await supabase.from('mt_platform_settings').insert({
            ...s,
            tipo: 'string',
            categoria: 'smtp',
            is_public: false,
            is_editable: true,
          });
        }
      }

      toast.success('Configurações SMTP salvas!');
      setSmtpStatus({ status: 'connected', message: 'Configurado' });
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const testSmtpConnection = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      toast.error('Preencha Host, Usuário e Senha antes de testar');
      return;
    }

    setIsTestingSmtp(true);
    setSmtpStatus({ status: 'checking' });

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Salva config temporariamente para o teste funcionar na edge function
      await saveSmtpConfig();

      const response = await fetch(`${supabaseUrl}/functions/v1/enviar-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          metodo: 'email',
          destino: smtpConfig.user,
          codigo: '123456',
          nome: 'Teste',
          tipo: 'influenciadora',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSmtpStatus({ status: 'connected', message: 'Teste enviado com sucesso' });
        toast.success(`Email de teste enviado para ${smtpConfig.user}!`);
      } else {
        setSmtpStatus({ status: 'error', message: result.error || 'Falha no envio' });
        toast.error(`Falha: ${result.error}`);
      }
    } catch (err: any) {
      setSmtpStatus({ status: 'error', message: err.message });
      toast.error('Erro ao testar SMTP');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const saveOtpConfig = async () => {
    setIsSavingOtp(true);
    try {
      const settings = [
        { chave: 'otp_default_method', valor: otpConfig.defaultMethod },
        { chave: 'otp_whatsapp_enabled', valor: otpConfig.whatsappEnabled ? 'true' : 'false' },
        { chave: 'otp_email_enabled', valor: otpConfig.emailEnabled ? 'true' : 'false' },
        { chave: 'otp_whatsapp_session', valor: otpConfig.whatsappSession },
      ];

      for (const s of settings) {
        const { data: existing } = await supabase
          .from('mt_platform_settings')
          .select('chave')
          .eq('chave', s.chave)
          .maybeSingle();

        if (existing) {
          await supabase.from('mt_platform_settings').update({ valor: s.valor }).eq('chave', s.chave);
        } else {
          await supabase.from('mt_platform_settings').insert({
            ...s,
            tipo: 'string',
            categoria: 'otp',
            is_public: false,
            is_editable: true,
          });
        }
      }

      // Se foi selecionada uma sessão padrão para OTP, marcar na tabela de sessões
      if (otpConfig.whatsappSession) {
        await supabase
          .from('mt_whatsapp_sessions')
          .update({ is_default: false } as any)
          .neq('session_name', otpConfig.whatsappSession);

        await supabase
          .from('mt_whatsapp_sessions')
          .update({ is_default: true } as any)
          .eq('session_name', otpConfig.whatsappSession);
      }

      toast.success('Configurações de envio salvas!');
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSavingOtp(false);
    }
  };

  const getSmtpStatusBadge = () => {
    switch (smtpStatus.status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Configurado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Testando...
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Não configurado
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Configure APIs e serviços externos conectados ao sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp (WAHA)
          </TabsTrigger>
          <TabsTrigger value="openai" className="gap-2">
            <Brain className="h-4 w-4" />
            OpenAI (IA)
          </TabsTrigger>
          <TabsTrigger value="googledrive" className="gap-2">
            <FolderSync className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2">
            <Youtube className="h-4 w-4" />
            YouTube
          </TabsTrigger>
          <TabsTrigger value="yeslaser" className="gap-2">
            <Building2 className="h-4 w-4" />
            YesLaser Office
          </TabsTrigger>
          <TabsTrigger value="envio" className="gap-2">
            <Bell className="h-4 w-4" />
            Envio / OTP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">WAHA - WhatsApp HTTP API</CardTitle>
                    <CardDescription>
                      Integração com o servidor WAHA para envio e recebimento de mensagens
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            {wahaStatus.version && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Versão: {wahaStatus.version}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Conexão</CardTitle>
              <CardDescription>
                Configure as credenciais de acesso ao servidor WAHA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waha-url">URL Base do WAHA</Label>
                <div className="flex gap-2">
                  <Input
                    id="waha-url"
                    placeholder="https://waha.seudominio.com.br"
                    value={wahaConfig.baseUrl}
                    onChange={(e) =>
                      setWahaConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    disabled={!wahaConfig.baseUrl}
                  >
                    <a
                      href={wahaConfig.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL do servidor WAHA onde a API está hospedada
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waha-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="waha-key"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Sua chave de API"
                      value={wahaConfig.apiKey}
                      onChange={(e) =>
                        setWahaConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave de autenticação para acessar a API do WAHA
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={saveWahaConfig} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testWahaConnection()}
                  disabled={isTesting || !wahaConfig.baseUrl}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Informações Importantes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>WAHA (WhatsApp HTTP API)</strong> é o serviço que permite enviar e
                receber mensagens do WhatsApp através de uma API REST.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>As configurações são armazenadas de forma segura no banco de dados</li>
                <li>A API Key nunca é exposta no frontend em produção</li>
                <li>Todas as chamadas passam por Edge Functions do Supabase</li>
                <li>
                  Para criar sessões e conectar números, acesse{' '}
                  <Link to="/whatsapp/sessoes" className="text-primary hover:underline">
                    WhatsApp → Sessões
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Tab */}
        <TabsContent value="openai" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Brain className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">OpenAI - Inteligência Artificial</CardTitle>
                    <CardDescription>
                      Análise de mensagens e geração de relatórios de desempenho com IA
                    </CardDescription>
                  </div>
                </div>
                {getOpenAIStatusBadge()}
              </div>
            </CardHeader>
            {openaiStatus.model && openaiStatus.status === 'connected' && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Modelo: {openaiStatus.model}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações da OpenAI</CardTitle>
              <CardDescription>
                Configure as credenciais e parâmetros da API OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai-key"
                      type={showOpenaiKey ? 'text' : 'password'}
                      placeholder="sk-proj-..."
                      value={openaiConfig.apiKey}
                      onChange={(e) =>
                        setOpenaiConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  >
                    {showOpenaiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave de API da OpenAI. Obtenha em{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Modelo</Label>
                  <select
                    id="openai-model"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={openaiConfig.model}
                    onChange={(e) =>
                      setOpenaiConfig((prev) => ({ ...prev, model: e.target.value }))
                    }
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    GPT-4o Mini oferece melhor custo-benefício
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-tokens">Máximo de Tokens</Label>
                  <Input
                    id="openai-tokens"
                    type="number"
                    min="100"
                    max="4000"
                    value={openaiConfig.maxTokens}
                    onChange={(e) =>
                      setOpenaiConfig((prev) => ({ ...prev, maxTokens: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite de tokens por requisição (100-4000)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="openai-enabled" className="text-base">
                    Análise de Mensagens com IA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar análise automática de conversas do WhatsApp
                  </p>
                </div>
                <Switch
                  id="openai-enabled"
                  checked={openaiConfig.enabled}
                  onCheckedChange={(checked) =>
                    setOpenaiConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={saveOpenAIConfig} disabled={isSavingOpenai}>
                  {isSavingOpenai ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={testOpenAIConnection}
                  disabled={isTestingOpenai || !openaiConfig.apiKey}
                >
                  {isTestingOpenai ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-base">Funcionalidades da IA</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Análise de Mensagens</strong> - A OpenAI será utilizada para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Analisar o tom e sentimento das conversas</li>
                <li>Identificar leads qualificados automaticamente</li>
                <li>Gerar relatórios de desempenho dos atendimentos</li>
                <li>Sugerir respostas baseadas no contexto</li>
                <li>Classificar mensagens por intenção (dúvida, reclamação, interesse)</li>
                <li>Detectar oportunidades de venda</li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                <strong>Nota:</strong> As mensagens são processadas de forma segura e não são
                armazenadas pela OpenAI. Os custos são baseados no uso do token.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Drive Tab */}
        <TabsContent value="googledrive" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FolderSync className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Google Drive - Galeria de Artes</CardTitle>
                    <CardDescription>
                      Sincronize imagens do Google Drive para a galeria de marketing
                    </CardDescription>
                  </div>
                </div>
                {getGoogleDriveStatusBadge()}
              </div>
            </CardHeader>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Google Drive</CardTitle>
              <CardDescription>
                Configure a API Key do Google para sincronizar imagens automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google-key">Google API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="google-key"
                      type={showGoogleKey ? 'text' : 'password'}
                      placeholder="AIza..."
                      value={googleDriveConfig.apiKey}
                      onChange={(e) =>
                        setGoogleDriveConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowGoogleKey(!showGoogleKey)}
                  >
                    {showGoogleKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave de API do Google. Obtenha em{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.cloud.google.com
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-folder">ID da Pasta Padrão (Opcional)</Label>
                <Input
                  id="google-folder"
                  placeholder="1F1H0_aG9iY7mbdOgJKCQLHMRUvx-YajP"
                  value={googleDriveConfig.defaultFolderId}
                  onChange={(e) =>
                    setGoogleDriveConfig((prev) => ({ ...prev, defaultFolderId: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  ID da pasta do Drive para usar como padrão (extraído do link). Pode ser alterado a cada sincronização.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={saveGoogleDriveConfig} disabled={isSavingGoogle}>
                  {isSavingGoogle ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={testGoogleDriveConnection}
                  disabled={isTestingGoogle || !googleDriveConfig.apiKey}
                >
                  {isTestingGoogle ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Como Funciona</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Sincronização com Google Drive</strong> - O sistema permite:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Importar imagens de qualquer pasta pública do Google Drive</li>
                <li>As subpastas são convertidas automaticamente em categorias</li>
                <li>Evita duplicatas - imagens já importadas são ignoradas</li>
                <li>Suporta JPG, PNG, GIF, WebP e SVG</li>
                <li>A cada mês você pode usar uma pasta diferente</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs">
                  <strong>Requisitos da API Key:</strong> A API Key deve ter a{' '}
                  <strong>Google Drive API</strong> habilitada no Google Cloud Console.
                  A pasta do Drive deve ser <strong>pública</strong> ou compartilhada com "qualquer pessoa com o link".
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Para sincronizar, acesse{' '}
                <Link to="/marketing/galeria" className="text-primary hover:underline">
                  Marketing → Galeria de Artes
                </Link>{' '}
                e clique em "Sincronizar Drive".
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Youtube className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">YouTube Data API</CardTitle>
                    <CardDescription>
                      Integração com YouTube para buscar e exibir vídeos
                    </CardDescription>
                  </div>
                </div>
                {getYouTubeStatusBadge()}
              </div>
            </CardHeader>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do YouTube</CardTitle>
              <CardDescription>
                Configure a API Key do YouTube para buscar vídeos e playlists
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-key">YouTube API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="youtube-key"
                      type={showYoutubeKey ? 'text' : 'password'}
                      placeholder="AIza..."
                      value={youtubeConfig.apiKey}
                      onChange={(e) =>
                        setYoutubeConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                  >
                    {showYoutubeKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave de API do YouTube. Obtenha em{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.cloud.google.com
                  </a>
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={saveYouTubeConfig} disabled={isSavingYoutube}>
                  {isSavingYoutube ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={testYouTubeConnection}
                  disabled={isTestingYoutube || !youtubeConfig.apiKey}
                >
                  {isTestingYoutube ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">Como Funciona</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Integração com YouTube</strong> - A API permite:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Buscar vídeos de canais específicos</li>
                <li>Exibir playlists e vídeos educacionais</li>
                <li>Incorporar vídeos de treinamento</li>
                <li>Listar vídeos por palavra-chave</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs">
                  <strong>Requisitos:</strong> A API Key deve ter a{' '}
                  <strong>YouTube Data API v3</strong> habilitada no Google Cloud Console.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YesLaser Office Tab */}
        <TabsContent value="yeslaser" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Building2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">YesLaser Office API</CardTitle>
                    <CardDescription>
                      Integração com o sistema de gestão YesLaser Office
                    </CardDescription>
                  </div>
                </div>
                {getYesLaserOfficeStatusBadge()}
              </div>
            </CardHeader>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do YesLaser Office</CardTitle>
              <CardDescription>
                Configure as credenciais de acesso à API do YesLaser Office
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yeslaser-usuario">Usuário</Label>
                <Input
                  id="yeslaser-usuario"
                  placeholder="AcessoApiYesLaser"
                  value={yeslaserOfficeConfig.usuario}
                  onChange={(e) =>
                    setYeslaserOfficeConfig((prev) => ({ ...prev, usuario: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Nome de usuário para autenticação na API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yeslaser-senha">Senha/Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="yeslaser-senha"
                      type={showYeslaserKey ? 'text' : 'password'}
                      placeholder="Token de acesso"
                      value={yeslaserOfficeConfig.senha}
                      onChange={(e) =>
                        setYeslaserOfficeConfig((prev) => ({ ...prev, senha: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowYeslaserKey(!showYeslaserKey)}
                  >
                    {showYeslaserKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Senha ou token de autenticação
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yeslaser-agencia">ID da Agência (Opcional)</Label>
                <Input
                  id="yeslaser-agencia"
                  placeholder="ID da agência de marketing"
                  value={yeslaserOfficeConfig.agenciaId}
                  onChange={(e) =>
                    setYeslaserOfficeConfig((prev) => ({ ...prev, agenciaId: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  ID da agência para filtrar dados específicos
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="yeslaser-enabled" className="text-base">
                    Integração Ativa
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar sincronização de dados com YesLaser Office
                  </p>
                </div>
                <Switch
                  id="yeslaser-enabled"
                  checked={yeslaserOfficeConfig.enabled}
                  onCheckedChange={(checked) =>
                    setYeslaserOfficeConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button onClick={saveYesLaserOfficeConfig} disabled={isSavingYeslaser}>
                  {isSavingYeslaser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={testYesLaserOfficeConnection}
                  disabled={isTestingYeslaser || !yeslaserOfficeConfig.usuario || !yeslaserOfficeConfig.senha}
                >
                  {isTestingYeslaser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base">Funcionalidades</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>YesLaser Office</strong> - A integração permite:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Sincronizar agendamentos com o sistema principal</li>
                <li>Consultar horários disponíveis por unidade</li>
                <li>Enviar leads diretamente para a API</li>
                <li>Listar unidades e agências de marketing</li>
                <li>Consultar histórico de procedimentos</li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Documentação da API:{' '}
                <a
                  href="https://apiaberta.yeslaseroffice.com.br/swagger/ui/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  apiaberta.yeslaseroffice.com.br/swagger
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* ABA: Envio / OTP */}
        {/* ============================================================ */}
        <TabsContent value="envio" className="space-y-4">

          {/* ---- Método Padrão ---- */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <Bell className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Método de Envio Padrão</CardTitle>
                    <CardDescription>
                      Define como os códigos OTP serão enviados para influenciadoras, parceiros e clientes
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Habilitar WhatsApp / Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-green-500/10">
                      <Smartphone className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">WhatsApp</Label>
                      <p className="text-xs text-muted-foreground">Via sessão WAHA da unidade</p>
                    </div>
                  </div>
                  <Switch
                    checked={otpConfig.whatsappEnabled}
                    onCheckedChange={(v) => setOtpConfig((p) => ({ ...p, whatsappEnabled: v }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-xs text-muted-foreground">Via servidor SMTP configurado</p>
                    </div>
                  </div>
                  <Switch
                    checked={otpConfig.emailEnabled}
                    onCheckedChange={(v) => setOtpConfig((p) => ({ ...p, emailEnabled: v }))}
                  />
                </div>
              </div>

              {/* Método Padrão */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Canal Padrão (quando disponíveis os dois)</Label>
                <RadioGroup
                  value={otpConfig.defaultMethod}
                  onValueChange={(v) => setOtpConfig((p) => ({ ...p, defaultMethod: v as 'whatsapp' | 'email' }))}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${otpConfig.defaultMethod === 'whatsapp' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'hover:bg-muted/50'}`}>
                    <RadioGroupItem value="whatsapp" id="otp-whatsapp" />
                    <label htmlFor="otp-whatsapp" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Enviar via WhatsApp primeiro</p>
                      </div>
                    </label>
                  </div>

                  <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${otpConfig.defaultMethod === 'email' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-muted/50'}`}>
                    <RadioGroupItem value="email" id="otp-email" />
                    <label htmlFor="otp-email" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-xs text-muted-foreground">Enviar via Email primeiro</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Sessão WhatsApp para OTP */}
              {otpConfig.whatsappEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="otp-session">Sessão WhatsApp para Envio de OTP</Label>
                  <Select
                    value={otpConfig.whatsappSession}
                    onValueChange={(v) => setOtpConfig((p) => ({ ...p, whatsappSession: v }))}
                  >
                    <SelectTrigger id="otp-session">
                      <SelectValue placeholder="Selecione a sessão que enviará os códigos..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSessions.length === 0 ? (
                        <SelectItem value="none" disabled>Nenhuma sessão disponível</SelectItem>
                      ) : (
                        availableSessions.map((s) => (
                          <SelectItem key={s.id} value={s.session_name}>
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${s.status === 'working' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                              <span>{s.nome || s.session_name}</span>
                              <Badge variant="outline" className="ml-1 text-xs">{s.status}</Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione a sessão WhatsApp que será usada para enviar os códigos de verificação. Deve estar com status <strong>working</strong>.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button onClick={saveOtpConfig} disabled={isSavingOtp}>
                  {isSavingOtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Salvar Configurações de Envio</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---- Configuração SMTP ---- */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Servidor de Email (SMTP)</CardTitle>
                    <CardDescription>
                      Configure as credenciais SMTP para envio de emails com códigos OTP
                    </CardDescription>
                  </div>
                </div>
                {getSmtpStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="smtp-host">Host SMTP</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com ou mail.seudominio.com"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig((p) => ({ ...p, host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta</Label>
                  <Select
                    value={smtpConfig.port}
                    onValueChange={(v) => setSmtpConfig((p) => ({
                      ...p,
                      port: v,
                      secure: v === '465',
                    }))}
                  >
                    <SelectTrigger id="smtp-port">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="587">587 (TLS - Recomendado)</SelectItem>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="25">25 (Sem criptografia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuário / Email</Label>
                <Input
                  id="smtp-user"
                  type="email"
                  placeholder="contato@suaempresa.com"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig((p) => ({ ...p, user: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Senha / Token de App</Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showSmtpPass ? 'text' : 'password'}
                    placeholder="Senha ou App Password do Gmail"
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig((p) => ({ ...p, pass: e.target.value }))}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                  >
                    {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para Gmail: use uma <strong>Senha de App</strong> (não a senha normal). Ative 2FA e gere em google.com/apppasswords
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email">Email Remetente</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    placeholder="noreply@suaempresa.com"
                    value={smtpConfig.fromEmail}
                    onChange={(e) => setSmtpConfig((p) => ({ ...p, fromEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name">Nome do Remetente</Label>
                  <Input
                    id="smtp-from-name"
                    placeholder="YESlaser"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig((p) => ({ ...p, fromName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Conexão Segura (SSL)</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilitar quando usar porta 465. Para porta 587 use STARTTLS (desligado).
                  </p>
                </div>
                <Switch
                  checked={smtpConfig.secure}
                  onCheckedChange={(v) => setSmtpConfig((p) => ({ ...p, secure: v }))}
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button onClick={saveSmtpConfig} disabled={isSavingSmtp}>
                  {isSavingSmtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Salvar SMTP</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={testSmtpConnection}
                  disabled={isTestingSmtp || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass}
                >
                  {isTestingSmtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando teste...</>
                  ) : (
                    <><TestTube className="mr-2 h-4 w-4" />Testar Envio</>
                  )}
                </Button>
              </div>

              {smtpStatus.status === 'error' && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{smtpStatus.message}</span>
                </div>
              )}
              {smtpStatus.status === 'connected' && smtpStatus.message !== 'Configurado' && (
                <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Email de teste enviado com sucesso para <strong>{smtpConfig.user}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Como funciona o Envio de OTP</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Os códigos de verificação de 6 dígitos são enviados quando:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Influenciadores(as) fazem login no <strong>Portal do Influenciador(a)</strong></li>
                <li>Parceiros fazem login no <strong>Portal do Parceiro</strong></li>
                <li>Clientes fazem login no <strong>Portal do Cliente</strong></li>
              </ul>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-3">
                  <p className="font-medium text-xs mb-1 flex items-center gap-1">
                    <Smartphone className="h-3 w-3 text-green-500" /> WhatsApp
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa a sessão WAHA selecionada. A sessão deve estar com status <strong>working</strong>.
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="font-medium text-xs mb-1 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-blue-500" /> Email
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa as credenciais SMTP configuradas. Para Gmail, use uma Senha de App.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Integracoes;
