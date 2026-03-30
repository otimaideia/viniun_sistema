import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TenantSelector } from "@/components/multitenant/TenantSelector";
import { FranchiseSelector } from "@/components/multitenant/FranchiseSelector";

export interface TopBarProps {
  /** User email to display */
  userEmail?: string;
  /** User role: super_admin, admin, central, or unidade */
  role: string;
  /** Current tenant logo URL */
  currentLogo: string;
  /** Tenant display name */
  tenantName: string;
  /** Whether the mobile sidebar is open */
  sidebarOpen: boolean;
  /** Toggle mobile sidebar */
  onToggleSidebar: () => void;
  /** Handle logout */
  onLogout: () => void;
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <Badge variant="default" className="text-xs bg-primary">
        <Shield className="h-3 w-3 mr-1" />
        Super Admin
      </Badge>
    );
  }
  if (role === "admin") {
    return (
      <Badge variant="secondary" className="text-xs">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    );
  }
  if (role === "central") {
    return (
      <Badge variant="secondary" className="text-xs">
        <Users className="h-3 w-3 mr-1" />
        Central
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      <Building2 className="h-3 w-3 mr-1" />
      Unidade
    </Badge>
  );
}

/** Mobile header bar (visible on small screens) */
export function MobileHeader({
  userEmail,
  role,
  currentLogo,
  tenantName,
  sidebarOpen,
  onToggleSidebar,
  onLogout,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 lg:hidden bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <img src={currentLogo} alt={tenantName} className="h-8 object-contain" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              <div className="mt-1"><RoleBadge role={role} /></div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Desktop top header bar (visible on large screens) */
export function DesktopTopBar({
  userEmail,
  role,
  onLogout,
}: Pick<TopBarProps, 'userEmail' | 'role' | 'onLogout'>) {
  return (
    <header className="hidden lg:flex sticky top-0 z-30 bg-card border-b border-border h-14 items-center justify-between px-6">
      {/* Seletores Multi-Tenant (apenas para admins) */}
      <div className="flex items-center gap-3">
        <TenantSelector className="h-9" />
        <FranchiseSelector variant="select" className="h-9 w-[180px]" />
      </div>

      {/* Menu do usuário */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <span className="text-sm font-medium max-w-[200px] truncate block">{userEmail}</span>
            </div>
            <RoleBadge role={role} />
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover">
          <DropdownMenuItem onClick={onLogout} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
