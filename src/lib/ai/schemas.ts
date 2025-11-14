/**
 * AI Structured Output Schemas
 * JSON Schema definitions for Anthropic Claude API structured outputs
 * 
 * These schemas guarantee valid JSON responses from Claude API
 * and eliminate the need for manual JSON parsing/cleaning.
 * 
 * @see https://docs.anthropic.com/claude/docs/structured-outputs
 */

/**
 * Cost Analysis Response Schema
 * Used for /api/ai/cost-analysis endpoint
 */
export const COST_ANALYSIS_SCHEMA = {
  name: "cost_analysis",
  schema: {
    type: "object",
    properties: {
      gunluk_kisi_maliyeti: {
        type: "string",
        description: "Günlük kişi başı maliyet (TL formatında, örn: '45.50 TL')"
      },
      tahmini_toplam_gider: {
        type: "string",
        description: "Tahmini toplam gider (TL formatında, örn: '125000 TL')"
      },
      onerilen_karlilik_orani: {
        type: "string",
        pattern: "^%\\d+(\\.\\d+)?$",
        description: "Önerilen karlılık oranı (örn: '%15.5')"
      },
      riskli_kalemler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Fiyat volatilitesi yüksek riskli kalemler listesi"
      },
      maliyet_dagilimi: {
        type: "object",
        properties: {
          hammadde: {
            type: "string",
            description: "Hammadde maliyeti yüzdesi (örn: '%45')"
          },
          iscilik: {
            type: "string",
            description: "İşçilik maliyeti yüzdesi (örn: '%30')"
          },
          genel_giderler: {
            type: "string",
            description: "Genel giderler yüzdesi (örn: '%15')"
          },
          kar: {
            type: "string",
            description: "Kar marjı yüzdesi (örn: '%10')"
          }
        },
        required: ["hammadde", "iscilik", "genel_giderler", "kar"],
        additionalProperties: false
      },
      optimizasyon_onerileri: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Maliyet optimizasyon önerileri listesi"
      }
    },
    required: [
      "gunluk_kisi_maliyeti",
      "tahmini_toplam_gider",
      "onerilen_karlilik_orani"
    ],
    additionalProperties: false
  }
} as const;

/**
 * Decision Analysis Response Schema
 * Used for /api/ai/decision endpoint
 */
export const DECISION_ANALYSIS_SCHEMA = {
  name: "decision_analysis",
  schema: {
    type: "object",
    properties: {
      karar: {
        type: "string",
        enum: ["Katıl", "Katılma", "Dikkatli Katıl"],
        description: "Teklif kararı"
      },
      risk_orani: {
        type: "string",
        pattern: "^%\\d+(\\.\\d+)?$",
        description: "Risk oranı (örn: '%25.5')"
      },
      tahmini_kar_orani: {
        type: "string",
        pattern: "^%\\d+(\\.\\d+)?$",
        description: "Tahmini kar oranı (örn: '%12.3')"
      },
      gerekce: {
        type: "string",
        description: "Kararın gerekçesi (detaylı açıklama)"
      },
      kritik_noktalar: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Dikkat edilmesi gereken kritik noktalar"
      },
      oneriler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Stratejik öneriler"
      }
    },
    required: ["karar", "risk_orani", "tahmini_kar_orani", "gerekce"],
    additionalProperties: false
  }
} as const;

/**
 * Deep Analysis Response Schema
 * Used for /api/ai/deep-analysis endpoint
 */
export const DEEP_ANALYSIS_SCHEMA = {
  name: "deep_analysis",
  schema: {
    type: "object",
    properties: {
      kurum: {
        type: "string",
        description: "İhale yapan kurum adı"
      },
      ihale_turu: {
        type: "string",
        description: "İhale türü"
      },
      analiz_ozeti: {
        type: "string",
        description: "Genel analiz özeti"
      },
      yasal_gereklilikler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Yasal gereklilikler listesi"
      },
      teknik_sartnameler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Teknik şartnameler özeti"
      },
      butce_analizi: {
        type: "object",
        properties: {
          toplam_butce: {
            type: "string",
            description: "Toplam bütçe (TL)"
          },
          uygunluk: {
            type: "string",
            enum: ["Uygun", "Dikkatli", "Riskli"],
            description: "Bütçe uygunluk durumu"
          },
          aciklama: {
            type: "string",
            description: "Bütçe analizi açıklaması"
          }
        },
        required: ["toplam_butce", "uygunluk"]
      },
      risk_degerlendirmesi: {
        type: "object",
        properties: {
          genel_risk: {
            type: "string",
            enum: ["Düşük", "Orta", "Yüksek"],
            description: "Genel risk seviyesi"
          },
          risk_faktorleri: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Risk faktörleri listesi"
          }
        },
        required: ["genel_risk"]
      },
      oneriler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Stratejik öneriler"
      }
    },
    required: ["kurum", "ihale_turu", "analiz_ozeti"],
    additionalProperties: false
  }
} as const;

/**
 * İhale Analysis Response Schema
 * Used for /api/ihale/upload endpoint
 */
export const IHALE_ANALYSIS_SCHEMA = {
  name: "ihale_analysis",
  schema: {
    type: "object",
    properties: {
      kurum: {
        type: "string",
        description: "İhale yapan kurum/kuruluş adı"
      },
      ihale_turu: {
        type: "string",
        description: "İhale türü açıklaması (yemek hizmeti, temizlik, danışmanlık vb.)"
      },
      tahmini_bedel: {
        type: ["string", "null"],
        description: "Tahmini bedel (TL formatında, örn: '125000 TL')"
      },
      butce: {
        type: ["string", "null"],
        description: "Bütçe (TL formatında)"
      },
      kisilik: {
        type: ["string", "null"],
        description: "Kişi sayısı veya ölçek"
      },
      sure: {
        type: ["string", "null"],
        description: "Hizmet süresi (örn: '12 ay', '2 yıl')"
      },
      ilan_tarihi: {
        type: ["string", "null"],
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "İlan tarihi (YYYY-MM-DD formatında)"
      },
      teklif_tarihi: {
        type: ["string", "null"],
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Teklif tarihi (YYYY-MM-DD formatında)"
      },
      ihale_tarihi: {
        type: ["string", "null"],
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "İhale tarihi (YYYY-MM-DD formatında)"
      },
      sartname_ozeti: {
        type: ["string", "null"],
        description: "Ana şartname maddelerinin özeti"
      },
      onemli_maddeler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Önemli şartname maddeleri listesi"
      },
      iletisim: {
        type: ["object", "null"],
        properties: {
          telefon: {
            type: ["string", "null"],
            description: "Telefon numarası"
          },
          email: {
            type: ["string", "null"],
            description: "E-posta adresi"
          },
          adres: {
            type: ["string", "null"],
            description: "Adres bilgisi"
          }
        },
        additionalProperties: false
      },
      gereksinimler: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Gereksinimler listesi"
      },
      dokuman_turu: {
        type: ["string", "null"],
        description: "Doküman türü (İhale İlanı, Şartname, Ön Yeterlik vb.)"
      },
      guven_skoru: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Veri çıkarma güven skoru (0-1 arası)"
      }
    },
    required: ["kurum", "ihale_turu"],
    additionalProperties: false
  }
} as const;

/**
 * Menu Robot Response Schema
 * Used for menu parsing from documents
 */
export const MENU_ROBOT_SCHEMA = {
  name: "menu_robot",
  schema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        yemek_adi: {
          type: "string",
          description: "Yemek adı"
        },
        gramaj: {
          type: "number",
          description: "Gramaj (gram cinsinden)"
        },
        kisi: {
          type: "number",
          description: "Kişi sayısı"
        },
        ogun: {
          type: "string",
          enum: ["sabah", "öğle", "akşam", "ara öğün"],
          description: "Öğün bilgisi"
        },
        kategori: {
          type: "string",
          description: "Yemek kategorisi (opsiyonel)"
        }
      },
      required: ["yemek_adi", "gramaj"],
      additionalProperties: false
    }
  }
} as const;

/**
 * Type definitions for TypeScript type safety
 */
export type CostAnalysisResponse = {
  gunluk_kisi_maliyeti: string;
  tahmini_toplam_gider: string;
  onerilen_karlilik_orani: string;
  riskli_kalemler?: string[];
  maliyet_dagilimi?: {
    hammadde: string;
    iscilik: string;
    genel_giderler: string;
    kar: string;
  };
  optimizasyon_onerileri?: string[];
};

export type DecisionAnalysisResponse = {
  karar: "Katıl" | "Katılma" | "Dikkatli Katıl";
  risk_orani: string;
  tahmini_kar_orani: string;
  gerekce: string;
  kritik_noktalar?: string[];
  oneriler?: string[];
};

export type DeepAnalysisResponse = {
  kurum: string;
  ihale_turu: string;
  analiz_ozeti: string;
  yasal_gereklilikler?: string[];
  teknik_sartnameler?: string[];
  butce_analizi?: {
    toplam_butce: string;
    uygunluk: "Uygun" | "Dikkatli" | "Riskli";
    aciklama?: string;
  };
  risk_degerlendirmesi?: {
    genel_risk: "Düşük" | "Orta" | "Yüksek";
    risk_faktorleri?: string[];
  };
  oneriler?: string[];
};

export type IhaleAnalysisResponse = {
  kurum: string;
  ihale_turu: string;
  tahmini_bedel?: string | null;
  butce?: string | null;
  kisilik?: string | null;
  sure?: string | null;
  ilan_tarihi?: string | null;
  teklif_tarihi?: string | null;
  ihale_tarihi?: string | null;
  sartname_ozeti?: string | null;
  onemli_maddeler?: string[];
  iletisim?: {
    telefon?: string | null;
    email?: string | null;
    adres?: string | null;
  } | null;
  gereksinimler?: string[];
  dokuman_turu?: string | null;
  guven_skoru: number;
};

export type MenuItemResponse = {
  yemek_adi: string;
  gramaj: number;
  kisi?: number;
  ogun?: "sabah" | "öğle" | "akşam" | "ara öğün";
  kategori?: string;
};

/**
 * Menu Parser Schema
 * For parsing menu files (CSV, TXT, Excel)
 */
export const MENU_PARSER_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      yemek_adi: {
        type: "string",
        description: "Yemek adı (örn: Tavuk Sote)"
      },
      kategori: {
        type: "string",
        description: "Yemek kategorisi (Ana Yemek, Çorba, Salata, vb.)"
      },
      porsiyon: {
        type: "string",
        description: "Porsiyon bilgisi (varsa)"
      },
      gramaj: {
        type: "number",
        description: "Gramaj/miktar bilgisi (gram cinsinden)"
      },
      ogun: {
        type: "string",
        enum: ["Kahvaltı", "Öğle", "Akşam", "Ara Öğün"] as any,
        description: "Öğün bilgisi"
      }
    },
    required: ["yemek_adi", "kategori"],
    additionalProperties: true
  }
} as any;

/**
 * Schema registry for easy access
 */
export const AI_SCHEMAS = {
  cost_analysis: COST_ANALYSIS_SCHEMA,
  decision_analysis: DECISION_ANALYSIS_SCHEMA,
  deep_analysis: DEEP_ANALYSIS_SCHEMA,
  menu_robot: MENU_ROBOT_SCHEMA,
  ihale_analysis: IHALE_ANALYSIS_SCHEMA,
  menu_parser: MENU_PARSER_SCHEMA,
} as const;

export type SchemaName = keyof typeof AI_SCHEMAS;

