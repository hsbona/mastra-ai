/**
 * Provedor de Embeddings - Mock
 * 
 * Gera embeddings determinísticos para testes e desenvolvimento.
 * Útil quando não há API key disponível ou para testar o pipeline RAG.
 */

import { EmbeddingProvider, EmbeddingConfig } from './provider';

// Configuração padrão do mock
const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'mock-embedding',
  dimensions: 1024,
  batchSize: 100,
  maxTokens: 8192,
};

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly config: EmbeddingConfig;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gera embeddings determinísticos baseados no hash do texto
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.generateDeterministicEmbedding(text));
  }

  /**
   * Gera embedding determinístico único
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.generateDeterministicEmbedding(text);
  }

  /**
   * Gera embedding determinístico baseado no hash do texto
   * Mesmo texto sempre gera mesmo embedding
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const embedding: number[] = [];
    const seed = this.hashCode(text);
    
    // Gerador de números pseudo-aleatórios baseado no seed
    for (let i = 0; i < this.config.dimensions; i++) {
      const value = this.seededRandom(seed + i);
      embedding.push(value);
    }
    
    // Normalizar para vetor unitário
    return this.normalize(embedding);
  }

  /**
   * Função hash simples
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32bit inteiro
    }
    return Math.abs(hash);
  }

  /**
   * Gerador de números pseudo-aleatórios com seed
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Normaliza vetor para magnitude 1
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Sempre saudável (não depende de API externa)
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

/**
 * Factory function para criar provider mock
 */
export function createMockProvider(config?: Partial<EmbeddingConfig>): MockEmbeddingProvider {
  return new MockEmbeddingProvider(config);
}
