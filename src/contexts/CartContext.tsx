import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  nome: string;
  imagem_url: string | null;
  preco: number;
  custo_pix: number | null;
  custo_cartao: number | null;
  sessoes: number | null;
  quantidade: number;
  url_slug: string | null;
}

export interface CartCoupon {
  codigo: string;
  desconto_tipo: 'percentual' | 'valor_fixo';
  desconto_valor: number;
  promotion_id: string;
}

interface CartState {
  items: CartItem[];
  coupon: CartCoupon | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantidade: number } }
  | { type: 'APPLY_COUPON'; payload: CartCoupon }
  | { type: 'REMOVE_COUPON' }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

interface CartContextType {
  items: CartItem[];
  coupon: CartCoupon | null;
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantidade'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantidade: number) => void;
  applyCoupon: (coupon: CartCoupon) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: (paymentMethod?: 'pix' | 'cartao' | 'recorrente') => number;
  getTotalPix: () => number;
  getTotalCartao: () => number;
}

// ─── Constants ────────────────────────────────────────────────

const STORAGE_KEY = 'yeslaser_cart';

const INITIAL_STATE: CartState = {
  items: [],
  coupon: null,
};

// ─── Reducer ──────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantidade: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantidade <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantidade: action.payload.quantidade }
            : item
        ),
      };
    }

    case 'APPLY_COUPON':
      return { ...state, coupon: action.payload };

    case 'REMOVE_COUPON':
      return { ...state, coupon: null };

    case 'CLEAR_CART':
      return INITIAL_STATE;

    case 'LOAD_CART':
      return action.payload;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartState;
        if (parsed.items && Array.isArray(parsed.items)) {
          dispatch({ type: 'LOAD_CART', payload: parsed });
        }
      }
    } catch {
      // Ignore corrupt data
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable
    }
  }, [state]);

  // ── Actions ───────────────────────────────────────────────

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantidade'>) => {
      dispatch({ type: 'ADD_ITEM', payload: { ...item, quantidade: 1 } });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id: string, quantidade: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantidade } });
  }, []);

  const applyCoupon = useCallback((coupon: CartCoupon) => {
    dispatch({ type: 'APPLY_COUPON', payload: coupon });
  }, []);

  const removeCoupon = useCallback(() => {
    dispatch({ type: 'REMOVE_COUPON' });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // ── Calculations ──────────────────────────────────────────

  const getSubtotal = useCallback(() => {
    return state.items.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  }, [state.items]);

  const getDiscount = useCallback(() => {
    if (!state.coupon) return 0;
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.preco * item.quantidade,
      0
    );
    if (state.coupon.desconto_tipo === 'percentual') {
      return Math.round(subtotal * (state.coupon.desconto_valor / 100) * 100) / 100;
    }
    // valor_fixo: cap at subtotal
    return Math.min(state.coupon.desconto_valor, subtotal);
  }, [state.items, state.coupon]);

  const getTotalPix = useCallback(() => {
    const itemsTotal = state.items.reduce(
      (sum, item) => sum + (item.custo_pix || item.preco) * item.quantidade,
      0
    );
    const discount = getDiscount();
    return Math.max(0, itemsTotal - discount);
  }, [state.items, getDiscount]);

  const getTotalCartao = useCallback(() => {
    const itemsTotal = state.items.reduce(
      (sum, item) => sum + (item.custo_cartao || item.preco) * item.quantidade,
      0
    );
    const discount = getDiscount();
    return Math.max(0, itemsTotal - discount);
  }, [state.items, getDiscount]);

  const getTotal = useCallback(
    (paymentMethod?: 'pix' | 'cartao' | 'recorrente') => {
      switch (paymentMethod) {
        case 'pix':
          return getTotalPix();
        case 'cartao':
          return getTotalCartao();
        case 'recorrente': {
          // Recorrente uses ~90% of cartao cost
          const cartaoTotal = state.items.reduce(
            (sum, item) => sum + (item.custo_cartao || item.preco) * item.quantidade,
            0
          );
          const recorrente = Math.round(cartaoTotal * 0.9 * 100) / 100;
          const discount = getDiscount();
          return Math.max(0, recorrente - discount);
        }
        default:
          return getSubtotal() - getDiscount();
      }
    },
    [state.items, getSubtotal, getDiscount, getTotalPix, getTotalCartao]
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantidade, 0),
    [state.items]
  );

  // ── Context Value ─────────────────────────────────────────

  const value = useMemo<CartContextType>(
    () => ({
      items: state.items,
      coupon: state.coupon,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      applyCoupon,
      removeCoupon,
      clearCart,
      getSubtotal,
      getDiscount,
      getTotal,
      getTotalPix,
      getTotalCartao,
    }),
    [
      state.items,
      state.coupon,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      applyCoupon,
      removeCoupon,
      clearCart,
      getSubtotal,
      getDiscount,
      getTotal,
      getTotalPix,
      getTotalCartao,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
