import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function SignupSucesso() {
  return (
    <div className="min-h-screen bg-viniun-light flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-viniun-dark mb-3">
          Conta criada com sucesso!
        </h1>

        <p className="text-gray-600 mb-8">
          Sua imobiliária já está configurada no Viniun. Verifique seu email
          para confirmar sua conta.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-viniun-navy hover:bg-viniun-dark text-white"
            asChild
          >
            <Link to="/login">Acessar o Painel</Link>
          </Button>

          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-viniun-blue transition-colors"
          >
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
