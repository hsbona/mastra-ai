# 🏗️ Infraestrutura XpertIA

Configurações de infraestrutura para o projeto Xpert (Mastra AI).

> ⚠️ **IMPORTANTE:** Esta pasta está **versionada no git**. Qualquer mudança na VPS deve ser refletida aqui.

---

## 📁 Estrutura

```
infra/
├── README.md                     # Este arquivo
├── docker/
│   ├── docker-compose.dev.yml    # PostgreSQL para desenvolvimento
│   └── docker-compose.prod.yml   # PostgreSQL otimizado para produção
├── pm2/
│   └── ecosystem.config.js       # Configuração PM2 para Mastra
└── postgreSQL/
    └── 01-init-database.sql      # Inicialização do banco de dados
```

---

## 🖥️ Configurações do Sistema

### Hostname

| Configuração | Valor |
|--------------|-------|
| **Hostname** | `dataxpertia-dev` |
| **IP** | `5.189.185.146` |

Para alterar:
```bash
hostnamectl set-hostname dataxpertia-dev
echo "127.0.0.1 dataxpertia-dev" >> /etc/hosts
```

---

## 🗄️ PostgreSQL

### Script de Inicialização

Execute **apenas em novo ambiente**:

```bash
psql -U postgres -d xpertia -f infra/postgreSQL/01-init-database.sql
```

O script cria:
- Extensões: `vector`, `uuid-ossp`, `pgcrypto`, `unaccent`, `btree_gist`
- Esquemas: `mastra`, `xpertia_rag`, `xpertia` (legado)

### Esquemas

| Esquema | Propósito | Gerenciado por |
|---------|-----------|----------------|
| `mastra` | Storage, observability, traces | Mastra |
| `xpertia_rag` | KBs, embeddings, RAG | Mastra (PgVector) |
| `xpertia` | **PROTEGIDO** - Dados legados | Não usar |

---

## 🚀 Comandos

### Docker Compose

```bash
# Desenvolvimento
cd infra/docker && docker compose -f docker-compose.dev.yml up -d

# Produção
cd infra/docker && docker compose -f docker-compose.prod.yml up -d
```

### PM2

```bash
# Iniciar Mastra (execute de dentro de Xpert/)
pm2 start infra/pm2/ecosystem.config.js

# Comandos úteis
pm2 status
pm2 logs xpertia-mastra
pm2 restart xpertia-mastra
pm2 stop xpertia-mastra
```

---

## ⚠️ Regras

| Regra | Descrição |
|-------|-----------|
| **Sincronização obrigatória** | Toda mudança na VPS deve ser refletida aqui |
| **Commit após mudança** | `git add infra/ && git commit -m "infra: ..."` |
| **Nunca alterar** | esquema `xpertia` (dados legados) |
| **Migrations** | **SEMPRE** com autorização explícita |

---

*Última atualização: 2026-03-14*
