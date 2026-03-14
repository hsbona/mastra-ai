import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { queryRAG, listIndexes } from '../rag';

export const queryRAGTool = createTool({
  id: 'query-rag',
  name: 'Query RAG Knowledge Base',
  description: 'Consulta a base de conhecimento vetorial (RAG) para encontrar informações em documentos indexados. ' +
    'Use esta tool quando o usuário perguntar sobre legislação, normas, ou documentos específicos da base de conhecimento. ' +
    'A busca é semântica - entende o significado da pergunta, não apenas palavras-chave.',

  inputSchema: z.object({
    query: z.string().describe('Pergunta ou tema de busca em linguagem natural'),
    indexName: z.string().optional().describe('Nome do índice a consultar (default: "default")'),
    topK: z.number().optional().describe('Número máximo de resultados (default: 5)'),
  }),

  outputSchema: z.object({
    results: z.array(z.object({
      content: z.string().describe('Conteúdo do chunk encontrado'),
      source: z.string().describe('Nome do documento fonte'),
      page: z.number().optional().describe('Número da página (se disponível)'),
      score: z.number().describe('Score de relevância (0-1)'),
      chunkIndex: z.number().describe('Índice do chunk no documento'),
    })),
    totalResults: z.number(),
    query: z.string(),
    indexName: z.string(),
  }),

  execute: async ({ query, indexName = 'default', topK = 5 }) => {
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
      throw new Error(`RAG query failed: ${message}`);
    }
  },
});

export const listIndexesTool = createTool({
  id: 'list-rag-indexes',
  name: 'List RAG Indexes',
  description: 'Lista todos os índices RAG disponíveis no sistema',

  inputSchema: z.object({}),

  outputSchema: z.object({
    indexes: z.array(z.string()),
    count: z.number(),
  }),

  execute: async () => {
    const indexes = await listIndexes();
    return { indexes, count: indexes.length };
  },
});
