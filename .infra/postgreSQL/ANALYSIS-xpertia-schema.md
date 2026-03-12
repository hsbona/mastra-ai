# Análise do Esquema 'xpertia' - XpertIA

**Data da análise:** 2026-03-12  
**Objetivo:** Identificar estrutura existente e possíveis conflitos com Mastra

---

## Resumo Executivo

O esquema `xpertia` contém **dados da aplicação legada** - uma estrutura completa de KB (Knowledge Base), usuários, sessões e auditoria. **Não há conflito** com o esquema `mastra` que será usado pelo framework.

---

## Tabelas do Esquema 'xpertia'

### 1. Tabelas com Dados (ATIVAS)

| Tabela | Registros | Descrição | Relacionamentos |
|--------|-----------|-----------|-----------------|
| `users` | 1 | Usuários do sistema | PK: id |
| `sessions` | 1 | Sessões ativas | FK → users |
| `threads` | 76 | Threads de conversa | FK → users |
| `messages` | 165 | Mensagens trocadas | FK → threads, users |
| `knowledge_bases` | 4 | KBs configurados | PK: id |
| `audit_logs` | 64 | Logs de auditoria LGPD | Muitos índices |

### 2. Tabelas Vazias (ESTRUTURA PREPARADA)

| Tabela | Registros | Descrição | Uso Previsto |
|--------|-----------|-----------|--------------|
| `documents` | 0 | Documentos processados | FK → knowledge_bases |
| `kb_embeddings` | 0 | Chunks com embeddings | FK → documents |
| `vector_embeddings_cache` | 0 | Cache de embeddings | Otimização |

### 3. Views

| View | Definição |
|------|-----------|
| `v_kb_vector_stats` | Estatísticas agregadas de embeddings por KB |

---

## Estrutura de KB (Knowledge Base)

O esquema `xpertia` já possui uma **estrutura normalizada de RAG**:

```
knowledge_bases (4 registros)
    └── documents (0 registros)
            └── kb_embeddings (0 registros - chunks com vector)
```

**Campos importantes em `kb_embeddings`:**
- `kb_slug`: Identificador do KB
- `document_id`: Referência ao documento
- `chunk_index`: Ordem do chunk
- `content`: Texto do chunk
- `embedding`: Vetor (USER-DEFINED = vector)
- `metadata`: JSONB com metadados

---

## Enums Customizados (9 tipos)

Localizados em `xpertia`:

| Enum | Valores (exemplo) |
|------|-------------------|
| `audit_action_type` | CREATE, READ, UPDATE, DELETE... |
| `audit_resource_type` | THREAD, MESSAGE, KB... |
| `audit_status` | SUCCESS, ERROR... |
| `confiabilidade` | Nivel de confiabilidade do usuário |
| `data_classification` | Classificação de dados |
| `lgpd_check_status` | Status de verificação LGPD |
| `lgpd_classification` | Classificação LGPD |
| `message_role` | user, assistant, system |
| `source_type` | Tipo de fonte do documento |

---

## Tabelas em 'public' (LEGADO)

Além do esquema `xpertia`, existem **4 tabelas legadas** em `public`:

| Tabela | Colunas | Descrição |
|--------|---------|-----------|
| `kb_constituicao` | id, vector_id, embedding, metadata | Embeddings da Constituição |
| `kb_lei14133` | id, vector_id, embedding, metadata | Embeddings da Lei 14.133 |
| `kb_lgpd` | id, vector_id, embedding, metadata | Embeddings da LGPD |
| `kb_siafi` | id, vector_id, embedding, metadata | Embeddings do SIAFI |

**Nota:** Estas tabelas usam o tipo `USER-DEFINED` para embeddings (pgvector).

---

## Relacionamentos (Foreign Keys)

Todas as FKs estão **contidas no esquema 'xpertia'**:

```sql
documents.kb_id → knowledge_bases.id
kb_embeddings.document_id → documents.id
messages.thread_id → threads.id
messages.user_id → users.id
sessions.user_id → users.id
threads.user_id → users.id
```

**Sem referências cruzadas entre esquemas.**

---

## Possíveis Conflitos

### ⚠️ Conflito Identificado: Duplicidade de Estruturas de KB

Existem **3 estruturas de KB diferentes**:

1. **Tabelas legadas em `public`** (kb_constituicao, kb_lei14133, etc.)
   - Criadas manualmente
   - Uma tabela por documento
   - Estrutura flat

2. **Tabelas da aplicação em `xpertia`** (knowledge_bases, documents, kb_embeddings)
   - Modelo relacional normalizado
   - Integrada com threads/messages
   - View de estatísticas

3. **Tabelas do Mastra em `mastra`** (serão criadas automaticamente)
   - Gerenciadas pelo framework
   - Usadas para storage, observability, e RAG interno

**Impacto:** Baixo - cada estrutura serve a um propósito diferente.

---

## Recomendações

1. **Preservar esquema 'xpertia'**: Contém dados ativos da aplicação (audit_logs, messages, threads)

2. **Consolidar estruturas de KB** (futuro):
   - Avaliar se as tabelas kb_* em `public` ainda são necessárias
   - Considerar migrar dados para estrutura normalizada em `xpertia`
   - Ou usar exclusivamente o RAG do Mastra (esquema `mastra`)

3. **Mastra usará 'mastra'**: Sem interferência nas tabelas existentes

4. **Nenhuma ação imediata necessária**: Estruturas coexistem sem conflitos técnicos

---

## Queries de Verificação

```sql
-- Verificar dados nas tabelas ativas
SELECT 'users', COUNT(*) FROM xpertia.users
UNION ALL SELECT 'threads', COUNT(*) FROM xpertia.threads
UNION ALL SELECT 'messages', COUNT(*) FROM xpertia.messages;

-- Verificar estrutura de KB
SELECT * FROM xpertia.knowledge_bases;

-- Verificar view de estatísticas
SELECT * FROM xpertia.v_kb_vector_stats;
```

---

## Conclusão

✅ **Sem conflitos críticos** entre esquema 'xpertia' (aplicação) e 'mastra' (framework)  
⚠️ **Observação:** Duplicidade de estruturas de KB pode ser consolidada no futuro  
✅ **Migração limpa:** Tabelas Mastra removidas de 'public' com sucesso
