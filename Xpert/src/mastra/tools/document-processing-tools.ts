/**
 * Document Processing Tools
 * 
 * Ferramentas especializadas para processamento de documentos grandes
 * com estratégia Map-Reduce.
 * 
 * NOTA: Para escrita de arquivos, use:
 * - workspace.filesystem.writeFile() para TXT/MD/JSON
 * - writeDOCXTool para documentos Word
 * - writeExcelTool para planilhas
 */

import { createTool } from '@mastra/core/tools';
import { MDocument } from '@mastra/rag';
import { z } from 'zod';
import * as path from 'path';
import { workspace } from '../workspace-config';
import { 
  selectStrategyForModel, 
  calculateSafeChunkSize,
  getModelConfig,
  DEFAULT_MODEL 
} from '../config/model-config';

// ============================================
// TOKEN ESTIMATION (Aproximação eficiente)
// ============================================

/**
 * Estima a quantidade de tokens em um texto
 * Regra aproximada: 1 token ≈ 4 caracteres para inglês/português
 * 
 * NOTA: Para tokenização precisa, use MDocument.chunkToken() do @mastra/rag
 * Esta função é uma aproximação rápida para decisões de estratégia.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

// ============================================
// SEMANTIC CHUNKING (usando MDocument nativo)
// ============================================

export interface ChunkingOptions {
  chunkSize?: number;
  overlap?: number;
  preserveParagraphs?: boolean;
}

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    wordCount: number;
    estimatedTokens: number;
  };
}

/**
 * Divide texto em chunks semânticos usando MDocument do Mastra RAG
 * 
 * Usa estratégia 'recursive' que preserva estrutura de parágrafos
 * e mantém contexto através de overlap configurável.
 */
export async function semanticChunking(
  text: string,
  options: ChunkingOptions = {}
): Promise<TextChunk[]> {
  const {
    chunkSize = 4000,
    overlap = 400,
  } = options;

  // Criar documento Mastra RAG
  const doc = MDocument.fromText(text);
  
  // Chunking recursivo (preserva estrutura de parágrafos)
  await doc.chunkRecursive({
    maxSize: chunkSize,
    overlap,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ' '],
  });
  
  // Obter chunks processados
  const chunks = doc.getDocs();
  
  // Mapear para o formato TextChunk
  return chunks.map((chunk, index) => ({
    content: chunk.text,
    index,
    metadata: {
      wordCount: chunk.text.split(/\s+/).filter(w => w.length > 0).length,
      estimatedTokens: estimateTokens(chunk.text),
    },
  }));
}

export const semanticChunkingTool = createTool({
  id: 'semantic-chunking',
  description: 'Divide texto em chunks semânticos preservando parágrafos (usa MDocument do Mastra RAG)',
  inputSchema: z.object({
    text: z.string().describe('Texto para dividir em chunks'),
    chunkSize: z.number().optional().describe('Tamanho aproximado de cada chunk (caracteres, default: 4000)'),
    overlap: z.number().optional().describe('Sobreposição entre chunks (caracteres, default: 400)'),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      content: z.string(),
      index: z.number(),
      metadata: z.object({
        wordCount: z.number(),
        estimatedTokens: z.number(),
      }),
    })),
    totalChunks: z.number(),
    totalTokens: z.number(),
  }),
  execute: async ({ 
    text, 
    chunkSize = 4000, 
    overlap = 400, 
  }) => {
    const chunks = await semanticChunking(text, {
      chunkSize,
      overlap,
    });

    const totalTokens = chunks.reduce((sum, c) => sum + c.metadata.estimatedTokens, 0);

    return {
      chunks,
      totalChunks: chunks.length,
      totalTokens,
    };
  },
});

// ============================================
// TOKEN ESTIMATION TOOL
// ============================================

export const estimateTokensTool = createTool({
  id: 'estimate-tokens',
  description: 'Estima tokens e sugere estratégia de processamento baseada no modelo',
  inputSchema: z.object({
    text: z.string().describe('Texto para estimar tokens'),
    modelId: z.string().optional().describe('ID do modelo (default: Llama 4 Scout)'),
    operation: z.enum(['summarize', 'translate', 'analyze']).optional().describe('Tipo de operação'),
  }),
  outputSchema: z.object({
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    chunkSize: z.number(),
    overlap: z.number(),
    description: z.string(),
    modelContextWindow: z.number(),
    safeChunkSize: z.number(),
  }),
  execute: async ({ 
    text, 
    modelId = DEFAULT_MODEL,
    operation = 'summarize'
  }) => {
    const tokenCount = estimateTokens(text);
    const safeChunkSize = calculateSafeChunkSize(modelId);
    const modelConfig = getModelConfig(modelId);
    
    // Determinar estratégia baseada no tamanho
    let strategy: 'direct' | 'map-reduce' | 'hierarchical';
    let chunkSize = safeChunkSize;
    let overlap = Math.floor(safeChunkSize * 0.1);
    let description: string;
    
    const maxDirectTokens = Math.floor(safeChunkSize * 0.9);
    
    if (tokenCount <= maxDirectTokens) {
      strategy = 'direct';
      chunkSize = tokenCount;
      overlap = 0;
      description = `Processamento direto (documento pequeno, <= ${maxDirectTokens} tokens)`;
    } else if (tokenCount < 50000) {
      strategy = 'map-reduce';
      description = `Map-Reduce paralelo (${modelConfig.name}, chunks de ${safeChunkSize} tokens)`;
    } else {
      chunkSize = Math.floor(safeChunkSize * 0.85);
      overlap = Math.floor(chunkSize * 0.1);
      strategy = 'hierarchical';
      description = `Map-Reduce hierárquico (documento grande, chunks de ${chunkSize} tokens)`;
    }
    
    return {
      tokenCount,
      strategy,
      chunkSize,
      overlap,
      description,
      modelContextWindow: modelConfig.contextWindow,
      safeChunkSize,
    };
  },
});

// ============================================
// WRITE LARGE FILE TOOL (DEPRECATED)
// ============================================
// 
// ⚠️ AVISO: Esta tool foi simplificada para manter compatibilidade.
// Para novos casos de uso:
// - TXT/MD: use workspace.filesystem.writeFile() diretamente
// - DOCX: use writeDOCXTool de file-tools/

export const writeLargeFileTool = createTool({
  id: 'write-large-file',
  description: '[DEPRECATED] Use workspace.filesystem.writeFile() para TXT/MD ou writeDOCXTool para DOCX',
  inputSchema: z.object({
    outputPath: z.string().describe('Caminho relativo à pasta workspace/outputs/'),
    content: z.string().describe('Conteúdo completo do arquivo'),
    fileType: z.enum(['txt', 'md', 'docx']).describe('Tipo do arquivo'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    fileSize: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ outputPath, content, fileType }) => {
    try {
      const basePath = workspace.filesystem.basePath;
      const fullPath = path.join(basePath, 'outputs', outputPath);
      
      if (fileType === 'txt' || fileType === 'md') {
        // ✅ Usar workspace nativo
        await workspace.filesystem.writeFile(fullPath, content);
        const stats = await workspace.filesystem.stat(fullPath);
        
        return {
          success: true,
          filePath: outputPath,
          fileSize: stats.size,
        };
      }
      
      if (fileType === 'docx') {
        // DOCX removido - usar writeDOCXTool
        return {
          success: false,
          filePath: '',
          fileSize: 0,
          error: 'DOCX não suportado. Use writeDOCXTool de file-tools/',
        };
      }
      
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        error: 'Tipo de arquivo não suportado',
      };
    } catch (error) {
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
});

// ============================================
// EXPORTS
// ============================================

export const documentProcessingTools = {
  estimateTokensTool,
  semanticChunkingTool,
  // writeLargeFileTool está deprecated
};
