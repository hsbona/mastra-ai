-- ============================================
-- EXTENSÕES DO POSTGRESQL
-- ============================================
-- Este script instala as extensões necessárias para o XpertIA/Mastra
-- Execute como superusuário ou usuário com privilégios CREATE EXTENSION

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para criptografia (hashing, etc.)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensão para busca de texto com remoção de acentos
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Extensão para índices GiST com B-tree
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Extensão pgvector para embeddings e busca vetorial
-- ESSENCIAL para RAG (Retrieval Augmented Generation)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verificar extensões instaladas
SELECT 
    extname AS extensao,
    extversion AS versao,
    extnamespace::regnamespace AS schema
FROM pg_extension 
WHERE extname != 'plpgsql'
ORDER BY extname;
