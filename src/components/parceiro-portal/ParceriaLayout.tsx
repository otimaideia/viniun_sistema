import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useParceriaAuthContext } from '@/contexts/ParceriaAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Building2,
  Users,
  Gift,
  BarChart3,
  LogOut,
  Menu,
  ChevronRight,
  QrCode,
  Link as LinkIcon,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeGetInitials } from '@/utils/unicodeSanitizer';

interface ParceriaLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: 'Dashboard', icon: Home, href: '/parceiro/portal' },
  { title: 'Meu Perfil', icon: Building2, href: '/parceiro/perfil' },
  { title: 'Indicações', icon: Users, href: '/parceiro/indicacoes' },
  { title: 'Benefícios', icon: Gift, href: '/parceiro/beneficios' },
  { title: 'Relatórios', icon: BarChart3, href: '/parceiro/relatorios' },
  { title: 'Ferramentas', icon: QrCode, href: '/parceiro/ferramentas' },
];

function NavItem({ item, isActive, onClick }: { item: typeof menuItems[0]; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-blue-600/10 hover:text-blue-600'
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="font-medium">{item.title}</span>
      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
    </Link>
  );
}

export function ParceriaLayout({ children }: ParceriaLayoutProps) {
  const { parceria, logout } = useParceriaAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/parceiro/login');
  };

  const displayName = parceria?.nome_fantasia || parceria?.razao_social || 'Parceiro';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/parceiro/portal" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-blue-600">Viniun</p>
                <p className="text-xs text-gray-500">Portal do Parceiro</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
              {parceria?.codigo_indicacao && (
                <div className="px-3 py-1.5 bg-blue-600/10 rounded-full">
                  <span className="text-sm text-blue-600 font-medium">
                    Código: <span className="font-bold">{parceria.codigo_indicacao}</span>
                  </span>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-2 border-white/30">
                        <AvatarImage src={parceria?.logo_url || undefined} />
                        <AvatarFallback className="bg-white/20 text-white">
                          {safeGetInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-white">
                        <p className="font-semibold">{displayName}</p>
                        {parceria?.codigo_indicacao && (
                          <p className="text-sm text-white/80">
                            Código: {parceria.codigo_indicacao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <nav className="p-4 space-y-1">
                    {menuItems.map((item) => (
                      <NavItem
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    ))}
                    <div className="pt-4 border-t mt-4">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sair</span>
                      </button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={parceria?.logo_url || undefined} />
                      <AvatarFallback className="bg-blue-600/10 text-blue-600">
                        {safeGetInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium text-gray-700">
                      {displayName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{displayName}</span>
                      {parceria?.responsavel_email && (
                        <span className="text-xs font-normal text-gray-500">
                          {parceria.responsavel_email}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/parceiro/perfil" className="cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Dados da Empresa
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/parceiro/ferramentas" className="cursor-pointer">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link e QR Code
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-4rem)] bg-white border-r shadow-sm">
          <nav className="p-4 space-y-1 sticky top-16">
            {menuItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={location.pathname === item.href}
              />
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
