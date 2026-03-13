/**
 * Sistema de Embeddings - Provider Agnóstico
 * 
 * Exporta todas as implementações de providers e factory
 */

// Types e Interfaces
export type {
  EmbeddingProvider,
  EmbeddingConfig,
  ProviderType,
  ProviderFactoryConfig,
} from './provider';

// Implementações
export {
  OpenRouterEmbeddingProvider,
  createOpenRouterProvider,
} from './openrouter-provider';

export {
  MockEmbeddingProvider,
  createMockProvider,
} from './mock-provider';

// Factory
export { createEmbeddingProvider, getDefaultProvider, checkProviderAvailability } from './factory';
