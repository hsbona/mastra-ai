# Arquitetura de Workspace do Xpert

## Visão Geral

O Xpert utiliza o **Workspace nativo do Mastra** para operações de filesystem, eliminando código duplicado e aproveitando ferramentas automáticas fornecidas pelo framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                    MASTRA INSTANCE                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Workspace                                                │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                │  │
│  │  │ LocalFilesystem │  │  LocalSandbox   │                │  │
│  │  │  (Xpert/ws/)    │  │   (commands)    │                │  │
│  │  └─────────────────┘  └─────────────────┘                │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                │  │
│  │  │   BM25 Search   │  │  Auto-Indexing  │                │  │
│  │  │   (optional)    │  │   (optional)    │                │  │
│  │  └─────────────────┘  └─────────────────┘                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WORKSPACE_TOOLS (Automáticas)                            │  │
│  │  • readFile, writeFile, deleteFile                        │  │
│  │  • listFiles, stat, createDirectory                       │  │
│  │  • grep, copy, move, executeCommand                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTS ESPECIALIZADOS                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  doc-reader  │  │  doc-writer  │  │ doc-transformer         │
│  │              │  │              │  │              │          │
│  │ + readPDF    │  │ + writeDOCX  │  │ + workflows  │          │
│  │ + readDOCX   │  │ + writeExcel │  │ + chunking   │          │
│  │ + readExcel  │  │ + writeLarge │  │ + estimate   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Diretórios

```
Xpert/
├── src/mastra/
│   ├── index.ts              # Workspace configurado aqui
│   ├── agents/
│   │   └── shared/
│   │       ├── doc-reader.ts     # Usa workspace nativo
│   │       ├── doc-writer.ts     # Usa workspace nativo
│   │       └── doc-transformer.ts # Usa workspace nativo
│   └── tools/
│       ├── file-tools.ts     # APENAS formatos especiais
│       └── document-processing-tools.ts
│
└── workspace/                # Diretório físico
    ├── uploads/              # Entrada: PDFs, DOCX, XLSX
    ├── outputs/              # Saída: documentos gerados
    │   ├── summaries/
    │   └── translations/
    └── skills/               # (opcional) Skills do agente
```

## Configuração do Workspace

### Inicialização (`src/mastra/index.ts`)

```typescript
import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const workspace = new Workspace({
  id: 'xpert-workspace',
  name: 'Xpert Workspace',
  filesystem: new LocalFilesystem({
    basePath: resolve(__dirname, '../../workspace'),
  }),
  sandbox: new LocalSandbox({
    workingDirectory: resolve(__dirname, '../../workspace'),
    env: { NODE_ENV: process.env.NODE_ENV || 'development' },
  }),
  bm25: true,
  autoIndexPaths: ['/outputs'],
});

export const mastra = new Mastra({
  workspace,  // ← Disponibiliza WORKSPACE_TOOLS automaticamente
  agents: { ... },
  // ...
});
```

### Configuração de Agentes

```typescript
import { workspace } from '../../index';

export const docReaderAgent = new Agent({
  id: 'doc-reader',
  name: 'Document Reader Agent',
  instructions: `...`,
  model: 'groq/llama-3.3-70b-versatile',
  workspace,  // ← Injeta WORKSPACE_TOOLS automaticamente
  tools: {
    // APENAS ferramentas especializadas
    readPDFTool,
    readDOCXTool,
    readExcelTool,
    // readFile, listFiles, createDirectory são nativos do workspace
  },
  memory: new Memory(),
});
```

## Ferramentas Disponíveis

### Nativas do Workspace (Automáticas)

| Ferramenta | Descrição | Exemplo de Uso |
|------------|-----------|----------------|
| `readFile` | Lê arquivos de texto | `readFile({ path: 'uploads/dados.txt' })` |
| `writeFile` | Escreve arquivos | `writeFile({ path: 'outputs/result.txt', content: '...' })` |
| `listFiles` | Lista diretórios | `listFiles({ path: 'uploads' })` |
| `createDirectory` | Cria diretórios | `createDirectory({ path: 'outputs/relatorios' })` |
| `stat` | Metadados do arquivo | `stat({ path: 'uploads/doc.pdf' })` |
| `deleteFile` | Remove arquivos | `deleteFile({ path: 'outputs/temp.txt' })` |
| `grep` | Busca em conteúdo | `grep({ pattern: 'contrato', path: 'uploads' })` |
| `executeCommand` | Executa comandos shell | `executeCommand({ command: 'ls -la' })` |

### Ferramentas Especializadas (Xpert)

| Ferramenta | Formato | Biblioteca | Uso |
|------------|---------|------------|-----|
| `readPDFTool` | PDF | pdf2json | Extração de texto com paginação |
| `readDOCXTool` | DOCX | mammoth | Leitura de documentos Word |
| `readExcelTool` | XLSX/XLS/CSV | xlsx | Leitura de planilhas |
| `writeDOCXTool` | DOCX | docx | Criação de documentos Word |
| `writeExcelTool` | XLSX | xlsx | Criação de planilhas Excel |

## Padrões de Uso

### 1. Verificar Existência de Arquivo

```typescript
// ✅ USAR: Ferramenta nativa do workspace
const result = await workspace.tools.listFiles({ path: 'uploads' });
// ou
const stat = await workspace.tools.stat({ path: 'uploads/documento.pdf' });
```

### 2. Ler Arquivo de Texto

```typescript
// ✅ USAR: Ferramenta nativa para .txt, .md, .json
const content = await workspace.tools.readFile({ 
  path: 'uploads/dados.txt',
  encoding: 'utf-8'
});

// ✅ USAR: Ferramenta especializada para PDFs
const result = await readPDFTool.execute({ 
  filePath: 'uploads/documento.pdf',
  startPage: 1,
  endPage: 50
});
```

### 3. Criar Estrutura de Diretórios

```typescript
// ✅ USAR: Ferramenta nativa
await workspace.tools.createDirectory({ 
  path: 'outputs/relatorios/2024' 
});
```

### 4. Salvar Documento Grande

```typescript
// ✅ USAR: writeLargeFileTool para conteúdo gerado
await writeLargeFileTool.execute({
  outputPath: 'summaries/resumo-executivo.md',
  content: markdownContent,
  fileType: 'md',
});
```

## Resolução de Caminhos

O Workspace resolve caminhos automaticamente baseado no `basePath`:

```typescript
// basePath: /root/dev/xpertia/mastra-ai/Xpert/workspace

// Caminhos relativos ao workspace:
workspace.filesystem.readFile('uploads/doc.txt')
// Resolve para: /root/dev/xpertia/mastra-ai/Xpert/workspace/uploads/doc.txt

workspace.filesystem.readFile('outputs/resultado.md')
// Resolve para: /root/dev/xpertia/mastra-ai/Xpert/workspace/outputs/resultado.md
```

## BM25 e Indexação

### Como Funciona

O BM25 é um algoritmo de ranking de relevância para busca por palavras-chave:

```typescript
const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: './workspace' }),
  bm25: true,  // Habilita indexação
  autoIndexPaths: ['/outputs'],  // Indexa automaticamente
});
```

### Processo de Indexação

1. **Tokenização**: Divide o texto em termos
2. **Cálculo TF-IDF**: Term Frequency × Inverse Document Frequency
3. **BM25 Scoring**: Considera frequência do termo e comprimento do documento
4. **Busca**: Retorna documentos ordenados por relevância

### Limitações

- ✅ Funciona com: `.txt`, `.md`, `.json`, código fonte
- ❌ **NÃO funciona diretamente com**: `.pdf`, `.docx`, `.xlsx`
- 💡 Para PDFs/DOCXs: Extraia o texto primeiro e salve como `.txt` para indexação

## Comparação: Antes vs Depois

### Antes (Implementação Manual)

```typescript
// file-tools.ts - 800+ linhas
export const listWorkspaceFilesTool = createTool({...});  // Duplicado
export const getFileInfoTool = createTool({...});         // Duplicado
export const createDirectoryTool = createTool({...});     // Duplicado

// Resolução de path manual (10+ estratégias)
const strategies = [
  path.resolve(cwd, '../../../workspace', filePath),
  path.resolve(cwd, '../../workspace', filePath),
  // ... mais 8 estratégias
];
```

### Depois (Workspace Nativo)

```typescript
// index.ts - Configuração única
export const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: resolve(__dirname, '../../workspace') }),
});

// file-tools.ts - 400 linhas (metade)
// APENAS ferramentas especializadas
export const fileTools = {
  readPDFTool, readDOCXTool, readExcelTool,
  writeDOCXTool, writeExcelTool,
};

// Resolução automática via workspace
workspace.filesystem.readFile('uploads/doc.txt');
```

## Benefícios da Abordagem Nativa

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Linhas de código** | ~1000 (tools manuais) | ~400 (apenas especializadas) |
| **Manutenção** | Múltiplos pontos de falha | Centralizado no Workspace |
| **Funcionalidades** | Básicas reimplementadas | Nativas + especializadas |
| **Execução de comandos** | Não disponível | Via LocalSandbox |
| **Indexação** | Não implementada | BM25 automático |
| **Busca em conteúdo** | Não implementada | Grep nativo |

## Troubleshooting

### Erro: "File not found"

```typescript
// ❌ ERRADO: Caminho absoluto sem contexto
readFile('/caminho/completo/arquivo.txt')

// ✅ CERTO: Caminho relativo ao workspace
readFile('uploads/arquivo.txt')
```

### Erro: "Workspace not available"

```typescript
// ❌ ERRADO: Agente sem workspace
const agent = new Agent({
  id: 'agent',
  tools: { readPDFTool },  // Ferramentas especializadas apenas
});

// ✅ CERTO: Agente com workspace
const agent = new Agent({
  id: 'agent',
  workspace,  // ← Necessário para WORKSPACE_TOOLS
  tools: { readPDFTool },
});
```

## Referências

- [Mastra Workspace Docs](https://mastra.ai/docs/workspace/overview)
- [LocalFilesystem Reference](https://mastra.ai/reference/workspace/local-filesystem)
- [BM25 Search](https://mastra.ai/docs/workspace/search)
