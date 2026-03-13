# 🏗️ Infraestrutura XpertIA

Este diretório contém as **definições de infraestrutura** necessárias para recriar o ambiente do XpertIA.

---

## ⚠️ REGRAS CRÍTICAS

| # | Regra | Descrição |
|---|-------|-----------|
| 1 | 📁 **Este é o local oficial** | Todas as definições de modificações no ambiente DEVEM estar em `.infra/` |
| 2 | 📝 **Sempre atualize** | Quando houver mudança no ambiente, atualize os arquivos em `.infra/` |
| 3 | 🔒 **Autorização obrigatória** | Mudanças na infraestrutura PRECISAM ser **EXPLICITAMENTE autorizadas** |

---

## 📁 Estrutura

```
.infra/
├── README.md                    # Este arquivo
├── postgreSQL/                  # Scripts SQL para PostgreSQL
│   └── 01-init-database.sql     # Único script necessário (novo ambiente)
└── docker/                      # Configurações Docker (referência)
```

---

## 🗄️ PostgreSQL

### Instalação em Servidor Limpo

Para novo ambiente, execute **apenas este script**:

```bash
# Como superusuário PostgreSQL
psql -U postgres -d xpertia -f .infra/postgreSQL/01-init-database.sql
```

O script cria:
- Extensões necessárias (vector, uuid-ossp, pgcrypto, etc.)
- Esquemas: `mastra`, `xpertia_rag`, `xpertia`
- Comentários documentando propósito de cada esquema

### Esquemas

| Esquema | Propósito | Gerenciado por | Status |
|---------|-----------|----------------|--------|
| `mastra` | Dados do **framework** (storage, observability, traces) | Mastra | Vazio |
| `xpertia_rag` | Dados da **aplicação** (KBs, embeddings, RAG) | Mastra (via PgVector) | Vazio |
| `xpertia` | Dados legados **PROTEGIDO** | Aplicação legada | Contém dados |
| `public` | Esquema padrão PostgreSQL | PostgreSQL | Vazio |

#### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  mastra        → Framework (storage, traces)            │
│  xpertia_rag   → Aplicação (KBs, embeddings)            │
│  xpertia       → Legado PROTEGIDO (não usar)            │
└─────────────────────────────────────────────────────────┘
```

#### Configuração no Código

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

> **Comportamento:**
> - **Esquema 'mastra'**: Mastra cria tabelas automaticamente ao iniciar (se não existirem)
> - **Esquema 'xpertia_rag'**: Tabelas criadas sob demanda via `pgVector.createIndex()`
> - **Segurança**: Nunca sobrescreve dados existentes (usa CREATE TABLE IF NOT EXISTS)

---

## 🔐 Política de Mudanças

### ❌ PROIBIDO sem autorização:

- Criar/alterar/remover esquemas
- Modificar extensões PostgreSQL
- Executar migrations em dados existentes

### ✅ Permitido (com documentação):

- Adicionar scripts de seed
- Criar índices adicionais

---

## 📚 Documentação Adicional

- **Análise do esquema legado:** `docs/database-schema-analysis.md`
- **Arquitetura Xpert-Gov:** `docs/xpert-gov-arquitetura-completa.md`

---

*Última atualização: 2026-03-12*
