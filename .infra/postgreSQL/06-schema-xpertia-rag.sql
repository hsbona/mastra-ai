-- ============================================
-- ESQUEMA XPERTIA_RAG: DADOS DA APLICAÇÃO GERENCIADOS PELO MASTRA
-- ============================================
-- Este esquema conterá objetos que SÃO DA APLICAÇÃO XpertIA
-- mas serão GERENCIADOS pelo framework Mastra (via PgVector, etc.)
--
-- ARQUITETURA:
--   mastra        → Dados internos do framework (storage, observability, traces)
--   xpertia_rag   → Dados da aplicação gerenciados pelo Mastra (KBs, embeddings)
--   xpertia       → Dados da aplicação legados (PROTEGIDO - não usar)
--
-- NOTA SOBRE NOMENCLATURA:
--   'mastra-xpertia' não é válido em PostgreSQL (hífen requer aspas)
--   Alternativas válidas: 'xpertia_rag', 'mastra_xpertia', 'xpertia_kb'
--   Escolhido: 'xpertia_rag' (descritivo e sem caracteres especiais)

-- ============================================
-- 1. CRIAR ESQUEMA
-- ============================================

CREATE SCHEMA IF NOT EXISTS xpertia_rag;

-- Comentário descritivo
COMMENT ON SCHEMA xpertia_rag IS 
'Dados da aplicação XpertIA gerenciados pelo framework Mastra (RAG, embeddings, KBs). '
'Isolado do esquema ''mastra'' (dados do framework) e ''xpertia'' (legado).';

-- ============================================
-- 2. CONFIGURAR PERMISSÕES
-- ============================================

-- Garantir acesso ao usuário da aplicação
-- (substitua 'xpertia' pelo nome do seu usuário se diferente)

-- GRANT USAGE ON SCHEMA xpertia_rag TO xpertia;
-- GRANT CREATE ON SCHEMA xpertia_rag TO xpertia;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA xpertia_rag TO xpertia;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA xpertia_rag GRANT ALL ON TABLES TO xpertia;

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================

SELECT 
    schema_name,
    schema_owner,
    'Esquema para dados da aplicação gerenciados pelo Mastra' as proposito
FROM information_schema.schemata 
WHERE schema_name = 'xpertia_rag';

-- ============================================
-- 4. COMPARATIVO DE ESQUEMAS
-- ============================================

SELECT 
    schema_name,
    CASE 
        WHEN schema_name = 'mastra' THEN 'Framework Mastra (storage, observability, traces)'
        WHEN schema_name = 'xpertia_rag' THEN 'Aplicação XpertIA gerenciada pelo Mastra (KBs, embeddings)'
        WHEN schema_name = 'xpertia' THEN 'Aplicação XpertIA legada (PROTEGIDO - não modificar)'
        WHEN schema_name = 'public' THEN 'Esquema padrão PostgreSQL (vazio após limpeza)'
        ELSE 'Outro'
    END AS proposito,
    CASE 
        WHEN schema_name = 'mastra' THEN 'Mastra automático'
        WHEN schema_name = 'xpertia_rag' THEN 'Mastra via configuração PgVector'
        WHEN schema_name = 'xpertia' THEN 'Aplicação legada (preservado)'
        ELSE 'PostgreSQL'
    END AS gerenciado_por
FROM information_schema.schemata 
WHERE schema_name IN ('mastra', 'xpertia_rag', 'xpertia', 'public')
ORDER BY 
    CASE schema_name 
        WHEN 'mastra' THEN 1 
        WHEN 'xpertia_rag' THEN 2 
        WHEN 'xpertia' THEN 3 
        ELSE 4 
    END;

-- ============================================
-- 5. CONFIGURAÇÃO RECOMENDADA NO CÓDIGO
-- ============================================
/*

Para usar este esquema com PgVector no Mastra:

const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: process.env.DATABASE_URL,
  schemaName: 'xpertia_rag',  // <-- Aqui!
});

await pgVector.createIndex({
  indexName: 'kb_legislacao',
  dimension: 1024,  // Alibaba text-embedding-v4
  metric: 'cosine',
});

// O Mastra criará as tabelas automaticamente em xpertia_rag

*/
