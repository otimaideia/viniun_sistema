import { Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Influenciadoras (Admin)
import Influenciadoras from "@/pages/Influenciadoras";
import InfluenciadorasDashboard from "@/pages/InfluenciadorasDashboard";
import InfluenciadorasLista from "@/pages/InfluenciadorasLista";
import InfluenciadorasIndicacoes from "@/pages/InfluenciadorasIndicacoes";
import InfluenciadoraDetail from "@/pages/InfluenciadoraDetail";
import InfluenciadoraEdit from "@/pages/InfluenciadoraEdit";
import InfluenciadoraContratoEdit from "@/pages/InfluenciadoraContratoEdit";
import InfluenciadoraPagamentoEdit from "@/pages/InfluenciadoraPagamentoEdit";
import InfluenciadoraPostEdit from "@/pages/InfluenciadoraPostEdit";
import InfluenciadoraContratoPreview from "@/pages/InfluenciadoraContratoPreview";
import InfluenciadoraContratoAssinatura from "@/pages/InfluenciadoraContratoAssinatura";
import InfluenciadoraNotifConfig from "@/pages/influenciadoras/InfluenciadoraNotifConfig";
import InfluenciadoraReferralNotifConfig from "@/pages/influenciadoras/InfluenciadoraReferralNotifConfig";

// Portal da Influenciadora (Publico + Self-Service)
import CadastroInfluenciadora from "@/pages/influenciadora/CadastroInfluenciadora";
import LoginInfluenciadora from "@/pages/influenciadora/LoginInfluenciadora";
import PortalInfluenciadora from "@/pages/influenciadora/PortalInfluenciadora";
import MeuPerfilInfluenciadora from "@/pages/influenciadora/MeuPerfilInfluenciadora";
import MeusValoresInfluenciadora from "@/pages/influenciadora/MeusValoresInfluenciadora";
import MinhasIndicacoesInfluenciadora from "@/pages/influenciadora/MinhasIndicacoesInfluenciadora";
import MeusGanhosInfluenciadora from "@/pages/influenciadora/MeusGanhosInfluenciadora";
import MinhasPermutasInfluenciadora from "@/pages/influenciadora/MinhasPermutasInfluenciadora";
import MeusPostsInfluenciadora from "@/pages/influenciadora/MeusPostsInfluenciadora";
import MeuContratoInfluenciadora from "@/pages/influenciadora/MeuContratoInfluenciadora";
import MinhasPromocoesInfluenciadora from "@/pages/influenciadora/MinhasPromocoesInfluenciadora";
import OnboardingInfluenciadora from "@/pages/influenciadora/OnboardingInfluenciadora";
import { InfluenciadoraAuthProvider } from "@/contexts/InfluenciadoraAuthContext";
import { InfluenciadoraProtectedRoute } from "@/components/influenciadora-portal";

export function InfluenciadoraRoutes() {
  return (
    <>
      {/* Influenciadoras (Admin) */}
      <Route path="/influenciadoras" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasDashboard /></ProtectedRoute>} />
      <Route path="/influenciadoras/dashboard" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasDashboard /></ProtectedRoute>} />
      <Route path="/influenciadoras/lista" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasLista /></ProtectedRoute>} />
      <Route path="/influenciadoras/indicacoes" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasIndicacoes /></ProtectedRoute>} />
      <Route path="/influenciadoras/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:id" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraDetail /></ProtectedRoute>} />
      <Route path="/influenciadoras/:id/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraEdit /></ProtectedRoute>} />
      {/* Contratos, Pagamentos e Posts de Influenciadoras */}
      <Route path="/influenciadoras/:influenciadoraId/contratos/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:influenciadoraId/contratos/:contratoId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:influenciadoraId/pagamentos/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPagamentoEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:influenciadoraId/pagamentos/:pagamentoId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPagamentoEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:influenciadoraId/posts/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPostEdit /></ProtectedRoute>} />
      <Route path="/influenciadoras/:influenciadoraId/posts/:postId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPostEdit /></ProtectedRoute>} />
      {/* Configuracao de Notificacoes */}
      <Route path="/influenciadoras/configuracoes/notificacoes" element={<ProtectedRoute module="influenciadoras"><DashboardLayout><InfluenciadoraNotifConfig /></DashboardLayout></ProtectedRoute>} />
      <Route path="/influenciadoras/indicacoes/configuracoes" element={<ProtectedRoute module="influenciadoras"><DashboardLayout><InfluenciadoraReferralNotifConfig /></DashboardLayout></ProtectedRoute>} />
      {/* Preview e Assinatura de Contratos */}
      <Route path="/influenciadoras/:influenciadoraId/contratos/:contratoId/preview" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoPreview /></ProtectedRoute>} />
      <Route path="/influenciadora/contrato/:contratoId/assinar" element={<InfluenciadoraContratoAssinatura />} />

      {/* Portal da Influenciadora - Novas rotas /influenciadores/* */}
      <Route path="/influenciadores" element={<CadastroInfluenciadora />} />
      <Route path="/influenciadores/cadastro" element={<Navigate to="/influenciadores" replace />} />
      <Route path="/influenciadores/*" element={
        <InfluenciadoraAuthProvider>
          <Routes>
            <Route path="login" element={<LoginInfluenciadora />} />
            <Route path="onboarding" element={<OnboardingInfluenciadora />} />
            <Route path="painel" element={
              <InfluenciadoraProtectedRoute>
                <PortalInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="perfil" element={
              <InfluenciadoraProtectedRoute>
                <MeuPerfilInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="valores" element={
              <InfluenciadoraProtectedRoute>
                <MeusValoresInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="indicacoes" element={
              <InfluenciadoraProtectedRoute>
                <MinhasIndicacoesInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="ganhos" element={
              <InfluenciadoraProtectedRoute>
                <MeusGanhosInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="permutas" element={
              <InfluenciadoraProtectedRoute>
                <MinhasPermutasInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="posts" element={
              <InfluenciadoraProtectedRoute>
                <MeusPostsInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="contrato" element={
              <InfluenciadoraProtectedRoute>
                <MeuContratoInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
            <Route path="promocoes" element={
              <InfluenciadoraProtectedRoute>
                <MinhasPromocoesInfluenciadora />
              </InfluenciadoraProtectedRoute>
            } />
          </Routes>
        </InfluenciadoraAuthProvider>
      } />

      {/* Redirects: rotas antigas /influenciadora/* para /influenciadores/* */}
      <Route path="/influenciadora/cadastro" element={<Navigate to="/influenciadores" replace />} />
      <Route path="/influenciadora/login" element={<Navigate to="/influenciadores/login" replace />} />
      <Route path="/influenciadora/portal" element={<Navigate to="/influenciadores/painel" replace />} />
      <Route path="/influenciadora/onboarding" element={<Navigate to="/influenciadores/onboarding" replace />} />
      {/* Manter rota publica de assinatura de contrato */}
      <Route path="/influenciadora/contrato/:contratoId/assinar" element={<InfluenciadoraContratoAssinatura />} />
      {/* Catch-all: qualquer outra rota antiga redireciona */}
      <Route path="/influenciadora/*" element={<Navigate to="/influenciadores" replace />} />
    </>
  );
}
