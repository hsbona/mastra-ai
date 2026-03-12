-- ============================================
-- XPERTIA DATABASE - SCRIPT DE INICIALIZAÇÃO
-- ============================================
-- Execute este script em um servidor PostgreSQL limpo
-- para preparar o ambiente para o XpertIA + Mastra
--
-- Ordem de execução: Este é o ÚNICO script necessário para novo ambiente
--
-- Arquitetura de Esquemas:
--   mastra        → Dados do framework (storage, observability, traces)
--   xpertia_rag   → Dados da aplicação gerenciados pelo Mastra (KBs, embeddings)
--   xpertia       → Dados legados da aplicação (PROTEGIDO - não usar)
--   public        → Esquema padrão PostgreSQL (vazio)

-- ============================================
-- 1. EXTENSÕES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 2. ESQUEMAS
-- ============================================

-- Esquema para dados do framework Mastra
CREATE SCHEMA IF NOT EXISTS mastra;
COMMENT ON SCHEMA mastra IS 
  'Dados do framework Mastra: storage, observability, traces. ' ||
  'Gerenciado automaticamente pelo framework via PostgresStore(schemaName: "mastra")';

-- Esquema para RAG da aplicação (KBs, embeddings)
CREATE SCHEMA IF NOT EXISTS xpertia_rag;
COMMENT ON SCHEMA xpertia_rag IS 
  'Dados da aplicação XpertIA gerenciados pelo Mastra: knowledge bases, embeddings, RAG. ' ||
  'Isolado do esquema "mastra" para separação de domínios (framework vs aplicação).';

-- Esquema para dados legados (não usado pelo novo Mastra)
CREATE SCHEMA IF NOT EXISTS xpertia;
COMMENT ON SCHEMA xpertia IS 
  'Dados legados da aplicação XpertIA. PROTEGIDO - não usar para novos dados. ' ||
  'Mantido para preservar histórico de audit_logs, messages, threads.';

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================

SELECT 
  'Extensões instaladas' as check_item,
  COUNT(*) as count,
  'OK' as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'unaccent', 'btree_gist', 'vector')

UNION ALL

SELECT 
  'Esquemas criados' as check_item,
  COUNT(*) as count,
  'OK' as status
FROM information_schema.schemata 
WHERE schema_name IN ('mastra', 'xpertia_rag', 'xpertia')

ORDER BY check_item;

-- ============================================
-- 4. CONFIGURAÇÃO RECOMENDADA (documentação)
-- ============================================
/*

NO CÓDIGO (src/mastra/index.ts):

import { PostgresStore, PgVector } from '@mastra/pg';

// Storage do framework → esquema 'mastra'
const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
  schemaName: 'mastra',
});

// RAG da aplicação → esquema 'xpertia_rag'
const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: process.env.DATABASE_URL,
  schemaName: 'xpertia_rag',
});

export const mastra = new Mastra({
  storage,
  vector: pgVector,
  // ... outras configurações
});

O Mastra criará automaticamente as tabelas necessárias 
em cada esquema quando iniciar pela primeira vez.

*/
