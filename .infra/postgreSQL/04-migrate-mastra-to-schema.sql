-- ============================================
-- MIGRAÇÃO: MOVER OBJETOS MASTRA PARA ESQUEMA DEDICADO
-- ============================================
-- Este script remove objetos do Mastra do esquema public
-- que foram criados antes da configuração schemaName: 'mastra'
-- 
-- ⚠️ ATENÇÃO: Este script DESTRÓI DADOS do esquema public
-- Execute apenas se:
-- 1. Os scripts 01-03 foram executados com sucesso
-- 2. Você tem autorização explícita
-- 3. Os dados em public podem ser perdidos (ou já foram migrados)

-- ============================================
-- 1. VERIFICAR OBJETOS EXISTENTES
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'mastra%';
    
    RAISE NOTICE 'Tabelas do Mastra encontradas em public: %', v_count;
END $$;

-- ============================================
-- 2. REMOVER TABELAS DO MASTRA EM PUBLIC
-- ============================================
-- Ordem respeitando foreign keys (tabelas filhas primeiro)

DROP TABLE IF EXISTS public.mastra_ai_spans CASCADE;
DROP TABLE IF EXISTS public.mastra_messages CASCADE;
DROP TABLE IF EXISTS public.mastra_threads CASCADE;
DROP TABLE IF EXISTS public.mastra_workflow_snapshot CASCADE;
DROP TABLE IF EXISTS public.mastra_experiment_results CASCADE;
DROP TABLE IF EXISTS public.mastra_experiments CASCADE;
DROP TABLE IF EXISTS public.mastra_scorer_definition_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_scorer_definitions CASCADE;
DROP TABLE IF EXISTS public.mastra_scorers CASCADE;
DROP TABLE IF EXISTS public.mastra_dataset_items CASCADE;
DROP TABLE IF EXISTS public.mastra_dataset_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_datasets CASCADE;
DROP TABLE IF EXISTS public.mastra_prompt_block_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_prompt_blocks CASCADE;
DROP TABLE IF EXISTS public.mastra_skill_blobs CASCADE;
DROP TABLE IF EXISTS public.mastra_skill_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_skills CASCADE;
DROP TABLE IF EXISTS public.mastra_agent_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_agents CASCADE;
DROP TABLE IF EXISTS public.mastra_mcp_client_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_mcp_clients CASCADE;
DROP TABLE IF EXISTS public.mastra_mcp_server_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_mcp_servers CASCADE;
DROP TABLE IF EXISTS public.mastra_observational_memory CASCADE;
DROP TABLE IF EXISTS public.mastra_resources CASCADE;
DROP TABLE IF EXISTS public.mastra_workspace_versions CASCADE;
DROP TABLE IF EXISTS public.mastra_workspaces CASCADE;

-- ============================================
-- 3. VERIFICAR LIMPEZA
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'mastra%';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ Limpeza concluída: Nenhuma tabela mastra* encontrada em public';
    ELSE
        RAISE WARNING '⚠️  Ainda existem % tabelas do Mastra em public', v_count;
    END IF;
END $$;

-- ============================================
-- 4. LISTAR TABELAS RESTANTES EM PUBLIC (NÃO-MASTRA)
-- ============================================

SELECT 
    table_name,
    'Tabela de aplicação' as tipo
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE 'mastra%'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
