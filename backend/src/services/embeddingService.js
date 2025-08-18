const crypto = require('crypto');
const fetch = require('node-fetch');
const logger = require('../utils/logger');

class EmbeddingService {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    this.dim = parseInt(process.env.EMBEDDING_DIM || '0', 10); // 0 means infer from model
    this.cache = new Map(); // simple in-memory cache text->vector
    this.maxCache = 500;
  }

  async generate(text = '') {
    if (!text) return [];
    const key = text.slice(0,1024); // cache key truncated
    if (this.cache.has(key)) return this.cache.get(key);
    try {
      const body = { model: this.model, prompt: text.substring(0, 8000) };
      const res = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: 45000
      });
      if (!res.ok) {
        throw new Error(`Embedding API error ${res.status}`);
      }
      const data = await res.json();
      if (!data.embedding || !Array.isArray(data.embedding)) throw new Error('Malformed embedding response');
      const vector = data.embedding.map(v => Number(v));
      if (this.dim === 0) this.dim = vector.length;
      this._remember(key, vector);
      return vector;
    } catch (err) {
      logger.error(`Ollama embedding failed for text (${err.message}). No fallback - returning empty embedding.`);
      // Return empty array instead of weak hash fallback
      // Documents without proper embeddings should be queued for re-embedding
      return [];
    }
  }

  _remember(key, vector) {
    this.cache.set(key, vector);
    if (this.cache.size > this.maxCache) {
      // simple eviction: delete first key
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
  }

  cosine(a, b) {
    if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }
}

module.exports = new EmbeddingService();
