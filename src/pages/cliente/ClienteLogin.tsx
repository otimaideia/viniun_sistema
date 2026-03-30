import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClienteAuthProvider, useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { ClienteLoginForm, ClienteVerifyCode } from '@/components/cliente';

type LoginStep = 'form' | 'verify';

function ClienteLoginContent() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useClienteAuthContext();
  const [step, setStep] = useState<LoginStep>('form');

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/cliente/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-purple-50 to-white safe-area-top safe-area-bottom">
        <div className="animate-pulse text-[#662E8E]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4 py-6 safe-area-top safe-area-bottom">
      {step === 'form' && (
        <ClienteLoginForm onCodeSent={() => setStep('verify')} />
      )}

      {step === 'verify' && (
        <ClienteVerifyCode onBack={() => setStep('form')} />
      )}
    </div>
  );
}

export default function ClienteLogin() {
  return (
    <ClienteAuthProvider>
      <ClienteLoginContent />
    </ClienteAuthProvider>
  );
}
