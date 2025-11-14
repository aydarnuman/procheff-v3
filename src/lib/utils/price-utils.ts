/**
 * Price utility functions
 * Client-safe utilities without database dependencies
 */

export function calculateUnitPrice(packagePrice: number, packageSize: number): number {
  return packagePrice / packageSize;
}

export function getPriceLevel(price: number, allPrices: number[]): string {
  if (allPrices.length === 0) return 'normal';
  
  const sorted = [...allPrices].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, p) => sum + p, 0) / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  if (price === min) return 'best_price'; // 🏆
  if (price < avg * 0.9) return 'cheap'; // ✅
  if (price < avg * 1.1) return 'normal'; // 💰
  if (price < avg * 1.3) return 'expensive'; // ⭐
  return 'very_expensive'; // 🔴
}

export function formatPrice(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' TL';
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Sebze': '🥬',
    'Meyve': '🍎',
    'Et & Tavuk': '🥩',
    'Balık': '🐟',
    'Süt & Kahvaltılık': '🥛',
    'Bakliyat': '🌾',
    'Yağ & Sos': '🫒',
    'İçecek': '🥤',
    'Atıştırmalık': '🍿',
    'Temizlik': '🧹',
    'Kişisel Bakım': '🧴',
    'Diğer': '📦'
  };
  
  return icons[category] || '📦';
}
