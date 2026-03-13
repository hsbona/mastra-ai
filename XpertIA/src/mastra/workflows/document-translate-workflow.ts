/**
 * Document Translate Workflow - Map-Reduce
 * Tradução de documentos grandes com glossário
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
  extractedTextSchema,
  chunkedContentSchema,
} from './shared/document-steps';

// ============================================
// SCHEMAS
// ============================================

const translateInputSchema = filePathSchema.extend({
  sourceLang: z.string().optional(),
  targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
  preserveFormatting: z.boolean().default(true),
});

const translateOutputSchema = z.object({
  success: z.boolean(),
  translatedText: z.string(),
  outputPath: z.string(),
  glossary: z.array(z.object({
    original: z.string(),
    translation: z.string(),
    type: z.string(),
  })),
  metadata: z.object({
    originalTokens: z.number(),
    strategy: z.string(),
    chunksProcessed: z.number(),
    processingTime: z.number(),
  }),
  error: z.string().optional(),
});

const textWithGlossarySchema = z.object({
  text: z.string(),
  fileName: z.string(),
  targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
  glossary: z.array(z.object({
    original: z.string(),
    translation: z.string(),
    type: z.string(),
  })),
  tokenCount: z.number(),
});

// ============================================
// AGENTES ESPECIALIZADOS
// ============================================

const glossaryExtractorAgent = new Agent({
  id: 'glossary-extractor',
  name: 'Glossary Extractor',
  description: 'Extrai terminologia para tradução consistente',
  instructions: `
Extraia termos técnicos, nomes próprios, siglas e expressões do texto.

Para cada termo, indique:
- Tipo: "technical" | "name" | "acronym" | "idiom"
- Tradução sugerida

Retorne apenas JSON:
{"terms": [{"original": "...", "translation": "...", "type": "..."}]}
`,
  model: 'groq/llama-3.3-70b-versatile',
});

const translatorAgent = new Agent({
  id: 'chunk-translator',
  name: 'Chunk Translator',
  description: 'Traduz chunks mantendo contexto',
  instructions: `
Traduza o texto completo com fidelidade ao original.

DIRETRIZES:
1. Mantenha tom, estilo e registro
2. Preserve estrutura de parágrafos
3. Use o glossário de forma consistente
4. Mantenha siglas quando apropriado

Use o contexto fornecido para manter continuidade.
`,
  model: 'groq/llama-3.3-70b-versatile',
});

// ============================================
// STEPS ESPECÍFICOS
// ============================================

// Step 2: Extrair glossário
const extractGlossaryStep = createStep({
  id: 'extract-glossary',
  inputSchema: extractedTextSchema.extend({
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
  }),
  outputSchema: textWithGlossarySchema,
  execute: async ({ inputData }) => {
    const { text, fileName, targetLang, metadata } = inputData;
    const sampleText = text.slice(0, 8000);
    
    console.log(`[Translate] Extraindo glossário de ${fileName}...`);
    
    const response = await glossaryExtractorAgent.generate(`
Analise e extraia terminologia importante:

${sampleText}

Idioma destino: ${targetLang}
Retorne JSON no formato especificado.
`);
    
    let glossary: Array<{ original: string; translation: string; type: string }> = [];
    
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        glossary = parsed.terms || [];
      }
    } catch (e) {
      console.warn('[Translate] Erro ao parsear glossário:', e);
    }
    
    const tokenCount = Math.ceil(text.length / 4);
    
    console.log(`[Translate] Glossário: ${glossary.length} termos`);
    
    return {
      text,
      fileName,
      targetLang,
      glossary,
      tokenCount,
    };
  },
});

// Step 3b: Adicionar targetLang ao resultado do chunking
const addTargetLangStep = createStep({
  id: 'add-target-lang',
  inputSchema: chunkedContentSchema.extend({
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
    glossary: z.array(z.object({
      original: z.string(),
      translation: z.string(),
      type: z.string(),
    })),
  }),
  outputSchema: chunkedContentSchema.extend({
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
    glossary: z.array(z.object({
      original: z.string(),
      translation: z.string(),
      type: z.string(),
    })),
  }),
  execute: async ({ inputData }) => inputData,
});

// Step 5: Traduzir chunks
const translateChunksStep = createStep({
  id: 'translate-chunks',
  inputSchema: chunkedContentSchema.extend({
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
    glossary: z.array(z.object({
      original: z.string(),
      translation: z.string(),
      type: z.string(),
    })),
  }),
  outputSchema: z.object({
    translatedChunks: z.array(z.string()),
    fileName: z.string(),
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
    glossary: z.array(z.object({
      original: z.string(),
      translation: z.string(),
      type: z.string(),
    })),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { chunks, fileName, targetLang, glossary, tokenCount, strategy } = inputData;
    
    const langNames: Record<string, string> = {
      pt: 'português', en: 'inglês', es: 'espanhol',
      fr: 'francês', de: 'alemão', it: 'italiano',
    };
    
    const glossaryText = glossary.length > 0
      ? `GLOSSÁRIO:\n${glossary.map(t => `- "${t.original}" → "${t.translation}"`).join('\n')}`
      : '';
    
    if (chunks.length === 1) {
      const response = await translatorAgent.generate(`
Traduza para ${langNames[targetLang]}:

${glossaryText}

TEXTO:
${chunks[0].content}
`);
      
      return {
        translatedChunks: [response.text],
        fileName,
        targetLang,
        glossary,
        tokenCount,
        strategy,
        totalChunks: 1,
      };
    }
    
    const translatedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[Translate] Chunk ${i + 1}/${chunks.length}`);
      
      const previousContext = i > 0
        ? `\nCONTEXTO ANTERIOR:\n${translatedChunks[i - 1].slice(-500)}`
        : '';
      
      const response = await translatorAgent.generate(`
Traduza a parte ${i + 1} de ${chunks.length} para ${langNames[targetLang]}.

${glossaryText}
${previousContext}

TEXTO:
${chunks[i].content}
`);
      
      translatedChunks.push(response.text);
    }
    
    return {
      translatedChunks,
      fileName,
      targetLang,
      glossary,
      tokenCount,
      strategy,
      totalChunks: chunks.length,
    };
  },
});

// Step 6: Montar e salvar
const assembleAndSaveStep = createStep({
  id: 'assemble-and-save',
  inputSchema: z.object({
    translatedChunks: z.array(z.string()),
    fileName: z.string(),
    targetLang: z.enum(['pt', 'en', 'es', 'fr', 'de', 'it']),
    glossary: z.array(z.object({
      original: z.string(),
      translation: z.string(),
      type: z.string(),
    })),
    tokenCount: z.number(),
    strategy: z.enum(['direct', 'map-reduce', 'hierarchical']),
    totalChunks: z.number(),
  }),
  outputSchema: translateOutputSchema,
  execute: async ({ inputData }) => {
    const { translatedChunks, fileName, targetLang, glossary, tokenCount, strategy, totalChunks } = inputData;
    const startTime = Date.now();
    
    const fullTranslation = translatedChunks.join('\n\n');
    
    const glossarySection = glossary.length > 0
      ? `## Glossário\n\n| Original | Tradução | Tipo |\n|----------|----------|------|\n${glossary.map(t => `| ${t.original} | ${t.translation} | ${t.type} |`).join('\n')}\n\n`
      : '';
    
    const formattedDoc = `# Tradução - ${fileName}

**Idioma:** ${targetLang.toUpperCase()}  
**Estratégia:** ${strategy}  
**Chunks:** ${totalChunks}

---

${glossarySection}

---

${fullTranslation}

---

*Gerado em ${new Date().toLocaleString('pt-BR')}*
`;
    
    const outputFileName = `traducao_${targetLang}_${fileName.replace(/\.[^/.]+$/, '')}_${Date.now()}.md`;
    const outputPath = `translations/${outputFileName}`;
    
    if (!writeLargeFileTool.execute) {
      throw new Error('writeLargeFileTool.execute não disponível');
    }
    
    const result = await (writeLargeFileTool.execute as any)({ 
      outputPath,
      content: formattedDoc,
      fileType: 'md',
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao salvar');
    }
    
    return {
      success: true,
      translatedText: fullTranslation,
      outputPath,
      glossary,
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
// WORKFLOW
// ============================================

export const documentTranslateWorkflow = createWorkflow({
  id: 'document-translate',
  description: 'Traduz documentos grandes usando Map-Reduce com glossário',
  inputSchema: translateInputSchema,
  outputSchema: translateOutputSchema,
})
  .then(extractTextStep)
  .then(extractGlossaryStep)
  .then(analyzeStrategyStep)
  .then(chunkDocumentStep)
  .then(translateChunksStep)
  .then(assembleAndSaveStep)
  .commit();

export { glossaryExtractorAgent, translatorAgent };
