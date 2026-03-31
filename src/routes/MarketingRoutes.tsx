import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Marketing
import Marketing from "@/pages/Marketing";
import MarketingTemplates from "@/pages/MarketingTemplates";
import MarketingCampanhas from "@/pages/MarketingCampanhas";
import MarketingAssets from "@/pages/MarketingAssets";
import MarketingGaleria from "@/pages/MarketingGaleria";
import MarketingAnalytics from "@/pages/MarketingAnalytics";

// Campanhas
import CampanhasIndex from "@/pages/campanhas/CampanhasIndex";
import CampanhaDetail from "@/pages/campanhas/CampanhaDetail";
import CampanhaEdit from "@/pages/campanhas/CampanhaEdit";

// Formularios
import Formularios from "@/pages/Formularios";
import FormularioNovo from "@/pages/FormularioNovo";
import FormularioEdit from "@/pages/FormularioEdit";
import FormularioDetail from "@/pages/FormularioDetail";

// Promocoes (lazy loading)
const Promocoes = lazy(() => import("@/pages/promocoes/Promocoes"));
const PromocaoEdit = lazy(() => import("@/pages/promocoes/PromocaoEdit"));
const PromocaoDetail = lazy(() => import("@/pages/promocoes/PromocaoDetail"));

export function MarketingRoutes() {
  return (
    <>
      {/* Marketing */}
      <Route path="/marketing" element={<ProtectedRoute module="marketing"><DashboardLayout><Marketing /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketing/templates" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingTemplates /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketing/campanhas" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingCampanhas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketing/assets" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingAssets /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketing/galeria" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingGaleria /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketing/analytics" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingAnalytics /></DashboardLayout></ProtectedRoute>} />
      {/* Formularios */}
      <Route path="/formularios" element={<ProtectedRoute module="formularios"><DashboardLayout><Formularios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/formularios/novo" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioNovo /></DashboardLayout></ProtectedRoute>} />
      <Route path="/formularios/:id" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/formularios/:id/editar" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Campanhas */}
      <Route path="/campanhas" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhasIndex /></DashboardLayout></ProtectedRoute>} />
      <Route path="/campanhas/novo" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/campanhas/:id" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/campanhas/:id/editar" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Promocoes */}
      <Route path="/promocoes" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><Promocoes /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/promocoes/novo" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/promocoes/:id" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/promocoes/:id/editar" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
    </>
  );
}
