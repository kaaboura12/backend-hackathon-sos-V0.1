import { Injectable } from '@nestjs/common';
import * as natural from 'natural';

export interface UrgencyAnalysisResult {
  isCritical: boolean;
  matchedWords: string[];
}

/** French stemmer for reducing words to roots (e.g. violence -> viol) */
const stemmer = natural.PorterStemmerFr;

/** Tokenizer that splits on non-word chars, keeps French letters (à, é, ç, etc.) */
const tokenizer = new natural.AggressiveTokenizerFr();

/** Critical French roots: stemmed forms that indicate urgent/critical content */
const CRITICAL_ROOTS = [
  'sang',
  'frap',
  'violenc',
  'abus',
  'suicid',
  'arm',
  'dang',
  'urg',
  'peur',
  'mal',
  'mort',
  'battu',
] as const;

@Injectable()
export class AiService {
  /**
   * Analyzes a report description for critical keywords using French NLP.
   * Tokenizes text, stems each word, and checks for matches against critical roots.
   * Used for détection de mots-clés critiques (cahier de charge).
   */
  analyzeUrgency(description: string): UrgencyAnalysisResult {
    if (!description || typeof description !== 'string') {
      return { isCritical: false, matchedWords: [] };
    }

    const normalized = description.trim().toLowerCase();
    if (normalized.length === 0) {
      return { isCritical: false, matchedWords: [] };
    }

    const tokens = tokenizer.tokenize(normalized);
    const matchedWords: string[] = [];
    const seen = new Set<string>();

    for (const word of tokens) {
      if (word.length < 2) continue;

      const stem = stemmer.stem(word);
      const isMatch = CRITICAL_ROOTS.some(
        (root) =>
          stem === root ||
          stem.startsWith(root) ||
          root.startsWith(stem),
      );

      if (isMatch && !seen.has(word)) {
        seen.add(word);
        matchedWords.push(word);
      }
    }

    return {
      isCritical: matchedWords.length > 0,
      matchedWords: [...matchedWords],
    };
  }
}
