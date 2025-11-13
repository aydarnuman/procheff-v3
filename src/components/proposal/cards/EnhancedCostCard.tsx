'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';

interface CostItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface EnhancedCostCardProps {
  items: CostItem[];
  onChange?: (items: CostItem[]) => void;
}

export function EnhancedCostCard({ items: initialItems, onChange }: EnhancedCostCardProps) {
  const [items, setItems] = useState<CostItem[]>(initialItems);
  const [showFormula, setShowFormula] = useState(false);

  const addItem = () => {
    const newItem: CostItem = {
      id: Date.now().toString(),
      description: '',
      unit: 'Adet',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    const updated = [...items, newItem];
    setItems(updated);
    onChange?.(updated);
  };

  const updateItem = (id: string, field: keyof CostItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          newItem.total = newItem.quantity * newItem.unitPrice;
        }
        return newItem;
      }
      return item;
    });
    setItems(updated);
    onChange?.(updated);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    onChange?.(updated);
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg">Maliyet Hesaplama</h3>
          <p className="text-slate-400 text-sm">{items.length} kalem</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowFormula(!showFormula)}
            className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calculator className="w-4 h-4" />
            Formül
          </motion.button>
          <motion.button
            onClick={addItem}
            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Ekle
          </motion.button>
        </div>
      </div>

      {/* Formula Builder */}
      {showFormula && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4"
        >
          <p className="text-slate-300 text-sm font-mono">
            TOPLAM = Σ (Miktar × Birim Fiyat)
          </p>
        </motion.div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr className="text-slate-400 text-xs">
                <th className="text-left p-3">Açıklama</th>
                <th className="text-center p-3 w-24">Birim</th>
                <th className="text-center p-3 w-24">Miktar</th>
                <th className="text-right p-3 w-32">Birim Fiyat</th>
                <th className="text-right p-3 w-32">Toplam</th>
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t border-slate-800 hover:bg-slate-800/30"
                >
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Maliyet kalemi..."
                    />
                  </td>
                  <td className="p-2">
                    <label htmlFor={`unit-${item.id}`} className="sr-only">Birim</label>
                    <input
                      id={`unit-${item.id}`}
                      name={`unit-${item.id}`}
                      title="Birim"
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800 text-white text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-2">
                    <label htmlFor={`quantity-${item.id}`} className="sr-only">Miktar</label>
                    <input
                      id={`quantity-${item.id}`}
                      name={`quantity-${item.id}`}
                      title="Miktar"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-800 text-white text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-2">
                    <label htmlFor={`unitPrice-${item.id}`} className="sr-only">Birim Fiyat</label>
                    <input
                      id={`unitPrice-${item.id}`}
                      name={`unitPrice-${item.id}`}
                      title="Birim Fiyat"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-800 text-white text-right rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2 text-right text-white font-medium">
                    {item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </td>
                  <td className="p-2">
                    <motion.button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-800/50 border-t-2 border-indigo-500">
              <tr>
                <td colSpan={4} className="p-3 text-white font-semibold text-right">
                  GENEL TOPLAM:
                </td>
                <td className="p-3 text-right">
                  <span className="text-2xl font-bold text-green-400">
                    {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
