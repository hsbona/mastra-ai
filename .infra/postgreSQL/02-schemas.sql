-- ============================================
-- ESQUEMAS DO BANCO DE DADOS
-- ============================================
-- Este script cria os esquemas necessários para o XpertIA
-- 
-- DECISÃO ARQUITETURAL:
-- - Esquema 'mastra': Dados persistidos pelo framework Mastra (storage, observability, RAG)
-- - Esquema 'xpertia': Dados da aplicação XpertIA (conhecimento, documentos, etc.)
-- - Esquema 'public': Objetos compartilhados (idealmente minimizado)

-- ============================================
-- 1. ESQUEMA MASTRA
-- ============================================
-- Isola todos os dados do framework Mastra do resto da aplicação
-- O Mastra automaticamente cria suas tabelas neste esquema quando
-- configurado com schemaName: 'mastra' no PostgresStore

CREATE SCHEMA IF NOT EXISTS mastra;

-- Comentário descritivo do esquema
COMMENT ON SCHEMA mastra IS 'Dados persistidos pelo framework Mastra (storage, observability, RAG, embeddings). Isolado dos dados da aplicação.';

-- ============================================
-- 2. ESQUEMA XPERTIA
-- ============================================
-- Dados específicos da aplicação XpertIA
-- Conhecimento, documentos processados, caches, etc.

CREATE SCHEMA IF NOT EXISTS xpertia;

-- Comentário descritivo do esquema
COMMENT ON SCHEMA xpertia IS 'Dados da aplicação XpertIA (knowledge base, documentos processados, caches). Separado dos dados do framework.';

-- ============================================
-- 3. CONFIGURAÇÃO DE PERMISSÕES
-- ============================================
-- Garantir que o usuário da aplicação tenha acesso adequado
-- (Ajuste 'xpertia' para o nome do seu usuário de aplicação)

-- GRANT USAGE ON SCHEMA mastra TO xpertia;
-- GRANT CREATE ON SCHEMA mastra TO xpertia;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mastra TO xpertia;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA mastra GRANT ALL ON TABLES TO xpertia;

-- GRANT USAGE ON SCHEMA xpertia TO xpertia;
-- GRANT CREATE ON SCHEMA xpertia TO xpertia;

-- Verificar esquemas criados
SELECT 
    schema_name,
    schema_owner,
    CASE 
        WHEN schema_name = 'mastra' THEN 'Framework Mastra (storage, observability, RAG)'
        WHEN schema_name = 'xpertia' THEN 'Aplicação XpertIA (dados de negócio)'
        WHEN schema_name = 'public' THEN 'Esquema padrão PostgreSQL'
        ELSE 'Outro'
    END AS proposito
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;
