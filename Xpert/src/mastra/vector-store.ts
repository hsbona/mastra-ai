/**
 * Vector Store Configuration
 * 
 * Configuração centralizada do PgVector para evitar ciclos de dependência.
 * Este módulo é importado por index.ts e pelo módulo RAG.
 */

import { PgVector } from '@mastra/pg';
import { vectorStoreConfig } from './config/database';

// ============================================
// VECTOR STORE - RAG da aplicação (KBs, embeddings)
// Esquema: 'xpertia_rag' - dados da aplicação Xpert (RAG, embeddings)
// Separado do esquema 'mastra' que contém dados do framework
// ============================================
export const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: vectorStoreConfig.connectionString,
  schemaName: vectorStoreConfig.schemaName,
});
