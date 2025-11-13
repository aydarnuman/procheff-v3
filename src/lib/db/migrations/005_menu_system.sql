-- Menu System Migration
-- ProCheff Menü Robotu Database Schema

-- Kategoriler (Çorbalar, Ana Yemekler, vs.)
CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  institution_type TEXT, -- 'all', 'hastane', 'universite', 'okul', 'resmi', 'ozel'
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Yemek Havuzu (Ana Tablo)
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category_id INTEGER,
  meal_type TEXT NOT NULL, -- 'sabah', 'ogle', 'aksam', 'ara'
  default_gramaj INTEGER NOT NULL, -- gram cinsinden
  unit_cost REAL NOT NULL, -- TL/kg
  calories INTEGER DEFAULT 0,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  season TEXT DEFAULT 'all', -- 'all', 'yaz', 'kis', 'ilkbahar', 'sonbahar'
  tags TEXT DEFAULT '[]', -- JSON array: ['glütensiz', 'vegan', 'diyet']
  institution_types TEXT DEFAULT '["all"]', -- JSON array
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

-- Reçeteler
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER UNIQUE,
  instructions TEXT, -- Tarif (adım adım)
  prep_time INTEGER DEFAULT 0, -- dakika
  cook_time INTEGER DEFAULT 0, -- dakika
  difficulty TEXT DEFAULT 'orta', -- 'kolay', 'orta', 'zor'
  serving_size INTEGER DEFAULT 1, -- kaç kişilik
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Reçete Malzemeleri
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER,
  ingredient_name TEXT NOT NULL,
  quantity REAL NOT NULL, -- 1 porsiyon için
  unit TEXT NOT NULL, -- 'g', 'kg', 'adet', 'ml', 'lt'
  cost_per_unit REAL DEFAULT 0, -- TL (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Kullanıcı Özel Menüleri
CREATE TABLE IF NOT EXISTS user_menus (
  id TEXT PRIMARY KEY, -- UUID
  user_id INTEGER,
  name TEXT NOT NULL,
  days INTEGER NOT NULL,
  institution_type TEXT NOT NULL,
  persons INTEGER NOT NULL,
  menu_data TEXT NOT NULL, -- JSON: günlük menü yapısı
  total_cost REAL DEFAULT 0,
  avg_calories INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Gramaj Standartları (Kurum Bazlı)
CREATE TABLE IF NOT EXISTS gramaj_standards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_type TEXT NOT NULL,
  meal_type TEXT NOT NULL, -- 'sabah', 'ogle', 'aksam'
  category TEXT NOT NULL, -- 'çorba', 'ana_yemek', 'pilav', 'salata', 'tatlı'
  min_gramaj INTEGER,
  max_gramaj INTEGER,
  recommended_gramaj INTEGER NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_meal_type ON menu_items(meal_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_menus_user ON user_menus(user_id);
CREATE INDEX IF NOT EXISTS idx_gramaj_standards_type ON gramaj_standards(institution_type, meal_type);
