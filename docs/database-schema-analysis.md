# Análise do Esquema de Banco de Dados - Xpert

**Data da análise:** 2026-03-12  
**Objetivo:** Identificar estrutura existente, decisões arquiteturais e configuração para Mastra

---

## Resumo Executivo

O banco de dados `xpertia` contém dados legados da aplicação no esquema `xpertia` e foi preparado para receber o framework Mastra com arquitetura de **separação de esquemas**.

---

## Arquitetura Decidida: Separação de Esquemas

### Decisão Arquitetural

Após análise, optamos por **manter a separação de esquemas**:

| Esquema | Propósito | Gerenciado por |
|---------|-----------|----------------|
| `mastra` | Dados do **framework** (storage, observability, traces) | Mastra (PostgresStore) |
| `xpertia_rag` | Dados da **aplicação** (KBs, embeddings, RAG) | Mastra (PgVector) |
| `xpertia` | Dados legados **PROTEGIDOS** | Aplicação legada |
| `public` | Esquema padrão PostgreSQL | PostgreSQL |

### Justificativa

1. **Separação de Domínios**: Framework vs Aplicação são donos diferentes dos dados
2. **Governança Diferenciada**: Time de Plataforma vs Time de Dados
3. **Evolução Independente**: Upgrade do Mastra não afeta KBs da aplicação
4. **Backup Granular**: Posso backupar só os KBs sem os traces temporários
5. **Migração Futura**: Facilita mover KBs para Pinecone/etc se necessário

### Configuração no Código

```typescript
// src/mastra/index.ts
import { PostgresStore, PgVector } from '@mastra/pg';

// Storage do framework → esquema 'mastra'
const storage = new PostgresStore({
  schemaName: 'mastra',
});

// RAG da aplicação → esquema 'xpertia_rag'  
const pgVector = new PgVector({
  id: 'xpertia-rag',
  schemaName: 'xpertia_rag',
});

export const mastra = new Mastra({
  storage,
  vector: pgVector,
});
```

---

## Esquema 'xpertia' - Dados Legados (PROTEGIDO)

⚠️ **NUNCA use ou modifique este esquema.** Contém dados de produção.

### Tabelas com Dados

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `users` | 1 | Usuários do sistema |
| `sessions` | 1 | Sessões ativas |
| `threads` | 76 | Threads de conversa |
| `messages` | 165 | Mensagens trocadas |
| `knowledge_bases` | 4 | KBs configurados |
| `audit_logs` | 64 | Logs de auditoria LGPD |

### Tabelas Vazias (Estrutura)

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `documents` | 0 | Documentos processados |
| `kb_embeddings` | 0 | Chunks com embeddings |
| `vector_embeddings_cache` | 0 | Cache de embeddings |

### Enums Customizados (9 tipos)

- `audit_action_type`, `audit_resource_type`, `audit_status`
- `confiabilidade`, `data_classification`
- `lgpd_check_status`, `lgpd_classification`
- `message_role`, `source_type`

---

## Estado Atual dos Esquemas

```
✅ mastra        → 0 tabelas (pronto para framework)
✅ xpertia_rag   → 0 tabelas (pronto para RAG)
✅ xpertia       → 9 tabelas (PROTEGIDO - dados legados)
✅ public        → 0 tabelas (vazio)
```

---

## Scripts de Infraestrutura

Local: `.infra/postgreSQL/`

| Script | Descrição |
|--------|-----------|
| `01-init-database.sql` | Único script necessário para novo ambiente |

O script cria extensões, esquemas e documentação. O Mastra criará as tabelas automaticamente.

---

## Queries Úteis

```sql
-- Verificar esquemas
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('mastra', 'xpertia_rag', 'xpertia');

-- Verificar extensões
SELECT extname, extversion FROM pg_extension 
WHERE extname != 'plpgsql';

-- Dados legados (não modificar!)
SELECT 'audit_logs', COUNT(*) FROM xpertia.audit_logs
UNION ALL SELECT 'messages', COUNT(*) FROM xpertia.messages
UNION ALL SELECT 'threads', COUNT(*) FROM xpertia.threads;
```

---

## Comportamento do Mastra ao Iniciar

### PostgresStore (esquema 'mastra')

| Situação | Comportamento |
|----------|---------------|
| Tabelas não existem | ✅ Cria automaticamente ao iniciar |
| Tabelas existem | ✅ Usa existentes (não sobrescreve) |
| Dados existem | ✅ Preservados (CREATE TABLE IF NOT EXISTS) |

**Tabelas criadas:** `mastra_threads`, `mastra_messages`, `mastra_ai_spans`, etc.

### PgVector (esquema 'xpertia_rag')

| Situação | Comportamento |
|----------|---------------|
| Inicialização | ❌ NÃO cria tabelas automaticamente |
| `createIndex()` chamado | ✅ Cria tabela para o índice |
| Índice já existe | ✅ Usa existente (não sobrescreve) |

**Tabelas criadas:** Sob demanda via `createIndex()` (ex: `kb_legislacao`)

### Resumo de Segurança

```
✅ Idempotente: Pode executar múltiplas vezes sem perder dados
✅ Não-destrutivo: Nunca sobrescreve tabelas ou dados existentes
✅ Incremental: Novas tabelas são adicionadas conforme necessário
```

---

## Conclusão

✅ **Arquitetura definida**: Separação de esquemas (mastra + xpertia_rag)  
✅ **Banco preparado**: Scripts executados, esquemas criados  
✅ **Dados legados preservados**: Esquema 'xpertia' intacto  
✅ **Pronto para implementação**: Configuração no index.ts  
✅ **Comportamento documentado**: Mastra é idempotente e seguro
