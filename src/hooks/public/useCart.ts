import { useState, useCallback, useEffect } from 'react';

export interface CartItem {
  service_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  preco_pix?: number;
  preco_cartao?: number;
  preco_recorrente?: number;
  imagem_url?: string | null;
  sessoes_protocolo?: number | null;
}

const CART_STORAGE_KEY = 'viniun-cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.service_id === item.service_id);
      if (existing) {
        return prev.map((i) =>
          i.service_id === item.service_id
            ? {
                ...i,
                quantidade: i.quantidade + item.quantidade,
                preco_total: (i.quantidade + item.quantidade) * i.preco_unitario,
              }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((serviceId: string) => {
    setItems((prev) => prev.filter((i) => i.service_id !== serviceId));
  }, []);

  const updateQuantity = useCallback((serviceId: string, quantidade: number) => {
    if (quantidade <= 0) {
      setItems((prev) => prev.filter((i) => i.service_id !== serviceId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.service_id === serviceId
          ? { ...i, quantidade, preco_total: quantidade * i.preco_unitario }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantidade, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.preco_total, 0);
  const totalPix = items.reduce(
    (sum, i) => sum + (i.preco_pix ?? i.preco_unitario) * i.quantidade,
    0
  );
  const totalCartao = items.reduce(
    (sum, i) => sum + (i.preco_cartao ?? i.preco_unitario) * i.quantidade,
    0
  );
  const totalRecorrente = items.reduce(
    (sum, i) => sum + (i.preco_recorrente ?? i.preco_cartao ?? i.preco_unitario) * i.quantidade,
    0
  );

  return {
    items,
    totalItems,
    totalAmount,
    totalPix,
    totalCartao,
    totalRecorrente,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isEmpty: items.length === 0,
  };
}
