/**
 * Provedor de Embeddings - OpenRouter
 * 
 * OpenRouter é um gateway unificado que permite acessar múltiplos
 * provedores de embeddings através de uma única API OpenAI-compatible.
 * 
 * Documentação: https://openrouter.ai/docs/api-reference/embeddings
 */

import { EmbeddingProvider, EmbeddingConfig } from './provider';

// Configuração padrão do OpenRouter
const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'openai/text-embedding-3-small',
  dimensions: 1536,
  batchSize: 100,  // OpenRouter suporta batches grandes
  maxTokens: 8191,
};

// Endpoint da API OpenRouter
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings';

export class OpenRouterEmbeddingProvider implements EmbeddingProvider {
  readonly config: EmbeddingConfig;
  private apiKey: string | undefined;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  /**
   * Gera embeddings em batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    const allEmbeddings: number[][] = [];

    // Processar em batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://xpertia.local', // Requerido pelo OpenRouter
          'X-Title': 'XpertIA RAG System', // Requerido pelo OpenRouter
        },
        body: JSON.stringify({
          model: this.config.model,
          input: batch,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter Embedding API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
      };

      const batchEmbeddings = data.data.map(d => d.embedding);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Gera embedding único (para queries)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xpertia.local',
        'X-Title': 'XpertIA RAG System',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter Embedding API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data[0].embedding;
  }

  /**
   * Verifica se a API key está configurada e válida
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('[OpenRouterProvider] OPENROUTER_API_KEY não configurada');
        return false;
      }

      // Testar com embedding simples
      await this.generateEmbedding('test');
      return true;
    } catch (error) {
      console.error('[OpenRouterProvider] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function para criar provider OpenRouter
 */
export function createOpenRouterProvider(config?: Partial<EmbeddingConfig>): OpenRouterEmbeddingProvider {
  return new OpenRouterEmbeddingProvider(config);
}
