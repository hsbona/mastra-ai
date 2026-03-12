# Tarefas Xpert-Gov MVP - SERPRO

Este diretório contém o plano de tarefas para o MVP do Xpert-Gov.

## 📋 Estrutura

- **`todo.json`** - Todas as tarefas com dependências, prioridades e critérios de aceitação
- **`README.md`** - Este arquivo com visão geral

## 🗓️ Cronograma de Sprints

| Sprint | Período | Foco | Tarefas | Milestone |
|--------|---------|------|---------|-----------|
| 1 | Semanas 1-2 | Fundação | 3 | Fundação Completa |
| 2 | Semanas 3-4 | Tools de Arquivo | 6 | Tools de Arquivo Prontas |
| 3 | Semanas 5-6 | Web e Análise | 5 | Pesquisa e Análise |
| 4 | Semanas 7-8 | Subagentes | 5 | Subagentes Criados |
| 5 | Semanas 9-10 | Coordinator CoT | 4 | Coordinator CoT |
| 6 | Semanas 11-12 | Workflows | 4 | Workflow Inteligente |
| 7 | Semanas 13-14 | RAG | 6 | RAG Implementado |
| 8 | Semanas 15-16 | Deploy | 5 | MVP em Homologação |

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
- `S4-001` analyst-agent
- `S4-002` writer-agent
- `S4-003` research-agent
- `S4-004` doc-processor-agent

## 📊 Progresso

```
Sprint 1: [████] 0% - Fundação
Sprint 2: [    ] 0% - Tools de Arquivo
Sprint 3: [    ] 0% - Web e Análise
Sprint 4: [    ] 0% - Subagentes
Sprint 5: [    ] 0% - Coordinator
Sprint 6: [    ] 0% - Workflows
Sprint 7: [    ] 0% - RAG
Sprint 8: [    ] 0% - Deploy
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

1. **S1-001** - Setup projeto Mastra estrutura base
2. **S1-002** - Configurar PostgreSQL + pgvector
3. **S1-003** - Configurar Mastra index.ts base

---

*Atualizado em: 2026-03-11*
