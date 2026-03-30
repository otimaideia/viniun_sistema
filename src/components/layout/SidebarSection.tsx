import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  children?: NavItem[];
  minAccessLevel?: 'platform' | 'tenant' | 'franchise';
}

export interface NavSection {
  title: string;
  module?: string;
  items: NavItem[];
}

export interface SidebarSectionProps {
  section: NavSection;
  collapsed: boolean;
  currentPath: string;
  expandedMenus: string[];
  onToggleSubmenu: (label: string) => void;
  onCloseMobileSidebar: () => void;
}

/** Renders a single navigation section with title and list of nav items */
export function SidebarSection({
  section,
  collapsed,
  currentPath,
  expandedMenus,
  onToggleSubmenu,
  onCloseMobileSidebar,
}: SidebarSectionProps) {
  return (
    <div className="mb-4">
      {/* Section title */}
      {!collapsed && (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {section.title}
        </div>
      )}

      {/* Section items */}
      <div className="space-y-1">
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.children ? item.label : item.href}
            item={item}
            collapsed={collapsed}
            currentPath={currentPath}
            expandedMenus={expandedMenus}
            onToggleSubmenu={onToggleSubmenu}
            onCloseMobileSidebar={onCloseMobileSidebar}
          />
        ))}
      </div>
    </div>
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
  expandedMenus: string[];
  onToggleSubmenu: (label: string) => void;
  onCloseMobileSidebar: () => void;
}

function SidebarNavItem({
  item,
  collapsed,
  currentPath,
  expandedMenus,
  onToggleSubmenu,
  onCloseMobileSidebar,
}: SidebarNavItemProps) {
  const isActive = currentPath === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedMenus.includes(item.label) || (hasChildren && currentPath.startsWith(item.href));
  const isParentActive = hasChildren && currentPath.startsWith(item.href);

  if (collapsed) {
    // Collapsed sidebar - use dropdown for items with children
    if (hasChildren) {
      return (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center h-10 w-full rounded-lg transition-colors",
                    isParentActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-48 bg-popover">
            {item.children?.map((child) => (
              <DropdownMenuItem key={child.href} asChild>
                <Link
                  to={child.href}
                  onClick={onCloseMobileSidebar}
                  className={cn(
                    "flex items-center gap-2",
                    currentPath === child.href && "bg-muted"
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  {child.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={onCloseMobileSidebar}
            className={cn(
              "flex items-center justify-center h-10 w-full rounded-lg transition-colors",
              isActive
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

  // Expanded sidebar
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => onToggleSubmenu(item.label)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
            isParentActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
            {item.children?.map((child) => {
              const isChildActive = currentPath === child.href;
              return (
                <Link
                  key={child.href}
                  to={child.href}
                  onClick={onCloseMobileSidebar}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isChildActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onCloseMobileSidebar}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
