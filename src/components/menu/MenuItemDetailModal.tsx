"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChefHat,
  Clock,
  DollarSign,
  Flame,
  Leaf,
  Loader2,
  Scale,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

interface MenuItemDetail {
  id: number;
  name: string;
  category_name: string;
  meal_type: string;
  default_gramaj: number;
  unit_cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  season: string;
  season_label: string;
  tags: string[];
  institution_types: string[];
}

interface Recipe {
  instructions: string;
  prep_time: number;
  cook_time: number;
  difficulty: string;
  ingredients: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    totalCost: number;
  }>;
}

interface DetailData {
  item: MenuItemDetail;
  recipe: Recipe | null;
  costs: {
    per_portion: number;
    breakdown: Array<{
      persons: number;
      label: string;
      totalKg: number;
      totalCost: number;
      costPerPerson: number;
    }>;
  };
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    per_100g: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

type TabType = 'gramaj' | 'recete' | 'tarif' | 'mevsim' | 'maliyet';

interface Props {
  itemId: number;
  onClose: () => void;
}

export function MenuItemDetailModal({ itemId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('gramaj');
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function loadDetails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/menu/detail/${itemId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'gramaj' as TabType, name: 'Gramaj', icon: Scale, color: 'from-green-500 to-emerald-500' },
    { id: 'recete' as TabType, name: 'Reçete', icon: ChefHat, color: 'from-orange-500 to-red-500' },
    { id: 'tarif' as TabType, name: 'Tarif', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
    { id: 'mevsim' as TabType, name: 'Mevsim', icon: Leaf, color: 'from-emerald-500 to-teal-500' },
    { id: 'maliyet' as TabType, name: 'Maliyet', icon: DollarSign, color: 'from-purple-500 to-pink-500' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-700/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            {data && (
              <>
                <h2 className="text-2xl font-bold text-white">{data.item.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{data.item.category_name}</p>
              </>
            )}
            {loading && <div className="h-8 w-48 bg-slate-800 animate-pulse rounded"></div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        {data && (
          <div className="flex gap-2 p-4 border-b border-slate-800 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadDetails}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {data && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'gramaj' && <GramajTab data={data} />}
                {activeTab === 'recete' && <ReceteTab data={data} />}
                {activeTab === 'tarif' && <TarifTab data={data} />}
                {activeTab === 'mevsim' && <MevsimTab data={data} />}
                {activeTab === 'maliyet' && <MaliyetTab data={data} />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Gramaj Tab
function GramajTab({ data }: { data: DetailData }) {
  return (
    <div className="space-y-6">
      {/* Porsiyon Bilgisi */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-green-400" />
          Porsiyon Bilgisi
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Porsiyon</p>
            <p className="text-2xl font-bold text-white">{data.item.default_gramaj}g</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Kalori</p>
            <p className="text-2xl font-bold text-orange-400">{data.nutrition.calories} kcal</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Protein</p>
            <p className="text-2xl font-bold text-red-400">{data.nutrition.protein}g</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Karbonhidrat</p>
            <p className="text-2xl font-bold text-yellow-400">{data.nutrition.carbs}g</p>
          </div>
        </div>
      </div>

      {/* Kişi Başı Hesaplama */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Hesaplama Tablosu</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-3 text-slate-400 text-sm">Kişi Sayısı</th>
                <th className="text-right p-3 text-slate-400 text-sm">Toplam (kg)</th>
                <th className="text-right p-3 text-slate-400 text-sm">Kişi Başı Maliyet</th>
                <th className="text-right p-3 text-slate-400 text-sm">Toplam Maliyet</th>
              </tr>
            </thead>
            <tbody>
              {data.costs.breakdown.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-3 text-white font-medium">{row.persons} kişi</td>
                  <td className="p-3 text-right text-cyan-400 font-mono">{row.totalKg} kg</td>
                  <td className="p-3 text-right text-green-400 font-mono">{row.costPerPerson} ₺</td>
                  <td className="p-3 text-right text-purple-400 font-bold">{row.totalCost.toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Reçete Tab
function ReceteTab({ data }: { data: DetailData }) {
  if (!data.recipe) {
    return (
      <div className="text-center py-12">
        <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Bu yemek için reçete bilgisi bulunmuyor</p>
      </div>
    );
  }

  const totalIngredientCost = data.recipe.ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);

  return (
    <div className="space-y-6">
      {/* Malzemeler */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-400" />
          Malzemeler (1 Porsiyon)
        </h3>
        <div className="space-y-2">
          {data.recipe.ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-bold">{idx + 1}</span>
                </div>
                <span className="text-white font-medium">{ing.ingredient_name}</span>
              </div>
              <div className="text-right">
                <p className="text-cyan-400 font-mono text-sm">
                  {ing.quantity} {ing.unit}
                </p>
                <p className="text-xs text-slate-500">{ing.totalCost.toFixed(2)} ₺</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-slate-400">Toplam Malzeme Maliyeti:</span>
          <span className="text-xl font-bold text-purple-400">{totalIngredientCost.toFixed(2)} ₺</span>
        </div>
      </div>

      {/* Süre Bilgisi */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl">
          <Clock className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-xs text-slate-400">Hazırlık</p>
          <p className="text-xl font-bold text-white">{data.recipe.prep_time} dk</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <Flame className="w-5 h-5 text-orange-400 mb-2" />
          <p className="text-xs text-slate-400">Pişirme</p>
          <p className="text-xl font-bold text-white">{data.recipe.cook_time} dk</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-xs text-slate-400">Zorluk</p>
          <p className="text-xl font-bold text-white capitalize">{data.recipe.difficulty}</p>
        </div>
      </div>
    </div>
  );
}

// Tarif Tab
function TarifTab({ data }: { data: DetailData }) {
  if (!data.recipe) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Bu yemek için tarif bulunmuyor</p>
      </div>
    );
  }

  const steps = data.recipe.instructions.split('\n').filter(s => s.trim());

  return (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-400" />
        Hazırlama Talimatları
      </h3>
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-400 font-bold text-sm">{idx + 1}</span>
            </div>
            <p className="text-slate-300 leading-relaxed flex-1 pt-1">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mevsim Tab
function MevsimTab({ data }: { data: DetailData }) {
  const seasonColors: Record<string, { bg: string; text: string; icon: string }> = {
    'all': { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: '🌍' },
    'yaz': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '☀️' },
    'kis': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '❄️' },
    'ilkbahar': { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🌸' },
    'sonbahar': { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🍂' }
  };

  const seasonInfo = seasonColors[data.item.season] || seasonColors.all;

  return (
    <div className="space-y-6">
      <div className="glass-card p-8 rounded-xl text-center">
        <div className="text-6xl mb-4">{seasonInfo.icon}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{data.item.season_label}</h3>
        <p className="text-slate-400">
          {data.item.season === 'all'
            ? 'Bu yemek her mevsim hazırlanabilir'
            : `Bu yemek ${data.item.season_label.toLowerCase()} mevsiminde daha uygun`
          }
        </p>
      </div>

      {data.item.tags && data.item.tags.length > 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Etiketler</h3>
          <div className="flex flex-wrap gap-2">
            {data.item.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.item.institution_types && data.item.institution_types.length > 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Uygun Kurumlar
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.item.institution_types.map((type, idx) => (
              <div
                key={idx}
                className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30 text-center"
              >
                <span className="text-purple-400 font-medium capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Maliyet Tab
function MaliyetTab({ data }: { data: DetailData }) {
  return (
    <div className="space-y-6">
      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-xl">
          <DollarSign className="w-6 h-6 text-green-400 mb-3" />
          <p className="text-sm text-slate-400 mb-1">Porsiyon Maliyeti</p>
          <p className="text-3xl font-bold text-green-400">{data.costs.per_portion} ₺</p>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <TrendingUp className="w-6 h-6 text-purple-400 mb-3" />
          <p className="text-sm text-slate-400 mb-1">Kg Başı Fiyat</p>
          <p className="text-3xl font-bold text-purple-400">{data.item.unit_cost} ₺</p>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <Scale className="w-6 h-6 text-cyan-400 mb-3" />
          <p className="text-sm text-slate-400 mb-1">Porsiyon Ağırlığı</p>
          <p className="text-3xl font-bold text-cyan-400">{data.item.default_gramaj}g</p>
        </div>
      </div>

      {/* Detaylı Maliyet Tablosu */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Farklı Kişi Sayıları İçin Maliyet</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-4 text-slate-400 text-sm font-semibold">Kişi Sayısı</th>
                <th className="text-right p-4 text-slate-400 text-sm font-semibold">Miktar</th>
                <th className="text-right p-4 text-slate-400 text-sm font-semibold">Kişi Başı</th>
                <th className="text-right p-4 text-slate-400 text-sm font-semibold">Toplam</th>
                <th className="text-center p-4 text-slate-400 text-sm font-semibold">KDV Dahil</th>
              </tr>
            </thead>
            <tbody>
              {data.costs.breakdown.map((row, idx) => {
                const withVAT = row.totalCost * 1.20; // %20 KDV
                return (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <span className="text-white font-medium">{row.persons} kişi</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-cyan-400 font-mono">{row.totalKg} kg</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-green-400 font-mono">{row.costPerPerson.toFixed(2)} ₺</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-purple-400 font-bold">{row.totalCost.toFixed(2)} ₺</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-orange-400 font-mono text-sm">{withVAT.toFixed(2)} ₺</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4">* KDV dahil fiyatlar %20 KDV ile hesaplanmıştır</p>
      </div>
    </div>
  );
}
