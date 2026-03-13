/**
 * Model Configuration - Context Window Management
 * Centraliza configurações de modelos e limites de contexto
 */

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  // Porcentagem do contexto que pode ser usada para o documento
  // O restante é reservado para instructions, system prompts, etc.
  safeDocumentRatio: number;
  // Tokens reservados para overhead fixo (instructions + prompt template)
  overheadTokens: number;
}

/**
 * Configurações de modelos suportados
 * Valores baseados na documentação oficial dos provedores
 */
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'groq/llama-3.3-70b-versatile': {
    id: 'groq/llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    contextWindow: 8192,
    safeDocumentRatio: 0.65, // Usar apenas 65% para documento
    overheadTokens: 1500,    // Reservar 1500 tokens para overhead
  },
  'groq/llama-3.1-8b-instant': {
    id: 'groq/llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Groq)',
    contextWindow: 8192,
    safeDocumentRatio: 0.65,
    overheadTokens: 1500,
  },
  'groq/llama-3.1-70b-versatile': {
    id: 'groq/llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B (Groq)',
    contextWindow: 8192,
    safeDocumentRatio: 0.65,
    overheadTokens: 1500,
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    safeDocumentRatio: 0.70,
    overheadTokens: 2000,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    safeDocumentRatio: 0.70,
    overheadTokens: 2000,
  },
};

/**
 * Modelo padrão do projeto
 */
export const DEFAULT_MODEL = 'groq/llama-3.3-70b-versatile';

/**
 * Obtém a configuração de um modelo
 */
export function getModelConfig(modelId: string = DEFAULT_MODEL): ModelConfig {
  return MODEL_CONFIGS[modelId] || MODEL_CONFIGS[DEFAULT_MODEL];
}

/**
 * Calcula o tamanho seguro de chunk para um modelo específico
 * Considerando overhead de instruções e margem de segurança
 * 
 * Fórmula: safeChunkSize = min(
 *   contextWindow * safeDocumentRatio,
 *   contextWindow - overheadTokens
 * )
 */
export function calculateSafeChunkSize(
  modelId: string = DEFAULT_MODEL,
  additionalOverhead: number = 0
): number {
  const config = getModelConfig(modelId);
  
  // Método 1: Baseado em ratio
  const sizeByRatio = Math.floor(config.contextWindow * config.safeDocumentRatio);
  
  // Método 2: Baseado em overhead explícito + adicional (ex: glossário)
  const sizeByOverhead = config.contextWindow - config.overheadTokens - additionalOverhead;
  
  // Retorna o mais conservador
  const safeSize = Math.min(sizeByRatio, sizeByOverhead);
  
  // Garante valor positivo
  return Math.max(safeSize, 1000);
}

/**
 * Estratégias de processamento ajustadas ao modelo
 */
export interface ProcessingStrategy {
  strategy: 'direct' | 'map-reduce' | 'hierarchical';
  chunkSize: number;
  overlap: number;
  description: string;
  maxDirectTokens: number;
}

/**
 * Seleciona estratégia de processamento considerando o modelo
 */
/**
 * Alias para selectStrategyForModel - mantido para compatibilidade
 * @deprecated Use selectStrategyForModel em vez disso
 */
export function selectProcessingStrategy(
  tokenCount: number,
  modelId: string = DEFAULT_MODEL,
  operation: 'summarize' | 'translate' | 'analyze' = 'summarize',
  glossarySize: number = 0
): ProcessingStrategy {
  const overhead = estimateOperationOverhead(operation, glossarySize);
  return selectStrategyForModel(tokenCount, modelId, overhead);
}

export function selectStrategyForModel(
  tokenCount: number,
  modelId: string = DEFAULT_MODEL,
  additionalOverhead: number = 0
): ProcessingStrategy {
  const config = getModelConfig(modelId);
  const safeChunkSize = calculateSafeChunkSize(modelId, additionalOverhead);
  const maxDirectTokens = Math.floor(safeChunkSize * 0.9); // 90% do chunk seguro
  
  if (tokenCount <= maxDirectTokens) {
    return {
      strategy: 'direct',
      chunkSize: tokenCount,
      overlap: 0,
      description: `Processamento direto (documento pequeno, <= ${maxDirectTokens} tokens)`,
      maxDirectTokens,
    };
  } else if (tokenCount < 50000) {
    return {
      strategy: 'map-reduce',
      chunkSize: safeChunkSize,
      overlap: Math.floor(safeChunkSize * 0.1), // 10% overlap
      description: `Map-Reduce paralelo (${config.name}, chunks de ${safeChunkSize} tokens)`,
      maxDirectTokens,
    };
  } else {
    // Para documentos muito grandes, usar chunks menores para garantir margem
    const conservativeChunkSize = Math.floor(safeChunkSize * 0.85);
    return {
      strategy: 'hierarchical',
      chunkSize: conservativeChunkSize,
      overlap: Math.floor(conservativeChunkSize * 0.1),
      description: `Map-Reduce hierárquico (documento grande, chunks de ${conservativeChunkSize} tokens)`,
      maxDirectTokens,
    };
  }
}

/**
 * Valida se um prompt vai estourar o contexto
 * Útil para verificar antes de enviar
 */
export function validateContextWindow(
  promptTokens: number,
  modelId: string = DEFAULT_MODEL
): { valid: boolean; remaining: number; warning?: string } {
  const config = getModelConfig(modelId);
  const availableForPrompt = config.contextWindow - config.overheadTokens;
  
  if (promptTokens > config.contextWindow) {
    return {
      valid: false,
      remaining: 0,
      warning: `Prompt (${promptTokens} tokens) excede context window total (${config.contextWindow})`,
    };
  }
  
  if (promptTokens > availableForPrompt) {
    return {
      valid: true,
      remaining: config.contextWindow - promptTokens,
      warning: `Prompt (${promptTokens} tokens) está próximo do limite seguro (${availableForPrompt})`,
    };
  }
  
  return {
    valid: true,
    remaining: config.contextWindow - promptTokens,
  };
}

/**
 * Estima overhead adicional baseado no tipo de operação
 */
export function estimateOperationOverhead(
  operation: 'summarize' | 'translate' | 'analyze',
  glossarySize: number = 0
): number {
  const baseOverhead = {
    summarize: 800,   // Instruções + template
    translate: 600,   // Instruções mais simples
    analyze: 1000,    // Análise pode ter critérios extensos
  };
  
  // Cada termo do glossário consome ~10 tokens na média
  const glossaryOverhead = glossarySize * 10;
  
  return baseOverhead[operation] + glossaryOverhead;
}
