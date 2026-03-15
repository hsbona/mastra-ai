# AGENTS.md

Guia para agentes de IA trabalhando neste repositório.

---

## ⚠️ REGRAS CRÍTICAS

| # | Regra | Ação |
|---|-------|------|
| 1 | 🐝 **Agents Swarm obrigatório** | Use múltiplos agents em paralelo para todas as tarefas |
| 2 | 🧠 **Carregar skill do Mastra primeiro** | Use `/mastra` antes de qualquer código |
| 3 | 🗑️ **Exclusão sempre via lixeira** | `gio trash` (preferido) ou `trash-put` (nunca `rm`)
| 4 | ⚙️ **Gerenciar serviços via script** | Use `./scripts/mastra-studio.sh` — nunca `kill`/`pkill` |
| 5 | 🔄 **Reiniciar para aplicar mudanças** | Use `./scripts/mastra-studio.sh restart` após alterar código |
| 6 | 🗄️ **Nunca alterar banco sem autorização** | Migrations proibidas sem confirmação |
| 6a| 🚫 **NUNCA usar esquema 'xpertia'** | Esquema legado protegido |
| 7 | 🚫 **Sem valores hard-coded** | Use `.env` e arquivos de configuração |
| 8 | 📁 **Ignorar `.archive`** | Nunca processar arquivos desta pasta |
| 9 | 📚 **SEMPRE verificar documentação** | APIs mudam constantemente - nunca confie na memória |

### 🗑️ Exclusão de Arquivos
```bash
✅ gio trash arquivo.txt         # Preferido - disponível nativamente
✅ trash-put arquivo.txt         # Alternativa - requer instalação
🚫 rm arquivo.txt                # PROIBIDO
🚫 rm -rf pasta/                 # PROIBIDO
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

## 📚 Documentação Mastra (CRÍTICO)

**⚠️ O Mastra evolui constantemente. APIs mudam, construtores mudam de assinatura, patterns são refatorados.**

> **NUNCA confie no conhecimento interno. Sempre verifique a documentação atual antes de escrever código.**

### Estratégia de Lookup (Fallback Automático)

A skill `/mastra` usa um sistema de 3 camadas para garantir documentação precisa:

```
┌─────────────────────────────────────────────────────────────────┐
│ CAMADA 1: Context7 MCP (Recomendado)                           │
│ → Mais rápido e atualizado                                     │
│ → Config: .agents/mcp/context7.json                            │
│ → Uso: Consultas diretas às bibliotecas /mastra-ai/mastra      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (indisponível)
┌─────────────────────────────────────────────────────────────────┐
│ CAMADA 2: Embedded Docs (Mais Confiável)                       │
│ → Corresponde à versão EXATA instalada                         │
│ → Local: node_modules/@mastra/*/dist/docs/                     │
│ → Uso: grep/cat nos arquivos .md                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (não instalado)
┌─────────────────────────────────────────────────────────────────┐
│ CAMADA 3: Remote Docs (Sempre Disponível)                      │
│ → Documentação mais recente publicada                          │
│ → Fonte: https://mastra.ai/llms.txt                            │
└─────────────────────────────────────────────────────────────────┘
```

### Configurar Context7 MCP

**Opção A: HTTP (Sem instalação)**
```bash
# URL: https://mcp.context7.com/mcp
# Header opcional: CONTEXT7_API_KEY: sua-chave
```

**Opção B: STDIO Local (Configuração incluída)**
```bash
# Configuração do projeto: .agents/mcp/context7.json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Bibliotecas Context7 Disponíveis

| Biblioteca | ID | Uso | Code Snippets | Score |
|------------|-----|-----|---------------|-------|
| Mastra Core | `/mastra-ai/mastra` | Framework principal | 6601 | 86.19 |
| Mastra Skills | `/mastra-ai/skills` | Skills oficiais | 145 | 66.44 |
| Mastra Overview | `/llmstxt/mastra_ai_llms_txt` | Visão geral | 7378 | 83.66 |
| Mastra AI Agents | `/llmstxt/mastra_ai_llms-full_txt` | Agents e voz | 80907 | 70.72 |

### Ferramentas Context7 MCP

| Ferramenta | Parâmetros | Descrição |
|------------|------------|-----------|
| `resolve-library-id` | `libraryName`, `query` | Resolve nome para ID da biblioteca |
| `query-docs` | `libraryId`, `query` | Consulta documentação específica |

### Workflow de Verificação Obrigatório

**ANTES de escrever qualquer código Mastra:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Carregar skill /mastra                                       │
├─────────────────────────────────────────────────────────────────┤
│ 2. Usar Context7 MCP (quando disponível):                       │
│    → resolve-library-id libraryName="mastra" query="framework"  │
│      Result: /mastra-ai/mastra                                  │
│    → query-docs libraryId="/mastra-ai/mastra"                   │
│               query="Agent class constructor"                   │
│      Result: Documentação atual com exemplos de código          │
├─────────────────────────────────────────────────────────────────┤
│    OU Fallback para Embedded Docs:                              │
│    → grep/cat em node_modules/@mastra/core/dist/docs/           │
├─────────────────────────────────────────────────────────────────┤
│    OU Fallback para Remote Docs:                                │
│    → curl https://mastra.ai/llms.txt                            │
├─────────────────────────────────────────────────────────────────┤
│ 3. Escrever código baseado NA DOCUMENTAÇÃO VERIFICADA           │
│    → Nunca assuma - sempre confirme                             │
├─────────────────────────────────────────────────────────────────┤
│ 4. Testar no Mastra Studio                                      │
│    → ./scripts/mastra-studio.sh restart                         │
│    → Verificar em http://localhost:4111                         │
└─────────────────────────────────────────────────────────────────┘
```

### Comandos Úteis

**Verificar instalação:**
```bash
cd Xpert && ls node_modules/@mastra/
```

**Buscar na documentação embedded:**
```bash
# Buscar por "Agent"
grep -r "class Agent" node_modules/@mastra/core/dist/docs/references/

# Ler documentação específica
cat node_modules/@mastra/core/dist/docs/references/docs-agents-overview.md
```

**Fetch documentação remota:**
```bash
curl -s https://mastra.ai/llms.txt | head -100
```

### Erros Comuns de APIs Desatualizadas

| Erro | Significado | Ação |
|------|-------------|------|
| `Property X does not exist on type Y` | API mudou | Verificar documentação atual |
| `Cannot find module` | Path de import mudou | Verificar estrutura do pacote |
| `Type mismatch` | Assinatura mudou | Checar type definitions |
| Constructor parameter errors | Construtor mudou | Ler definição da classe |

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

### Antes de começar:
- [ ] Carregou a skill `/mastra`?
- [ ] **Verificou documentação atual (Context7/embedded/remote)?**
- [ ] PostgreSQL acessível (`./scripts/mastra-studio.sh status`)?
- [ ] Mastra Studio iniciado (`./scripts/mastra-studio.sh start`)?

### Durante desenvolvimento:
- [ ] Criou em `src/mastra/{agents,workflows,tools}/`?
- [ ] **Consultou documentação antes de usar novas APIs?**
- [ ] Exportou em `src/mastra/index.ts`?

### Após alterações:
- [ ] **Reiniciou o Studio (`./scripts/mastra-studio.sh restart`)?**
- [ ] Verificou que as alterações apareceram em http://localhost:4111?

---

## Recursos

### Documentação
- [Mastra Docs](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
- **Skill:** `/mastra` (carregue antes de codar)

### Configurações
- **MCP Config:** `.agents/mcp/context7.json`
- **Embedded Docs:** `Xpert/node_modules/@mastra/core/dist/docs/`

### Externos
- [Context7 Dashboard](https://context7.com/dashboard)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
