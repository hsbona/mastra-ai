/**
 * RAG Tools - Versão Agnóstica
 * 
 * Ferramentas para consulta à base de conhecimento vetorial.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import { queryRAG, listIndexes } from '../rag';
import { createAgnosticTool } from './agnostic';

// ============================================
// Tool 1: queryRAGTool - Consulta a base RAG
// ============================================
function normalizeQueryInput(input: unknown): { 
  query: string; 
  indexName: string; 
  topK: number;
} {
  if (typeof input !== 'object' || input === null) {
    return { query: '', indexName: 'default', topK: 5 };
  }
  const obj = input as Record<string, unknown>;
  
  const query = typeof obj.query === 'string' ? obj.query :
               typeof obj.q === 'string' ? obj.q :
               typeof obj.question === 'string' ? obj.question : '';
  
  const indexName = typeof obj.indexName === 'string' ? obj.indexName :
                   typeof obj.index === 'string' ? obj.index :
                   'default';
  
  let topK = 5;
  if (typeof obj.topK === 'number') {
    topK = obj.topK;
  } else if (typeof obj.topK === 'string') {
    topK = parseInt(obj.topK, 10) || 5;
  } else if (typeof obj.limit === 'number') {
    topK = obj.limit;
  } else if (typeof obj.limit === 'string') {
    topK = parseInt(obj.limit, 10) || 5;
  }
  
  return { query, indexName, topK: Math.min(topK, 20) };
}

export const queryRAGTool = createAgnosticTool({
  id: 'query-rag',
  name: 'Query RAG',
  description: 'Consulta a base de conhecimento vetorial (RAG) para encontrar informações em documentos indexados. ' +
    'Use esta tool quando o usuário perguntar sobre legislação, normas, ou documentos específicos da base de conhecimento. ' +
    'A busca é semântica - entende o significado da pergunta, não apenas palavras-chave.',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    results: z.array(z.object({
      content: z.string(),
      source: z.string(),
      page: z.number().optional(),
      score: z.number(),
      chunkIndex: z.number(),
    })),
    totalResults: z.number(),
    query: z.string(),
    indexName: z.string(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const { query, indexName, topK } = normalizeQueryInput(rawInput);
    
    if (!query) {
      return {
        results: [],
        totalResults: 0,
        query: '',
        indexName,
        error: 'Query não fornecida',
      };
    }
    
    try {
      const results = await queryRAG(query, indexName, topK);

      return {
        results: results.map(r => ({
          content: r.chunk.content,
          source: r.chunk.metadata.source,
          page: r.chunk.metadata.page,
          score: r.score,
          chunkIndex: r.chunk.metadata.chunkIndex,
        })),
        totalResults: results.length,
        query,
        indexName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        results: [],
        totalResults: 0,
        query,
        indexName,
        error: `RAG query failed: ${message}`,
      };
    }
  },
});

// ============================================
// Tool 2: listIndexesTool - Lista índices RAG
// ============================================
export const listIndexesTool = createAgnosticTool({
  id: 'list-rag-indexes',
  name: 'List RAG Indexes',
  description: 'Lista todos os índices RAG disponíveis no sistema',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    indexes: z.array(z.string()),
    count: z.number(),
    error: z.string().optional(),
  }),
  execute: async () => {
    try {
      const indexes = await listIndexes();
      return { indexes, count: indexes.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        indexes: [],
        count: 0,
        error: `Failed to list indexes: ${message}`,
      };
    }
  },
});
