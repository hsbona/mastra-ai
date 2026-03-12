/**
 * Vector Store Configuration
 * 
 * Configuração centralizada do PgVector para evitar ciclos de dependência.
 * Este módulo é importado por index.ts e pelo módulo RAG.
 */

import { PgVector } from '@mastra/pg';

// ============================================
// VECTOR STORE - RAG da aplicação (KBs, embeddings)
// Esquema: 'xpertia_rag' - isolado do framework
// ============================================
export const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia',
  schemaName: 'xpertia_rag',
});
