import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarSection, type NavItem, type NavSection } from "./SidebarSection";

export interface SidebarNavProps {
  /** Filtered navigation sections to render */
  sections: NavSection[];
  /** Whether sidebar is collapsed */
  collapsed: boolean;
  /** Current route path */
  currentPath: string;
  /** Currently expanded submenu labels */
  expandedMenus: string[];
  /** Toggle a submenu open/closed */
  onToggleSubmenu: (label: string) => void;
  /** Close the mobile sidebar overlay */
  onCloseMobileSidebar: () => void;
  /** Whether the user is a franchise (unidade) user */
  isUnidade: boolean;
  /** Special "Minha Franquia" nav item for unidade users */
  minhaFranquiaItem: NavItem | null;
}

/** Full sidebar navigation content (sections + special items) */
export function SidebarNav({
  sections,
  collapsed,
  currentPath,
  expandedMenus,
  onToggleSubmenu,
  onCloseMobileSidebar,
  isUnidade,
  minhaFranquiaItem,
}: SidebarNavProps) {
  return (
    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
      {/* Item especial "Minha Franquia" para usuários de unidade */}
      {isUnidade && minhaFranquiaItem && (
        <MinhaFranquiaLink
          item={minhaFranquiaItem}
          collapsed={collapsed}
          currentPath={currentPath}
          onCloseMobileSidebar={onCloseMobileSidebar}
        />
      )}

      {/* Renderização dinâmica de menu baseado em módulos habilitados */}
      {sections.map((section) => (
        <SidebarSection
          key={section.title}
          section={section}
          collapsed={collapsed}
          currentPath={currentPath}
          expandedMenus={expandedMenus}
          onToggleSubmenu={onToggleSubmenu}
          onCloseMobileSidebar={onCloseMobileSidebar}
        />
      ))}
    </nav>
  );
}

/** Special "Minha Franquia" link for franchise users */
function MinhaFranquiaLink({
  item,
  collapsed,
  currentPath,
  onCloseMobileSidebar,
}: {
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
  onCloseMobileSidebar: () => void;
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={onCloseMobileSidebar}
            className={cn(
              "flex items-center justify-center h-10 w-full rounded-lg transition-colors mb-2",
              currentPath === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onCloseMobileSidebar}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2",
        currentPath === item.href
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
