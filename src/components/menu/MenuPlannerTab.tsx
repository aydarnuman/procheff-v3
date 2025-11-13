"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  Download,
  Edit3,
  Hand,
  Loader2,
  RefreshCw,
  Sparkles,
  Sun,
  Users,
  X
} from "lucide-react";
import { useState } from "react";

type PlanMode = 'auto' | 'manual';
type MealType = 'kahvalti' | 'ogle' | 'aksam';

interface MenuMeal {
  item_id: number;
  name: string;
  gramaj: number;
  cost: number;
}

interface MenuDayPlan {
  day: number;
  meals: Partial<Record<MealType, MenuMeal>>;
}

interface MenuPlanSummary {
  days: number;
  meals: number;
  totalMealsServed: number;
  persons: number;
  totalCost: number;
  costPerDay: number;
  costPerPerson: number;
  avgCaloriesPerPerson: number;
}

interface MenuPlannerAutoResponse {
  plan: MenuDayPlan[];
  summary: MenuPlanSummary;
}

interface AlternativeMenuItem {
  id: number;
  name: string;
  default_gramaj: number;
  unit_cost: number;
  calories: number;
  meal_type: MealType;
}

interface EditingCell {
  day: number;
  meal: MealType;
}

// Predefined templates
const MENU_TEMPLATES = [
  {
    id: 'hastane',
    name: '🏥 Hastane Diyeti',
    description: '7 gün, düşük yağlı, dengeli',
    params: {
      days: 7,
      meals: ['ogle' as MealType, 'aksam' as MealType],
      institutionType: 'hastane',
      persons: 200,
      budget: 12,
      season: 'all'
    }
  },
  {
    id: 'okul',
    name: '🎓 Okul Menüsü',
    description: '30 gün, ekonomik, çeşitli',
    params: {
      days: 30,
      meals: ['ogle' as MealType],
      institutionType: 'okul',
      persons: 500,
      budget: 10,
      season: 'all'
    }
  },
  {
    id: 'dugün',
    name: '💒 Düğün Menüsü',
    description: '1 gün, özel, lüks',
    params: {
      days: 1,
      meals: ['aksam' as MealType],
      institutionType: 'ozel',
      persons: 300,
      budget: 50,
      season: 'all'
    }
  },
  {
    id: 'fitness',
    name: '🏋️ Fitness Menüsü',
    description: '7 gün, yüksek protein',
    params: {
      days: 7,
      meals: ['ogle' as MealType, 'aksam' as MealType],
      institutionType: 'ozel',
      persons: 100,
      budget: 20,
      season: 'all'
    }
  },
  {
    id: 'ofis',
    name: '🏢 Ofis Catering',
    description: '5 gün, hızlı, pratik',
    params: {
      days: 5,
      meals: ['ogle' as MealType],
      institutionType: 'ozel',
      persons: 150,
      budget: 15,
      season: 'all'
    }
  }
];

export function MenuPlannerTab() {
  const [mode, setMode] = useState<PlanMode>('auto');
  const [days, setDays] = useState<number>(7);
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(['ogle']);
  const [institutionType, setInstitutionType] = useState<string>('ozel');
  const [persons, setPersons] = useState<number>(500);
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [season, setSeason] = useState<string>('all');
  const [generating, setGenerating] = useState(false);
  const [menuPlan, setMenuPlan] = useState<MenuPlannerAutoResponse | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeMenuItem[]>([]);

  function toggleMeal(meal: MealType) {
    if (selectedMeals.includes(meal)) {
      setSelectedMeals(selectedMeals.filter(m => m !== meal));
    } else {
      setSelectedMeals([...selectedMeals, meal]);
    }
  }

  function applyTemplate(template: typeof MENU_TEMPLATES[0]) {
    setDays(template.params.days);
    setSelectedMeals(template.params.meals);
    setInstitutionType(template.params.institutionType);
    setPersons(template.params.persons);
    setBudget(template.params.budget);
    setSeason(template.params.season);
    setShowTemplates(false);
  }

  async function generateMenu() {
    if (selectedMeals.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/menu/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          days,
          meals: selectedMeals,
          institutionType,
          persons,
          budget,
          season
        })
      });

      const data = await res.json();
      if (data.success && data.mode === 'auto' && data.plan && data.summary) {
        setMenuPlan({
          plan: data.plan as MenuDayPlan[],
          summary: data.summary as MenuPlanSummary
        });
      } else if (data.success && data.mode === 'manual') {
        setMenuPlan(null);
        console.info('Manual mode response received. Manual handling not yet implemented.');
      } else {
        console.error('Menu planning failed:', data.error);
      }
    } catch (error) {
      console.error('Menu generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }

  async function exportToExcel() {
    if (!menuPlan) return;

    try {
      const res = await fetch('/api/menu/export/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: menuPlan.plan,
          summary: menuPlan.summary,
          meals: selectedMeals,
          institutionType
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `menu-plani-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  async function exportToPDF() {
    if (!menuPlan) return;

    try {
      const res = await fetch('/api/menu/export/planner-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: menuPlan.plan,
          summary: menuPlan.summary,
          meals: selectedMeals,
          institutionType
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `menu-plani-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  }

  async function fetchAlternatives(day: number, meal: MealType) {
    setEditingCell({ day, meal });

    try {
      const res = await fetch('/api/menu/havuz', {
        method: 'GET'
      });

      const data = await res.json();
      if (data.success) {
        // Filter by meal type and shuffle
        const filtered = (data.items as AlternativeMenuItem[]).filter((item) =>
          item.meal_type === meal || item.meal_type === 'ogle'
        ).slice(0, 8);
        setAlternatives(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
    }
  }

  function replaceMeal(newItem: AlternativeMenuItem) {
    if (!editingCell || !menuPlan) return;

    const updatedPlan = menuPlan.plan.map((dayPlan) => {
      if (dayPlan.day === editingCell.day) {
        return {
          ...dayPlan,
          meals: {
            ...dayPlan.meals,
            [editingCell.meal]: {
              item_id: newItem.id,
              name: newItem.name,
              gramaj: newItem.default_gramaj,
              cost: newItem.unit_cost
            }
          }
        };
      }
      return dayPlan;
    });

    setMenuPlan({
      plan: updatedPlan,
      summary: menuPlan.summary
    });

    setEditingCell(null);
    setAlternatives([]);
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel: Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Planlama Modu</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('auto')}
              className={`p-4 rounded-xl transition-all ${
                mode === 'auto'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              <Sparkles className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Otomatik</p>
              <p className="text-xs opacity-70 mt-1">AI Destekli</p>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`p-4 rounded-xl transition-all ${
                mode === 'manual'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              <Hand className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Manuel</p>
              <p className="text-xs opacity-70 mt-1">Özelleştir</p>
            </button>
          </div>
        </motion.div>

        {/* Template Button */}
        <button
          onClick={() => setShowTemplates(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20
            hover:from-indigo-500/30 hover:to-purple-500/30 text-white rounded-xl
            font-medium transition-all flex items-center justify-center gap-2
            border border-indigo-500/30"
        >
          <Sparkles className="w-5 h-5" />
          Hazır Şablon Kullan
        </button>

        {/* Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl space-y-4"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Parametreler</h3>

          {/* Gün Sayısı */}
          <div>
            <label id="label-menu-days" htmlFor="menu-days" className="text-sm text-slate-400 mb-2 block">Gün Sayısı</label>
            <input
              id="menu-days"
              name="menu-days"
              aria-labelledby="label-menu-days"
              aria-label="Gün sayısı"
              title="Gün Sayısı"
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                text-white focus:border-purple-500/50 focus:outline-none transition-colors"
              min={1}
              max={30}
            />
            <p className="text-xs text-slate-500 mt-1">1-30 gün arası</p>
          </div>

          {/* Öğün Seçimi */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Öğünler</label>
            <div className="flex gap-2">
              {[
                { value: 'kahvalti', label: 'Kahvaltı', icon: '🍳' },
                { value: 'ogle', label: 'Öğle', icon: '🍽️' },
                { value: 'aksam', label: 'Akşam', icon: '🌙' }
              ].map((meal) => (
                <button
                  key={meal.value}
                  onClick={() => toggleMeal(meal.value as MealType)}
                  className={`flex-1 p-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMeals.includes(meal.value as MealType)
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <span className="block text-lg mb-1">{meal.icon}</span>
                  {meal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kurum Tipi */}
          <div>
            <label id="label-institution-type" htmlFor="institution-type" className="text-sm text-slate-400 mb-2 block">Kurum Tipi</label>
            <select
              id="institution-type"
              name="institution-type"
              aria-labelledby="label-institution-type"
              aria-label="Kurum tipi"
              title="Kurum Tipi"
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                text-white focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="ozel">Özel</option>
              <option value="resmi">Resmi</option>
              <option value="okul">Okul</option>
              <option value="universite">Üniversite</option>
              <option value="hastane">Hastane</option>
            </select>
          </div>

          {/* Kişi Sayısı */}
          <div>
            <label id="label-person-count" htmlFor="person-count" className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Kişi Sayısı
            </label>
            <input
              id="person-count"
              name="person-count"
              aria-labelledby="label-person-count"
              aria-label="Kişi sayısı"
              title="Kişi Sayısı"
              type="number"
              value={persons}
              onChange={(e) => setPersons(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                text-white focus:border-purple-500/50 focus:outline-none transition-colors"
              min={1}
            />
          </div>

          {/* Bütçe (Opsiyonel) */}
          <div>
            <label id="label-daily-budget" htmlFor="daily-budget" className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Günlük Bütçe (Opsiyonel)
            </label>
            <input
              id="daily-budget"
              name="daily-budget"
              aria-labelledby="label-daily-budget"
              aria-label="Günlük bütçe"
              title="Günlük Bütçe"
              type="number"
              value={budget || ''}
              onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Kişi başı TL"
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                text-white placeholder-slate-600 focus:border-purple-500/50 focus:outline-none transition-colors"
              min={0}
            />
          </div>

          {/* Mevsim (Opsiyonel) */}
          <div>
            <label id="label-season" htmlFor="season" className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Mevsim
            </label>
            <select
              id="season"
              name="season"
              aria-labelledby="label-season"
              aria-label="Mevsim"
              title="Mevsim"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                text-white focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="all">Tüm Mevsimler</option>
              <option value="yaz">Yaz</option>
              <option value="kis">Kış</option>
              <option value="ilkbahar">İlkbahar</option>
              <option value="sonbahar">Sonbahar</option>
            </select>
          </div>
        </motion.div>

        {/* Generate Button */}
        <button
          onClick={generateMenu}
          disabled={selectedMeals.length === 0 || generating}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white
            rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Oluşturuluyor...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Menü Planı Oluştur
            </>
          )}
        </button>
      </div>

      {/* Right Panel: Results */}
      <div className="lg:col-span-2">
        {menuPlan ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Menü Planı</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    flex items-center gap-2 border ${
                      editMode
                        ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/50'
                        : 'bg-slate-800/50 text-slate-300 border-slate-700/50 hover:text-blue-400'
                    }`}
                >
                  <Edit3 className="w-4 h-4" />
                  {editMode ? 'Düzenleme Modu' : 'Düzenle'}
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg
                    text-slate-300 text-sm font-medium transition-colors flex items-center gap-2
                    border border-slate-700/50 hover:text-green-400"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg
                    text-slate-300 text-sm font-medium transition-colors flex items-center gap-2
                    border border-slate-700/50 hover:text-red-400"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Toplam Gün</p>
                <p className="text-xl font-bold text-white">{menuPlan.summary?.days || days}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Toplam Öğün</p>
                <p className="text-xl font-bold text-white">{menuPlan.summary?.totalMealsServed || 0}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Günlük Maliyet</p>
                <p className="text-xl font-bold text-green-400">
                  {menuPlan.summary?.costPerDay?.toFixed(2) || '0'} ₺
                </p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Kişi Başı</p>
                <p className="text-xl font-bold text-cyan-400">
                  {menuPlan.summary?.costPerPerson?.toFixed(2) || '0'} ₺
                </p>
              </div>
            </div>

            {/* Calendar Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-slate-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/30">
                      <th className="text-left p-4 text-slate-400 font-semibold text-xs uppercase">Gün</th>
                      {selectedMeals.map((meal) => (
                        <th key={meal} className="text-center p-4 text-slate-400 font-semibold text-xs uppercase">
                          {meal === 'kahvalti' ? 'Kahvaltı' : meal === 'ogle' ? 'Öğle' : 'Akşam'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menuPlan.plan && menuPlan.plan.map((dayPlan, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 text-white font-medium">Gün {dayPlan.day}</td>
                        {selectedMeals.map((meal) => {
                          const mealData = dayPlan.meals[meal];
                          return (
                            <td key={meal} className="p-4 text-center">
                              {mealData ? (
                                <div className="relative group">
                                  <div className="text-sm">
                                    <p className="text-white font-medium">{mealData.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {mealData.gramaj}g · {mealData.cost} TL/kg
                                    </p>
                                  </div>
                                  {editMode && (
                                    <button
                                      onClick={() => fetchAlternatives(dayPlan.day, meal)}
                                      className="absolute top-0 right-0 p-1 bg-blue-500/20 hover:bg-blue-500/40
                                        rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Değiştir"
                                    >
                                      <RefreshCw className="w-3 h-3 text-blue-400" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 rounded-2xl text-center"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600
              flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Menü Planı Oluştur
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {mode === 'auto'
                ? 'AI destekli otomatik menü planlama ile dengeli ve çeşitli menüler oluşturun.'
                : 'Manuel olarak menülerinizi özelleştirin ve planınızı oluşturun.'
              }
            </p>
          </motion.div>
        )}
      </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplates && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Menü Şablonları</h3>
            <button
              onClick={() => setShowTemplates(false)}
              aria-label="Şablon seçimini kapat"
              title="Şablon seçimini kapat"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MENU_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-6 bg-slate-800/50 hover:bg-slate-800 rounded-xl
                  border border-slate-700/50 hover:border-indigo-500/50 transition-all
                  text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </h4>
                  <Sparkles className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  {template.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {template.params.days} gün
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users className="w-3 h-3" />
                    {template.params.persons} kişi
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <DollarSign className="w-3 h-3" />
                    {template.params.budget} TL/kişi
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Sun className="w-3 h-3" />
                    {template.params.meals.length} öğün
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-300">
              💡 <strong>İpucu:</strong> Şablon seçtikten sonra parametreleri özelleştirebilirsiniz!
            </p>
          </div>
        </motion.div>
      </div>
      )}

      {/* Alternatives Modal */}
      {editingCell && alternatives.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Alternatif Yemekler</h3>
              <p className="text-sm text-slate-400 mt-1">
                Gün {editingCell.day} · {
                  editingCell.meal === 'kahvalti' ? 'Kahvaltı' :
                  editingCell.meal === 'ogle' ? 'Öğle' :
                  'Akşam'
                }
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCell(null);
                setAlternatives([]);
              }}
              aria-label="Alternatifler penceresini kapat"
              title="Alternatifler penceresini kapat"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alternatives.map((item) => (
              <button
                key={item.id}
                onClick={() => replaceMeal(item)}
                className="p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg
                  border border-slate-700/50 hover:border-blue-500/50 transition-all
                  text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h4>
                  <RefreshCw className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>{item.default_gramaj}g</div>
                  <div>{item.unit_cost} TL/kg</div>
                  <div>{item.calories} kcal</div>
                  <div className="text-right text-green-400">Seç →</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
      )}
    </>
  );
}
