/**
 * Fuzzy Matcher
 * Product matching using Levenshtein distance and TF-IDF scoring
 */

export interface MatchCandidate {
  id: string;
  name: string;
  normalizedName: string;
  category?: string;
  brand?: string;
  metadata?: any;
}

export interface MatchResult {
  candidate: MatchCandidate;
  score: number;
  method: 'exact' | 'levenshtein' | 'tfidf' | 'soundex' | 'combined';
  confidence: number;
  reasons: string[];
}

export interface FuzzyMatchOptions {
  threshold?: number;
  maxResults?: number;
  methods?: Array<'exact' | 'levenshtein' | 'tfidf' | 'soundex'>;
  boostExactMatch?: boolean;
  considerBrand?: boolean;
  considerCategory?: boolean;
}

export class FuzzyMatcher {
  private static readonly DEFAULT_OPTIONS: FuzzyMatchOptions = {
    threshold: 0.7,
    maxResults: 5,
    methods: ['exact', 'levenshtein', 'tfidf'],
    boostExactMatch: true,
    considerBrand: true,
    considerCategory: true
  };
  
  // Turkish-specific character mappings
  private static readonly CHAR_MAPPINGS: { [key: string]: string } = {
    'ı': 'i', 'İ': 'i',
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c'
  };
  
  // Common abbreviations and variations
  private static readonly ABBREVIATIONS: { [key: string]: string[] } = {
    'kg': ['kilogram', 'kilo'],
    'g': ['gram', 'gr'],
    'lt': ['litre', 'l'],
    'ml': ['mililitre'],
    'pkt': ['paket'],
    'krmz': ['kırmızı', 'kirmizi'],
    'ysl': ['yeşil', 'yesil'],
    'byk': ['büyük', 'buyuk'],
    'kck': ['küçük', 'kucuk']
  };
  
  /**
   * Find best matches for a query
   */
  static findBestMatches(
    query: string,
    candidates: MatchCandidate[],
    options: FuzzyMatchOptions = {}
  ): MatchResult[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const normalizedQuery = this.normalizeString(query);
    const queryTokens = this.tokenize(normalizedQuery);
    
    const results: MatchResult[] = [];
    
    for (const candidate of candidates) {
      const scores: Array<{ method: MatchResult['method']; score: number; reason: string }> = [];
      
      // Try each matching method
      if (opts.methods?.includes('exact')) {
        const exactScore = this.exactMatch(normalizedQuery, candidate.normalizedName);
        if (exactScore > 0) {
          scores.push({ method: 'exact', score: exactScore, reason: 'Tam eşleşme' });
        }
      }
      
      if (opts.methods?.includes('levenshtein')) {
        const levScore = this.levenshteinMatch(normalizedQuery, candidate.normalizedName);
        scores.push({ 
          method: 'levenshtein', 
          score: levScore, 
          reason: `Benzerlik: %${(levScore * 100).toFixed(0)}` 
        });
      }
      
      if (opts.methods?.includes('tfidf')) {
        const tfidfScore = this.tfidfMatch(queryTokens, this.tokenize(candidate.normalizedName));
        scores.push({ 
          method: 'tfidf', 
          score: tfidfScore, 
          reason: `Kelime eşleşmesi: %${(tfidfScore * 100).toFixed(0)}` 
        });
      }
      
      if (opts.methods?.includes('soundex')) {
        const soundexScore = this.soundexMatch(normalizedQuery, candidate.normalizedName);
        if (soundexScore > 0) {
          scores.push({ 
            method: 'soundex', 
            score: soundexScore, 
            reason: 'Ses benzerliği' 
          });
        }
      }
      
      // Get best score
      const bestScore = scores.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      // Apply modifiers
      let finalScore = bestScore.score;
      const reasons = [bestScore.reason];
      
      // Boost for brand match
      if (opts.considerBrand && candidate.brand && query.toLowerCase().includes(candidate.brand.toLowerCase())) {
        finalScore *= 1.2;
        reasons.push('Marka eşleşmesi');
      }
      
      // Boost for category match
      if (opts.considerCategory && candidate.category) {
        const categoryBoost = this.getCategoryBoost(query, candidate.category);
        if (categoryBoost > 0) {
          finalScore *= (1 + categoryBoost);
          reasons.push('Kategori uyumu');
        }
      }
      
      // Cap at 1.0
      finalScore = Math.min(finalScore, 1.0);
      
      if (finalScore >= opts.threshold!) {
        results.push({
          candidate,
          score: finalScore,
          method: bestScore.method,
          confidence: this.calculateConfidence(finalScore, bestScore.method),
          reasons
        });
      }
    }
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxResults);
  }
  
  /**
   * Normalize string for matching
   */
  static normalizeString(str: string): string {
    let normalized = str.toLowerCase().trim();
    
    // Replace Turkish characters
    for (const [char, replacement] of Object.entries(this.CHAR_MAPPINGS)) {
      normalized = normalized.replace(new RegExp(char, 'g'), replacement);
    }
    
    // Expand abbreviations
    for (const [abbr, expansions] of Object.entries(this.ABBREVIATIONS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      normalized = normalized.replace(regex, expansions[0]);
    }
    
    // Remove special characters but keep spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');
    
    // Remove extra spaces
    return normalized.replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Tokenize string
   */
  private static tokenize(str: string): string[] {
    return str.split(/\s+/).filter(token => token.length > 1);
  }
  
  /**
   * Exact match
   */
  private static exactMatch(query: string, candidate: string): number {
    return query === candidate ? 1.0 : 0;
  }
  
  /**
   * Levenshtein distance match
   */
  private static levenshteinMatch(query: string, candidate: string): number {
    const distance = this.levenshteinDistance(query, candidate);
    const maxLength = Math.max(query.length, candidate.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }
  
  /**
   * Calculate Levenshtein distance
   */
  private static levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    
    if (m === 0) return n;
    if (n === 0) return m;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= m; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= n; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deletion
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    
    return matrix[m][n];
  }
  
  /**
   * TF-IDF match
   */
  private static tfidfMatch(queryTokens: string[], candidateTokens: string[]): number {
    if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
    
    const querySet = new Set(queryTokens);
    const candidateSet = new Set(candidateTokens);
    
    // Calculate intersection
    const intersection = new Set([...querySet].filter(x => candidateSet.has(x)));
    
    // Jaccard similarity
    const union = new Set([...querySet, ...candidateSet]);
    const jaccard = intersection.size / union.size;
    
    // Token coverage
    const queryCoverage = intersection.size / querySet.size;
    const candidateCoverage = intersection.size / candidateSet.size;
    
    // Combined score
    return (jaccard + queryCoverage + candidateCoverage) / 3;
  }
  
  /**
   * Soundex match for phonetic similarity
   */
  private static soundexMatch(query: string, candidate: string): number {
    const querySoundex = this.soundex(query);
    const candidateSoundex = this.soundex(candidate);
    
    return querySoundex === candidateSoundex ? 0.8 : 0;
  }
  
  /**
   * Soundex algorithm for Turkish
   */
  private static soundex(str: string): string {
    const normalized = this.normalizeString(str).toUpperCase();
    if (normalized.length === 0) return '0000';
    
    const soundexMap: { [key: string]: string } = {
      'B': '1', 'F': '1', 'P': '1', 'V': '1',
      'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
      'D': '3', 'T': '3',
      'L': '4',
      'M': '5', 'N': '5',
      'R': '6'
    };
    
    let soundex = normalized[0];
    let previousCode = soundexMap[normalized[0]] || '0';
    
    for (let i = 1; i < normalized.length && soundex.length < 4; i++) {
      const code = soundexMap[normalized[i]] || '0';
      
      if (code !== '0' && code !== previousCode) {
        soundex += code;
        previousCode = code;
      }
    }
    
    return soundex.padEnd(4, '0');
  }
  
  /**
   * Get category boost
   */
  private static getCategoryBoost(query: string, category: string): number {
    const categoryKeywords: { [key: string]: string[] } = {
      'Bakliyat': ['mercimek', 'nohut', 'fasulye', 'bulgur', 'pirinç'],
      'Süt Ürünleri': ['süt', 'yoğurt', 'ayran', 'peynir', 'tereyağı'],
      'Et': ['et', 'kıyma', 'tavuk', 'balık', 'sucuk', 'salam'],
      'Sebze': ['domates', 'patates', 'soğan', 'biber', 'salatalık'],
      'Meyve': ['elma', 'portakal', 'muz', 'çilek', 'karpuz']
    };
    
    const keywords = categoryKeywords[category] || [];
    const lowerQuery = query.toLowerCase();
    
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        return 0.1; // 10% boost
      }
    }
    
    return 0;
  }
  
  /**
   * Calculate confidence based on score and method
   */
  private static calculateConfidence(score: number, method: MatchResult['method']): number {
    const methodWeights = {
      'exact': 1.0,
      'levenshtein': 0.9,
      'tfidf': 0.8,
      'soundex': 0.7,
      'combined': 0.85
    };
    
    return score * (methodWeights[method] || 0.5);
  }
  
  /**
   * Find single best match
   */
  static findBestMatch(
    query: string,
    candidates: MatchCandidate[],
    options?: FuzzyMatchOptions
  ): MatchResult | null {
    const matches = this.findBestMatches(query, candidates, options);
    return matches.length > 0 ? matches[0] : null;
  }
}
