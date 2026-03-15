/**
 * Workspace Tools Customizadas
 * 
 * Wrappers para as WORKSPACE_TOOLS nativas do Mastra que normalizam
 * parâmetros e tratam casos edge com modelos específicos (ex: Llama-4).
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { workspace } from '../workspace-config';

/**
 * Tool para listar arquivos no workspace.
 * 
 * Wrapper simplificado que funciona com Llama-4:
 * - Apenas "path" é obrigatório
 * - Todos os outros parâmetros são opcionais
 * - Defaults aplicados no código, não no schema
 */
export const listWorkspaceFilesTool = createTool({
  id: 'list_workspace_files',
  description: `Lista arquivos e diretórios no workspace.

Use esta ferramenta para listar conteúdo de diretórios.

Parâmetros:
- path: Caminho do diretório relativo ao workspace (ex: ".", "uploads", "outputs", "/uploads")

NOTA: Paths começando com "/" são automaticamente convertidos para relativos ao workspace.

Exemplo: { "path": "uploads" }`,
  inputSchema: z.object({
    path: z.string().describe('Caminho do diretório relativo ao workspace (ex: ".", "uploads", "outputs")'),
  }),
  outputSchema: z.object({
    tree: z.string().describe('Representação em árvore dos arquivos'),
    summary: z.string().describe('Resumo da listagem'),
  }),
  execute: async (inputData, context) => {
    // Normaliza o path: remove barra inicial para torná-lo relativo ao workspace
    let path = inputData?.path ?? '.';
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    
    try {
      // Usa o filesystem do workspace diretamente
      const result = await workspace.filesystem.readdir(path);
      
      // Formata como árvore
      const entries = Array.isArray(result) ? result : [result];
      const tree = formatAsTree(entries, path);
      const summary = `Total: ${entries.length} itens`;
      
      return { tree, summary };
    } catch (error: any) {
      return { 
        tree: `Erro ao listar ${path}: ${error.message}`, 
        summary: 'Erro na operação' 
      };
    }
  },
});

/**
 * Formata entradas de arquivo como árvore
 */
function formatAsTree(entries: any[], basePath: string): string {
  if (!entries || entries.length === 0) {
    return `${basePath}/ (vazio)`;
  }
  
  const lines: string[] = [basePath || '.'];
  
  for (const entry of entries) {
    const name = entry.name || String(entry);
    const isDir = entry.type === 'directory' || entry.isDirectory;
    const suffix = isDir ? '/' : '';
    lines.push(`  ${name}${suffix}`);
  }
  
  return lines.join('\n');
}
