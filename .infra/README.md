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
├── README.md                           # Este arquivo
├── PLANO_EXECUCAO_VPS.md             # 📋 PLANO COMPLETO (aguardando autorização)
├── ARCHITECTURE.md                   # 🏗️ Arquitetura da VPS
├── PM2_VS_DOCKER.md                  # 🤔 Por que PM2 fora do Docker?
├── NGINX_IN_DOCKER.md                # 🌐 Por que Nginx dentro do Docker?
├── WORKFLOW_REMOTO.md                # 💻 Local vs Remoto: como desenvolver?
├── vps-deployment-guide.md           # 🚀 Guia completo de deploy na VPS
├── postgresql-optimization.md        # 🔧 Configuração do PostgreSQL
├── pm2-ecosystem.config.js           # ⚙️ Configuração PM2 (8GB)
├── scripts/                          # Scripts de automação
│   └── setup-vps.sh                  # Script de setup automático da VPS
├── postgreSQL/                       # Scripts SQL para PostgreSQL
│   └── 01-init-database.sql          # Script de inicialização
└── docker/                           # Configurações Docker
    ├── docker-compose.prod.yml       # Docker Compose (PostgreSQL 8GB)
    └── docker-compose.yml            # Configuração original (referência)
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

## 🚀 Deploy na VPS

**MODO DESENVOLVIMENTO:** Remoto (VSCode SSH)  
**STATUS:** Aguardando autorização - veja [`PLANO_EXECUCAO_VPS.md`](PLANO_EXECUCAO_VPS.md)

Para configurar o ambiente de produção na VPS (5.189.185.146):

1. **Leia o PLANO DE EXECUÇÃO:** [`PLANO_EXECUCAO_VPS.md`](PLANO_EXECUCAO_VPS.md)
   - Ordem detalhada dos passos
   - Checkpoints de validação
   - Procedimento de rollback

2. **Leia o guia completo:** [`vps-deployment-guide.md`](vps-deployment-guide.md)
   - Explicações sobre Nginx e PM2
   - Workflow de desenvolvimento remoto
   - Configuração de firewall
   - Integração Nginx + Mastra Studio

3. **Entenda a arquitetura:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
   - Por que PM2 fora do Docker
   - Por que Nginx dentro do Docker
   - Fluxo de comunicação entre serviços

4. **Use as configurações:**
   - [`docker/docker-compose.prod.yml`](docker/docker-compose.prod.yml) - PostgreSQL + Nginx
   - [`pm2-ecosystem.config.js`](pm2-ecosystem.config.js) - Mastra Studio
   - [`scripts/setup-vps.sh`](scripts/setup-vps.sh) - Setup automático

### Resumo da Alocação de Recursos (AMPLIADA)

Como a VPS tem **24GB RAM disponíveis**, os recursos foram AMPLIADOS:

| Serviço | RAM | CPU | Propósito | Status |
|---------|-----|-----|-----------|--------|
| **PostgreSQL** | **8GB** | **3 cores** | Cache para RAG/embeddings | ⬆️ AMPLIADO |
| **Mastra Studio (PM2)** | **8GB** | **3 cores** | Agents e workflows | ⬆️ AMPLIADO |
| **Nginx** | **1GB** | **1 core** | Proxy reverso + SSL | ⬆️ AMPLIADO |
| **SO** | ~6GB | 1 core | Sistema operacional | Margem |
| **Total** | **~23GB** | **8 cores** | - | VPS: 24GB/8cores |

**Margem de segurança:** ~1GB RAM para picos de uso

---

*Última atualização: 2026-03-13*
