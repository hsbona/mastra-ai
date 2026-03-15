# AGENTS.md

Guia para agentes de IA trabalhando neste repositório.

---

## ⚠️ REGRAS CRÍTICAS

| # | Regra | Ação |
|---|-------|------|
| 1 | 🐝 **Agents Swarm obrigatório** | Use múltiplos agents em paralelo para todas as tarefas |
| 2 | 🧠 **Carregar skill do Mastra primeiro** | Use `/mastra` antes de qualquer código |
| 3 | 🗑️ **Exclusão sempre via lixeira** | `trash-put` ou `gio trash` (nunca `rm`) |
| 4 | ⚙️ **Gerenciar serviços via script** | Use `./scripts/mastra-studio.sh` — nunca `kill`/`pkill` |
| 5 | 🔄 **Reiniciar para aplicar mudanças** | Use `./scripts/mastra-studio.sh restart` após alterar código |
| 6 | 🗄️ **Nunca alterar banco sem autorização** | Migrations proibidas sem confirmação |
| 6a| 🚫 **NUNCA usar esquema 'xpertia'** | Esquema legado protegido |
| 7 | 🚫 **Sem valores hard-coded** | Use `.env` e arquivos de configuração |
| 8 | 📁 **Ignorar `.archive`** | Nunca processar arquivos desta pasta |

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

## Visão Geral

Projeto **Xpert** — aplicação **Mastra** (TypeScript) para aplicações com IA.

> 📁 **Localização:** O projeto está na pasta `Xpert/`, não na raiz do repositório.

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

## Estrutura

```
Xpert/
src/mastra/
├── index.ts       # Ponto de entrada
├── agents/        # Definição de agents
├── workflows/     # Fluxos de trabalho
├── tools/         # Ferramentas
└── ...
```

---

## Comandos

### Mastra Studio

```bash
# Iniciar
./scripts/mastra-studio.sh start

# Parar
./scripts/mastra-studio.sh stop

# Reiniciar (após alterar código)
./scripts/mastra-studio.sh restart

# Status
./scripts/mastra-studio.sh status

# Logs
./scripts/mastra-studio.sh logs
```

> 📝 **Log:** `/tmp/mastra-studio.log`

### ⚠️ Aplicar Alterações

**As alterações só aparecem após reiniciar:**

```bash
./scripts/mastra-studio.sh restart
```

**Fluxo:**
1. Altere o código
2. Execute `./scripts/mastra-studio.sh restart`
3. Acesse http://localhost:4111

---

## Ambiente de Desenvolvimento

Desenvolvimento é feito **DIRETAMENTE na VPS** via VSCode Remote SSH.

| Configuração | Valor |
|--------------|-------|
| **SO** | AlmaLinux 9.7 |
| **IP** | `5.189.185.146` |
| **Acesso** | SSH / VSCode Remote |
| **Repositório** | `/root/dev/xpertia/mastra-ai` |
| **PostgreSQL** | localhost:5432 |

### Port Forwarding

| Porta Local | Porta Remota | Serviço |
|-------------|--------------|---------|
| `localhost:4111` | `localhost:4111` | Mastra Studio |

> 💡 O VSCode detecta automaticamente processos e oferece port forwarding.

### PostgreSQL

```bash
# Verificar status
sudo systemctl status postgresql

# Conectar
sudo -u postgres psql -d xpertia
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

## Checklist

- [ ] Carregou a skill `/mastra`?
- [ ] PostgreSQL acessível (`./scripts/mastra-studio.sh status`)?
- [ ] Mastra Studio iniciado (`./scripts/mastra-studio.sh start`)?
- [ ] Criou em `src/mastra/{agents,workflows,tools}/`?
- [ ] Exportou em `src/mastra/index.ts`?
- [ ] **Reiniciou o Studio após alterações (`./scripts/mastra-studio.sh restart`)?**
- [ ] Verificou que as alterações apareceram em http://localhost:4111?

---

## Recursos

- [Documentação do Mastra](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
