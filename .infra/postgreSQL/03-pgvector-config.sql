-- ============================================
-- CONFIGURAÇÃO PGVECTOR (RAG)
-- ============================================
-- Este script configura o pgvector para embeddings do XpertIA
-- 
-- MODEL: Alibaba text-embedding-v4
-- DIMENSIONS: 1024
-- INDEX: HNSW (Hierarchical Navigable Small World) para busca eficiente

-- ============================================
-- 1. VERIFICAR EXTENSÃO
-- ============================================
-- A extensão deve estar instalada no esquema public (padrão)
-- ou em um esquema específico onde ficarão os tipos vector

SELECT 
    extname,
    extversion,
    extnamespace::regnamespace as schema
FROM pg_extension 
WHERE extname = 'vector';

-- ============================================
-- 2. TIPO VECTOR
-- ============================================
-- O tipo vector é criado automaticamente pela extensão
-- Permite armazenar vetores de alta dimensionalidade

-- Exemplo de criação de tabela com embeddings (para referência):
/*
CREATE TABLE IF NOT EXISTS mastra.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id TEXT NOT NULL,
    content TEXT,
    embedding VECTOR(1024), -- Alibaba text-embedding-v4
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice HNSW para busca vetorial eficiente
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
ON mastra.embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice para busca por resource_id
CREATE INDEX IF NOT EXISTS idx_embeddings_resource_id 
ON mastra.embeddings(resource_id);
*/

-- ============================================
-- 3. FUNÇÕES ÚTEIS PARA RAG
-- ============================================

-- Função para calcular similaridade de cosseno
-- CREATE OR REPLACE FUNCTION mastra.cosine_similarity(a vector, b vector)
-- RETURNS float AS $$
-- BEGIN
--     RETURN 1 - (a <=> b);
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. CONFIGURAÇÕES DE PERFORMANCE
-- ============================================

-- Ajustar work_mem para operações vetoriais (opcional, requer restart)
-- ALTER SYSTEM SET work_mem = '256MB';

-- Configurar ef_search para queries (padrão: 40)
-- SET hnsw.ef_search = 100; -- Mais preciso, mais lento

-- ============================================
-- 5. VERIFICAÇÃO
-- ============================================

-- Verificar versão do pgvector
SELECT 
    'pgvector' as componente,
    extversion as versao,
    'Extensão para vetores e busca semântica' as descricao
FROM pg_extension 
WHERE extname = 'vector';

-- Testar criação de vetor (sanity check)
SELECT '[1,2,3]'::vector(3) as teste_vetor;
