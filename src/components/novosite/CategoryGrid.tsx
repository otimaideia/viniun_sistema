import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Zap,
  Heart,
  Star,
  Scissors,
  Sun,
  type LucideIcon,
} from "lucide-react";

interface CategoryGridProps {
  categories: Array<{
    id: string;
    nome: string;
    descricao?: string | null;
    icone?: string | null;
    imagem_url?: string | null;
    cor?: string | null;
    url_slug?: string | null;
    codigo: string;
  }>;
  basePath?: string;
  columns?: 2 | 3 | 4 | 6;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Heart,
  Star,
  Scissors,
  Sun,
};

const FALLBACK_GRADIENTS = [
  "from-purple-600 to-purple-600",
  "from-violet-500 to-purple-500",
  "from-sky-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-purple-500 to-purple-600",
];

const COLUMN_CLASSES: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
};

export function CategoryGrid({
  categories,
  basePath = "/novosite",
  columns = 4,
}: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma categoria disponivel.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", COLUMN_CLASSES[columns])}>
      {categories.map((cat, idx) => {
        const IconComponent = cat.icone ? ICON_MAP[cat.icone] : null;
        const fallbackGradient =
          FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
        const href = `${basePath}/${cat.url_slug || cat.codigo}`;

        return (
          <Link
            key={cat.id}
            to={href}
            className="group relative block rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Background */}
            <div className="aspect-[4/3] relative">
              {cat.imagem_url ? (
                <img
                  src={cat.imagem_url}
                  alt={cat.nome}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full bg-gradient-to-br",
                    fallbackGradient
                  )}
                  style={
                    cat.cor
                      ? {
                          background: `linear-gradient(135deg, ${cat.cor}, ${cat.cor}cc)`,
                        }
                      : undefined
                  }
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center text-white">
                {IconComponent && (
                  <div className="mb-3 p-3 rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                    <IconComponent className="w-6 h-6" />
                  </div>
                )}

                <h3 className="text-base font-bold leading-tight mb-1 drop-shadow-md">
                  {cat.nome}
                </h3>

                {cat.descricao && (
                  <p className="text-xs text-white/80 line-clamp-2 max-w-[200px]">
                    {cat.descricao}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
