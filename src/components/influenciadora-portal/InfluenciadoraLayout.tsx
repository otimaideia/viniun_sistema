import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
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
  User,
  DollarSign,
  Users,
  Wallet,
  Repeat,
  Image,
  LogOut,
  Menu,
  Sparkles,
  ChevronRight,
  FileText,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import { getTermoInfluenciador, getPortalLabel } from '@/utils/genero';

interface InfluenciadoraLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: 'Dashboard', icon: Home, href: '/influenciadores/painel', tour: 'dashboard' },
  { title: 'Meu Perfil', icon: User, href: '/influenciadores/perfil', tour: 'perfil' },
  { title: 'Meu Contrato', icon: FileText, href: '/influenciadores/contrato', tour: 'contrato' },
  { title: 'Meus Valores', icon: DollarSign, href: '/influenciadores/valores', tour: 'valores' },
  { title: 'Minhas Indicações', icon: Users, href: '/influenciadores/indicacoes', tour: 'indicacoes' },
  { title: 'Meus Ganhos', icon: Wallet, href: '/influenciadores/ganhos', tour: 'ganhos' },
  { title: 'Minhas Permutas', icon: Repeat, href: '/influenciadores/permutas', tour: 'permutas' },
  { title: 'Meus Posts', icon: Image, href: '/influenciadores/posts', tour: 'posts' },
  { title: 'Promoções', icon: Megaphone, href: '/influenciadores/promocoes', tour: 'promocoes' },
];

function NavItem({ item, isActive, onClick }: { item: typeof menuItems[0]; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      data-tour={item.tour}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-[#662E8E] text-white shadow-md'
          : 'text-gray-600 hover:bg-[#662E8E]/10 hover:text-[#662E8E]'
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="font-medium">{item.title}</span>
      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
    </Link>
  );
}

export function InfluenciadoraLayout({ children }: InfluenciadoraLayoutProps) {
  const { influenciadora, logout } = useInfluenciadoraAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/influenciadores/login');
  };

  const displayName = influenciadora?.nome_artistico || influenciadora?.nome || getTermoInfluenciador(influenciadora?.genero);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/influenciadores/painel" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-[#662E8E]">YESlaser</p>
                <p className="text-xs text-gray-500">{getPortalLabel(influenciadora?.genero)}</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
              {influenciadora?.codigo_indicacao && (
                <div className="px-3 py-1.5 bg-[#F2B705]/10 rounded-full">
                  <span className="text-sm text-[#662E8E] font-medium">
                    Código: <span className="font-bold">{influenciadora.codigo_indicacao}</span>
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
                  <div className="p-6 border-b bg-gradient-to-r from-[#662E8E] to-[#662E8E]/80">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-2 border-white/30">
                        <AvatarImage src={influenciadora?.foto_perfil} />
                        <AvatarFallback className="bg-white/20 text-white">
                          {safeGetInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-white">
                        <p className="font-semibold">{displayName}</p>
                        {influenciadora?.codigo_indicacao && (
                          <p className="text-sm text-white/80">
                            Código: {influenciadora.codigo_indicacao}
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
                      <AvatarImage src={influenciadora?.foto_perfil} />
                      <AvatarFallback className="bg-[#662E8E]/10 text-[#662E8E]">
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
                      {influenciadora?.email && (
                        <span className="text-xs font-normal text-gray-500">
                          {influenciadora.email}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/influenciadores/perfil" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/influenciadores/contrato" className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Meu Contrato
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/influenciadores/valores" className="cursor-pointer">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Meus Valores
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
