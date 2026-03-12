import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { PostgresStore, PgVector } from '@mastra/pg';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { conversationalAgent } from './agents/conversational-agent';
import { researchAgent } from './agents/shared/research';
import { docProcessorAgent } from './agents/shared/doc-processor';
import { xpertGovAnalystAgent } from './agents/xpert-gov/analyst';
import { xpertGovWriterAgent } from './agents/xpert-gov/writer';
import { xpertGovCoordinator } from './agents/xpert-gov';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { fileTools } from './tools/file-tools';
import { webSearchTool, fetchURLTool, summarizeContentTool, calculateTool } from './tools/web-tools';

// Exportar tools para uso em agentes
export { fileTools };
export { webSearchTool, fetchURLTool, summarizeContentTool, calculateTool };

// Exportar agentes especializados
export { researchAgent, docProcessorAgent, xpertGovAnalystAgent, xpertGovWriterAgent };

// Exportar coordenador principal
export { xpertGovCoordinator };

// ============================================
// WORKSPACE - Área de trabalho persistente
// ============================================
const workspace = new Workspace({
  name: 'xpertia-workspace',
  storage: new LocalFilesystem({
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

// ============================================
// VECTOR STORE - RAG da aplicação (KBs, embeddings)
// Esquema: 'xpertia_rag' - isolado do framework
// ============================================
export const pgVector = new PgVector({
  id: 'xpertia-rag',
  connectionString: process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia',
  schemaName: 'xpertia_rag',
});

// ============================================
// MASTRA INSTANCE
// ============================================
export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { 
    weatherAgent, 
    conversationalAgent,
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
