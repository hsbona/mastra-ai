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
├── README.md                 # Este arquivo
├── postgreSQL/              # Scripts SQL para PostgreSQL
│   ├── 01-extensions.sql    # Extensões necessárias
│   ├── 02-schemas.sql       # Esquemas do banco
│   └── 03-pgvector-config.sql # Configuração RAG/Embeddings
└── docker/                  # Configurações Docker (referência)
```

---

## 🗄️ PostgreSQL

### Como usar os scripts

Execute na ordem numérica:

```bash
# 1. Extensões (como superusuário)
psql -U postgres -d xpertia -f .infra/postgreSQL/01-extensions.sql

# 2. Esquemas
psql -U xpertia -d xpertia -f .infra/postgreSQL/02-schemas.sql

# 3. Configuração pgvector
psql -U xpertia -d xpertia -f .infra/postgreSQL/03-pgvector-config.sql
```

### Esquemas

| Esquema | Propósito | Gerenciado por |
|---------|-----------|----------------|
| `mastra` | Dados do framework (storage, observability, RAG) | Mastra (automático) |
| `xpertia` | Dados da aplicação (knowledge base, documentos) | Aplicação |
| `public` | Objetos compartilhados (minimizado) | PostgreSQL |

### Extensões Instaladas

| Extensão | Versão | Propósito |
|----------|--------|-----------|
| `vector` | 0.8.2 | Embeddings e busca vetorial (RAG) |
| `uuid-ossp` | 1.1 | Geração de UUIDs |
| `pgcrypto` | 1.3 | Criptografia e hashing |
| `unaccent` | 1.1 | Busca de texto sem acentos |
| `btree_gist` | 1.7 | Índices GiST com B-tree |

---

## 🔐 Política de Mudanças

### ❌ PROIBIDO sem autorização explícita:

- Criar/alterar/remover esquemas
- Criar/alterar/remover tabelas do Mastra
- Modificar extensões do PostgreSQL
- Alterar configurações de performance
- Executar migrations que afetem dados existentes

### ✅ Permitido (com documentação):

- Adicionar novos scripts em `.infra/postgreSQL/`
- Atualizar comentários em objetos existentes
- Criar índices adicionais (após aprovação)
- Adicionar dados de seed em scripts separados

### 📝 Processo de Mudança:

1. **Propor** a mudança com justificativa
2. **Aguardar** autorização explícita
3. **Testar** em ambiente de desenvolvimento
4. **Documentar** a mudança em `.infra/`
5. **Executar** com aprovação

---

## 🔄 Recriação do Banco

Para recriar o banco de dados do zero:

```bash
# 1. Conectar ao PostgreSQL
psql -U postgres

# 2. Criar banco e usuário
CREATE DATABASE xpertia;
CREATE USER xpertia WITH ENCRYPTED PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE xpertia TO xpertia;

# 3. Executar scripts na ordem
\c xpertia
\i .infra/postgreSQL/01-extensions.sql
\i .infra/postgreSQL/02-schemas.sql
\i .infra/postgreSQL/03-pgvector-config.sql
```

---

## 📋 Checklist de Manutenção

- [ ] Scripts estão atualizados com o ambiente real?
- [ ] Todas as extensões estão documentadas?
- [ ] Permissões estão corretas?
- [ ] Índices estão otimizados?
- [ ] Backups estão configurados?

---

*Última atualização: 2026-03-12*  
*Versão: 1.0*
