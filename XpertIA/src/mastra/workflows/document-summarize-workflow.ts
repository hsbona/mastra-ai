/**
 * Document Summarize Workflow - Map-Reduce
 * Processamento em tempo real de documentos grandes
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { writeLargeFileTool } from '../tools/document-processing-tools';
import { 
  extractTextStep, 
  analyzeStrategyStep, 
  chunkDocumentStep,
  filePathSchema,
  chunkedContentSchema,
} from './shared/document-steps';

// ============================================
// OUTPUT SCHEMA
// ============================================

const summarizeOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  outputPath: z.string(),
  metadata: z.object({
    originalTokens: z.number(),
    strategy: z.string(),
    chunksProcessed: z.number(),
    processingTime: z.number(),
  }),
  error: z.string().optional(),
});

// ============================================
// AGENTES ESPECIALIZADOS
// ============================================

const mapSummarizerAgent = new Agent({
  id: 'map-summarizer',
  name: 'Map Summarizer',
  description: 'Resume partes individuais de documentos',
  instructions: `
Você é um especialista em resumir seções de documentos.

SUA TAREFA: Resumir uma parte específica do documento mantendo:
- Pontos principais e ideias-chave
- Dados e números importantes
- Contexto necessário para entendimento
- Tom e estilo do original

DIRETRIZES:
1. Seja conciso mas completo
2. Preserve informações factuais críticas
3. Mantenha a estrutura lógica
4. Use linguagem neutra e objetiva
5. NÃO adicione opiniões ou interpretações

FORMATO: Parágrafos contínuos em português.
`,
  model: 'groq/llama-3.3-70b-versatile',
});

const reduceSummarizerAgent = new Agent({
  id: 'reduce-summarizer',
  name: 'Reduce Summarizer',
  description: 'Consolida múltiplos resumos parciais',
  instructions: `
Você é um especialista em consolidar resumos parciais em um documento final.

SUA TAREFA: Combinar múltiplos resumos de partes em um único resumo executivo.

DIRETRIZES:
1. Elimine redundâncias entre os resumos
2. Organize por temas ou tópicos principais
3. Mantenha fluxo lógico e narrativa coesa
4. Preserve todos os pontos críticos
5. Crie transições suaves entre seções
6. Mantenha consistência de terminologia

ESTRUTURA DO RESUMO EXECUTIVO:
- Introdução (contexto e objetivo)
- Principais pontos/temas
- Conclusões ou recomendações

FORMATO: Markdown estruturado em português.
`,
  model: 'groq/llama-3.3-70b-versatile',
});

// ============================================
// STEPS ESPECÍFICOS DO WORKFLOW
// ============================================

// Step 4: Map - Resumir cada chunk
const mapSummariesStep = createStep({
  id: 'map-summaries',
  inputSchema: chunkedContentSchema,
  outputSchema: z.object({
    partialSummaries: z.array(z.string()),
    fileName: z.string(),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { chunks, fileName, tokenCount, strategy } = inputData;
    
    if (chunks.length === 1) {
      const response = await mapSummarizerAgent.generate(`
Resuma o seguinte documento de forma concisa:

${chunks[0].content}

Forneça um resumo em parágrafos destacando os pontos principais.
`);
      
      return {
        partialSummaries: [response.text],
        fileName,
        tokenCount,
        strategy,
        totalChunks: 1,
      };
    }
    
    const partialSummaries: string[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`[Summarize] Batch ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}`);
      
      const promises = batch.map((chunk) => 
        mapSummarizerAgent.generate(`
Resuma a parte ${chunk.index + 1} de ${chunks.length} do documento:

${chunk.content}

Mantenha os pontos principais, dados e fatos importantes.
`)
      );
      
      const results = await Promise.all(promises);
      partialSummaries.push(...results.map(r => r.text));
    }
    
    return {
      partialSummaries,
      fileName,
      tokenCount,
      strategy,
      totalChunks: chunks.length,
    };
  },
});

// Step 5: Reduce - Consolidar resumos
const reduceFinalStep = createStep({
  id: 'reduce-final',
  inputSchema: z.object({
    partialSummaries: z.array(z.string()),
    fileName: z.string(),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    fileName: z.string(),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { partialSummaries, fileName, tokenCount, strategy, totalChunks } = inputData;
    
    if (partialSummaries.length === 1) {
      return {
        summary: partialSummaries[0],
        fileName,
        tokenCount,
        strategy,
        totalChunks,
      };
    }
    
    let summariesToConsolidate = partialSummaries;
    
    // Reduce hierárquico se necessário
    if (partialSummaries.length > 10 && strategy === 'hierarchical') {
      console.log(`[Summarize] Reduce hierárquico: ${partialSummaries.length} resumos`);
      
      const intermediateSummaries: string[] = [];
      const groupSize = 5;
      
      for (let i = 0; i < partialSummaries.length; i += groupSize) {
        const group = partialSummaries.slice(i, i + groupSize);
        const response = await reduceSummarizerAgent.generate(`
Combine estes ${group.length} resumos em um resumo intermediário:

${group.map((s, idx) => `--- ${i + idx + 1} ---\n${s}`).join('\n\n')}
`);
        intermediateSummaries.push(response.text);
      }
      
      summariesToConsolidate = intermediateSummaries;
    }
    
    const finalResponse = await reduceSummarizerAgent.generate(`
Crie um RESUMO EXECUTIVO FINAL do documento "${fileName}":

${summariesToConsolidate.map((s, idx) => `--- ${idx + 1} ---\n${s}`).join('\n\n')}

ESTRUTURA:
1. **Visão Geral** (2-3 frases)
2. **Principais Pontos**
3. **Conclusões** (se aplicável)

Use parágrafos fluidos, linguagem profissional.
`);
    
    return {
      summary: finalResponse.text,
      fileName,
      tokenCount,
      strategy,
      totalChunks,
    };
  },
});

// Step 6: Formatar e salvar
const formatAndSaveStep = createStep({
  id: 'format-and-save',
  inputSchema: z.object({
    summary: z.string(),
    fileName: z.string(),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  outputSchema: summarizeOutputSchema,
  execute: async ({ inputData }) => {
    const { summary, fileName, tokenCount, strategy, totalChunks } = inputData;
    const startTime = Date.now();
    
    const formattedSummary = `# Resumo Executivo

**Documento:** ${fileName}  
**Estratégia:** ${strategy}  
**Chunks:** ${totalChunks}  
**Tokens:** ~${tokenCount}

---

${summary}

---

*Gerado em ${new Date().toLocaleString('pt-BR')}*
`;
    
    const outputFileName = `resumo_${fileName.replace(/\.[^/.]+$/, '')}_${Date.now()}.md`;
    const outputPath = `summaries/${outputFileName}`;
    
    if (!writeLargeFileTool.execute) {
      throw new Error('writeLargeFileTool.execute não disponível');
    }
    
    const result = await (writeLargeFileTool.execute as any)({ 
      outputPath,
      content: formattedSummary,
      fileType: 'md',
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao salvar');
    }
    
    return {
      success: true,
      summary: formattedSummary,
      outputPath,
      metadata: {
        originalTokens: tokenCount,
        strategy,
        chunksProcessed: totalChunks,
        processingTime: Date.now() - startTime,
      },
    };
  },
});

// ============================================
// WORKFLOW DEFINITION
// ============================================

export const documentSummarizeWorkflow = createWorkflow({
  id: 'document-summarize',
  description: 'Resume documentos grandes usando Map-Reduce',
  inputSchema: filePathSchema.extend({
    outputFormat: z.enum(['executive', 'detailed', 'bullet-points']).default('executive'),
    maxLength: z.number().optional(),
  }),
  outputSchema: summarizeOutputSchema,
})
  .then(extractTextStep)
  .then(analyzeStrategyStep)
  .then(chunkDocumentStep)
  .then(mapSummariesStep)
  .then(reduceFinalStep)
  .then(formatAndSaveStep)
  .commit();

export { mapSummarizerAgent, reduceSummarizerAgent };
