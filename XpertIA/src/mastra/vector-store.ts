/**
 * Vector Store Configuration
 * 
 * Configuração centralizada do PgVector para evitar ciclos de dependência.
 * Este módulo é importado por index.ts e pelo módulo RAG.
 */

import { PgVector } from '@mastra/pg';

// ============================================
// VECTOR STORE - RAG da aplicação (KBs, embeddings)
// Esquema: 'mastra' - conforme especificação do projeto
// Todos os dados do framework Mastra isolados no esquema 'mastra'
// ============================================
// Aumentar timeout da conexão para evitar erros em grandes upserts
const getConnectionString = () => {
  const baseUrl = process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia';
  // Adicionar parâmetros de timeout se não existirem
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connect_timeout=30&statement_timeout=300000`;
};

export const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: getConnectionString(),
  schemaName: 'mastra',
});
