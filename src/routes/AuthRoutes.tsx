import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import PendingApproval from "@/pages/PendingApproval";

const SignupEmpresa = lazy(() => import("@/pages/landing/SignupEmpresa"));
const SignupSucesso = lazy(() => import("@/pages/landing/SignupSucesso"));

export function AuthRoutes() {
  return (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/aguardando-aprovacao" element={<PendingApproval />} />
      <Route path="/cadastro" element={<Suspense fallback={null}><SignupEmpresa /></Suspense>} />
      <Route path="/cadastro/sucesso" element={<Suspense fallback={null}><SignupSucesso /></Suspense>} />
    </>
  );
}
