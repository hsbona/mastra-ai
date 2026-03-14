import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { pgVector } from './vector-store';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { documentSummarizeWorkflow } from './workflows/document-summarize-workflow';
import { documentTranslateWorkflow } from './workflows/document-translate-workflow';
import { researchAgent } from './agents/shared/research';
import { docReaderAgent } from './agents/shared/doc-reader';
import { docWriterAgent } from './agents/shared/doc-writer';
import { docTransformerAgent } from './agents/shared/doc-transformer';
import { xpertGovAnalystAgent } from './agents/xpert-gov/analyst';
import { xpertGovWriterAgent } from './agents/xpert-gov/writer';
import { xpertGovSupervisor } from './agents/xpert-gov';
import { chatAgent } from './agents/chat-agent';
import { fileTools } from './tools/file-tools';
import { webSearchTool, fetchURLTool, summarizeContentTool, calculateTool } from './tools/web-tools';
import { systemTools } from './tools/system-tools';

// ============================================
// RAG - Sistema de Retrieval-Augmented Generation
// ============================================
export * from './rag';

// Exportar RAG tools
export { queryRAGTool, listIndexesTool } from './tools/rag-tools';

// Exportar tools para uso em agentes
export { fileTools };
export { webSearchTool, fetchURLTool, summarizeContentTool, calculateTool };
export { systemTools };

// Exportar tools de processamento de documentos
export { 
  documentProcessingTools,
  estimateTokens,
  semanticChunking,
} from './tools/document-processing-tools';

// Exportar workflows de processamento de documentos
export { documentSummarizeWorkflow, mapSummarizerAgent, reduceSummarizerAgent } from './workflows/document-summarize-workflow';
export { documentTranslateWorkflow, glossaryExtractorAgent, translatorAgent } from './workflows/document-translate-workflow';

// Exportar steps compartilhados
export {
  extractTextStep,
  analyzeStrategyStep,
  chunkDocumentStep,
  createExtractTextStep,
  createAnalyzeStrategyStep,
  createChunkingStep,
} from './workflows/shared/document-steps';

// Exportar configurações de modelo e context window
export {
  MODEL_CONFIGS,
  DEFAULT_MODEL,
  getModelConfig,
  calculateSafeChunkSize,
  selectStrategyForModel,
  selectProcessingStrategy,
  validateContextWindow,
  estimateOperationOverhead,
} from './config/model-config';

// Exportar agentes especializados
export { researchAgent, docReaderAgent, docWriterAgent, docTransformerAgent, xpertGovAnalystAgent, xpertGovWriterAgent };

// Exportar supervisor principal
export { xpertGovSupervisor };
export { chatAgent };

// ============================================
// WORKSPACE - Área de trabalho persistente
// ============================================
const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: './workspace',
  }),
});

// ============================================
// STORAGE - Dados do framework (threads, traces, etc.)
// Esquema: 'mastra' - isolado da aplicação
// ============================================
const storage = new PostgresStore({
  id: "mastra-storage",
  connectionString: process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia',
  schemaName: 'mastra',
});

// pgVector é importado de './vector-store' para evitar ciclos de dependência

// ============================================
// MASTRA INSTANCE
// ============================================
export const mastra = new Mastra({
  workflows: { 
    documentSummarizeWorkflow,
    documentTranslateWorkflow,
  },
  agents: { 
    researchAgent,
    docReaderAgent,
    docWriterAgent,
    docTransformerAgent,
    xpertGovAnalystAgent,
    xpertGovWriterAgent,
    xpertGovSupervisor,
    chatAgent,
  },
  workspace,
  storage,
  vectors: { pgVector },  // Vector store para RAG
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
