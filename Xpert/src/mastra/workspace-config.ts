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
 * Quando configurado em um Agent, fornece automaticamente as tools:
 * - mastra_workspace_read_file: Ler arquivos
 * - mastra_workspace_write_file: Escrever arquivos
 * - mastra_workspace_edit_file: Editar arquivos
 * - mastra_workspace_list_files: Listar diretórios
 * - mastra_workspace_delete: Deletar arquivos
 * - mastra_workspace_file_stat: Metadados de arquivos
 * - mastra_workspace_mkdir: Criar diretórios
 * - mastra_workspace_grep: Buscar em conteúdo
 * - mastra_workspace_execute_command: Executar comandos (via sandbox)
 * 
 * Para uso direto no código (sem LLM), use:
 *   workspace.filesystem.readdir(path)  // Listar
 *   workspace.filesystem.readFile(path) // Ler
 *   workspace.filesystem.writeFile(path, content) // Escrever
 * 
 * NOTA: Para PDFs, DOCX, XLSX - usar tools especializadas em file-tools/
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
  autoIndexPaths: ['outputs'],  // Indexa automaticamente arquivos gerados
});

// Exporta o basePath para conveniência
export const workspaceBasePath = workspace.filesystem.basePath;
