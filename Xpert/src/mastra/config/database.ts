/**
 * Database Configuration
 * 
 * Centraliza todas as configurações de banco de dados.
 * Dados sensíveis vem de .env, valores padrão ficam aqui.
 */

// ============================================
// CONNECTION STRING
// ============================================

/**
 * Connection string base do PostgreSQL
 * Prioridade: variável de ambiente > valor padrão de desenvolvimento
 */
export const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://mastra:mastra_secret@localhost:5432/xpertia';

/**
 * Connection string com parâmetros de timeout para operações pesadas
 * Usado pelo PgVector para evitar erros em grandes upserts
 */
export function getConnectionStringWithTimeout(
  connectTimeout: number = 30,
  statementTimeout: number = 300000
): string {
  const separator = DATABASE_URL.includes('?') ? '&' : '?';
  return `${DATABASE_URL}${separator}connect_timeout=${connectTimeout}&statement_timeout=${statementTimeout}`;
}

// ============================================
// SCHEMA NAMES
// ============================================

/**
 * Esquema para dados do framework Mastra (threads, traces, memory)
 * Isolado da aplicação
 */
export const MASTRA_SCHEMA = 'mastra';

/**
 * Esquema para dados da aplicação Xpert (RAG, embeddings)
 * ⚠️ NUNCA usar 'xpertia' - esquema legado protegido
 */
export const RAG_SCHEMA = 'xpertia_rag';

// ============================================
// STORAGE CONFIGURATIONS
// ============================================

/**
 * Configuração base para PostgresStore (dados do framework)
 */
export const storageConfig = {
  connectionString: DATABASE_URL,
  schemaName: MASTRA_SCHEMA,
};

/**
 * Configuração para PgVector (RAG e embeddings)
 */
export const vectorStoreConfig = {
  connectionString: getConnectionStringWithTimeout(),
  schemaName: RAG_SCHEMA,
};

// ============================================
// MEMORY CONFIGURATION
// ============================================

/**
 * Configuração padrão para memória de agents
 */
export const memoryConfig = {
  lastMessages: 20,
};
