# AGENTS.md

This document provides guidance for AI coding agents working in this repository.

## CRITICAL: Mastra Skill Required

**BEFORE doing ANYTHING with Mastra code or answering Mastra questions, load the Mastra skill FIRST.**

See [Mastra Skills section](#mastra-skills) for loading instructions.

---

## Project Overview

This is a **Mastra** project written in TypeScript. Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack.

### ⚠️ IMPORTANT: Mastra Studio as UI

**This project is consumed EXCLUSIVELY via Mastra Studio.**

- ✅ **IN SCOPE**: Agents, Workflows, Tools, Memory, Storage, Observability
- ✅ **IN SCOPE**: APIs e endpoints servidos pelo Mastra
- ❌ **OUT OF SCOPE**: Desenvolvimento de UI/frontend
- ❌ **OUT OF SCOPE**: Interfaces web, mobile ou desktop

> **Nunca implemente código de interface com o usuário neste projeto.** O Mastra Studio já fornece a interface completa para interação com os agents e workflows.

---

## Technology Stack

### Core Runtime

| Component | Version | Description |
|-----------|---------|-------------|
| **Node.js** | >=22.13.0 | Runtime JavaScript |
| **pnpm** | 10.30.3 | Package manager |
| **TypeScript** | 5.9.3 | Language & compiler |
| **Module System** | ES2022 | ES Modules (`"type": "module"`) |

### Mastra Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | ^1.11.0 | Core framework (agents, workflows, tools) |
| `mastra` (CLI) | ^1.3.8 | CLI para dev, build e deploy |
| `@mastra/memory` | ^1.6.2 | Memória conversacional para agents |
| `@mastra/pg` | ^1.0.0 | Storage PostgreSQL + pgvector (vetor) |
| `@mastra/observability` | ^1.4.0 | Tracing, métricas e telemetria |
| `@mastra/loggers` | ^1.0.2 | Logging (PinoLogger) |
| `@mastra/evals` | ^1.1.2 | Avaliação de performance de agents |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| **Zod** | ^4.3.6 | Validação de schemas e type safety |

### Model Provider (Configurável)

| Provider | Modelo Atual | Uso |
|----------|--------------|-----|
| **Groq** | llama-3.3-70b-versatile | Modelo padrão para agents |

> Os modelos podem ser trocados via configuração. Veja `.env` para API keys.

---

## Commands

Use these commands to interact with the project.

### Installation

```bash
pnpm install
```

### Development

**Inicia o Mastra Studio** em `http://localhost:4111`:

```bash
pnpm run dev
```

> O Mastra Studio é a interface de desenvolvimento e consumo dos agents.

### Build

Build para produção (gera servidor Node.js):

```bash
pnpm run build
```

### Start

Inicia o servidor em produção:

```bash
pnpm run start
```

---

## Project Structure

Folders organize your agent's resources, like agents, tools, and workflows.

| Folder | Description |
|--------|-------------|
| `src/mastra` | Entry point for all Mastra-related code and configuration. |
| `src/mastra/agents` | Define and configure your agents - their behavior, goals, and tools. |
| `src/mastra/workflows` | Define multi-step workflows that orchestrate agents and tools together. |
| `src/mastra/tools` | Create reusable tools that your agents can call |
| `src/mastra/mcp` | (Optional) Implement custom MCP servers to share your tools with external agents |
| `src/mastra/scorers` | (Optional) Define scorers for evaluating agent performance over time |
| `src/mastra/public` | (Optional) Contents are copied into the `.build/output` directory during the build process, making them available for serving at runtime |

### Top-level files

Top-level files define how your Mastra project is configured, built, and connected to its environment.

| File | Description |
|------|-------------|
| `src/mastra/index.ts` | Central entry point where you configure and initialize Mastra. |
| `.env` | Environment variables (API keys, configs). **Nunca commite este arquivo.** |
| `.env.example` | Template para variáveis de ambiente. |
| `package.json` | Defines project metadata, dependencies, and available npm scripts. |
| `tsconfig.json` | Configures TypeScript options such as path aliases, compiler settings, and build output. |
| `.infra/docker/` | Configuração Docker para PostgreSQL + pgvector. |
| `.env.example` | Template para variáveis de ambiente (incluindo `DATABASE_URL`). |

---

## Architecture Notes

### Storage & Memory

- **Storage**: `PostgresStore` com PostgreSQL + pgvector
- **Memory**: `@mastra/memory` com PostgreSQL para persistência
- **Vector Store**: `PgVector` para embeddings e busca semântica
- **Observability**: Traces salvos no PostgreSQL para visualização no Mastra Studio
- **Infraestrutura**: Docker Compose em `.infra/docker/`

### Agents

Os agents são definidos em `src/mastra/agents/` e registrados em `src/mastra/index.ts`.

Exemplo de configuração:
```typescript
export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: `...`,
  model: 'groq/llama-3.3-70b-versatile',
  memory: new Memory(), // Opcional: habilita memória conversacional
});
```

### Workflows

Workflows são definidos em `src/mastra/workflows/` usando `createWorkflow` e `createStep`.

### Tools

Tools são criadas com `createTool` e podem ser usadas por agents ou workflows.

---

## Infrastructure Setup

### PostgreSQL com Docker

O projeto utiliza PostgreSQL com extensão pgvector para storage e busca vetorial.

#### 1. Iniciar a infraestrutura

```bash
cd .infra/docker
cp .env.example .env
# Edite .env se necessário
docker-compose up -d
```

#### 2. Configurar variáveis de ambiente

No arquivo `.env` do projeto (raiz):

```bash
DATABASE_URL=postgresql://mastra:mastra_secret@localhost:5432/xpertia
```

#### 3. Verificar conexão

```bash
docker-compose ps
```

#### 4. Parar a infraestrutura

```bash
docker-compose down
```

> Veja `.infra/docker/README.md` para mais detalhes.

---

## Mastra Skills

Skills are modular capabilities that extend agent functionalities. They provide pre-built tools, integrations, and workflows that agents can leverage to accomplish tasks more effectively.

This project has skills installed for the following agents:

- Claude Code
- Cursor

### Loading Skills

1. **Load the Mastra skill FIRST** - Use `/mastra` command or Skill tool
2. **Never rely on cached knowledge** - Mastra APIs change frequently between versions
3. **Always verify against current docs** - The skill provides up-to-date documentation

**Why this matters:** Your training data about Mastra is likely outdated. Constructor signatures, APIs, and patterns change rapidly. Loading the skill ensures you use current, correct APIs.

Skills are automatically available to agents in your project once installed. Agents can access and use these skills without additional configuration.

---

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Mastra .well-known skills discovery](https://mastra.ai/.well-known/skills/index.json)
- [Mastra Studio](http://localhost:4111) - Interface de desenvolvimento (rodando localmente)

---

## Checklist para Novos Agents

Ao criar um novo agent, workflow ou tool:

- [ ] Carregou a skill `/mastra` antes de começar?
- [ ] PostgreSQL está rodando (`docker-compose -f .infra/docker/docker-compose.yml ps`)?
- [ ] Definiu o agent/workflow/tool no arquivo apropriado em `src/mastra/`?
- [ ] Exportou e registrou em `src/mastra/index.ts`?
- [ ] Testou via Mastra Studio (`pnpm run dev`)?
- [ ] **NÃO** criou código de UI/frontend?
