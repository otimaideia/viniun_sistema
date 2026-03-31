import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import WhatsAppSessoes from "@/pages/WhatsAppSessoes";
import WhatsAppSessoes2 from "@/pages/WhatsAppSessoes2";
import WhatsAppChat from "@/pages/WhatsAppChat";
import WhatsAppDashboard from "@/pages/WhatsAppDashboard";
import WhatsAppStatus from "@/pages/WhatsAppStatus";
import WhatsAppAutomacoes from "@/pages/WhatsAppAutomacoes";
import WhatsAppConfiguracoes from "@/pages/WhatsAppConfiguracoes";
import Chatbot from "@/pages/Chatbot";
import WhatsAppRelatorios from "@/pages/WhatsAppRelatorios";
import WhatsAppRespostasRapidas from "@/pages/WhatsAppRespostasRapidas";
import WhatsAppTemplates from "@/pages/WhatsAppTemplates";
import WhatsAppFilas from "@/pages/WhatsAppFilas";
import WhatsAppFilaDetail from "@/pages/WhatsAppFilaDetail";
import WhatsAppFilaEdit from "@/pages/WhatsAppFilaEdit";
import WhatsAppBotConfig from "@/pages/WhatsAppBotConfig";
import AIAgents from "@/pages/AIAgents";
import AIAgentEdit from "@/pages/AIAgentEdit";
// WhatsApp Hibrido (WAHA + Meta Cloud API)
import WhatsAppHybridConfig from "@/pages/configuracoes/WhatsAppHybridConfig";
import WhatsAppProviders from "@/pages/configuracoes/WhatsAppProviders";
import WhatsAppRouting from "@/pages/configuracoes/WhatsAppRouting";
import WhatsAppCustos from "@/pages/WhatsAppCustos";
import WhatsAppMetaTemplates from "@/pages/WhatsAppMetaTemplates";
import WhatsAppRoutingLogs from "@/pages/WhatsAppRoutingLogs";
import WhatsAppHybridStats from "@/pages/WhatsAppHybridStats";
// WhatsApp Broadcast & Grupos
import WhatsAppBroadcast from "@/pages/WhatsAppBroadcast";
import WhatsAppBroadcastEdit from "@/pages/WhatsAppBroadcastEdit";
import WhatsAppBroadcastDetail from "@/pages/WhatsAppBroadcastDetail";
import WhatsAppListas from "@/pages/WhatsAppListas";
import WhatsAppListaEdit from "@/pages/WhatsAppListaEdit";
import WhatsAppListaDetail from "@/pages/WhatsAppListaDetail";
import WhatsAppGrupos from "@/pages/WhatsAppGrupos";
import WhatsAppGrupoDetail from "@/pages/WhatsAppGrupoDetail";
import WhatsAppGrupoBulkAdd from "@/pages/WhatsAppGrupoBulkAdd";
import WhatsAppGrupoOperacoes from "@/pages/WhatsAppGrupoOperacoes";
import { MetaMessengerConfig } from "@/pages/MetaMessengerConfig";
import { MetaConversations } from "@/pages/MetaConversations";
import { MetaChat } from "@/pages/MetaChat";

export function WhatsAppRoutes() {
  return (
    <>
      {/* WhatsApp */}
      <Route path="/whatsapp" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/conversas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/conversas/:sessaoId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/sessoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppSessoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/sessoes2" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppSessoes2 /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/status" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppStatus /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/automacoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppAutomacoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/configuracoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppConfiguracoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/relatorios" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppRelatorios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/respostas-rapidas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppRespostasRapidas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/templates" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppTemplates /></DashboardLayout></ProtectedRoute>} />
      {/* Filas de Atendimento */}
      <Route path="/whatsapp/filas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/filas/novo" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/filas/:id" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/filas/:id/editar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Chatbot IA - OpenAI */}
      <Route path="/whatsapp/bot-config" element={<ProtectedRoute module="chatbot"><DashboardLayout><WhatsAppBotConfig /></DashboardLayout></ProtectedRoute>} />
      {/* Agentes IA */}
      <Route path="/whatsapp/ai-agents" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/ai-agents/novo" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgentEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/ai-agents/:id/editar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgentEdit /></DashboardLayout></ProtectedRoute>} />
      {/* WhatsApp Hibrido - Config, Providers, Routing, Custos, Templates, Logs */}
      <Route path="/whatsapp/hybrid-config" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppHybridConfig /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/providers" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppProviders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/routing" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppRouting /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/custos" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppCustos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/meta-templates" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppMetaTemplates /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/routing-logs" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppRoutingLogs /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/hybrid-stats" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppHybridStats /></DashboardLayout></ProtectedRoute>} />
      {/* Broadcast / Disparo em Massa */}
      <Route path="/whatsapp/broadcast" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcast /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/broadcast/novo" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/broadcast/:id" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/broadcast/:id/editar" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Listas de Destinatarios */}
      <Route path="/whatsapp/listas" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/listas/novo" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/listas/:id" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/listas/:id/editar" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Grupos WhatsApp */}
      <Route path="/whatsapp/grupos" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/grupos/adicionar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoBulkAdd /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/grupos/operacoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoOperacoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/grupos/:groupId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoDetail /></DashboardLayout></ProtectedRoute>} />
      {/* Rotas antigas para compatibilidade */}
      <Route path="/whatsapp/chat" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/chat/:sessaoId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
      <Route path="/whatsapp/dashboard" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppDashboard /></DashboardLayout></ProtectedRoute>} />

      {/* Meta Messenger & Instagram */}
      <Route path="/meta-messenger/config" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaMessengerConfig /></DashboardLayout></ProtectedRoute>} />
      <Route path="/meta-messenger/conversations" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaConversations /></DashboardLayout></ProtectedRoute>} />
      <Route path="/meta-messenger/chat/:conversationId" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaChat /></DashboardLayout></ProtectedRoute>} />

      {/* Chatbot */}
      <Route path="/chatbot" element={<ProtectedRoute module="chatbot"><DashboardLayout><Chatbot /></DashboardLayout></ProtectedRoute>} />
    </>
  );
}
