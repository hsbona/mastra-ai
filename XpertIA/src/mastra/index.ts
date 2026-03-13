import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore } from '@mastra/pg';
import { pgVector } from './vector-store';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { conversationalAgent } from './agents/conversational-agent';
import { fileSummarizerAgent } from './agents/file-summarizer';
import { researchAgent } from './agents/shared/research';
import { docProcessorAgent } from './agents/shared/doc-processor';
import { xpertGovAnalystAgent } from './agents/xpert-gov/analyst';
import { xpertGovWriterAgent } from './agents/xpert-gov/writer';
import { xpertGovCoordinator } from './agents/xpert-gov';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
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

// Exportar agentes especializados
export { researchAgent, docProcessorAgent, xpertGovAnalystAgent, xpertGovWriterAgent };

// Exportar coordenador principal
export { xpertGovCoordinator };

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
  workflows: { weatherWorkflow },
  agents: { 
    weatherAgent, 
    conversationalAgent,
    fileSummarizerAgent,
    researchAgent,
    docProcessorAgent,
    xpertGovAnalystAgent,
    xpertGovWriterAgent,
    xpertGovCoordinator,
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  workspace,
  storage,
  vector: pgVector,  // Vector store para RAG
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
