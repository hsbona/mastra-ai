-- ============================================
-- LIMPEZA: REMOVER TABELAS DE DESENVOLVIMENTO DE 'public'
-- ============================================
-- Este script remove as tabelas kb_* que foram criadas durante
-- desenvolvimento/testes e estão vazias.
-- 
-- ⚠️ VERIFICAÇÃO: Todas as tabelas abaixo estão com 0 registros
--    kb_constituicao: 0 registros
--    kb_lei14133:     0 registros  
--    kb_siafi:        0 registros
--    kb_lgpd:         0 registros
--
-- Se alguma tabela tiver dados, este script falhará (proteção).

-- ============================================
-- 1. VERIFICAR DADOS ANTES DE REMOVER
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
    v_table TEXT;
    v_tables TEXT[] := ARRAY['kb_constituicao', 'kb_lei14133', 'kb_siafi', 'kb_lgpd'];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_count;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'Tabela % contém % registros. Não será removida.', v_table, v_count;
        END IF;
        RAISE NOTICE '✅ Verificado: % está vazia (0 registros)', v_table;
    END LOOP;
END $$;

-- ============================================
-- 2. REMOVER TABELAS
-- ============================================

DROP TABLE IF EXISTS public.kb_constituicao CASCADE;
DROP TABLE IF EXISTS public.kb_lei14133 CASCADE;
DROP TABLE IF EXISTS public.kb_siafi CASCADE;
DROP TABLE IF EXISTS public.kb_lgpd CASCADE;

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
    AND table_name LIKE 'kb_%';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ Limpeza concluída: Nenhuma tabela kb_* restante em public';
    ELSE
        RAISE WARNING '⚠️  Ainda existem % tabelas kb_* em public', v_count;
    END IF;
END $$;

-- Listar objetos restantes em public (deve ser apenas objetos do sistema)
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
