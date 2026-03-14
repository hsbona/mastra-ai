/**
 * Document Processing Tools - Arquitetura Simplificada
 * Tools para processamento de documentos grandes com Map-Reduce
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
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
 * AGORA CONSIDERA O MODELO E LIMITE DE CONTEXTO!
 * 
 * @param tokenCount - Número estimado de tokens no documento
 * @param modelId - ID do modelo (default: meta-llama/llama-4-scout-17b-16e-instruct)
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
    modelId: z.string().optional().describe('ID do modelo (default: meta-llama/llama-4-scout-17b-16e-instruct)'),
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
  }: { 
    text: string; 
    modelId?: string;
    operation?: 'summarize' | 'translate' | 'analyze';
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
    chunkSize = 4000, // Será ajustado dinamicamente baseado no modelo
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
  }: { 
    text: string; 
    chunkSize?: number; 
    overlap?: number; 
    preserveParagraphs?: boolean;
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
// STREAMING FILE WRITER
// ============================================

export const writeLargeFileTool = createTool({
  id: 'write-large-file',
  description: 'Escreve arquivos grandes em streaming para economizar memória',
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
  execute: async ({ 
    outputPath, 
    content, 
    fileType 
  }: { 
    outputPath: string; 
    content: string; 
    fileType: 'txt' | 'md' | 'docx';
  }) => {
    try {
      const fullDir = path.resolve('./workspace/outputs', path.dirname(outputPath));
      await fs.mkdir(fullDir, { recursive: true });
      
      const fullPath = path.resolve('./workspace/outputs', outputPath);
      
      if (fileType === 'txt' || fileType === 'md') {
        // Para arquivos texto, escrever diretamente
        await fs.writeFile(fullPath, content, 'utf-8');
        
        const stats = await fs.stat(fullPath);
        
        return {
          success: true,
          filePath: outputPath,
          fileSize: stats.size,
        };
      } else if (fileType === 'docx') {
        // Para DOCX, usar a library docx
        const { Document, Packer, Paragraph, TextRun } = await import('docx');
        
        // Dividir conteúdo em parágrafos
        const paragraphs = content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
        
        const children = paragraphs.map(text => 
          new Paragraph({
            children: [new TextRun({ text })],
          })
        );
        
        const doc = new Document({
          sections: [{ children }],
        });
        
        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(fullPath, buffer);
        
        return {
          success: true,
          filePath: outputPath,
          fileSize: buffer.length,
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
  writeLargeFileTool,
};
