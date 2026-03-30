import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppProvidersMT } from './useWhatsAppProvidersMT';
import { useWhatsAppWindowMT } from './useWhatsAppWindowsMT';
import { useWhatsAppRoutingRulesMT } from './useWhatsAppRoutingRulesMT';
import { useWhatsAppCostsMT } from './useWhatsAppCostsMT';
import type {
  RoutingDecision,
  ProviderType,
  WhatsAppProvider,
  WhatsAppRoutingRule,
  TemplateCategory,
} from '@/types/whatsapp-hybrid';
import { META_COST_TABLE_BRL, estimateCost, formatCostBRL } from '@/types/whatsapp-hybrid';

interface SendMessageOptions {
  text?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  forceProvider?: ProviderType;
  isBulk?: boolean;
}

export function useWhatsAppRouterMT(conversationId?: string) {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const { providers, defaultProvider } = useWhatsAppProvidersMT({
    franchise_id: franchise?.id,
    is_active: true,
  });
  const { window: currentWindow, windowStatus, isOpen: isWindowOpen } = useWhatsAppWindowMT(conversationId);
  const { rules } = useWhatsAppRoutingRulesMT({ is_active: true });
  const { summary: costSummary } = useWhatsAppCostsMT();

  // === DECISOR INTELIGENTE ===
  const getDecision = useCallback((options?: SendMessageOptions): RoutingDecision | null => {
    if (!providers.length) return null;

    const activeProviders = providers.filter(p => p.is_active && p.status === 'connected');
    if (!activeProviders.length) {
      // Tentar com providers desconectados como último recurso
      const anyActive = providers.filter(p => p.is_active);
      if (!anyActive.length) return null;
    }

    // 1. Provider forçado pelo usuário
    if (options?.forceProvider) {
      const forced = activeProviders.find(p => p.provider_type === options.forceProvider);
      if (forced) {
        return buildDecision(forced, null, 'Provider forçado manualmente', options);
      }
    }

    // 2. Aplicar regras por prioridade
    const applicableRules = rules.filter(rule => {
      if (!rule.is_active) return false;
      if (rule.franchise_id && rule.franchise_id !== franchise?.id) return false;
      return evaluateCondition(rule, options);
    }).sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      const provider = findProviderForRule(rule, activeProviders);
      if (provider) {
        return buildDecision(provider, rule, `Regra: ${rule.nome}`, options);
      }

      // Tentar fallback da regra
      if (rule.fallback_provider) {
        const fallback = activeProviders.find(p => p.provider_type === rule.fallback_provider);
        if (fallback) {
          return {
            ...buildDecision(fallback, rule, `Fallback da regra: ${rule.nome}`, options),
            fallback_available: false, // Já estamos no fallback
          };
        }
      }
    }

    // 3. Sem regras aplicáveis → usar default ou WAHA
    const fallbackProvider = defaultProvider
      || activeProviders.find(p => p.provider_type === 'waha')
      || activeProviders[0];

    if (fallbackProvider) {
      return buildDecision(fallbackProvider, null, 'Nenhuma regra aplicável - usando padrão', options);
    }

    return null;
  }, [providers, defaultProvider, rules, isWindowOpen, currentWindow, franchise?.id]);

  // === AVALIAR CONDIÇÃO DA REGRA ===
  function evaluateCondition(rule: WhatsAppRoutingRule, options?: SendMessageOptions): boolean {
    switch (rule.condition_type) {
      case 'window_open':
        return isWindowOpen;
      case 'window_closed':
        return !isWindowOpen;
      case 'bulk_campaign':
        return !!options?.isBulk;
      case 'template_required':
        return !isWindowOpen && !options?.templateName;
      case 'message_type':
        return !!options?.templateName;
      case 'first_contact':
        return !currentWindow;
      case 'follow_up':
        return !isWindowOpen && !!currentWindow;
      case 'business_hours': {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 8 && hour < 18; // 08:00-17:59 (configurável no futuro)
      }
      case 'outside_business_hours': {
        const now = new Date();
        const hour = now.getHours();
        return hour < 8 || hour >= 18;
      }
      case 'always':
        return true;
      default:
        return false;
    }
  }

  // === ENCONTRAR PROVIDER PARA REGRA ===
  function findProviderForRule(rule: WhatsAppRoutingRule, activeProviders: WhatsAppProvider[]): WhatsAppProvider | undefined {
    if (rule.preferred_provider === 'cheapest') {
      // WAHA é sempre mais barato (grátis)
      return activeProviders.find(p => p.provider_type === 'waha')
        || activeProviders.find(p => p.provider_type === 'meta_cloud_api');
    }
    if (rule.preferred_provider === 'fastest') {
      // Meta API geralmente mais rápido para templates
      return activeProviders.find(p => p.provider_type === 'meta_cloud_api')
        || activeProviders.find(p => p.provider_type === 'waha');
    }
    return activeProviders.find(p => p.provider_type === rule.preferred_provider);
  }

  // === CONSTRUIR DECISÃO ===
  function buildDecision(
    provider: WhatsAppProvider,
    rule: WhatsAppRoutingRule | null,
    reason: string,
    options?: SendMessageOptions
  ): RoutingDecision {
    const isMeta = provider.provider_type === 'meta_cloud_api';
    const needsTemplate = isMeta && !isWindowOpen;
    // Categoria dinâmica baseada no tipo de template/mensagem
    const category: TemplateCategory = options?.templateName
      ? 'MARKETING' // Templates são tipicamente marketing (pode ser refinado por metadata do template)
      : isWindowOpen
        ? 'SERVICE'  // Dentro da janela = conversa de serviço (grátis)
        : 'MARKETING'; // Fora da janela sem template = marketing
    const cost = isMeta ? META_COST_TABLE_BRL[category] : 0;
    const isFree = cost === 0;

    // Verificar se tem fallback disponível
    const otherType: ProviderType = provider.provider_type === 'waha' ? 'meta_cloud_api' : 'waha';
    const fallbackAvailable = providers.some(
      p => p.provider_type === otherType && p.is_active && p.status === 'connected'
    );

    return {
      provider: provider.provider_type,
      provider_id: provider.id,
      provider_name: provider.nome,
      reason,
      rule_applied: rule || undefined,
      window_open: isWindowOpen,
      window_expires_at: windowStatus?.expires_at || undefined,
      estimated_cost: cost,
      cost_category: category,
      is_free: isFree,
      requires_template: needsTemplate,
      requires_confirmation: !isFree && (rule?.require_confirmation ?? false),
      fallback_available: fallbackAvailable,
      fallback_provider: fallbackAvailable ? otherType : undefined,
    };
  }

  // === DECISÃO ATUAL (memoizada) ===
  const decision = useMemo(() => getDecision(), [getDecision]);

  // === ENVIAR MENSAGEM VIA ROUTER ===
  const sendMessage = useMutation({
    mutationFn: async (options: SendMessageOptions & { recipientPhone: string }) => {
      const routingDecision = getDecision(options);
      if (!routingDecision) throw new Error('Nenhum provider disponível');

      const startTime = Date.now();

      // Registrar log de roteamento
      const logEntry = {
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        conversation_id: conversationId,
        provider_id: routingDecision.provider_id,
        provider_selected: routingDecision.provider,
        rule_applied_id: routingDecision.rule_applied?.id,
        rule_applied_name: routingDecision.rule_applied?.nome,
        decision_reason: routingDecision.reason,
        window_status: isWindowOpen ? 'open' : 'closed',
        window_expires_at: windowStatus?.expires_at,
        estimated_cost: routingDecision.estimated_cost,
        cost_category: routingDecision.cost_category,
      };

      try {
        // Enviar via edge function (waha-proxy com ação de roteamento)
        const { data, error } = await supabase.functions.invoke('waha-proxy', {
          body: {
            action: options.templateName ? 'send-template' : 'send-text',
            tenant_id: tenant?.id,
            franchise_id: franchise?.id,
            conversation_id: conversationId,
            provider_type: routingDecision.provider,
            provider_id: routingDecision.provider_id,
            recipient_phone: options.recipientPhone,
            text: options.text,
            template_name: options.templateName,
            template_params: options.templateParams,
            media_url: options.mediaUrl,
            media_type: options.mediaType,
          },
        });

        if (error) throw error;

        const responseTime = Date.now() - startTime;

        // Registrar log de sucesso (try-catch para não mascarar envio bem-sucedido)
        try {
          await (supabase.from('mt_whatsapp_routing_logs') as any).insert({
            ...logEntry,
            message_id: data?.message_id,
            success: true,
            actual_cost: routingDecision.estimated_cost,
            response_time_ms: responseTime,
          });
        } catch (logError) {
          console.warn('[Router] Falha ao registrar log de sucesso:', logError);
        }

        return data;
      } catch (error) {
        const responseTime = Date.now() - startTime;

        // Registrar log de falha (try-catch para não mascarar erro original)
        try {
          await (supabase.from('mt_whatsapp_routing_logs') as any).insert({
            ...logEntry,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            response_time_ms: responseTime,
            fallback_used: false,
          });
        } catch (logError) {
          console.warn('[Router] Falha ao registrar log de erro:', logError);
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-wa-routing-logs'] });
      queryClient.invalidateQueries({ queryKey: ['mt-wa-costs'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  return {
    // Decisão atual
    decision,
    getDecision,

    // Estado
    isWindowOpen,
    windowStatus,
    providers,
    defaultProvider,

    // Ações
    sendMessage,

    // Custos
    estimateCost,
    costSummary,
    formatCostBRL,

    // Permissões por nível (franchise pode configurar sua unidade)
    canConfigureProviders: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
    canConfigureRules: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
    canForceProvider: accessLevel !== 'user',
    canViewCosts: accessLevel !== 'user',
    canViewLogs: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
  };
}
