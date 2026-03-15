# Estrutura Modular de Tools

## Visão Geral

As ferramentas do Xpert foram reorganizadas em uma estrutura modular para melhor:
- **Manutenibilidade**: Cada tool em seu próprio arquivo
- **Testabilidade**: Isolamento facilita testes unitários
- **Descoberta**: Estrutura clara de pastas
- **Colaboração**: Menos conflitos de merge

---

## Estrutura de Diretórios

```
Xpert/src/mastra/tools/
├── file-tools/                    # Tools para arquivos (PDF, DOCX, XLSX)
│   ├── index.ts                   # Barrel exports
│   ├── utils.ts                   # Funções utilitárias compartilhadas
│   ├── read-pdf.ts               # 185 linhas - Leitura de PDF
│   ├── read-docx.ts              # 81 linhas - Leitura de Word
│   ├── read-excel.ts             # 92 linhas - Leitura de Excel
│   ├── write-docx.ts             # 98 linhas - Escrita de Word
│   └── write-excel.ts            # 86 linhas - Escrita de Excel
│
├── document-processing-tools.ts   # Processamento de documentos (349 linhas)
├── rag-tools.ts                  # RAG - Retrieval Augmented Generation (70 linhas)
└── web-tools.ts                  # Ferramentas web (298 linhas)
```

---

## Comparação: Antes vs Depois

### file-tools

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Arquivos** | 1 (monolito) | 7 (modular) |
| **Tamanho** | 576 linhas | 598 linhas (total) |
| **Maior arquivo** | 576 linhas | 185 linhas (read-pdf.ts) |
| **Menor arquivo** | - | 22 linhas (utils.ts) |
| **Coesão** | Baixa (5 tools) | Alta (1 tool por arquivo) |

### Benefícios da Modularização

1. **Arquivos Menores**: Mais fáceis de entender e manter
2. **Isolamento**: Mudanças em uma tool não afetam as outras
3. **Imports Granulares**: Apenas o necessário
4. **Testes**: Cada tool pode ser testada isoladamente

---

## Importação e Uso

### Importação Individual (Recomendado)

```typescript
// Apenas o que precisa
import { readPDFTool } from '../../tools/file-tools/read-pdf';
import { writeDOCXTool } from '../../tools/file-tools/write-docx';
```

### Importação em Grupo (Barrel Export)

```typescript
// Todas as file-tools
import { readPDFTool, readDOCXTool, writeDOCXTool } from '../../tools/file-tools';

// Ou objeto completo
import { fileTools } from '../../tools/file-tools';
// fileTools.readPDFTool, fileTools.writeDOCXTool, etc.
```

---

## Criando uma Nova Tool

### 1. Estrutura Básica

```typescript
// tools/file-tools/read-custom.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { resolveFilePath } from './utils';

export const readCustomTool = createTool({
  id: 'read-custom',
  description: 'Descrição da ferramenta',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional(),
  }),
  execute: async ({ filePath }) => {
    try {
      const fullPath = resolveFilePath(filePath);
      // Implementação...
      return { success: true, data: null };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  },
});
```

### 2. Exportar no Index

```typescript
// tools/file-tools/index.ts
export { readCustomTool } from './read-custom';

// Adicionar ao objeto fileTools
export const fileTools = {
  // ... outras tools
  readCustomTool,
};
```

---

## Tools Existentes

### file-tools/ (Formatos Específicos)

| Tool | Arquivo | Função | Biblioteca |
|------|---------|--------|------------|
| `readPDFTool` | read-pdf.ts | Extrai texto de PDFs | pdf2json |
| `readDOCXTool` | read-docx.ts | Lê documentos Word | mammoth |
| `readExcelTool` | read-excel.ts | Lê planilhas | xlsx |
| `writeDOCXTool` | write-docx.ts | Cria documentos Word | docx |
| `writeExcelTool` | write-excel.ts | Cria planilhas | xlsx |

### Outras Tools (Monolitos Aceitáveis)

| Arquivo | Linhas | Tools | Status |
|---------|--------|-------|--------|
| `rag-tools.ts` | 70 | 2 | 🟢 Manter (pequeno) |
| `web-tools.ts` | 298 | 4 | 🟡 Opcional (médio) |
| `document-processing-tools.ts` | 349 | 5+ | 🟡 Pode dividir |

---

## Quando Modularizar?

### ✅ Modularizar Quando:
- Arquivo > 300 linhas
- Múltiplas responsabilidades não relacionadas
- Necessidade de testes isolados
- Equipe grande (reduzir conflitos)

### 🟢 Manter Junto Quando:
- Arquivo < 150 linhas
- Tools relacionadas (mesmo domínio)
- Baixa frequência de mudanças
- Equipe pequena

---

## Exemplo de Refatoração Futura

Se `web-tools.ts` crescer além de 400 linhas:

```
tools/
├── file-tools/              # Já modularizado
├── web-tools/               # Nova pasta
│   ├── index.ts
│   ├── search.ts           # webSearchTool
│   ├── fetch.ts            # fetchURLTool
│   ├── summarize.ts        # summarizeContentTool
│   └── calculate.ts        # calculateTool
└── ...
```

---

## Comandos Úteis

```bash
# Contar linhas por arquivo
wc -l Xpert/src/mastra/tools/**/*.ts

# Listar estrutura
tree Xpert/src/mastra/tools/

# Verificar imports não usados
npx tsc --noEmit
```
