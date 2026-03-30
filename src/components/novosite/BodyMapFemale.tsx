import { useState, useRef } from 'react';

interface BodyMapProps {
  onAreaClick?: (areaCode: string) => void;
  priceData?: Record<string, { minPrice: number; size: string }>;
}

interface BodyZone {
  code: string;
  label: string;
  path: string;
}

const ZONES: BodyZone[] = [
  {
    code: 'rosto_completo',
    label: 'Rosto Completo',
    path: 'M 135,28 C 135,28 130,18 150,12 C 170,6 175,18 175,28 L 175,52 C 175,62 165,72 155,72 C 145,72 135,62 135,52 Z',
  },
  {
    code: 'axilas',
    label: 'Axilas',
    path: 'M 112,105 L 120,95 L 128,105 L 120,115 Z M 182,105 L 190,95 L 198,105 L 190,115 Z',
  },
  {
    code: 'bracos',
    label: 'Braços',
    path: 'M 95,110 L 108,95 L 118,105 L 112,130 L 102,160 L 90,155 Z M 192,105 L 202,95 L 215,110 L 220,155 L 208,160 L 198,130 Z',
  },
  {
    code: 'maos',
    label: 'Mãos',
    path: 'M 82,165 L 100,158 L 96,180 L 78,182 Z M 210,158 L 228,165 L 232,182 L 214,180 Z',
  },
  {
    code: 'busto',
    label: 'Busto',
    path: 'M 128,95 C 128,95 125,110 130,120 L 138,120 C 140,110 138,95 138,95 Z M 172,95 C 172,95 170,110 172,120 L 180,120 C 182,110 182,95 182,95 Z',
  },
  {
    code: 'abdomen',
    label: 'Abdômen',
    path: 'M 132,125 L 178,125 L 178,175 C 178,180 170,185 155,185 C 140,185 132,180 132,175 Z',
  },
  {
    code: 'virilha_completa',
    label: 'Virilha Completa',
    path: 'M 135,185 L 175,185 L 172,210 L 155,215 L 138,210 Z',
  },
  {
    code: 'coxas',
    label: 'Coxas',
    path: 'M 125,210 L 140,210 L 145,290 L 120,290 Z M 170,210 L 185,210 L 190,290 L 165,290 Z',
  },
  {
    code: 'pernas_completas',
    label: 'Pernas Completas',
    path: 'M 120,295 L 145,295 L 148,400 L 118,400 Z M 165,295 L 190,295 L 192,400 L 162,400 Z',
  },
  {
    code: 'pes',
    label: 'Pés',
    path: 'M 115,402 L 150,402 L 152,420 L 112,420 Z M 160,402 L 195,402 L 198,420 L 158,420 Z',
  },
];

const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BodyMapFemale({ onAreaClick, priceData }: BodyMapProps) {
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, code: string) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
    });
    setActiveArea(code);
  };

  const handleMouseLeave = () => {
    setActiveArea(null);
    setTooltip(null);
  };

  const activeZone = ZONES.find((z) => z.code === activeArea);
  const activePrice = activeArea && priceData?.[activeArea];

  return (
    <div className="relative select-none" style={{ width: 310, height: 440 }}>
      <svg
        ref={svgRef}
        viewBox="0 0 310 440"
        width="310"
        height="440"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Body silhouette outline */}
        <path
          d={`
            M 155,8
            C 170,5 180,14 180,30
            L 180,55
            C 180,68 170,78 160,80
            L 165,82
            C 175,84 188,88 195,92
            L 218,105
            L 228,160
            L 218,168
            L 205,165
            L 195,135
            L 188,115
            C 188,115 190,130 190,145
            L 192,180
            L 192,215
            L 198,295
            L 198,400
            L 200,425
            L 158,425
            L 160,400
            L 165,295
            L 170,215
            L 168,185
            L 155,190
            L 142,185
            L 140,215
            L 145,295
            L 150,400
            L 152,425
            L 110,425
            L 112,400
            L 112,295
            L 118,215
            L 118,180
            L 120,145
            C 120,130 122,115 122,115
            L 115,135
            L 105,165
            L 92,168
            L 82,160
            L 92,105
            L 115,92
            C 122,88 135,84 145,82
            L 150,80
            C 140,78 130,68 130,55
            L 130,30
            C 130,14 140,5 155,8
            Z
          `}
          fill="#f5f0ee"
          stroke="#d4c5be"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Clickable zones */}
        {ZONES.map((zone) => (
          <path
            key={zone.code}
            d={zone.path}
            data-area={zone.code}
            fill={activeArea === zone.code ? 'rgba(107,45,139,0.25)' : 'transparent'}
            stroke={activeArea === zone.code ? 'rgba(107,45,139,0.6)' : 'transparent'}
            strokeWidth="1.5"
            className="cursor-pointer transition-colors duration-150"
            onMouseMove={(e) => handleMouseMove(e, zone.code)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onAreaClick?.(zone.code)}
          />
        ))}

        {/* Zone labels on body */}
        {ZONES.map((zone) => {
          const center = getPathCenter(zone.path);
          if (!center) return null;
          return (
            <text
              key={`label-${zone.code}`}
              x={center.x}
              y={center.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none"
              fill={activeArea === zone.code ? '#6B2D8B' : '#9ca3af'}
              fontSize="8"
              fontWeight={activeArea === zone.code ? '600' : '400'}
            >
              {zone.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {activeArea && tooltip && activeZone && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="font-semibold text-sm">{activeZone.label}</div>
            {activePrice ? (
              <>
                <div className="text-gray-300 mt-0.5">Tamanho: {activePrice.size}</div>
                <div className="text-purple-300 font-medium mt-0.5">
                  a partir de {formatCurrency(activePrice.minPrice)}
                </div>
              </>
            ) : (
              <div className="text-gray-400 mt-0.5">Clique para ver preços</div>
            )}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Approximate center of an SVG path by averaging the numeric coordinate pairs. */
function getPathCenter(d: string): { x: number; y: number } | null {
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < nums.length - 1; i += 2) {
    sx += parseFloat(nums[i]);
    sy += parseFloat(nums[i + 1]);
    n++;
  }
  return n ? { x: sx / n, y: sy / n } : null;
}
