import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductCard, MarketPrice } from '@/lib/db/market-db';

interface PriceAlert {
  id: string;
  productCardId: string;
  targetPrice: number;
  alertType: 'price_drop' | 'back_in_stock' | 'new_promotion';
  isActive: boolean;
  createdAt: Date;
}

interface PriceStore {
  // Data
  productCards: ProductCard[];
  marketPrices: Record<string, MarketPrice[]>; // productCardId -> prices
  priceAlerts: PriceAlert[];
  
  // UI State
  selectedCategory: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions - Product Cards
  addProductCard: (card: ProductCard) => void;
  updateProductCard: (id: string, updates: Partial<ProductCard>) => void;
  deleteProductCard: (id: string) => void;
  loadProductCards: () => Promise<void>;
  
  // Actions - Market Prices
  setMarketPrices: (productCardId: string, prices: MarketPrice[]) => void;
  fetchPrices: (productCardId: string) => Promise<void>;
  
  // Actions - Price Alerts
  addPriceAlert: (alert: PriceAlert) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  
  // Actions - UI
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getFilteredProducts: () => ProductCard[];
  getProductWithPrices: (id: string) => { product: ProductCard | undefined; prices: MarketPrice[] };
  getCheapestPrice: (productCardId: string) => MarketPrice | null;
}

export const usePriceStore = create<PriceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      productCards: [],
      marketPrices: {},
      priceAlerts: [],
      selectedCategory: null,
      searchQuery: '',
      isLoading: false,
      error: null,
      
      // Product Card Actions
      addProductCard: (card) => {
        set((state) => ({
          productCards: [...state.productCards, card],
          error: null
        }));
      },
      
      updateProductCard: (id, updates) => {
        set((state) => ({
          productCards: state.productCards.map(card =>
            card.id === id ? { ...card, ...updates } : card
          ),
          error: null
        }));
      },
      
      deleteProductCard: (id) => {
        set((state) => ({
          productCards: state.productCards.filter(card => card.id !== id),
          marketPrices: Object.fromEntries(
            Object.entries(state.marketPrices).filter(([key]) => key !== id)
          ),
          priceAlerts: state.priceAlerts.filter(alert => alert.productCardId !== id),
          error: null
        }));
      },
      
      loadProductCards: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load from database
          const response = await fetch('/api/products/list');
          if (response.ok) {
            const data = await response.json();
            set({ productCards: data.products, isLoading: false });
          } else {
            throw new Error('Failed to load products');
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false 
          });
        }
      },
      
      // Market Price Actions
      setMarketPrices: (productCardId, prices) => {
        set((state) => ({
          marketPrices: {
            ...state.marketPrices,
            [productCardId]: prices
          },
          error: null
        }));
      },
      
      fetchPrices: async (productCardId) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/ai/fetch-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productCardId })
          });
          
          if (response.ok) {
            const data = await response.json();
            get().setMarketPrices(productCardId, data.prices);
          } else {
            throw new Error('Failed to fetch prices');
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false 
          });
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Price Alert Actions
      addPriceAlert: (alert) => {
        set((state) => ({
          priceAlerts: [...state.priceAlerts, alert],
          error: null
        }));
      },
      
      removePriceAlert: (id) => {
        set((state) => ({
          priceAlerts: state.priceAlerts.filter(alert => alert.id !== id),
          error: null
        }));
      },
      
      togglePriceAlert: (id) => {
        set((state) => ({
          priceAlerts: state.priceAlerts.map(alert =>
            alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
          ),
          error: null
        }));
      },
      
      // UI Actions
      setSelectedCategory: (category) => {
        set({ selectedCategory: category, error: null });
      },
      
      setSearchQuery: (query) => {
        set({ searchQuery: query, error: null });
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      // Computed
      getFilteredProducts: () => {
        const state = get();
        let filtered = [...state.productCards];
        
        // Filter by category
        if (state.selectedCategory) {
          filtered = filtered.filter(card => card.category === state.selectedCategory);
        }
        
        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(card =>
            card.name.toLowerCase().includes(query) ||
            card.category?.toLowerCase().includes(query) ||
            card.tags?.some(tag => tag.toLowerCase().includes(query))
          );
        }
        
        return filtered;
      },
      
      getProductWithPrices: (id) => {
        const state = get();
        const product = state.productCards.find(card => card.id === id);
        const prices = state.marketPrices[id] || [];
        return { product, prices };
      },
      
      getCheapestPrice: (productCardId) => {
        const state = get();
        const prices = state.marketPrices[productCardId] || [];
        
        if (prices.length === 0) return null;
        
        return prices.reduce((min, price) =>
          price.unit_price < min.unit_price ? price : min
        );
      }
    }),
    {
      name: 'price-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        productCards: state.productCards,
        marketPrices: state.marketPrices,
        priceAlerts: state.priceAlerts,
        selectedCategory: state.selectedCategory
      })
    }
  )
);
