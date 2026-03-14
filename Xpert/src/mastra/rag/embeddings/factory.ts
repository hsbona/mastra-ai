/**
 * Factory para criar providers de embedding
 * 
 * Permite configurar o provider via variável de ambiente:
 * - EMBEDDING_PROVIDER=openrouter (padrão)
 * - EMBEDDING_PROVIDER=mock
 * 
 * Ou via código:
 * const provider = createEmbeddingProvider({ type: 'openrouter' });
 */

import {
  EmbeddingProvider,
  EmbeddingConfig,
  ProviderType,
  ProviderFactoryConfig,
} from './provider';
import { createOpenRouterProvider } from './openrouter-provider';
import { createMockProvider } from './mock-provider';

/**
 * Cria um provider de embedding baseado na configuração
 */
export function createEmbeddingProvider(
  config?: ProviderFactoryConfig
): EmbeddingProvider {
  const providerType = config?.type || 
    (process.env.EMBEDDING_PROVIDER as ProviderType) || 
    'openrouter';

  switch (providerType) {
    case 'openrouter': {
      // Só passar propriedades definidas (evita sobrescrever defaults com undefined)
      const orConfig: Partial<EmbeddingConfig> = {};
      if (config?.model) orConfig.model = config.model;
      if (config?.dimensions) orConfig.dimensions = config.dimensions;
      return createOpenRouterProvider(orConfig);
    }

    case 'mock': {
      // Só passar propriedades definidas (evita sobrescrever defaults com undefined)
      const mockConfig: Partial<EmbeddingConfig> = {};
      if (config?.dimensions) mockConfig.dimensions = config.dimensions;
      return createMockProvider(mockConfig);
    }

    default:
      throw new Error(`Provider de embedding não suportado: ${providerType}`);
  }
}

/**
 * Retorna o provider padrão
 * 
 * Tenta usar OpenRouter, mas se não houver API key, usa mock
 * Pode ser sobrescrito via EMBEDDING_PROVIDER env var
 */
export function getDefaultProvider(): EmbeddingProvider {
  const explicitProvider = process.env.EMBEDDING_PROVIDER as ProviderType;
  
  // Se usuário explicitou um provider, usa ele
  if (explicitProvider) {
    return createEmbeddingProvider({ type: explicitProvider });
  }
  
  // Se não há API key do OpenRouter, usa mock
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[EmbeddingProvider] OPENROUTER_API_KEY não encontrada. Usando mock provider para testes.');
    return createMockProvider();
  }
  
  // Usa OpenRouter como padrão
  return createEmbeddingProvider({ type: 'openrouter' });
}

/**
 * Verifica se um provider está disponível
 */
export async function checkProviderAvailability(
  providerType: ProviderType
): Promise<boolean> {
  try {
    const provider = createEmbeddingProvider({ type: providerType });
    return await provider.healthCheck();
  } catch {
    return false;
  }
}
