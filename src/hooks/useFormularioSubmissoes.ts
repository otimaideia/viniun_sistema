import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  FormularioSubmissao,
  FormularioSubmissaoInsert,
} from "@/types/formulario";
import { useUserProfile } from "./useUserProfile";
import { getNextResponsible, type RoundRobinConfig } from "@/services/roundRobinService";

interface UseFormularioSubmissoesOptions {
  formularioId?: string;
  limit?: number;
}

export function useFormularioSubmissoes(options: UseFormularioSubmissoesOptions = {}) {
  const queryClient = useQueryClient();
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();

  // Query para listar submissões
  const {
    data: submissoes = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["formulario-submissoes", options.formularioId, canViewAllLeads, unidadeId],
    queryFn: async (): Promise<FormularioSubmissao[]> => {
      let query = supabase
        .from("mt_form_submissions")
        .select(`
          *,
          formulario:mt_forms(id, nome, slug, franchise_id),
          lead:mt_leads(id, nome, email, whatsapp)
        `)
        .order("created_at", { ascending: false });

      if (options.formularioId) {
        query = query.eq("form_id", options.formularioId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Filtro por franquia se não for admin/central
      if (!canViewAllLeads && unidadeId) {
        query = query.eq("formulario.franchise_id", unidadeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar submissões:", error);
        throw error;
      }

      return (data || []) as FormularioSubmissao[];
    },
    enabled: !isProfileLoading,
  });

  // Mutation para criar submissão (usado pelo formulário público)
  const createMutation = useMutation({
    mutationFn: async (submissao: FormularioSubmissaoInsert) => {
      const { data, error } = await supabase
        .from("mt_form_submissions")
        .insert(submissao)
        .select()
        .single();

      if (error) throw error;
      return data as FormularioSubmissao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-submissoes"] });
    },
    onError: (error) => {
      console.error("Erro ao criar submissão:", error);
    },
  });

  // Submeter formulário (versão completa com criação de lead)
  const submitFormulario = async (
    formularioId: string,
    dados: Record<string, unknown>,
    metadata: {
      ip_address?: string;
      user_agent?: string;
      referrer?: string;
      session_id?: string;
      tempo_preenchimento_segundos?: number;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      codigo_indicacao?: string;
      variante_id?: string;
    } = {}
  ): Promise<{ submissao: FormularioSubmissao; lead_id?: string } | null> => {
    try {
      // 1. Buscar o formulário e seus campos para mapear dados para lead
      const { data: formulario, error: formError } = await supabase
        .from("mt_forms")
        .select(`
          *,
          campos:mt_form_fields(*)
        `)
        .eq("id", formularioId)
        .single();

      if (formError || !formulario) {
        throw new Error("Formulário não encontrado");
      }

      // 2. Verificar se tem código de indicação e buscar indicador
      let indicadoPorId: string | null = null;
      if (metadata.codigo_indicacao) {
        const { data: indicador } = await supabase
          .from("mt_leads")
          .select("id")
          .eq("codigo_indicacao", metadata.codigo_indicacao)
          .maybeSingle();

        if (indicador) {
          indicadoPorId = indicador.id;
        }
      }

      // 3. Mapear dados para lead
      const leadData: Record<string, unknown> = {
        tenant_id: (formulario as any).tenant_id,
        franchise_id: (formulario as any).franchise_id,
        status: "Lead Recebido",
        landing_page: metadata.referrer || formulario.slug,
        campanha: metadata.utm_campaign || null,
        utm_source: metadata.utm_source,
        utm_medium: metadata.utm_medium,
        utm_campaign: metadata.utm_campaign,
        utm_content: metadata.utm_content,
        utm_term: metadata.utm_term,
        indicado_por_id: indicadoPorId,
      };

      // Mapear campos do formulário para campos do lead
      for (const campo of formulario.campos || []) {
        if (campo.campo_lead && dados[campo.nome] !== undefined) {
          const valor = dados[campo.nome];

          // Normalizar nome do campo no lead
          switch (campo.campo_lead) {
            case "whatsapp":
            case "telefone":
              leadData.whatsapp = valor;
              leadData.telefone = valor;
              break;
            case "servico_interesse_id":
              leadData.servico_interesse = valor;
              break;
            default:
              leadData[campo.campo_lead] = valor;
          }
        }
      }

      // 4. Criar lead
      let leadId: string | undefined;
      if (leadData.nome || leadData.email || leadData.whatsapp) {
        // Verificar se lead já existe pelo email ou whatsapp
        const existingQuery = supabase
          .from("mt_leads")
          .select("id");

        if (leadData.email) {
          existingQuery.eq("email", leadData.email);
        } else if (leadData.whatsapp) {
          existingQuery.eq("whatsapp", leadData.whatsapp);
        }

        const { data: existingLead } = await existingQuery.maybeSingle();

        if (existingLead) {
          // Atualizar lead existente
          const { data: updatedLead, error: updateError } = await supabase
            .from("mt_leads")
            .update(leadData)
            .eq("id", existingLead.id)
            .select()
            .single();

          if (updateError) {
            console.error("Erro ao atualizar lead:", updateError);
          } else {
            leadId = updatedLead.id;
          }
        } else {
          // Round Robin: determinar responsável automaticamente
          if ((formulario as any).round_robin_enabled) {
            try {
              const rrConfig: RoundRobinConfig = {
                session_id: formulario.id,
                tenant_id: (formulario as any).tenant_id,
                round_robin_enabled: true,
                round_robin_mode: (formulario as any).round_robin_mode || 'team',
                team_id: (formulario as any).team_id || null,
                department_id: (formulario as any).department_id || null,
                responsible_user_id: (formulario as any).responsible_user_id || null,
              };
              const rrResult = await getNextResponsible(rrConfig);
              if (rrResult.user_id) {
                leadData.responsible_user_id = rrResult.user_id;
                leadData.atribuido_para = rrResult.user_id;
                leadData.atribuido_em = new Date().toISOString();
              }
            } catch (rrErr) {
              console.error('[RoundRobin Form Hook] Erro:', rrErr);
              if ((formulario as any).responsible_user_id) {
                leadData.responsible_user_id = (formulario as any).responsible_user_id;
                leadData.atribuido_para = (formulario as any).responsible_user_id;
                leadData.atribuido_em = new Date().toISOString();
              }
            }
          } else if ((formulario as any).responsible_user_id) {
            leadData.responsible_user_id = (formulario as any).responsible_user_id;
            leadData.atribuido_para = (formulario as any).responsible_user_id;
            leadData.atribuido_em = new Date().toISOString();
          }

          // Criar novo lead
          const { data: newLead, error: insertError } = await supabase
            .from("mt_leads")
            .insert(leadData)
            .select()
            .single();

          if (insertError) {
            console.error("Erro ao criar lead:", insertError);
          } else {
            leadId = newLead.id;
          }
        }
      }

      // 5. Criar submissão
      const submissaoData = {
        form_id: formularioId,
        tenant_id: (formulario as any).tenant_id,
        franchise_id: (formulario as any).franchise_id,
        lead_id: leadId,
        dados: {
          ...dados,
          session_id: metadata.session_id,
          tempo_preenchimento: metadata.tempo_preenchimento_segundos,
          codigo_indicacao: metadata.codigo_indicacao,
          variante_id: metadata.variante_id,
        },
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        referrer: metadata.referrer,
        utm_source: metadata.utm_source,
        utm_medium: metadata.utm_medium,
        utm_campaign: metadata.utm_campaign,
        status: 'novo',
      };

      const { data: submissao, error: submissaoError } = await supabase
        .from("mt_form_submissions")
        .insert(submissaoData)
        .select()
        .single();

      if (submissaoError) throw submissaoError;

      // 6. Enviar webhook se configurado
      if (formulario.webhook_ativo && formulario.webhook_url) {
        try {
          await fetch(formulario.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(formulario.webhook_headers || {}),
            },
            body: JSON.stringify({
              submissao_id: submissao.id,
              formulario_id: formularioId,
              lead_id: leadId,
              dados,
              metadata,
            }),
          });

          // Atualizar status do webhook
          await supabase
            .from("mt_form_submissions")
            .update({ status: 'webhook_enviado' })
            .eq("id", submissao.id);
        } catch (webhookError) {
          console.error("Erro ao enviar webhook:", webhookError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["formulario-submissoes"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      return { submissao: submissao as FormularioSubmissao, lead_id: leadId };
    } catch (error) {
      console.error("Erro ao submeter formulário:", error);
      toast.error("Erro ao enviar formulário");
      return null;
    }
  };

  return {
    submissoes,
    isLoading,
    error,
    refetch,
    isFetching,
    createSubmissao: createMutation.mutate,
    submitFormulario,
    isSubmitting: createMutation.isPending,
  };
}
