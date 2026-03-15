/**
 * Workspace Configuration
 * 
 * Configuração centralizada do Workspace do Mastra.
 * Este arquivo é importado por index.ts e pelos agents para evitar
 * dependências circulares.
 */

import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Workspace nativo do Mastra para operações de filesystem.
 * 
 * Fornece automaticamente:
 * - WORKSPACE_TOOLS.LIST_FILES: Listar diretórios
 * - WORKSPACE_TOOLS.READ_FILE: Ler arquivos (texto/binário)
 * - WORKSPACE_TOOLS.WRITE_FILE: Escrever arquivos
 * - WORKSPACE_TOOLS.DELETE_FILE: Deletar arquivos
 * - WORKSPACE_TOOLS.CREATE_DIRECTORY: Criar diretórios
 * - WORKSPACE_TOOLS.STAT: Metadados de arquivos
 * - WORKSPACE_TOOLS.GREP: Busca em conteúdo
 * - WORKSPACE_TOOLS.EXECUTE_COMMAND: Execução de comandos (via LocalSandbox)
 * 
 * NOTA: Para PDFs, DOCX, XLSX - usar tools especializadas em file-tools.ts
 */
export const workspace = new Workspace({
  id: 'xpert-workspace',
  name: 'Xpert Workspace',
  filesystem: new LocalFilesystem({
    // Workspace localizado em: /root/dev/xpertia/mastra-ai/Xpert/workspace
    basePath: resolve(__dirname, '../../workspace'),
  }),
  sandbox: new LocalSandbox({
    workingDirectory: resolve(__dirname, '../../workspace'),
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  }),
  // Indexação BM25 para busca em documentos de texto (opcional)
  bm25: true,
  autoIndexPaths: ['/outputs'],  // Indexa automaticamente arquivos gerados
});

// Exporta o basePath para conveniência
export const workspaceBasePath = workspace.filesystem.basePath;
