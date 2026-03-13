# Arquitetura Simplificada: Processamento de Documentos

## Visão Geral

Arquitetura enxuta com apenas **2 modos de operação**:

1. **RAG Institucional** - Base de conhecimento perene (gerenciada fora do chat)
2. **Processamento Tempo Real** - Map-Reduce para documentos em uso agora (sem persistência)

Além disso, a **geração de arquivos** segue o mesmo princípio de "partes" para evitar travamentos.

---

## 🏗️ Arquitetura: 2 Modos de Operação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         XpertIA - Document Processing                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODO 1: RAG INSTITUCIONAL (Fora do Chat)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • Documentos perenes da organização                                │   │
│  │ • Manuais, regulamentos, contratos-padrão                          │   │
│  │ • Alimentação: ADMIN/Interface dedicada (não via chat)             │   │
│  │ • Persistência: PERMANENTE no PGVector                             │   │
│  │ • Disponibilidade: Todos os usuários                               │   │
│  │                                                                     │   │
│  │  Fluxo: Admin → Upload → Processamento → Indexação → KB            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│                              │                                              │
│                              │ indexDocumentToKB()                         │
│                              │ (workflow separado, não via agente)         │
│                                                                             │
│  MODO 2: PROCESSAMENTO TEMPO REAL (Durante Chat)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • Documentos que o usuário está usando AGORA                       │   │
│  │ • Upload via chat → Processamento imediato → Resultado           │   │
│  │ • NÃO é indexado no RAG                                          │   │
│  │ • Persistência: Apenas durante a sessão (memória)                │   │
│  │                                                                     │   │
│  │  Estratégia: Map-Reduce (ou Direto, dependendo do tamanho)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│                              │                                              │
│                              │ processDocumentRealtime()                     │
│                              │ (sem indexação, processamento direto)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Fluxo de Decisão Simplificado

```
Usuário envia arquivo no chat
          │
          ▼
┌─────────────────────────┐
│ O usuário quer:         │
│                         │
│ A) Indexar na base de   │
│    conhecimento?        │
│                         │
│ B) Processar agora      │
│    (resumo/tradução/QA)?│
└─────────────────────────┘
          │
    ┌─────┴─────┐
    │           │
   (A)         (B)
    │           │
    ▼           ▼
┌─────────┐  ┌─────────────────────────────┐
│ REDIREC.│  │ Processamento Tempo Real    │
│ PARA    │  │                             │
│ ADMIN   │  │ • Extrair texto             │
│ PAINEL  │  │ • Estimar tokens            │
└─────────┘  │ • Selecionar estratégia:    │
             │                             │
             │   < 6k tokens → Direto      │
             │   6k-100k   → Map-Reduce    │
             │   > 100k    → Map-Reduce    │
             │               Hierárquico   │
             │                             │
             │ • Executar workflow         │
             │ • Retornar resultado        │
             │ • Limpar da memória         │
             └─────────────────────────────┘
```

**Regra de Ouro:**
> Se o arquivo veio via chat → **Processamento Tempo Real** (Map-Reduce)  
> Se é para KB → **Interface Admin separada** (não via chat)

---

## ⚡ Modo 1: Processamento Tempo Real (Map-Reduce)

### Estratégias por Tamanho

| Tokens | Páginas (est.) | Estratégia | Tempo Est. | Chamadas LLM |
|--------|----------------|------------|------------|--------------|
| < 6.000 | < 10 | **Direto** | ~3-5s | 1 |
| 6.000 - 50.000 | 10-80 | **Map-Reduce** (paralelo) | ~15-45s | 1 + N (chunks) + 1 |
| 50.000 - 200.000 | 80-300 | **Map-Reduce** (hierárquico) | ~2-5min | 1 + N + M + 1 |
| > 200.000 | > 300 | **Recusar** ou processar por partes | - | - |

### Workflow: Resumo Tempo Real

```typescript
// src/mastra/workflows/realtime-summarize.ts

export const realtimeSummarizeWorkflow = createWorkflow({
  id: 'realtime-summarize',
  steps: [
    // Step 1: Extração e análise
    {
      id: 'extract-and-analyze',
      execute: async ({ filePath }: { filePath: string }) => {
        // Extrair texto usando tools existentes
        const text = await extractText(filePath);
        const tokenCount = estimateTokens(text);
        const strategy = selectStrategy(tokenCount);
        
        return { text, tokenCount, strategy };
      }
    },
    
    // Step 2: Chunking (se necessário)
    {
      id: 'chunk-if-needed',
      execute: async ({ text, strategy, tokenCount }) => {
        if (strategy === 'direct') {
          return { chunks: [text], chunkCount: 1 };
        }
        
        // Chunking semântico
        const chunks = await semanticChunking(text, {
          chunkSize: 4000,
          overlap: 400,
          preserveParagraphs: true,
        });
        
        return { chunks, chunkCount: chunks.length };
      }
    },
    
    // Step 3: Map (resumo de cada chunk)
    {
      id: 'map-summaries',
      execute: async ({ chunks, strategy }) => {
        if (chunks.length === 1) {
          // Estratégia direta
          const summary = await llm.generate({
            model: 'groq/llama-3.3-70b-versatile',
            prompt: `Resuma o seguinte documento:\n\n${chunks[0]}`,
          });
          return { partialSummaries: [summary] };
        }
        
        // Map-Reduce: Processar chunks em paralelo (batch de 5)
        const partialSummaries: string[] = [];
        const batchSize = 5;
        
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const promises = batch.map((chunk, idx) => 
            llm.generate({
              model: 'groq/llama-3.3-70b-versatile',
              prompt: `Resuma a seguinte parte do documento (parte ${i + idx + 1} de ${chunks.length}):\n\n${chunk}`,
            })
          );
          
          const results = await Promise.all(promises);
          partialSummaries.push(...results);
        }
        
        return { partialSummaries };
      }
    },
    
    // Step 4: Reduce (consolidação)
    {
      id: 'reduce-final',
      execute: async ({ partialSummaries, strategy }) => {
        if (partialSummaries.length === 1) {
          return { summary: partialSummaries[0] };
        }
        
        // Se muitos resumos parciais, hierarquia adicional
        if (partialSummaries.length > 10 && strategy === 'hierarchical') {
          // Segunda rodada de reduce
          const intermediateChunks = groupIntoChunks(partialSummaries, 5);
          const intermediateSummaries = await Promise.all(
            intermediateChunks.map(group => 
              llm.generate({
                model: 'groq/llama-3.3-70b-versatile',
                prompt: `Combine estes resumos parciais em um resumo coerente:\n\n${group.join('\n\n---\n\n')}`,
              })
            )
          );
          
          // Resumo final
          const finalSummary = await llm.generate({
            model: 'groq/llama-3.3-70b-versatile',
            prompt: `Crie um resumo executivo final baseado nestes resumos intermediários:\n\n${intermediateSummaries.join('\n\n---\n\n')}`,
          });
          
          return { summary: finalSummary };
        }
        
        // Reduce simples
        const finalSummary = await llm.generate({
          model: 'groq/llama-3.3-70b-versatile',
          prompt: `Crie um resumo executivo final baseado nestes resumos parciais:\n\n${partialSummaries.join('\n\n---\n\n')}`,
        });
        
        return { summary: finalSummary };
      }
    },
    
    // Step 5: Formatação e salvamento
    {
      id: 'format-and-save',
      execute: async ({ summary, tokenCount }) => {
        // Formatar em markdown estruturado
        const formattedSummary = `# Resumo Executivo

${summary}

---
*Documento processado em tempo real*  
*Tamanho estimado: ~${tokenCount} tokens*
`;
        
        // Salvar em workspace/outputs/
        const outputPath = `outputs/summaries/resumo_${Date.now()}.md`;
        await saveToWorkspace(outputPath, formattedSummary);
        
        return { summary: formattedSummary, outputPath };
      }
    }
  ]
});
```

### Workflow: Tradução Tempo Real

```typescript
// src/mastra/workflows/realtime-translate.ts

export const realtimeTranslateWorkflow = createWorkflow({
  id: 'realtime-translate',
  steps: [
    // Step 1: Extração e análise
    {
      id: 'extract',
      execute: async ({ filePath, targetLang }) => {
        const text = await extractText(filePath);
        const tokenCount = estimateTokens(text);
        
        return { text, tokenCount, targetLang };
      }
    },
    
    // Step 2: Extração de glossário (terminologia)
    {
      id: 'extract-glossary',
      execute: async ({ text, targetLang }) => {
        // Primeiro passo: identificar termos técnicos, nomes próprios
        const glossary = await llm.generate({
          model: 'groq/llama-3.3-70b-versatile',
          prompt: `Analise o texto abaixo e extraia:
1. Termos técnicos que devem ser traduzidos consistentemente
2. Nomes próprios (pessoas, empresas, lugares)
3. Siglas e acrônimos

Retorne como JSON:
{
  "terms": [{"original": "...", "translation": "...", "type": "technical|name|acronym"}]
}

Texto (primeiras 2000 palavras): ${text.slice(0, 12000)}`,
        });
        
        return { glossary: JSON.parse(glossary) };
      }
    },
    
    // Step 3: Chunking
    {
      id: 'chunk',
      execute: async ({ text, tokenCount }) => {
        if (tokenCount < 6000) {
          return { chunks: [text] };
        }
        
        const chunks = await semanticChunking(text, {
          chunkSize: 3500, // Menor para tradução (mais seguro)
          overlap: 350,
          preserveParagraphs: true,
        });
        
        return { chunks };
      }
    },
    
    // Step 4: Tradução com contexto de glossário
    {
      id: 'translate-chunks',
      execute: async ({ chunks, targetLang, glossary }) => {
        const translatedChunks: string[] = [];
        
        for (let i = 0; i < chunks.length; i++) {
          const previousContext = i > 0 
            ? `Contexto anterior (último parágrafo da parte ${i}): ${translatedChunks[i-1].slice(-500)}`
            : '';
          
          const translated = await llm.generate({
            model: 'groq/llama-3.3-70b-versatile',
            prompt: `Traduza o seguinte texto para ${targetLang}.

GLOSSÁRIO DE TERMOS (use consistentemente):
${glossary.terms.map((t: any) => `${t.original} → ${t.translation}`).join('\n')}

${previousContext}

Texto a traduzir (parte ${i + 1} de ${chunks.length}):
${chunks[i]}

Instruções:
- Mantenha a formatação original
- Use os termos do glossário consistentemente
- Preserve nomes próprios quando apropriado
- Mantenha o tom e estilo do original`,
          });
          
          translatedChunks.push(translated);
        }
        
        return { translatedChunks };
      }
    },
    
    // Step 5: Montagem e salvamento
    {
      id: 'assemble',
      execute: async ({ translatedChunks, targetLang, glossary }) => {
        const fullTranslation = translatedChunks.join('\n\n');
        
        // Criar documento DOCX
        const outputPath = `outputs/translations/traducao_${targetLang}_${Date.now()}.docx`;
        await assembleAndSaveDOCX(outputPath, translatedChunks, {
          title: `Tradução - ${targetLang.toUpperCase()}`,
          glossary: glossary.terms,
        });
        
        return { 
          outputPath, 
          chunkCount: translatedChunks.length,
          preview: fullTranslation.slice(0, 500) + '...'
        };
      }
    }
  ]
});
```

---

## 💾 Geração de Arquivos Grandes (Escrita em Partes)

### Problema

Criar um arquivo DOCX/Excel com 500 páginas de conteúdo pode:
- Estourar memória do Node.js
- Travar o processo
- Exceder limites de string do JavaScript

### Solução: Escrita em Streaming/Partes

```typescript
// src/mastra/tools/file-writer-streaming.ts

interface StreamingWriteOptions {
  outputPath: string;
  fileType: 'docx' | 'xlsx' | 'txt';
  chunkSize?: number; // itens por chunk
}

/**
 * Escreve arquivo grande em partes para evitar estouro de memória
 */
export async function writeLargeFile(
  contentGenerator: AsyncGenerator<string[]>,
  options: StreamingWriteOptions
) {
  const { outputPath, fileType, chunkSize = 100 } = options;
  
  switch (fileType) {
    case 'docx':
      return await writeLargeDOCX(contentGenerator, outputPath, chunkSize);
    case 'xlsx':
      return await writeLargeExcel(contentGenerator, outputPath, chunkSize);
    case 'txt':
      return await writeLargeText(contentGenerator, outputPath);
  }
}

/**
 * Escreve DOCX grande em partes usando docx library
 */
async function writeLargeDOCX(
  contentGenerator: AsyncGenerator<string[]>,
  outputPath: string,
  paragraphsPerChunk: number
) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const fs = await import('fs');
  const path = await import('path');
  
  // Criar documento
  const children: any[] = [];
  let totalParagraphs = 0;
  let chunkCount = 0;
  
  // Processar generator em partes
  for await (const paragraphs of contentGenerator) {
    chunkCount++;
    
    // Converter parágrafos em elementos docx
    for (const text of paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text })],
        })
      );
      totalParagraphs++;
    }
    
    // Se acumulou muitos parágrafos, log de progresso
    if (totalParagraphs % 1000 === 0) {
      console.log(`Processados ${totalParagraphs} parágrafos...`);
    }
  }
  
  // Criar documento final
  const doc = new Document({
    sections: [{ children }],
  });
  
  // Salvar em buffer e escrever em stream
  const buffer = await Packer.toBuffer(doc);
  
  // Escrever em partes se buffer for muito grande
  const fullPath = path.resolve('./workspace/outputs', outputPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  
  // Para arquivos muito grandes, usar streaming
  if (buffer.length > 10 * 1024 * 1024) { // > 10MB
    await writeBufferInChunks(fullPath, buffer);
  } else {
    await fs.promises.writeFile(fullPath, buffer);
  }
  
  return {
    outputPath,
    totalParagraphs,
    chunkCount,
    fileSize: buffer.length,
  };
}

/**
 * Escreve Excel grande em partes
 */
async function writeLargeExcel(
  dataGenerator: AsyncGenerator<Record<string, any>[]>,
  outputPath: string,
  rowsPerSheet: number
) {
  const XLSX = await import('xlsx');
  const fs = await import('fs');
  const path = await import('path');
  
  const workbook = XLSX.utils.book_new();
  let sheetCount = 0;
  let totalRows = 0;
  let currentBatch: Record<string, any>[] = [];
  
  for await (const rows of dataGenerator) {
    currentBatch.push(...rows);
    
    // Quando atingir limite, criar nova sheet
    if (currentBatch.length >= rowsPerSheet) {
      sheetCount++;
      const worksheet = XLSX.utils.json_to_sheet(currentBatch);
      XLSX.utils.book_append_sheet(workbook, worksheet, `Dados_${sheetCount}`);
      
      totalRows += currentBatch.length;
      currentBatch = []; // Liberar memória
      
      console.log(`Criada sheet ${sheetCount} com ${rowsPerSheet} linhas...`);
    }
  }
  
  // Adicionar remainder
  if (currentBatch.length > 0) {
    sheetCount++;
    const worksheet = XLSX.utils.json_to_sheet(currentBatch);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Dados_${sheetCount}`);
    totalRows += currentBatch.length;
  }
  
  // Salvar
  const fullPath = path.resolve('./workspace/outputs', outputPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await fs.promises.writeFile(fullPath, buffer);
  
  return {
    outputPath,
    totalRows,
    sheetCount,
    fileSize: buffer.length,
  };
}

/**
 * Escreve arquivo texto grande em streaming
 */
async function writeLargeText(
  contentGenerator: AsyncGenerator<string>,
  outputPath: string
) {
  const fs = await import('fs');
  const path = await import('path');
  
  const fullPath = path.resolve('./workspace/outputs', outputPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  
  const writeStream = fs.createWriteStream(fullPath);
  let totalChars = 0;
  
  for await (const chunk of contentGenerator) {
    writeStream.write(chunk);
    totalChars += chunk.length;
    
    // A cada 1MB, dar log
    if (totalChars % (1024 * 1024) === 0) {
      console.log(`Escritos ${(totalChars / 1024 / 1024).toFixed(2)} MB...`);
    }
  }
  
  writeStream.end();
  
  // Aguardar finalização
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  
  return { outputPath, totalChars };
}
```

### Exemplo de Uso: Gerar Relatório Grande

```typescript
// Exemplo: Gerar relatório de 1000 páginas

async function generateLargeReport(data: any[]) {
  // Generator que produz conteúdo em partes
  async function* contentGenerator() {
    for (let i = 0; i < data.length; i += 100) {
      const batch = data.slice(i, i + 100);
      
      // Processar batch e gerar parágrafos
      const paragraphs = await Promise.all(
        batch.map(item => generateParagraph(item))
      );
      
      yield paragraphs;
      
      // Permitir GC entre batches
      if (i % 1000 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }
  
  const result = await writeLargeFile(contentGenerator(), {
    outputPath: 'outputs/relatorios/relatorio_grande.docx',
    fileType: 'docx',
    chunkSize: 100,
  });
  
  return result;
}
```

---

## 📁 Estrutura de Pastas Revisada

```
XpertIA/workspace/
├── uploads/           # Arquivos recebidos via chat (temporários)
│   └── (limpo periodicamente)
│
├── outputs/           # Resultados de processamento
│   ├── summaries/     # Resumos gerados
│   ├── translations/  # Traduções
│   ├── extractions/   # Dados extraídos
│   └── reports/       # Relatórios gerados
│
└── temp/              # Arquivos temporários de processamento
    └── (limpo a cada sessão)
```

**RAG Institucional:**
- Não usa pasta `workspace/` para storage
- Usa PGVector + metadados em tabela separada
- Upload via interface admin (não chat)

---

## 🔄 Resumo da Arquitetura Simplificada

### O que foi ELIMINADO:
- ❌ Documentos pessoais do usuário no RAG
- ❌ Indexação automática de uploads de chat
- ❌ 3 níveis complexos → reduzido para 2

### O que ficou:
1. **RAG Institucional** - Gerenciado via admin, fora do chat
2. **Processamento Tempo Real** - Map-Reduce para tudo que vem via chat
3. **Geração em Partes** - Escrita de arquivos grandes em chunks

### Fluxo do Usuário:

```
Usuário: "Resuma este PDF"
  ↓
Agente: processa via Map-Reduce (não indexa)
  ↓
Retorna resumo + salva em outputs/
  ↓
(Fim - não fica na base de conhecimento)

---

Usuário: "Como faço para solicitar férias?"
  ↓
Agente: consulta RAG Institucional (KB permanente)
  ↓
Retorna resposta baseada em manuais/regulamentos
```

---

## ✅ Checklist de Implementação

### Sprint 1: Processamento Tempo Real
- [ ] Criar `estimateTokens()`
- [ ] Criar `semanticChunking()`
- [ ] Implementar `realtimeSummarizeWorkflow`
- [ ] Implementar `realtimeTranslateWorkflow`
- [ ] Atualizar agente para usar workflows

### Sprint 2: Geração em Partes
- [ ] Criar `writeLargeFile()` com streaming
- [ ] Implementar geradores async para DOCX/XLSX
- [ ] Testar com arquivos > 100MB
- [ ] Otimizar uso de memória

### Sprint 3: Integração
- [ ] Integrar workflows ao agente conversacional
- [ ] Criar interface admin para RAG institucional (separado)
- [ ] Testes end-to-end

---

*Documento criado em 2026-03-13 - Arquitetura simplificada com 2 modos de operação.*
