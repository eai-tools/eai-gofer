/**
 * TfIdfUtil - Shared TF-IDF keyword extraction and similarity utility.
 *
 * Extracted from ResearchChunker's keyword extraction to provide a unified
 * implementation for ContextBuilder (C3), KnowledgeGraph (H4), and MemoryManager.
 *
 * 019: Phase 1 — Foundation utility for rubric items C3 and H4.
 */

/**
 * Comprehensive stopword set (107 words) — superset of all project-internal lists.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it', 'its',
  'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'she',
  'him', 'her', 'his', 'i', 'me', 'my', 'not', 'no', 'nor', 'so', 'if',
  'then', 'else', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'which', 'who', 'what', 'any', 'about', 'into', 'over', 'after',
  'before', 'between',
]);

/**
 * Simple suffix stemmer — strips common English suffixes.
 * Not a full Porter stemmer, but sufficient for keyword matching.
 */
function stem(word: string): string {
  if (word.length <= 4) return word;
  // Order matters: longest suffixes first
  if (word.endsWith('ation')) return word.slice(0, -5);
  if (word.endsWith('tion')) return word.slice(0, -4);
  if (word.endsWith('sion')) return word.slice(0, -4);
  if (word.endsWith('ment')) return word.slice(0, -4);
  if (word.endsWith('ness')) return word.slice(0, -4);
  if (word.endsWith('able')) return word.slice(0, -4);
  if (word.endsWith('ible')) return word.slice(0, -4);
  if (word.endsWith('ting')) return word.slice(0, -3);
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ous')) return word.slice(0, -3);
  if (word.endsWith('ive')) return word.slice(0, -3);
  if (word.endsWith('ful')) return word.slice(0, -3);
  if (word.endsWith('ist')) return word.slice(0, -3);
  if (word.endsWith('est')) return word.slice(0, -3);
  if (word.endsWith('ity')) return word.slice(0, -3);
  if (word.endsWith('ly')) return word.slice(0, -2);
  if (word.endsWith('er')) return word.slice(0, -2);
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('al')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Tokenize text into stemmed, filtered tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

/**
 * Compute term frequencies for a token array.
 */
function termFrequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

/**
 * Extract keywords from text using TF-IDF-like scoring.
 *
 * When a corpus is provided, uses true IDF weighting (log(N/df)).
 * Without a corpus, falls back to term-frequency ranking.
 *
 * @param text - The text to extract keywords from
 * @param maxKeywords - Maximum number of keywords to return (default: 15)
 * @param corpusDocFreq - Optional document frequency map from buildCorpusDocFreq()
 * @param corpusSize - Number of documents in the corpus (required if corpusDocFreq provided)
 */
export function extractKeywords(
  text: string,
  maxKeywords: number = 15,
  corpusDocFreq?: Map<string, number>,
  corpusSize?: number,
): string[] {
  const tokens = tokenize(text);
  const tf = termFrequencies(tokens);

  const scored: Array<[string, number]> = [];
  for (const [term, count] of tf) {
    let score = count;
    if (corpusDocFreq && corpusSize && corpusSize > 0) {
      const df = corpusDocFreq.get(term) || 1;
      const idf = Math.log(corpusSize / df);
      score = count * idf;
    }
    scored.push([term, score]);
  }

  return scored
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([term]) => term);
}

/**
 * Build a document frequency map from a corpus of texts.
 * Returns a Map<term, number_of_documents_containing_term>.
 */
export function buildCorpusDocFreq(documents: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of documents) {
    const uniqueTerms = new Set(tokenize(doc));
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  return df;
}

/**
 * Compute similarity between two texts using TF-IDF cosine similarity.
 * Returns a score between 0 and 1.
 */
export function computeDocumentSimilarity(
  textA: string,
  textB: string,
  corpusDocFreq?: Map<string, number>,
  corpusSize?: number,
): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const tfA = termFrequencies(tokensA);
  const tfB = termFrequencies(tokensB);

  // Collect all terms
  const allTerms = new Set([...tfA.keys(), ...tfB.keys()]);
  if (allTerms.size === 0) return 0;

  // Build TF-IDF vectors
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const term of allTerms) {
    const rawA = tfA.get(term) || 0;
    const rawB = tfB.get(term) || 0;
    let idf = 1;
    if (corpusDocFreq && corpusSize && corpusSize > 0) {
      const df = corpusDocFreq.get(term) || 1;
      idf = Math.log(corpusSize / df);
    }
    const weightA = rawA * idf;
    const weightB = rawB * idf;
    dotProduct += weightA * weightB;
    magnitudeA += weightA * weightA;
    magnitudeB += weightB * weightB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Compute ranked similarities between a query and a corpus of documents.
 * Returns documents ranked by similarity (highest first).
 *
 * @param query - The query text
 * @param corpus - Array of {id, text} documents
 * @param minSimilarity - Minimum similarity threshold (default: 0.1)
 */
export function computeCorpusSimilarity(
  query: string,
  corpus: Array<{ id: string; text: string }>,
  minSimilarity: number = 0.1,
): Array<{ id: string; similarity: number }> {
  // Build corpus doc frequencies
  const allTexts = [query, ...corpus.map((d) => d.text)];
  const docFreq = buildCorpusDocFreq(allTexts);
  const corpusSize = allTexts.length;

  const results: Array<{ id: string; similarity: number }> = [];
  for (const doc of corpus) {
    const sim = computeDocumentSimilarity(query, doc.text, docFreq, corpusSize);
    if (sim >= minSimilarity) {
      results.push({ id: doc.id, similarity: sim });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
