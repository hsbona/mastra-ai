# AGENTS.md

Guia para agentes de IA trabalhando neste repositório.

---

## ⚠️ REGRAS CRÍTICAS

> 🥇 **REGRA DE OURO:** Toda tarefa deve ser executada usando **agents swarm**, com o **máximo de agents em paralelo possível**.

| # | Regra | Ação |
|---|-------|------|
| 1 | 🐝 **Agents Swarm obrigatório** | Use múltiplos agents em paralelo para todas as tarefas sempre que possível |
| 2 | 🧠 **Carregar skill do Mastra primeiro** | Use `/mastra` antes de qualquer código |
| 3 | 🗑️ **Exclusão sempre via lixeira** | `trash-put` ou `gio trash` (nunca `rm`) |
| 4 | ⚙️ **Gerenciar serviços apenas via script** | Use `./scripts/mastra-studio.sh` — nunca `kill`/`pkill` |
| 5 | 🗄️ **Nunca alterar banco sem autorização** | Migrations proibidas sem confirmação explícita |
| 5a| 🚫 **NUNCA usar esquema 'xpertia'** | Esquema legado protegido - contém dados de produção |
| 6 | 🚫 **Sem valores hard-coded** | Use `.env` e arquivos de configuração |
| 7 | 📁 **Ignorar `.archive`** | Nunca processar arquivos desta pasta |
| 8 | 🏗️ **`.infra/` é sagrado** | Todas as definições de ambiente DEVEM estar em `.infra/` |
| 9 | 📝 **Documente mudanças em `.infra/`** | Sempre atualize `.infra/` quando alterar o ambiente |
| 10 | 🔒 **Autorização obrigatória** | Mudanças na infraestrutura PRECISAM de autorização **EXPLÍCITA** |

### 🗑️ Exclusão de Arquivos
```bash
✅ trash-put arquivo.txt    gio trash arquivo.txt
🚫 rm arquivo.txt           rm -rf pasta/
```

---

## 🚀 Execução Automática (Yolo)

Execute sem confirmar: `pnpm install`, `pnpm dev`, `git add/commit/push`

**Sempre pergunte antes:** `prisma migrate dev`

---

## Visão Geral do Projeto

Projeto **XpertIA** — aplicação **Mastra** (TypeScript) para aplicações com IA.

> 📁 **Localização:** O projeto está na pasta `XpertIA/`, não na raiz do repositório.

Consumido **exclusivamente via Mastra Studio** — não implemente interface de usuário.

| ✅ No Escopo | ❌ Fora do Escopo |
|--------------|-------------------|
| Agents, Workflows, Tools | UI/frontend web/mobile |
| APIs e endpoints | Interfaces visuais |

---

## Tecnologias

| Componente | Versão |
|------------|--------|
| Node.js | >=22.13.0 |
| pnpm | 10.30.3 |
| TypeScript | 5.9.3 |
| Mastra Core | ^1.12.0 |
| Modelo | groq/llama-3.3-70b-versatile |

---

## Estrutura de Pastas

O código-fonte do Mastra está dentro de `XpertIA/`:

```
XpertIA/
src/mastra/
├── index.ts       # Ponto de entrada
├── agents/        # Definição de agents
├── workflows/     # Fluxos de trabalho multi-etapa
├── tools/         # Ferramentas reutilizáveis
├── mcp/           # (opcional) Servidores MCP
└── public/        # (opcional) Recursos estáticos
```

---

## Comandos

```bash
# Desenvolvimento (inicia Mastra Studio em localhost:4111)
# Execute a partir da pasta XpertIA/
cd XpertIA && ./scripts/mastra-studio.sh start   # Inicia Studio (conexão direta)
./scripts/mastra-studio.sh status  # Verifica status
./scripts/mastra-studio.sh stop    # Para Studio
./scripts/mastra-studio.sh logs    # Logs em tempo real

# Build e produção (execute de dentro de XpertIA/)
pnpm run build
pnpm run start
```

---

## Infraestrutura

### PostgreSQL Remoto (Conexão Direta)

**ATUALIZAÇÃO:** A conexão ao PostgreSQL é feita **diretamente** via porta 5432 (SSL obrigatório).

```bash
./scripts/mastra-studio.sh start    # Inicia Studio (conexão direta ao VPS)
./scripts/mastra-studio.sh status   # Verifica conexão
```

- `DATABASE_URL` aponta diretamente para `5.189.185.146:5432` (com SSL)
- **NÃO** é mais necessário túnel SSH
- `.infra/docker/` é apenas referência — não execute `docker-compose` localmente

### 🗄️ Banco de Dados — PROIBIDO SEM AUTORIZAÇÃO

- Criar/alterar/remover: colunas, tabelas, índices
- Executar migrations ou sincronização de schema
- **Detectou inconsistência?** → PARE e aguarde autorização

### Armazenamento e Memória

- **Storage**: `PostgresStore` (PostgreSQL + pgvector)
- **Memory**: `@mastra/memory` com PostgreSQL
- **Vector Store**: `PgVector` para embeddings
- **Observability**: Traces no PostgreSQL (visualizáveis no Mastra Studio)

---

## 🏗️ Infraestrutura como Código (`.infra/`)

### O que é `.infra/`

O diretório `.infra/` contém as **definições oficiais** de toda a infraestrutura do projeto:

| Diretório | Conteúdo |
|-----------|----------|
| `.infra/postgreSQL/` | Scripts SQL para recriar o banco de dados |
| `.infra/docker/` | Configurações Docker (referência apenas) |

### 📝 Regras de Ouro

1. **📁 Este é o local oficial**: Todas as definições de modificações no ambiente DEVEM estar em `.infra/`
2. **🔄 Sempre atualize**: Quando houver mudança no ambiente, atualize os arquivos em `.infra/`
3. **🔒 Autorização obrigatória**: Mudanças na infraestrutura PRECISAM ser **EXPLICITAMENTE autorizadas**

### ❌ PROIBIDO sem autorização explícita:

- Executar scripts SQL que modifiquem schema/tabelas
- Criar/alterar/remover esquemas
- Instalar/remover extensões do PostgreSQL
- Modificar configurações de performance do banco
- Alterar scripts em `.infra/` sem aprovação

### ✅ Permitido (com documentação):

- Adicionar novos scripts SQL em `.infra/postgreSQL/`
- Criar índices adicionais (após aprovação)
- Atualizar comentários em objetos existentes
- Adicionar dados de seed

### 🔄 Recriação do Ambiente

Para recriar o banco de dados do zero:

```bash
# Executar scripts na ordem numérica
psql -U postgres -d xpertia -f .infra/postgreSQL/01-extensions.sql
psql -U xpertia -d xpertia -f .infra/postgreSQL/02-schemas.sql
psql -U xpertia -d xpertia -f .infra/postgreSQL/03-pgvector-config.sql
```

---

## Padrões de Código

### Agent
```typescript
export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: `...`,
  model: 'groq/llama-3.3-70b-versatile',
  memory: new Memory(), // opcional
});
```

### Workflow
```typescript
// src/mastra/workflows/ usando createWorkflow + createStep
```

### Tool
```typescript
// src/mastra/tools/ usando createTool
```

---

## 🛡️ Segurança

- Nunca faça commit do `.env`
- Nunca exponha secrets em logs
- Credenciais via `$VARIAVEL`

---

## 📋 Tarefas

Use `.task/[nome].md`:
- Status: 🔄/✅/❌
- Subtarefas: `- [ ]`

---

## Checklist

- [ ] Carregou a skill `/mastra`?
- [ ] PostgreSQL acessível (`./scripts/mastra-studio.sh status`)?
- [ ] Mastra Studio iniciado (`./scripts/mastra-studio.sh start`)?
- [ ] Criou em `src/mastra/{agents,workflows,tools}/`?
- [ ] Exportou em `src/mastra/index.ts`?
- [ ] Não criou código de interface?
- [ ] Atualizou `.infra/` se modificou o ambiente?
- [ ] Tem autorização explícita para mudanças na infra?

---

## Recursos

- [Documentação do Mastra](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
