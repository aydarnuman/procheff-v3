import { ReportTemplate } from "./service";

export const defaultTemplates: ReportTemplate[] = [
  {
    name: "İhale Analiz Raporu",
    description: "Detaylı ihale analiz raporu - maliyet, risk ve karar önerileri",
    type: "analysis",
    sections: ["summary", "menu", "costs", "risks", "decision", "recommendations"],
    filters: {
      includeCharts: true,
      includeDetails: true,
    },
    format: "pdf",
  },
  {
    name: "Maliyet Özet Raporu",
    description: "Hızlı maliyet özeti ve kar marjı analizi",
    type: "summary",
    sections: ["costs", "profit_margins", "comparisons"],
    filters: {
      compareWithMarket: true,
    },
    format: "excel",
  },
  {
    name: "Aylık Performans Raporu",
    description: "Aylık ihale performans ve başarı oranları",
    type: "detailed",
    sections: ["monthly_stats", "win_rate", "profit_analysis", "trends"],
    filters: {
      period: "monthly",
    },
    format: "pdf",
  },
  {
    name: "Risk Değerlendirme Raporu",
    description: "Detaylı risk analizi ve mitigation önerileri",
    type: "analysis",
    sections: ["risk_assessment", "risk_matrix", "mitigation_strategies"],
    filters: {
      riskThreshold: "medium",
    },
    format: "pdf",
  },
  {
    name: "Menü Karşılaştırma Raporu",
    description: "Menü kalemleri ve piyasa fiyat karşılaştırması",
    type: "detailed",
    sections: ["menu_items", "market_prices", "price_variations"],
    filters: {
      includeAlternatives: true,
    },
    format: "excel",
  },
];

export const reportSections = {
  summary: {
    name: "Özet",
    description: "Genel özet ve ana bulgular",
    required: ["tender_info", "key_metrics"],
  },
  menu: {
    name: "Menü Analizi",
    description: "Menü kalemleri ve porsiyon detayları",
    required: ["menu_items", "portions", "categories"],
  },
  costs: {
    name: "Maliyet Analizi",
    description: "Detaylı maliyet hesaplaması",
    required: ["item_costs", "total_cost", "cost_breakdown"],
  },
  risks: {
    name: "Risk Değerlendirmesi",
    description: "Risk faktörleri ve değerlendirme",
    required: ["risk_factors", "risk_score", "risk_level"],
  },
  decision: {
    name: "Karar Önerisi",
    description: "AI tabanlı karar ve öneriler",
    required: ["decision", "confidence_score", "reasoning"],
  },
  recommendations: {
    name: "Öneriler",
    description: "İyileştirme ve optimizasyon önerileri",
    required: ["suggestions", "optimizations"],
  },
  monthly_stats: {
    name: "Aylık İstatistikler",
    description: "Aylık performans metrikleri",
    required: ["tender_count", "win_rate", "total_revenue"],
  },
  profit_margins: {
    name: "Kar Marjları",
    description: "Kar marjı analizi ve projeksiyonlar",
    required: ["gross_margin", "net_margin", "projections"],
  },
  market_prices: {
    name: "Piyasa Fiyatları",
    description: "Güncel piyasa fiyat analizi",
    required: ["price_data", "market_averages", "trends"],
  },
  risk_matrix: {
    name: "Risk Matrisi",
    description: "Risk olasılık ve etki matrisi",
    required: ["matrix_data", "risk_categories"],
  },
};

export const formatOptions = {
  pdf: {
    name: "PDF",
    extension: ".pdf",
    mimeType: "application/pdf",
    icon: "📄",
    supportsCharts: true,
    supportsImages: true,
  },
  excel: {
    name: "Excel",
    extension: ".xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    icon: "📊",
    supportsCharts: true,
    supportsImages: false,
  },
  csv: {
    name: "CSV",
    extension: ".csv",
    mimeType: "text/csv",
    icon: "📑",
    supportsCharts: false,
    supportsImages: false,
  },
  html: {
    name: "HTML",
    extension: ".html",
    mimeType: "text/html",
    icon: "🌐",
    supportsCharts: true,
    supportsImages: true,
  },
};

export function validateTemplate(template: Partial<ReportTemplate>): string[] {
  const errors: string[] = [];

  if (!template.name || template.name.trim() === "") {
    errors.push("Template name is required");
  }

  if (!template.type) {
    errors.push("Template type is required");
  }

  if (!template.sections || template.sections.length === 0) {
    errors.push("At least one section must be selected");
  }

  if (!template.format) {
    errors.push("Report format is required");
  }

  if (template.recipients && template.recipients.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = template.recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      errors.push(`Invalid email addresses: ${invalidEmails.join(", ")}`);
    }
  }

  return errors;
}

export function getSectionRequirements(sectionKey: string): string[] {
  const section = reportSections[sectionKey as keyof typeof reportSections];
  return section?.required || [];
}

export function getTemplateVariables(template: ReportTemplate): string[] {
  const variables = new Set<string>();

  // Extract variables from sections
  template.sections.forEach(section => {
    const requirements = getSectionRequirements(section);
    requirements.forEach(req => variables.add(req));
  });

  // Add common variables
  variables.add("tender_name");
  variables.add("tender_date");
  variables.add("organization");
  variables.add("generated_date");
  variables.add("generated_by");

  return Array.from(variables);
}