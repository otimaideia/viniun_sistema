import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { Calendar, User, LogOut, Home, Menu, Sparkles, History } from 'lucide-react';
import { cn } from '@/lib/utils';
const logoViniun = "/images/logo-viniun.svg";
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ClienteLayoutProps {
  children: ReactNode;
}

export function ClienteLayout({ children }: ClienteLayoutProps) {
  const { lead, logout } = useClienteAuthContext();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/cliente/dashboard', icon: Home, label: 'Início' },
    { path: '/cliente/agendamentos', icon: Calendar, label: 'Agendamentos' },
    { path: '/cliente/servicos', icon: Sparkles, label: 'Meus Serviços' },
    { path: '/cliente/historico', icon: History, label: 'Histórico' },
    { path: '/cliente/perfil', icon: User, label: 'Perfil' },
  ];

  const firstName = lead?.nome?.split(' ')[0] || 'Cliente';

  const NavLinks = ({ mobile = false, onItemClick }: { mobile?: boolean; onItemClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium',
              mobile ? 'text-base' : 'text-sm',
              isActive
                ? 'text-[#662E8E] bg-[#662E8E]/10'
                : 'text-gray-600 hover:text-[#662E8E] hover:bg-gray-100'
            )}
          >
            <Icon className={cn('h-5 w-5', isActive && 'text-[#662E8E]')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50 flex">
      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b">
          <Link to="/cliente/dashboard">
            <img
              src={logoViniun}
              alt="Viniun"
              className="h-8"
            />
          </Link>
        </div>

        {/* User info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
              <User className="h-5 w-5 text-[#662E8E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{lead?.nome || 'Cliente'}</p>
              <p className="text-sm text-gray-500 truncate">{lead?.email || lead?.telefone}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 lg:pl-64">
        {/* Top header - Mobile & Tablet */}
        <header className="lg:hidden bg-white border-b sticky top-0 z-50 safe-area-top">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  {/* Logo */}
                  <div className="flex items-center h-16 px-6 border-b">
                    <img src={logoViniun} alt="Viniun" className="h-8" />
                  </div>

                  {/* User info */}
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-[#662E8E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{lead?.nome || 'Cliente'}</p>
                        <p className="text-sm text-gray-500 truncate">{lead?.email || lead?.telefone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 p-4 space-y-1">
                    <NavLinks mobile onItemClick={() => setMobileMenuOpen(false)} />
                  </nav>

                  {/* Logout */}
                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sair da conta</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo center */}
            <Link to="/cliente/dashboard">
              <img src={logoViniun} alt="Viniun" className="h-7" />
            </Link>

            {/* User avatar / logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-gray-500 hover:text-[#662E8E]"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-8 bg-white border-b">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Olá, {firstName}!
            </h1>
            <p className="text-sm text-gray-500">Bem-vindo(a) ao seu portal Viniun</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{lead?.email || lead?.telefone}</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Bottom Navigation - Mobile only */}
        <nav className="lg:hidden bg-white border-t fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center py-2 px-4 rounded-lg transition-colors min-w-[72px]',
                    isActive
                      ? 'text-[#662E8E]'
                      : 'text-gray-500 hover:text-[#662E8E]'
                  )}
                >
                  <Icon className={cn('h-6 w-6', isActive && 'text-[#662E8E]')} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
