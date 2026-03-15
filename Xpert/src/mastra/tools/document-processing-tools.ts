/**
 * Document Processing Tools
 * 
 * Ferramentas especializadas para processamento de documentos grandes
 * com estratégia Map-Reduce: estimativa de tokens, chunking semântico.
 * 
 * NOTA: Esta NÃO é uma ferramenta de escrita de arquivos - para isso use:
 * - workspace.filesystem.writeFile() para TXT/MD/JSON
 * - writeDOCXTool para documentos Word
 * - writeExcelTool para planilhas
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as path from 'path';
import { workspace } from '../workspace-config';
import { 
  selectStrategyForModel, 
  calculateSafeChunkSize,
  estimateOperationOverhead,
  getModelConfig,
  DEFAULT_MODEL 
} from '../config/model-config';

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Estima a quantidade de tokens em um texto
 * Regra aproximada: 1 token ≈ 4 caracteres para inglês/português
 * ou 1 token ≈ 0.75 palavras
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // Método 1: Baseado em caracteres (mais conservador)
  const charBased = Math.ceil(text.length / 4);
  
  // Método 2: Baseado em palavras
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordBased = Math.ceil(words.length / 0.75);
  
  // Retorna o maior para ser conservador
  return Math.max(charBased, wordBased);
}

/**
 * Seleciona a estratégia de processamento baseada no tamanho
 * CONSIDERA O MODELO E LIMITE DE CONTEXTO!
 * 
 * @param tokenCount - Número estimado de tokens no documento
 * @param modelId - ID do modelo
 * @param operation - Tipo de operação (afeta overhead)
 * @param glossarySize - Tamanho do glossário (se houver)
 */
export function selectProcessingStrategy(
  tokenCount: number,
  modelId: string = DEFAULT_MODEL,
  operation: 'summarize' | 'translate' | 'analyze' = 'summarize',
  glossarySize: number = 0
): {
  strategy: 'direct' | 'map-reduce' | 'hierarchical';
  chunkSize: number;
  overlap: number;
  description: string;
} {
  const overhead = estimateOperationOverhead(operation, glossarySize);
  return selectStrategyForModel(tokenCount, modelId, overhead);
}

export const estimateTokensTool = createTool({
  id: 'estimate-tokens',
  description: 'Estima a quantidade de tokens em um texto para decidir estratégia de processamento',
  inputSchema: z.object({
    text: z.string().describe('Texto para estimar tokens'),
    modelId: z.string().optional().describe('ID do modelo'),
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
    const strategy = selectProcessingStrategy(tokenCount, modelId, operation);
    const safeChunkSize = calculateSafeChunkSize(modelId);
    const modelConfig = getModelConfig(modelId);
    
    return {
      tokenCount,
      strategy: strategy.strategy,
      chunkSize: strategy.chunkSize,
      overlap: strategy.overlap,
      description: strategy.description,
      modelContextWindow: modelConfig.contextWindow,
      safeChunkSize,
    };
  },
});

// ============================================
// SEMANTIC CHUNKING
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
 * Divide texto em chunks semânticos preservando parágrafos
 * Usa abordagem simples baseada em parágrafos
 */
export async function semanticChunking(
  text: string,
  options: ChunkingOptions = {}
): Promise<TextChunk[]> {
  const {
    chunkSize = 4000,
    overlap = 400,
    preserveParagraphs = true,
  } = options;

  const chunks: TextChunk[] = [];
  
  if (preserveParagraphs) {
    // Dividir por parágrafos primeiro
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      // Se adicionar este parágrafo ultrapassa o tamanho, salvar chunk atual
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          metadata: {
            wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
            estimatedTokens: estimateTokens(currentChunk),
          },
        });
        
        // Overlap: manter parte do chunk anterior
        if (overlap > 0 && currentChunk.length > overlap) {
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      } else {
        // Adicionar parágrafo ao chunk atual
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Adicionar último chunk se não estiver vazio
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
          estimatedTokens: estimateTokens(currentChunk),
        },
      });
    }
  } else {
    // Chunking simples por caracteres
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push({
        content: chunk,
        index: chunks.length,
        metadata: {
          wordCount: chunk.split(/\s+/).filter(w => w.length > 0).length,
          estimatedTokens: estimateTokens(chunk),
        },
      });
    }
  }
  
  return chunks;
}

export const semanticChunkingTool = createTool({
  id: 'semantic-chunking',
  description: 'Divide texto em chunks semânticos preservando parágrafos',
  inputSchema: z.object({
    text: z.string().describe('Texto para dividir em chunks'),
    chunkSize: z.number().optional().describe('Tamanho aproximado de cada chunk (caracteres)'),
    overlap: z.number().optional().describe('Sobreposição entre chunks (caracteres)'),
    preserveParagraphs: z.boolean().optional().describe('Preservar fronteiras de parágrafos'),
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
    preserveParagraphs = true 
  }) => {
    
    const chunks = await semanticChunking(text, {
      chunkSize,
      overlap,
      preserveParagraphs,
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
// WRITE LARGE FILE TOOL (DEPRECATED)
// ============================================
// 
// ⚠️ AVISO: Esta tool foi simplificada para manter compatibilidade.
// Para novos casos de uso:
// - TXT/MD: use workspace.filesystem.writeFile() diretamente
// - DOCX: use writeDOCXTool de file-tools/
// 
// A lógica de DOCX foi removida pois duplicava writeDOCXTool.

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
  // writeLargeFileTool está deprecated - use workspace.filesystem.writeFile ou writeDOCXTool
};
