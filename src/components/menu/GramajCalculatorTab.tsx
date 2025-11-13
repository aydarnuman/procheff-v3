"use client";

import { motion } from "framer-motion";
import {
  Download,
  Eye,
  Loader2,
  Plus,
  Scale,
  Search,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { MenuItemDetailModal } from "./MenuItemDetailModal";

interface MenuItemDB {
  id: number;
  name: string;
  category_id: number;
  default_gramaj: number;
  unit_cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GramajResult {
  item: MenuItemDB;
  perPerson: number;
  total: number;
}

export function GramajCalculatorTab() {
  const [selectedItems, setSelectedItems] = useState<MenuItemDB[]>([]);
  const [institutionType, setInstitutionType] = useState<string>('ozel');
  const [persons, setPersons] = useState<number>(500);
  const [results, setResults] = useState<GramajResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Search modal state
  const [searchTerm, setSearchTerm] = useState('');
  const [availableItems, setAvailableItems] = useState<MenuItemDB[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Load available items
  useEffect(() => {
    if (showSearch && availableItems.length === 0) {
      loadMenuItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch]);

  async function loadMenuItems() {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/menu/havuz');
      const data = await res.json();
      if (data.success) {
        setAvailableItems(data.items);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoadingItems(false);
    }
  }

  async function calculateGramaj() {
    if (selectedItems.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/menu/gramaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map(i => i.id),
          institution_type: institutionType,
          persons
        })
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Gramaj calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function addItem(item: MenuItemDB) {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
    setShowSearch(false);
    setSearchTerm('');
  }

  function removeItem(id: number) {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
    setResults(null);
  }

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openDetailModal(itemId: number) {
    setSelectedItemId(itemId);
    setShowDetailModal(true);
  }

  async function exportToExcel() {
    if (!results) return;

    try {
      const res = await fetch('/api/menu/export/gramaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          institutionType,
          persons
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gramaj-tablosu-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel: Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Menü Seçimi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Menü Seç</h3>
            <button
              onClick={() => setShowSearch(true)}
              className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg
                border border-blue-500/30 transition-all text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yemek Ekle
            </button>
          </div>

          {/* Selected Items */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Henüz yemek eklenmedi
              </div>
            ) : (
              selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg
                    border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <span className="text-white text-sm font-medium">{item.name}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label="Kalemi kaldır"
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Parametreler</h3>

          <div className="space-y-4">
            {/* Kurum Tipi */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Kurum Tipi</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ozel', label: 'Özel' },
                  { value: 'resmi', label: 'Resmi' },
                  { value: 'okul', label: 'Okul' },
                  { value: 'hastane', label: 'Hastane' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setInstitutionType(opt.value)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      institutionType === opt.value
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kişi Sayısı */}
            <div>
              <label htmlFor="person-count" className="text-sm text-slate-400 mb-2 block">Kişi Sayısı</label>
              <input
                id="person-count"
                type="number"
                value={persons}
                onChange={(e) => setPersons(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                  text-white focus:border-green-500/50 focus:outline-none transition-colors"
                min={1}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateGramaj}
            disabled={selectedItems.length === 0 || loading}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white
              rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Hesaplanıyor...
              </>
            ) : (
              <>
                <Scale className="w-5 h-5" />
                Gramaj Hesapla
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Right Panel: Results */}
      <div className="lg:col-span-2">
        {results ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Gramaj Tablosu</h2>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg
                  text-slate-300 text-sm font-medium transition-colors flex items-center gap-2
                  border border-slate-700/50 hover:text-green-400"
              >
                <Download className="w-4 h-4" />
                Excel İndir
              </button>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Kurum</p>
                <p className="text-xl font-bold text-white capitalize">{institutionType}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Kişi Sayısı</p>
                <p className="text-xl font-bold text-white">{persons}</p>
              </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-slate-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/30">
                      <th className="text-left p-4 text-slate-400 font-semibold text-xs uppercase">Yemek</th>
                      <th className="text-center p-4 text-slate-400 font-semibold text-xs uppercase">Kişi Başı</th>
                      <th className="text-center p-4 text-slate-400 font-semibold text-xs uppercase">Toplam</th>
                      <th className="text-center p-4 text-slate-400 font-semibold text-xs uppercase">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <span className="text-white font-medium">{result.item.name}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-green-400 font-mono text-sm font-semibold">
                            {result.perPerson}g
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-cyan-400 font-mono text-sm font-semibold">
                            {result.total} kg
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openDetailModal(result.item.id)}
                            className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30
                              border border-indigo-500/30 transition-colors"
                            title="Detaylı Bilgi"
                          >
                            <Eye className="w-4 h-4 text-indigo-400" />
                          </button>
                        </td>
                      </motion.tr>
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
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800
              flex items-center justify-center mb-6">
              <Scale className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Gramaj Hesaplaması Bekleniyor
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Yemekleri seçin, kurum tipini belirleyin ve gramaj hesaplaması başlatın.
            </p>
          </motion.div>
        )}
      </div>
    </div>

    {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Yemek Seç</h3>
              <button
                onClick={() => setShowSearch(false)}
                aria-label="Arama panelini kapat"
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Yemek ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg
                  text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingItems ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Yemek bulunamadı
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg
                      border border-slate-700/50 hover:border-blue-500/50 transition-all text-left
                      group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.default_gramaj}g · {item.calories} kcal
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

    {/* Detail Modal */}
    {showDetailModal && selectedItemId && (
      <MenuItemDetailModal
        itemId={selectedItemId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItemId(null);
        }}
      />
    )}
    </>
  );
}
