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
| 8 | 🏗️ **`infra/` é sagrado** | Todas as definições de ambiente DEVEM estar em `infra/` |
| 9 | 📝 **Documente mudanças em `infra/`** | Sempre atualize `infra/` quando alterar o ambiente |
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

## Estrutura de Pastas

O código-fonte do Mastra está dentro de `Xpert/`:

```
Xpert/
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
cd Xpert && ../scripts/mastra-studio.sh start   # Inicia Studio
../scripts/mastra-studio.sh status  # Verifica status
../scripts/mastra-studio.sh stop    # Para Studio
../scripts/mastra-studio.sh logs    # Logs em tempo real

> 📝 **Arquivo de log:** `/tmp/mastra-studio.log`

# Build e produção (execute de dentro de Xpert/)
pnpm run build
pnpm run start
```

---

## 🖥️ Ambiente de Desenvolvimento

> **IMPORTANTE:** O desenvolvimento é feito **DIRETAMENTE na VPS** via VSCode Remote SSH.

### VPS de Desenvolvimento

| Configuração | Valor |
|--------------|-------|
| **SO** | AlmaLinux 9.7 (Moss Jungle Cat) |
| **Tipo** | VPS sem interface gráfica (headless) |
| **IP** | `5.189.185.146` |
| **Acesso** | SSH / VSCode Remote |
| **Repositório** | `/root/dev/xpertia/mastra-ai` |
| **PostgreSQL** | localhost:5432 (mesma máquina) |

### Conexão SSH

```bash
# Comando direto
ssh -i .key/root_key root@5.189.185.146

# Ou usando configuração do SSH (~/.ssh/config)
Host spark-dev
    HostName 5.189.185.146
    User root
    IdentityFile ~/.ssh/root_key
    
# Conectar com:
ssh spark-dev
```

> ⚠️ **Atenção:** Nunca faça commit da chave SSH `.key/root_key`. O arquivo já está no `.gitignore`.

### VSCode Remote

1. **Local:** VSCode com extensão "Remote - SSH"
2. **Remote:** VPS AlmaLinux 9 (este servidor)
3. **Caminho:** `/root/dev/xpertia/mastra-ai`

### Port Forwarding (Automático)

Ao usar VSCode Remote, o port forwarding é automático:

| Porta Local | Porta Remota | Serviço |
|-------------|--------------|---------|
| `localhost:4111` | `localhost:4111` | Mastra Studio |

> 💡 O VSCode detecta automaticamente processos escutando em portas e oferece abrir no navegador local.

### 🚫 Sem Interface Gráfica

- Esta VPS **não possui** ambiente desktop (GNOME, KDE, XFCE, etc.)
- **NÃO instalar** navegadores (Chromium, Firefox, Chrome), editores gráficos, ou qualquer software GUI
- **NÃO instalar** pacotes que dependam de X11/Wayland
- Use apenas ferramentas CLI (linha de comando)

---

### PostgreSQL (Local na VPS)

O PostgreSQL roda **localmente na mesma VPS** do desenvolvimento:

```bash
# Verificar status
sudo systemctl status postgresql

# Conectar ao banco
sudo -u postgres psql -d xpertia

# Ver logs
sudo journalctl -u postgresql -f
```

- Host: `localhost` (127.0.0.1)
- Porta: `5432`
- DATABASE_URL aponta para localhost
- **NÃO** é necessário túnel SSH ou conexão remota

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

## 🏗️ Infraestrutura como Código (`infra/`)

### O que é `infra/`

O diretório `infra/` contém as **definições oficiais** de toda a infraestrutura do projeto. Ele está **versionado no git** na raiz do repositório:

```
/root/dev/xpertia/mastra-ai/
├── infra/              # ← INFRAESTRUTURA VERSIONADA
│   ├── docker/
│   ├── pm2/
│   ├── postgreSQL/
│   └── README.md
├── Xpert/              # ← Código da aplicação
├── docs/
└── scripts/
```

| Diretório | Conteúdo |
|-----------|----------|
| `infra/postgreSQL/` | Scripts SQL para recriar o banco de dados |
| `infra/docker/` | Configurações Docker (DEV e PROD) |
| `infra/pm2/` | Configuração PM2 para Mastra |

### 📝 Regras de Ouro

1. **📁 Este é o local oficial**: Todas as definições de modificações no ambiente DEVEM estar em `infra/`
2. **🔄 Sempre atualize**: Quando houver mudança no ambiente, atualize os arquivos em `infra/`
3. **🔒 Autorização obrigatória**: Mudanças na infraestrutura PRECISAM ser **EXPLICITAMENTE autorizadas**

### ⚠️ Regra Crítica: Sincronização Infra ↔ VPS

**SEMPRE** que fizer qualquer alteração diretamente na VPS (banco de dados, Docker, PM2), você **DEVE** atualizar os arquivos correspondentes em `infra/`:

```
❌ Fluxo INCORRETO:
   1. Altera config no PostgreSQL na VPS
   2. Esquece de atualizar infra/postgreSQL/
   3. Perde a mudança quando recriar o ambiente

✅ Fluxo CORRETO:
   1. Altera config no PostgreSQL na VPS
   2. Atualiza infra/postgreSQL/ com a mesma mudança
   3. Commit: git add infra/ && git commit -m "infra: ajusta ..."
   4. Ambiente pode ser recriado idêntico
```

**Checklist mental:**
- Mudei algo no banco? → Atualize `infra/postgreSQL/`
- Mudei config do Docker? → Atualize `infra/docker/`
- Mudei config do PM2? → Atualize `infra/pm2/`

### ❌ PROIBIDO sem autorização explícita:

- Executar scripts SQL que modifiquem schema/tabelas
- Criar/alterar/remover esquemas
- Instalar/remover extensões do PostgreSQL
- Modificar configurações de performance do banco
- Alterar scripts em `infra/` sem aprovação

### ✅ Permitido (com documentação):

- Adicionar novos scripts SQL em `infra/postgreSQL/`
- Criar índices adicionais (após aprovação)
- Atualizar comentários em objetos existentes
- Adicionar dados de seed

### 🔄 Recriação do Ambiente

Para recriar o banco de dados do zero:

```bash
# Executar script de inicialização
psql -U postgres -d xpertia -f /root/dev/xpertia/mastra-ai/infra/postgreSQL/01-init-database.sql
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
- [ ] Atualizou `infra/` se modificou o ambiente?
- [ ] Fez commit das mudanças em `infra/`?
- [ ] Tem autorização explícita para mudanças na infra?

---

## Recursos

- [Documentação do Mastra](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)
