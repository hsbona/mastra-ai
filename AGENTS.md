# AGENTS.md

Guia para agentes de IA trabalhando neste repositório.

---

## ⚠️ REGRAS CRÍTICAS

| # | Regra | Ação |
|---|-------|------|
| 1 | 🧠 **Carregar skill do Mastra primeiro** | Use `/mastra` antes de qualquer código |
| 2 | 🗑️ **Exclusão sempre via lixeira** | `trash-put` ou `gio trash` (nunca `rm`) |
| 3 | ⚙️ **Gerenciar serviços apenas via script** | Use `./scripts/mastra-studio.sh` — nunca `kill`/`pkill` |
| 4 | 🗄️ **Nunca alterar banco sem autorização** | Migrations proibidas sem confirmação explícita |
| 5 | 🚫 **Sem valores hard-coded** | Use `.env` e arquivos de configuração |
| 6 | 📁 **Ignorar `.archive`** | Nunca processar arquivos desta pasta |

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

Projeto **Mastra** (TypeScript) para aplicações com IA. Consumido **exclusivamente via Mastra Studio** — não implemente interface de usuário.

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
| Mastra Core | ^1.11.0 |
| Modelo | groq/llama-3.3-70b-versatile |

---

## Estrutura de Pastas

```
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
./scripts/mastra-studio.sh start   # Inicia túnel + studio
./scripts/mastra-studio.sh status  # Verifica status
./scripts/mastra-studio.sh stop    # Para tudo
./scripts/mastra-studio.sh logs    # Logs em tempo real

# Build e produção
pnpm run build
pnpm run start
```

---

## Infraestrutura

### PostgreSQL Remoto (via Túnel SSH)

**NUNCA** use PostgreSQL local. O banco está em VPS e requer túnel:

```bash
./scripts/tunnel-vps.sh start    # Inicia túnel localhost:5432 → VPS:5432
./scripts/tunnel-vps.sh status   # Verifica conexão
```

- `DATABASE_URL` aponta para `localhost:5432` (via túnel)
- **NÃO** altere para conexão direta ao VPS
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
- [ ] Túnel SSH ativo (`./scripts/tunnel-vps.sh status`)?
- [ ] Mastra Studio iniciado (`./scripts/mastra-studio.sh start`)?
- [ ] Criou em `src/mastra/{agents,workflows,tools}/`?
- [ ] Exportou em `src/mastra/index.ts`?
- [ ] Não criou código de interface?

---

## Recursos

- [Documentação do Mastra](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
