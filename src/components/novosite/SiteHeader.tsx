import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, ChevronDown } from 'lucide-react';
import { CartSidebar } from './CartSidebar';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

// ─── Navigation Data ───────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Depilação a Laser',
    href: '/novosite/depilacao-a-laser',
    children: [
      { label: 'Feminina', href: '/novosite/depilacao-a-laser/feminina' },
      { label: 'Masculina', href: '/novosite/depilacao-a-laser/masculina' },
    ],
  },
  {
    label: 'Estética Facial',
    href: '/novosite/estetica-facial',
    children: [
      { label: 'Botox', href: '/novosite/estetica-facial/botox' },
      { label: 'Preenchimento', href: '/novosite/estetica-facial/preenchimento' },
      { label: 'Peeling', href: '/novosite/estetica-facial/peeling' },
      { label: 'Limpeza de Pele', href: '/novosite/estetica-facial/limpeza-de-pele' },
      { label: 'Harmonização Facial', href: '/novosite/estetica-facial/harmonizacao-facial' },
      { label: 'LED Facial', href: '/novosite/estetica-facial/led-facial' },
      { label: 'Skinbooster', href: '/novosite/estetica-facial/skinbooster' },
      { label: 'Microagulhamento', href: '/novosite/estetica-facial/microagulhamento' },
    ],
  },
  {
    label: 'Estética Corporal',
    href: '/novosite/estetica-corporal',
    children: [
      { label: 'Radiofrequência', href: '/novosite/estetica-corporal/radiofrequencia' },
      { label: 'Cavitação', href: '/novosite/estetica-corporal/cavitacao' },
      { label: 'Drenagem Linfática', href: '/novosite/estetica-corporal/drenagem-linfatica' },
      { label: 'Criolipólise', href: '/novosite/estetica-corporal/criolipólise' },
      { label: 'Endermologia', href: '/novosite/estetica-corporal/endermologia' },
      { label: 'Bioestimulador', href: '/novosite/estetica-corporal/bioestimulador' },
    ],
  },
  {
    label: 'Pacotes',
    href: '/novosite/pacotes',
  },
  {
    label: 'Promoções',
    href: '/novosite/promocoes',
  },
];

// ─── Desktop Navigation Link ──────────────────────────────────

function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link
        to={href}
        className={cn(
          'block select-none rounded-md px-3 py-2 text-sm leading-none no-underline outline-none transition-colors',
          'text-gray-700 hover:bg-[#6B2D8B]/5 hover:text-[#6B2D8B] focus:bg-[#6B2D8B]/5 focus:text-[#6B2D8B]',
          className
        )}
      >
        {children}
      </Link>
    </NavigationMenuLink>
  );
}

// ─── Component ─────────────────────────────────────────────────

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { itemCount: cartCount } = useCart();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/novosite" className="flex flex-col leading-none">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#6B2D8B]">YES</span>
              <span className="text-[#1a1a2e]">laser</span>
            </span>
            <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">
              Praia Grande
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <NavigationMenuItem key={item.label}>
                    <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:text-[#6B2D8B] hover:bg-[#6B2D8B]/5 data-[state=open]:text-[#6B2D8B] data-[state=open]:bg-[#6B2D8B]/5 text-sm font-medium">
                      {item.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[280px] p-3">
                        {/* Category Header */}
                        <NavLink href={item.href} className="font-semibold text-[#6B2D8B] mb-1">
                          Ver Todos
                        </NavLink>
                        <div className="h-px bg-gray-100 my-1.5" />
                        {/* Sub-items */}
                        <ul className="grid gap-0.5">
                          {item.children.map((child) => (
                            <li key={child.label}>
                              <NavLink href={child.href}>{child.label}</NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ) : (
                  <NavigationMenuItem key={item.label}>
                    <NavLink href={item.href} className="font-medium">
                      {item.label}
                    </NavLink>
                  </NavigationMenuItem>
                )
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Cart Sidebar */}
            <CartSidebar />

            {/* Login */}
            <Link to="/novosite/login" className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                className="border-[#6B2D8B] text-[#6B2D8B] hover:bg-[#6B2D8B] hover:text-white gap-1.5"
              >
                <User className="h-4 w-4" />
                Entrar
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-600">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[360px] p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                  <SheetTitle className="text-left">
                    <span className="text-xl font-bold">
                      <span className="text-[#6B2D8B]">YES</span>
                      <span className="text-[#1a1a2e]">laser</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col h-[calc(100%-5rem)]">
                  {/* Navigation */}
                  <nav className="flex-1 overflow-y-auto px-4 py-4">
                    <Accordion type="multiple" className="w-full">
                      {NAV_ITEMS.map((item) =>
                        item.children ? (
                          <AccordionItem key={item.label} value={item.label} className="border-none">
                            <AccordionTrigger className="py-3 text-sm font-medium text-gray-700 hover:text-[#6B2D8B] hover:no-underline">
                              {item.label}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-col gap-1 pb-2 pl-3">
                                <Link
                                  to={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="py-2 text-sm font-medium text-[#6B2D8B]"
                                >
                                  Ver Todos
                                </Link>
                                {item.children.map((child) => (
                                  <Link
                                    key={child.label}
                                    to={child.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="py-2 text-sm text-gray-600 hover:text-[#6B2D8B] transition-colors"
                                  >
                                    {child.label}
                                  </Link>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ) : (
                          <div key={item.label} className="border-none">
                            <Link
                              to={item.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex py-3 text-sm font-medium text-gray-700 hover:text-[#6B2D8B] transition-colors"
                            >
                              {item.label}
                            </Link>
                          </div>
                        )
                      )}
                    </Accordion>
                  </nav>

                  {/* Mobile Footer Actions */}
                  <div className="border-t p-4 space-y-2">
                    <Link to="/novosite/login" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-[#6B2D8B] hover:bg-[#5B2378] text-white gap-2">
                        <User className="h-4 w-4" />
                        Entrar na Minha Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
