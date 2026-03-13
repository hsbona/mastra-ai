/**
 * Shared Document Processing Steps
 * Steps reutilizáveis para workflows de processamento de documentos
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { estimateTokens, selectProcessingStrategy, semanticChunking } from '../../tools/document-processing-tools';
import { readPDFTool, readDOCXTool } from '../../tools/file-tools';

// ============================================
// COMMON SCHEMAS
// ============================================

export const filePathSchema = z.object({
  filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/'),
  fileType: z.enum(['pdf', 'docx', 'txt']).describe('Tipo do arquivo'),
});

export const extractedTextSchema = z.object({
  text: z.string(),
  fileName: z.string(),
  metadata: z.object({
    totalPages: z.number().optional(),
    wordCount: z.number(),
  }),
});

export const analyzedContentSchema = z.object({
  text: z.string(),
  fileName: z.string(),
  tokenCount: z.number(),
  strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
  chunkSize: z.number(),
  overlap: z.number(),
  description: z.string(),
});

export const chunkedContentSchema = z.object({
  chunks: z.array(z.object({
    content: z.string(),
    index: z.number(),
    metadata: z.object({
      wordCount: z.number(),
      estimatedTokens: z.number(),
    }),
  })),
  fileName: z.string(),
  tokenCount: z.number(),
  strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
});

// ============================================
// STEP 1: EXTRACT TEXT FROM FILE
// ============================================

export const createExtractTextStep = (stepId: string = 'extract-text') => createStep({
  id: stepId,
  inputSchema: filePathSchema,
  outputSchema: extractedTextSchema,
  execute: async ({ inputData }) => {
    const { filePath, fileType } = inputData;
    
    if (fileType === 'pdf') {
      if (!readPDFTool.execute) {
        throw new Error('readPDFTool.execute não disponível');
      }
      const result = await (readPDFTool.execute as any)({ filePath });
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao ler PDF');
      }
      
      return {
        text: result.text,
        fileName: result.metadata.fileName,
        metadata: {
          totalPages: result.metadata.totalPages,
          wordCount: result.text.split(/\s+/).filter((w: string) => w.length > 0).length,
        },
      };
    } else if (fileType === 'docx') {
      if (!readDOCXTool.execute) {
        throw new Error('readDOCXTool.execute não disponível');
      }
      const result = await (readDOCXTool.execute as any)({ 
        filePath,
        extractHtml: false,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao ler DOCX');
      }
      
      return {
        text: result.text,
        fileName: result.metadata.fileName,
        metadata: {
          wordCount: result.metadata.wordCount,
        },
      };
    } else {
      // TXT - ler direto
      const fs = await import('fs/promises');
      const path = await import('path');
      const fullPath = path.resolve('./workspace', filePath);
      const text = await fs.readFile(fullPath, 'utf-8');
      
      return {
        text,
        fileName: path.basename(filePath),
        metadata: {
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        },
      };
    }
  },
});

// ============================================
// STEP 2: ANALYZE AND SELECT STRATEGY
// ============================================

export const createAnalyzeStrategyStep = (stepId: string = 'analyze-strategy') => createStep({
  id: stepId,
  inputSchema: extractedTextSchema,
  outputSchema: analyzedContentSchema,
  execute: async ({ inputData }) => {
    const { text, fileName, metadata } = inputData;
    const tokenCount = estimateTokens(text);
    const strategy = selectProcessingStrategy(tokenCount);
    
    console.log(`[DocumentWorkflow] Arquivo: ${fileName}`);
    console.log(`[DocumentWorkflow] Tokens estimados: ${tokenCount}`);
    console.log(`[DocumentWorkflow] Estratégia: ${strategy.description}`);
    
    return {
      text,
      fileName,
      tokenCount,
      strategy: strategy.strategy,
      chunkSize: strategy.chunkSize,
      overlap: strategy.overlap,
      description: strategy.description,
    };
  },
});

// ============================================
// STEP 3: CHUNK DOCUMENT
// ============================================

export const createChunkingStep = (stepId: string = 'chunk-document') => createStep({
  id: stepId,
  inputSchema: analyzedContentSchema,
  outputSchema: chunkedContentSchema,
  execute: async ({ inputData }) => {
    const { text, strategy, chunkSize, overlap, fileName, tokenCount } = inputData;
    
    if (strategy === 'direct') {
      // Documento pequeno - um único "chunk"
      return {
        chunks: [{
          content: text,
          index: 0,
          metadata: {
            wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
            estimatedTokens: tokenCount,
          },
        }],
        fileName,
        tokenCount,
        strategy,
      };
    }
    
    // Documento grande - fazer chunking
    const chunks = await semanticChunking(text, {
      chunkSize,
      overlap,
      preserveParagraphs: true,
    });
    
    console.log(`[DocumentWorkflow] Criados ${chunks.length} chunks`);
    
    return {
      chunks,
      fileName,
      tokenCount,
      strategy,
    };
  },
});

// ============================================
// DEFAULT STEPS INSTANCES
// ============================================

export const extractTextStep = createExtractTextStep();
export const analyzeStrategyStep = createAnalyzeStrategyStep();
export const chunkDocumentStep = createChunkingStep();
