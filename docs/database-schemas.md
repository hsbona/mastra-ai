# Documentação dos Esquemas PostgreSQL

**Banco de Dados:** `xpertia`  
**Servidor:** `5.189.185.146:5432`  
**Gerado em:** 2026-03-12

---

## Visão Geral

| Esquema | Descrição | Tabelas | Registros Totais |
|---------|-----------|---------|------------------|
| `mastra` | Dados do framework Mastra (storage, observability, traces) | 27 | ~333 |
| `xpertia_rag` | Dados da aplicação XpertIA (RAG, embeddings, KBs) | 1 | ~2.860 |

---

## Esquema: `mastra`

Esquema gerenciado automaticamente pelo framework Mastra via `PostgresStore(schemaName: "mastra")`. Contém todas as tabelas de storage, observabilidade e traces do framework.

### Tabelas do Framework

#### Storage & Mensagens

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_threads` | 6 | Threads de conversação |
| `mastra_messages` | 26 | Mensagens trocadas em threads |
| `mastra_resources` | 0 | Recursos com working memory |
| `mastra_observational_memory` | 0 | Memória observacional dos agentes |
| `mastra_workflow_snapshot` | 0 | Snapshots de execução de workflows |

**Índices principais:**
- `mastra_mastra_messages_thread_id_createdat_idx` - Otimiza busca por thread ordenada por data
- `mastra_mastra_threads_resourceid_createdat_idx` - Busca por resourceId

#### Observability (Traces)

| Tabela | Registros | Descrição | Tamanho |
|--------|-----------|-----------|---------|
| `mastra_ai_spans` | 301 | Spans de traces de AI | 11 MB |

**Índices de performance:**
- `mastra_mastra_ai_spans_traceid_spanid_pk` - PK composta (traceId, spanId)
- `mastra_mastra_ai_spans_traceid_startedat_idx` - Busca por trace ordenada
- `mastra_mastra_ai_spans_parentspanid_startedat_idx` - Hierarquia de spans
- `mastra_mastra_ai_spans_root_spans_idx` - Spans raiz (parentSpanId IS NULL)
- `mastra_mastra_ai_spans_metadata_gin_idx` - Busca em JSONB metadata
- `mastra_mastra_ai_spans_tags_gin_idx` - Busca em tags

#### Agentes & Versionamento

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_agents` | 0 | Definição de agentes |
| `mastra_agent_versions` | 0 | Histórico de versões de agentes |

#### Skills

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_skills` | 0 | Skills registradas |
| `mastra_skill_versions` | 0 | Versões de skills |
| `mastra_skill_blobs` | 0 | Conteúdo binário de skills (hash-based) |

#### MCP (Model Context Protocol)

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_mcp_servers` | 0 | Servidores MCP |
| `mastra_mcp_server_versions` | 0 | Versões de servidores MCP |
| `mastra_mcp_clients` | 0 | Clientes MCP |
| `mastra_mcp_client_versions` | 0 | Versões de clientes MCP |

#### Prompts & Scorers

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_prompt_blocks` | 0 | Blocos de prompt reutilizáveis |
| `mastra_prompt_block_versions` | 0 | Versões de blocos de prompt |
| `mastra_scorer_definitions` | 0 | Definições de scorers |
| `mastra_scorer_definition_versions` | 0 | Versões de definições |
| `mastra_scorers` | 0 | Execuções de scoring |

#### Experimentos & Datasets

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_datasets` | 0 | Datasets para evals |
| `mastra_dataset_versions` | 0 | Versões de datasets |
| `mastra_dataset_items` | 0 | Itens de datasets |
| `mastra_experiments` | 0 | Experimentos de eval |
| `mastra_experiment_results` | 0 | Resultados de experimentos |

#### Workspaces

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mastra_workspaces` | 0 | Workspaces do Mastra Studio |
| `mastra_workspace_versions` | 0 | Versões de workspaces |

### Estrutura de Campos Comuns

A maioria das tabelas segue padrões consistentes:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `text` | Identificador único (PK) |
| `createdAt` | `timestamp` | Data de criação |
| `updatedAt` | `timestamp` | Data de atualização |
| `createdAtZ` | `timestamptz` | Data de criação com timezone (default: now()) |
| `updatedAtZ` | `timestamptz` | Data de atualização com timezone |
| `metadata` | `jsonb` | Metadados flexíveis |

Tabelas de versionamento adicionam:
- `versionNumber` - Número sequencial da versão
- `changeMessage` - Mensagem descritiva da mudança
- `changedFields` - JSONB com campos alterados

---

## Esquema: `xpertia_rag`

Esquema para dados de RAG (Retrieval-Augmented Generation) da aplicação XpertIA. Gerenciado pelo `PgVector(schemaName: "xpertia_rag")` - tabelas criadas sob demanda via `createIndex()`.

### Tabela: `legislacao`

Knowledge base de legislação com embeddings vetoriais para busca semântica.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `integer` | NO | `nextval(...)` | PK autoincremental |
| `vector_id` | `text` | NO | - | ID único do vetor (UUID) |
| `embedding` | `vector` | YES | - | Vetor de embedding (1024 dimensões) |
| `metadata` | `jsonb` | YES | `'{}'` | Metadados do chunk (source, title, chunkIndex, etc.) |

**Estatísticas:**
- Registros: ~2.860 chunks
- Tamanho: 48 MB

**Índices:**

| Nome | Tipo | Coluna/Expressão |
|------|------|------------------|
| `legislacao_pkey` | UNIQUE | `id` |
| `legislacao_vector_id_key` | UNIQUE | `vector_id` |
| `legislacao_vector_idx` | HNSW | `embedding vector_cosine_ops` (m=16, ef_construction=64) |
| `legislacao_md_6db9c307_idx` | btree | `metadata->>'source'` |
| `legislacao_md_7932423e_idx` | btree | `metadata->>'title'` |
| `legislacao_md_f8098637_idx` | btree | `metadata->>'chunkIndex'` |

> **Nota:** O índice HNSW `legislacao_vector_idx` permite busca por similaridade de cosseno em alta performance.

---

## Extensões Instaladas

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Funções criptográficas
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Busca sem acentos
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- Índices GIST
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector - embeddings
```

---

## Diagrama de Relacionamentos (Simplificado)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ESQUEMA: mastra                         │
├─────────────────────────────────────────────────────────────────┤
│  mastra_threads ◄──────┐                                        │
│  mastra_messages ──────┘ (1:N)   Threads contêm mensagens      │
│                                                                 │
│  mastra_agents ◄────┐                                           │
│  mastra_agent_versions (1:N)     Versionamento de agentes      │
│                                                                 │
│  mastra_ai_spans ──────────────── Traces/observability         │
│  mastra_resources ─────────────── Working memory               │
│  mastra_workflow_snapshot ─────── Estado de workflows          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ESQUEMA: xpertia_rag                       │
├─────────────────────────────────────────────────────────────────┤
│  legislacao ───────────────────── Embeddings de legislação     │
│  (tabelas adicionais sob demanda via createIndex())            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuração no Código

```typescript
// src/mastra/index.ts
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
  // ...
});
```

---

## Notas de Segurança

- ⚠️ **Esquema `xpertia` é PROTEGIDO** - Contém dados legados, não usar para novos dados
- ✅ O Mastra usa `CREATE TABLE IF NOT EXISTS` - dados existentes são preservados
- ✅ O esquema `xpertia_rag` isola dados da aplicação do framework

---

## Referências

- [Documentação Mastra Storage](https://mastra.ai/docs/reference/storage)
- [Documentação Mastra Memory](https://mastra.ai/docs/reference/memory)
- [Documentação pgvector](https://github.com/pgvector/pgvector)
