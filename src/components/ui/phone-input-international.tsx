import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { ChevronDown } from 'lucide-react';

// Lista de países com códigos e bandeiras
export interface Country {
  code: string;
  name: string;
  flag: string;
  format: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRIES: Country[] = [
  { code: '55', name: 'Brasil', flag: '🇧🇷', format: '(XX) XXXXX-XXXX', minDigits: 10, maxDigits: 11 },
  { code: '1', name: 'Estados Unidos', flag: '🇺🇸', format: '(XXX) XXX-XXXX', minDigits: 10, maxDigits: 10 },
  { code: '351', name: 'Portugal', flag: '🇵🇹', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '34', name: 'Espanha', flag: '🇪🇸', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '33', name: 'França', flag: '🇫🇷', format: 'X XX XX XX XX', minDigits: 9, maxDigits: 9 },
  { code: '49', name: 'Alemanha', flag: '🇩🇪', format: 'XXXX XXXXXXX', minDigits: 10, maxDigits: 11 },
  { code: '39', name: 'Itália', flag: '🇮🇹', format: 'XXX XXX XXXX', minDigits: 9, maxDigits: 10 },
  { code: '44', name: 'Reino Unido', flag: '🇬🇧', format: 'XXXX XXXXXX', minDigits: 10, maxDigits: 10 },
  { code: '81', name: 'Japão', flag: '🇯🇵', format: 'XX-XXXX-XXXX', minDigits: 10, maxDigits: 10 },
  { code: '86', name: 'China', flag: '🇨🇳', format: 'XXX XXXX XXXX', minDigits: 11, maxDigits: 11 },
  { code: '54', name: 'Argentina', flag: '🇦🇷', format: '(XX) XXXX-XXXX', minDigits: 10, maxDigits: 10 },
  { code: '56', name: 'Chile', flag: '🇨🇱', format: 'X XXXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '57', name: 'Colômbia', flag: '🇨🇴', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '52', name: 'México', flag: '🇲🇽', format: '(XX) XXXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '51', name: 'Peru', flag: '🇵🇪', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '598', name: 'Uruguai', flag: '🇺🇾', format: 'X XXX XXXX', minDigits: 8, maxDigits: 8 },
  { code: '595', name: 'Paraguai', flag: '🇵🇾', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '591', name: 'Bolívia', flag: '🇧🇴', format: 'X XXX XXXX', minDigits: 8, maxDigits: 8 },
  { code: '593', name: 'Equador', flag: '🇪🇨', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '58', name: 'Venezuela', flag: '🇻🇪', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '41', name: 'Suíça', flag: '🇨🇭', format: 'XX XXX XX XX', minDigits: 9, maxDigits: 9 },
  { code: '31', name: 'Holanda', flag: '🇳🇱', format: 'X XX XX XX XX', minDigits: 9, maxDigits: 9 },
  { code: '32', name: 'Bélgica', flag: '🇧🇪', format: 'XXX XX XX XX', minDigits: 9, maxDigits: 9 },
  { code: '43', name: 'Áustria', flag: '🇦🇹', format: 'XXXX XXXXXX', minDigits: 10, maxDigits: 13 },
  { code: '48', name: 'Polônia', flag: '🇵🇱', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '7', name: 'Rússia', flag: '🇷🇺', format: 'XXX XXX-XX-XX', minDigits: 10, maxDigits: 10 },
  { code: '91', name: 'Índia', flag: '🇮🇳', format: 'XXXXX XXXXX', minDigits: 10, maxDigits: 10 },
  { code: '82', name: 'Coreia do Sul', flag: '🇰🇷', format: 'XX-XXXX-XXXX', minDigits: 9, maxDigits: 10 },
  { code: '61', name: 'Austrália', flag: '🇦🇺', format: 'XXXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '64', name: 'Nova Zelândia', flag: '🇳🇿', format: 'XX XXX XXXX', minDigits: 8, maxDigits: 9 },
  { code: '27', name: 'África do Sul', flag: '🇿🇦', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '971', name: 'Emirados Árabes', flag: '🇦🇪', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '972', name: 'Israel', flag: '🇮🇱', format: 'XX-XXX-XXXX', minDigits: 9, maxDigits: 9 },
  { code: '90', name: 'Turquia', flag: '🇹🇷', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '20', name: 'Egito', flag: '🇪🇬', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '212', name: 'Marrocos', flag: '🇲🇦', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '234', name: 'Nigéria', flag: '🇳🇬', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '254', name: 'Quênia', flag: '🇰🇪', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 9 },
  { code: '66', name: 'Tailândia', flag: '🇹🇭', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '84', name: 'Vietnã', flag: '🇻🇳', format: 'XXX XXX XXX', minDigits: 9, maxDigits: 10 },
  { code: '63', name: 'Filipinas', flag: '🇵🇭', format: 'XXX XXX XXXX', minDigits: 10, maxDigits: 10 },
  { code: '62', name: 'Indonésia', flag: '🇮🇩', format: 'XXX-XXX-XXXX', minDigits: 10, maxDigits: 12 },
  { code: '60', name: 'Malásia', flag: '🇲🇾', format: 'XX-XXX XXXX', minDigits: 9, maxDigits: 10 },
  { code: '65', name: 'Singapura', flag: '🇸🇬', format: 'XXXX XXXX', minDigits: 8, maxDigits: 8 },
  { code: '353', name: 'Irlanda', flag: '🇮🇪', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 9 },
  { code: '354', name: 'Islândia', flag: '🇮🇸', format: 'XXX XXXX', minDigits: 7, maxDigits: 7 },
  { code: '47', name: 'Noruega', flag: '🇳🇴', format: 'XXX XX XXX', minDigits: 8, maxDigits: 8 },
  { code: '46', name: 'Suécia', flag: '🇸🇪', format: 'XX-XXX XX XX', minDigits: 9, maxDigits: 9 },
  { code: '45', name: 'Dinamarca', flag: '🇩🇰', format: 'XX XX XX XX', minDigits: 8, maxDigits: 8 },
  { code: '358', name: 'Finlândia', flag: '🇫🇮', format: 'XX XXX XXXX', minDigits: 9, maxDigits: 10 },
];

// Função para encontrar país pelo código
export function getCountryByCode(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

// Função para formatar telefone baseado no país
export function formatPhoneByCountry(phone: string, countryCode: string): string {
  const country = getCountryByCode(countryCode);
  const cleaned = phone.replace(/\D/g, '');

  if (!cleaned) return '';

  switch (countryCode) {
    case '55': // Brasil
      if (cleaned.length <= 2) {
        return cleaned.length > 0 ? `(${cleaned}` : '';
      }
      if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
      }
      if (cleaned.length <= 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;

    case '1': // USA
      if (cleaned.length <= 3) {
        return cleaned.length > 0 ? `(${cleaned}` : '';
      }
      if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      }
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;

    case '351': // Portugal
    case '34': // Espanha
      if (cleaned.length <= 3) {
        return cleaned;
      }
      if (cleaned.length <= 6) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      }
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;

    case '44': // UK
      if (cleaned.length <= 4) {
        return cleaned;
      }
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 10)}`;

    case '54': // Argentina
    case '52': // México
      if (cleaned.length <= 2) {
        return cleaned.length > 0 ? `(${cleaned}` : '';
      }
      if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
      }
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;

    default:
      // Formato genérico: agrupar em blocos de 3-4 dígitos
      const chunks: string[] = [];
      for (let i = 0; i < cleaned.length; i += 3) {
        chunks.push(cleaned.slice(i, i + 3));
      }
      return chunks.join(' ');
  }
}

// Função para limpar telefone
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Função para validar telefone baseado no país
export function validatePhoneByCountry(phone: string, countryCode: string): boolean {
  const country = getCountryByCode(countryCode);
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= country.minDigits && cleaned.length <= country.maxDigits;
}

// Função para formatar para WhatsApp API
export function formatPhoneForWhatsApp(phone: string, countryCode: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  return `${countryCode}${cleaned}@c.us`;
}

// Função para formatar exibição internacional
export function formatPhoneInternational(phone: string, countryCode: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  const formatted = formatPhoneByCountry(cleaned, countryCode);
  return `+${countryCode} ${formatted}`;
}

// Props do componente
export interface PhoneInputInternationalProps {
  value?: string;
  countryCode?: string;
  onChange?: (value: string) => void;
  onCountryChange?: (code: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  showCountryName?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const PhoneInputInternational = React.forwardRef<
  HTMLInputElement,
  PhoneInputInternationalProps
>(
  (
    {
      value = '',
      countryCode = '55',
      onChange,
      onCountryChange,
      onBlur,
      placeholder,
      disabled = false,
      error = false,
      className,
      id,
      name,
      showCountryName = false,
      size = 'default',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value);
    const [selectedCountry, setSelectedCountry] = React.useState(countryCode);

    // Sincronizar com props externas
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    React.useEffect(() => {
      setSelectedCountry(countryCode);
    }, [countryCode]);

    const country = getCountryByCode(selectedCountry);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneByCountry(rawValue, selectedCountry);
      setInternalValue(formatted);
      onChange?.(formatted);
    };

    const handleCountrySelect = (code: string) => {
      setSelectedCountry(code);
      onCountryChange?.(code);
      // Re-formatar o telefone com o novo país
      if (internalValue) {
        const cleaned = cleanPhoneNumber(internalValue);
        const reformatted = formatPhoneByCountry(cleaned, code);
        setInternalValue(reformatted);
        onChange?.(reformatted);
      }
    };

    const sizeClasses = {
      sm: 'h-8 text-sm',
      default: 'h-10',
      lg: 'h-12 text-lg',
    };

    return (
      <div className={cn('flex gap-1', className)}>
        {/* Seletor de País */}
        <Select value={selectedCountry} onValueChange={handleCountrySelect} disabled={disabled}>
          <SelectTrigger
            className={cn(
              'w-[90px] flex-shrink-0',
              sizeClasses[size],
              error && 'border-destructive'
            )}
          >
            <SelectValue>
              <span className="flex items-center gap-1">
                <span className="text-base">{country.flag}</span>
                <span className="text-xs text-muted-foreground">+{country.code}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <span className="font-medium">+{c.code}</span>
                  {showCountryName && (
                    <span className="text-muted-foreground text-sm">{c.name}</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Input do Telefone */}
        <Input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          value={internalValue}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          placeholder={placeholder || country.format.replace(/X/g, '9')}
          disabled={disabled}
          className={cn(
            'flex-1',
            sizeClasses[size],
            error && 'border-destructive'
          )}
          maxLength={country.format.length + 2}
        />
      </div>
    );
  }
);

PhoneInputInternational.displayName = 'PhoneInputInternational';

export default PhoneInputInternational;
