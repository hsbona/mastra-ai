/**
 * Interface abstrata para provedores de embeddings
 * 
 * Permite trocar o provedor (OpenRouter, OpenAI, Cohere, etc.)
 * sem modificar o código do pipeline RAG.
 */

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batchSize: number;
  maxTokens?: number;
}

export interface EmbeddingProvider {
  /** Configuração do provider */
  readonly config: EmbeddingConfig;

  /**
   * Gera embeddings para múltiplos textos
   * @param texts - Array de textos
   * @returns Array de vetores de embedding
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Gera embedding para um único texto
   * @param text - Texto
   * @returns Vetor de embedding
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Verifica se o provider está configurado corretamente
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Factory para criar providers baseado em configuração
 */
export type ProviderType = 'openrouter' | 'openai' | 'cohere' | 'mock';

export interface ProviderFactoryConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
}
