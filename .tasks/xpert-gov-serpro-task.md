# Tarefas Xpert-Gov MVP - SERPRO

Este diretório contém o plano de tarefas para o MVP do Xpert-Gov.

## 📋 Estrutura

- **`todo.json`** - Todas as tarefas com dependências, prioridades e critérios de aceitação
- **`xpert-gov-serpro-task.md`** - Este arquivo com visão geral

## 🎯 Decisões Arquiteturais (v1.1)

| Aspecto | Decisão |
|---------|---------|
| **Estrutura** | Subpastas por domínio: `agents/xpert-gov/`, `agents/shared/` |
| **Biblioteca PDF** | `pdf-lib` (leitura e escrita, MIT license) |
| **Embedding** | Alibaba `text-embedding-v4` com **1024 dimensões** |
| **Arquitetura Principal** | **Agent CoT** (Chain of Thought) com `maxSteps=15` |
| **Workflows** | Não será usado no MVP (CoT é suficiente) |
| **Web Search** | Tavily (free tier) ou DuckDuckGo como fallback |
| **Database Schema** | **Esquema `mastra`** - Todos os dados persistidos pelo Mastra (storage, observability, RAG) são isolados no esquema `mastra`, separados dos dados da aplicação no esquema `public` ou `xpertia` |

## 🗓️ Cronograma de Sprints

| Sprint | Período | Foco | Tarefas | Milestone | Status |
|--------|---------|------|---------|-----------|--------|
| 1 | Semanas 1-2 | Fundação | 4 | Fundação Completa | ✅ Done |
| 2 | Semanas 3-4 | Tools de Arquivo | 5 | Tools de Arquivo Prontas | ✅ Done |
| 3 | Semanas 5-6 | Web e Análise | 4 | Pesquisa e Análise | 🔄 Next |
| 4 | Semanas 7-8 | Subagentes | 4 | Subagentes Criados | ⏳ Pending |
| 5 | Semanas 9-10 | Coordinator CoT | 3 | Coordinator CoT | ⏳ Pending |
| 6 | Semanas 11-12 | RAG | 5 | RAG Implementado | ⏳ Pending |

## 📁 Estrutura de Pastas do Projeto

```
XpertIA/
├── src/mastra/
│   ├── index.ts                    # Entry point (exporta todos os agentes)
│   ├── agents/
│   │   ├── xpert-gov/              # 👈 Agentes governamentais
│   │   │   ├── index.ts            # xpert-gov coordinator
│   │   │   ├── analyst.ts          # analyst
│   │   │   └── writer.ts           # writer
│   │   └── shared/                 # 👈 Agentes compartilhados
│   │       ├── research.ts         # research
│   │       └── doc-processor.ts    # doc-processor
│   ├── tools/
│   │   ├── file-tools.ts           # PDF, DOCX, XLSX
│   │   ├── web-tools.ts            # Search, fetch URL
│   │   └── system-tools.ts         # Workspace tools
│   └── rag/
│       └── index.ts                # Config PgVector + embeddings
├── workspace/                      # 👈 Área de trabalho persistente
│   ├── uploads/                    # Arquivos enviados
│   ├── outputs/                    # Arquivos gerados
│   └── temp/                       # Arquivos temporários
└── knowledge-base/                 # 👈 Documentos RAG
    └── legislacao/
```

## 🧠 Arquitetura CoT (Chain of Thought)

O **xpert-gov** é um agente supervisor com raciocínio em múltiplos passos:

```
┌─────────────────────────────────────────────────────────────┐
│                    XPERT-GOV (CoT)                          │
│                    maxSteps = 15                            │
├─────────────────────────────────────────────────────────────┤
│  1. COMPREENDER solicitação do usuário                      │
│  2. PLANIFICAR tarefas necessárias                          │
│  3. DELEGAR para subagentes especializados                  │
│     ├─→ agent-research (pesquisa web)                       │
│     ├─→ agent-doc-processor (arquivos)                      │
│     ├─→ agent-analyst (análise dados)                       │
│     └─→ agent-writer (redação)                              │
│  4. SUPERVISIONAR execução                                  │
│  5. REVISAR criticamente os resultados                      │
│  6. CONSOLIDAR entrega final                                │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Grupos de Paralelização

### Sprint 2 - Tools de Arquivo (Paralelizáveis)
- `S2-001` readPDFTool
- `S2-002` readDOCXTool
- `S2-003` readExcelTool
- `S2-004` writeDOCXTool
- `S2-005` writeExcelTool

### Sprint 3 - Web e Análise (Paralelizáveis)
- `S3-001` webSearchTool
- `S3-002` fetchURLTool
- `S3-003` summarizeContentTool
- `S3-004` calculateTool

### Sprint 4 - Subagentes (Paralelizáveis)
- `S4-001` research agent (shared)
- `S4-002` doc-processor agent (shared)
- `S4-003` xpert-gov analyst
- `S4-004` xpert-gov writer

## 📊 Progresso

```
Sprint 1: [    ] 0% - Fundação
Sprint 2: [    ] 0% - Tools de Arquivo
Sprint 3: [    ] 0% - Web e Análise
Sprint 4: [    ] 0% - Subagentes
Sprint 5: [    ] 0% - Coordinator
Sprint 6: [    ] 0% - RAG
```

## 🚀 Como Usar

### Visualizar todas as tarefas:
```bash
cat .tasks/todo.json | jq '.tasks[] | {id: .id, title: .title, sprint: .sprint, status: .status}'
```

### Ver tarefas por sprint:
```bash
cat .tasks/todo.json | jq '.tasks[] | select(.sprint == 1) | {id: .id, title: .title}'
```

### Ver tarefas paralelizáveis do sprint atual:
```bash
cat .tasks/todo.json | jq '.parallelGroups["S2-file-tools"].tasks'
```

## ✅ Próximas Tarefas (Sprint 1)

1. **S1-001** - Criar estrutura de pastas organizada
2. **S1-002** - Adicionar dependências de arquivo (pdf-lib, xlsx, docx, mammoth)
3. **S1-003** - Configurar Workspace (LocalFilesystem + LocalSandbox)
4. **S1-004** - Verificar PostgreSQL + pgvector

---

*Atualizado em: 2026-03-12 (v1.1)*
*Decisões: Estrutura em subpastas, pdf-lib, text-embedding-v4 (1024d), CoT sem workflow complexo*
