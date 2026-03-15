# AGENTS.md

Guia para agentes de IA trabalhando neste repositório.

---

## ⚠️ REGRAS CRÍTICAS

| # | Regra | Ação |
|---|-------|------|
| 1 | 🐝 **Agents Swarm obrigatório** | Use múltiplos agents em paralelo para tarefas complexas |
| 2 | 🧠 **Carregar skill `/mastra` primeiro** | Use antes de qualquer código |
| 3 | 🗑️ **Exclusão sempre via lixeira** | `gio trash` ou `trash-put` — **nunca `rm -rf`** |
| 4 | ⚙️ **Gerenciar serviços via script** | Use `./scripts/mastra-studio.sh` — nunca `kill`/`pkill` |
| 5 | 🔄 **Reiniciar para aplicar mudanças** | Execute `./scripts/mastra-studio.sh restart` após alterar código |
| 6 | 🗄️ **Nunca alterar banco sem autorização** | Migrations proibidas sem confirmação |
| 7 | 🚫 **NUNCA usar esquema 'xpertia'** | Esquema legado protegido |
| 8 | 🔐 **Sem valores hard-coded** | Use `.env` e arquivos de configuração |
| 9 | 📁 **Ignorar `.archive`** | Nunca processar arquivos desta pasta |
| 10 | 📚 **SEMPRE verificar documentação** | APIs mudam — use `/mastra` |
| 11 | 🏗️ **Usar funcionalidades nativas do Mastra** | NUNCA recrie o que já existe (Workspace, tools nativas) |

---

### 🏗️ Funcionalidades Nativas do Mastra

**NUNCA recrie o que o Mastra já fornece.**

#### Workspace

| Funcionalidade | Como usar | O que NÃO fazer |
|----------------|-----------|-----------------|
| **Leitura/Escrita** | `workspace.filesystem.readFile()` / `writeFile()` | ❌ `fs` com paths hard-coded |
| **Listar/Criar diretórios** | `workspace.filesystem.listFiles()` / `createDirectory()` | ❌ Tools próprias |
| **Busca** | `workspace.filesystem.grep()` | ❌ Busca manual |
| **Comandos** | `workspace.sandbox.executeCommand()` | ❌ `child_process` direto |

#### Checklist antes de implementar
```
□ A funcionalidade já existe no Mastra?
□ Consultou a skill `/mastra`?
□ Está usando Workspace para filesystem?
```

---

## 🛠️ Padrão de Tools: Agnostic Tools

### Regra de Ouro
**TODAS as tools customizadas DEVEM usar `createAgnosticTool`** para garantir compatibilidade com múltiplos provedores de LLM.

### Por que isso é necessário?

O Mastra nativo tem comportamentos inconsistentes entre provedores (OpenAI, Groq, Llama, etc):
- Alguns LLMs enviam `null` em parâmetros opcionais
- Outros enviam objetos aninhados ao invés de valores simples
- Tipos podem variar (string vs number)

Nossa camada `createAgnosticTool` normaliza essas variações automaticamente.

### Como criar uma tool compatível

```typescript
import { z } from 'zod';
import { createAgnosticTool } from './agnostic';

// 1. Função de normalização de input
function normalizeInput(input: unknown): { param1: string; param2?: number } {
  if (typeof input !== 'object' || input === null) {
    return { param1: '' };
  }
  const obj = input as Record<string, unknown>;
  
  // Extrai valores aceitando múltiplos nomes de parâmetros
  const param1 = typeof obj.param1 === 'string' ? obj.param1 :
                typeof obj.name === 'string' ? obj.name : '';
  
  const param2 = typeof obj.param2 === 'number' ? obj.param2 :
                typeof obj.param2 === 'string' ? parseInt(obj.param2, 10) || undefined :
                undefined;
  
  return { param1, param2 };
}

// 2. Criação da tool
export const minhaTool = createAgnosticTool({
  id: 'minha_tool',
  name: 'Minha Tool',
  description: 'Descrição clara do que a tool faz',
  inputSchema: z.record(z.any()), // SEMPRE ultra-permissivo
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    // 3. Normaliza o input
    const input = normalizeInput(rawInput);
    
    if (!input.param1) {
      return {
        success: false,
        data: null,
        error: 'Parâmetro obrigatório não fornecido',
      };
    }
    
    try {
      // ... lógica da tool
      return { success: true, data: resultado };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
});
```

### Princípios Importantes

| Princípio | Implementação |
|-----------|---------------|
| **Input ultra-permissivo** | `z.record(z.any())` ao invés de schemas rígidos |
| **Normalização explícita** | Função `normalizeInput()` que aceita múltiplos formatos |
| **Tratamento de erro gracioso** | Sempre retornar objeto com `success` e `error` opcional |
| **Nunca lançar exceções** | Retornar erro no output ao invés de `throw` |
| **Chunking para dados grandes** | Processar em partes quando necessário |

### Chunking Padrão

Todas as tools que processam grandes volumes de dados DEVEM implementar chunking:

```typescript
// Exemplo de processamento com chunking
export const processLargeFileTool = createAgnosticTool({
  id: 'process-large-file',
  // ...
  execute: async (rawInput) => {
    const { filePath, chunkSize = 1000 } = normalizeInput(rawInput);
    
    // Processa em chunks para não sobrecarregar memória
    const results = [];
    for (let offset = 0; ; offset += chunkSize) {
      const chunk = await readChunk(filePath, offset, chunkSize);
      if (chunk.length === 0) break;
      
      const processed = await processChunk(chunk);
      results.push(processed);
      
      // Libera memória do chunk
      if (global.gc) global.gc();
    }
    
    return { success: true, data: results };
  },
});
```

### Ferramentas que já seguem o padrão

- ✅ `workspace-safe.ts` - Tools de filesystem (list_files, read_file, etc.)
- ✅ `web-tools.ts` - Web search, fetch URL, calculate
- ✅ `rag-tools.ts` - Query RAG, list indexes
- ✅ `file-tools/read-pdf.ts` - Leitura de PDFs
- ✅ `file-tools/read-docx.ts` - Leitura de DOCX
- ✅ `file-tools/read-excel.ts` - Leitura de Excel
- ✅ `file-tools/write-docx.ts` - Escrita de DOCX

---

## 🚀 Modo Yolo

Execute sem confirmar: `pnpm install`, `pnpm dev`, `git add/commit/push`

**Sempre pergunte antes:** `prisma migrate dev`

---

## Visão Geral

Projeto **Xpert** — aplicação Mastra (TypeScript) na pasta `Xpert/`.

> 📁 **Localização:** Código em `Xpert/src/mastra/`

Consumido **exclusivamente via Mastra Studio** — sem UI.

| ✅ No Escopo | ❌ Fora do Escopo |
|--------------|-------------------|
| Agents, Workflows, Tools | UI/frontend |
| APIs e endpoints | Interfaces visuais |

---

## 📚 Documentação Mastra

**⚠️ APIs mudam constantemente — nunca confie na memória.**

### Como usar a Skill `/mastra`

A skill `/mastra` fornece acesso à documentação atualizada via Context7 MCP.

**Workflow:**
```
1. Digite "/mastra" no início da conversa
2. Pergunte sobre a API/pattern necessário
3. A skill buscará na melhor fonte disponível
```

### Estratégia de Lookup (Fallback)

```
Context7 MCP (via skill /mastra)
         ↓ (indisponível)
Embedded Docs: Xpert/node_modules/@mastra/core/dist/docs/
         ↓ (não instalado)
Remote Docs: https://mastra.ai/llms.txt
```

### Comandos Úteis

```bash
# Buscar na documentação local
grep -r "class Agent" Xpert/node_modules/@mastra/core/dist/docs/

# Documentação remota
curl -s https://mastra.ai/llms.txt | head -100
```

### Erros Comuns

| Erro | Significado | Ação |
|------|-------------|------|
| `Property X does not exist` | API mudou | Consultar `/mastra` |
| `Cannot find module` | Path de import mudou | Verificar documentação |
| Constructor errors | Assinatura mudou | Checar type definitions |

---

## Tecnologias

| Componente | Versão |
|------------|--------|
| Node.js | >=22.13.0 |
| pnpm | 10.30.3 |
| TypeScript | 5.9.3 |
| Mastra Core | ^1.12.0 |
| Modelo Padrão | meta-llama/llama-4-scout-17b-16e-instruct |

---

## Estrutura

```
Xpert/
├── src/mastra/
│   ├── index.ts          # Registra agents/workflows
│   ├── agents/           # Definição de agents
│   ├── workflows/        # Fluxos de trabalho
│   └── tools/            # Ferramentas
├── .env                  # Variáveis (não commitar)
└── package.json
```

---

## Comandos

### Mastra Studio

```bash
./scripts/mastra-studio.sh start     # Iniciar
./scripts/mastra-studio.sh stop      # Parar
./scripts/mastra-studio.sh restart   # Reiniciar (após alterações)
./scripts/mastra-studio.sh status    # Status
./scripts/mastra-studio.sh logs      # Logs
```

> 📝 **Log:** `/tmp/mastra-studio.log`

**Fluxo após alterações:**
1. Altere o código em `Xpert/src/mastra/`
2. Execute `./scripts/mastra-studio.sh restart`
3. Acesse http://localhost:4111

---

## Ambiente de Desenvolvimento

| Configuração | Valor |
|--------------|-------|
| **SO** | AlmaLinux 9.7 |
| **IP** | `5.189.185.146` |
| **Acesso** | VSCode Remote SSH |
| **Repositório** | `/root/dev/xpertia/mastra-ai` |
| **PostgreSQL** | localhost:5432 |

**Port Forwarding:** `localhost:4111` → Mastra Studio

```bash
# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -d xpertia
```

---

## Padrões de Código

### Agent
```typescript
import { Agent } from '@mastra/core/agent';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: `...`,
  model: 'groq/llama-3.3-70b-versatile',
});
```

### Workflow
```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const myStep = createStep({
  id: 'my-step',
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ greeting: z.string() }),
  execute: async ({ inputData }) => ({
    greeting: `Hello, ${inputData.name}!`,
  }),
});

export const myWorkflow = createWorkflow({
  id: 'my-workflow',
  triggerSchema: z.object({ name: z.string() }),
  steps: [myStep],
});
```

### Tool
```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const myTool = createTool({
  id: 'my-tool',
  name: 'My Tool',
  description: 'O que a tool faz',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => ({
    result: `Result: ${inputData.query}`,
  }),
});
```

---

## Checklist

### Antes:
- [ ] Carregou a skill `/mastra`?
- [ ] Verificou documentação atual?
- [ ] PostgreSQL acessível? (`./scripts/mastra-studio.sh status`)

### Durante:
- [ ] Criou em `Xpert/src/mastra/{agents,workflows,tools}/`?
- [ ] Não recriou funcionalidades nativas?
- [ ] Exportou em `Xpert/src/mastra/index.ts`?

### Após:
- [ ] Reiniciou o Studio? (`./scripts/mastra-studio.sh restart`)
- [ ] Verificou em http://localhost:4111?

---

## Arquivos Ignorados

| Arquivo | Propósito |
|---------|-----------|
| `.gitignore` | Ignorados pelo Git |
| `.kimiignore` | Ignorados pelo agente de IA |

**Nunca processe:** `.archive/`, `node_modules/`, arquivos em `.kimiignore`

---

## Recursos

- [Mastra Docs](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
- **Skill:** `/mastra` — sempre use antes de codar
