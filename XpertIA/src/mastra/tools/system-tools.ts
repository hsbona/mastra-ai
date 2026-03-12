/**
 * System Tools - Sprint 1 Extension
 * Tools para gerenciamento do workspace e operações de sistema
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// LIST WORKSPACE FILES TOOL
// ============================================

export const listWorkspaceFilesTool = createTool({
  id: 'list-workspace-files',
  name: 'List Workspace Files',
  description: 'Lista arquivos e diretórios no workspace, com opção de recursão',
  inputSchema: z.object({
    directory: z.string().optional().default('').describe('Diretório relativo ao workspace (padrão: raiz)'),
    recursive: z.boolean().optional().default(false).describe('Listar recursivamente (padrão: false)'),
    fileType: z.enum(['all', 'pdf', 'docx', 'xlsx', 'txt', 'json']).optional().default('all').describe('Filtrar por tipo de arquivo'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    files: z.array(z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(['file', 'directory']),
      size: z.number().optional(),
      extension: z.string().optional(),
    })),
    totalFiles: z.number(),
    totalDirectories: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const basePath = path.join('./workspace', context.directory || '');
      
      // Verificar se diretório existe
      try {
        await fs.access(basePath);
      } catch {
        return {
          success: false,
          files: [],
          totalFiles: 0,
          totalDirectories: 0,
          error: `Diretório não encontrado: ${context.directory}`,
        };
      }

      const files: Array<{
        name: string;
        path: string;
        type: 'file' | 'directory';
        size?: number;
        extension?: string;
      }> = [];

      async function scanDir(dirPath: string, relativePath: string) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            files.push({
              name: entry.name,
              path: relPath,
              type: 'directory',
            });
            
            if (context.recursive) {
              await scanDir(fullPath, relPath);
            }
          } else {
            const ext = path.extname(entry.name).toLowerCase().replace('.', '');
            
            // Filtrar por tipo se necessário
            if (context.fileType !== 'all') {
              const typeMap: Record<string, string[]> = {
                pdf: ['pdf'],
                docx: ['docx', 'doc'],
                xlsx: ['xlsx', 'xls', 'csv'],
                txt: ['txt', 'md'],
                json: ['json'],
              };
              
              if (!typeMap[context.fileType]?.includes(ext)) {
                continue;
              }
            }
            
            const stats = await fs.stat(fullPath);
            files.push({
              name: entry.name,
              path: relPath,
              type: 'file',
              size: stats.size,
              extension: ext,
            });
          }
        }
      }

      await scanDir(basePath, context.directory || '');

      return {
        success: true,
        files,
        totalFiles: files.filter(f => f.type === 'file').length,
        totalDirectories: files.filter(f => f.type === 'directory').length,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        totalFiles: 0,
        totalDirectories: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao listar arquivos',
      };
    }
  },
});

// ============================================
// CREATE DIRECTORY TOOL
// ============================================

export const createDirectoryTool = createTool({
  id: 'create-directory',
  name: 'Create Directory',
  description: 'Cria um novo diretório no workspace (cria diretórios pais se necessário)',
  inputSchema: z.object({
    path: z.string().describe('Caminho do diretório a ser criado (relativo ao workspace)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    fullPath: z.string(),
    created: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const fullPath = path.join('./workspace', context.path);
      
      await fs.mkdir(fullPath, { recursive: true });
      
      return {
        success: true,
        fullPath,
        created: true,
      };
    } catch (error) {
      return {
        success: false,
        fullPath: '',
        created: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar diretório',
      };
    }
  },
});

// ============================================
// DELETE FILE/ DIRECTORY TOOL
// ============================================

export const deleteWorkspaceItemTool = createTool({
  id: 'delete-workspace-item',
  name: 'Delete Workspace Item',
  description: 'Deleta um arquivo ou diretório do workspace (cuidado: irreversível)',
  inputSchema: z.object({
    path: z.string().describe('Caminho do item a ser deletado (relativo ao workspace)'),
    confirm: z.boolean().describe('Deve ser true para confirmar a exclusão'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    deleted: z.boolean(),
    path: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context.confirm) {
        return {
          success: false,
          deleted: false,
          path: context.path,
          error: 'Confirmação necessária. Defina confirm: true para deletar.',
        };
      }

      const fullPath = path.join('./workspace', context.path);
      
      // Verificar se existe
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          deleted: false,
          path: context.path,
          error: `Item não encontrado: ${context.path}`,
        };
      }

      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }

      return {
        success: true,
        deleted: true,
        path: context.path,
      };
    } catch (error) {
      return {
        success: false,
        deleted: false,
        path: context.path,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar',
      };
    }
  },
});

// ============================================
// GET FILE INFO TOOL
// ============================================

export const getFileInfoTool = createTool({
  id: 'get-file-info',
  name: 'Get File Info',
  description: 'Obtém informações detalhadas sobre um arquivo (tamanho, datas, tipo)',
  inputSchema: z.object({
    path: z.string().describe('Caminho do arquivo (relativo ao workspace)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    name: z.string(),
    path: z.string(),
    size: z.number(),
    extension: z.string(),
    created: z.string(),
    modified: z.string(),
    isFile: z.boolean(),
    isDirectory: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const fullPath = path.join('./workspace', context.path);
      
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        name: path.basename(context.path),
        path: context.path,
        size: stats.size,
        extension: path.extname(context.path).toLowerCase().replace('.', ''),
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return {
        success: false,
        name: '',
        path: context.path,
        size: 0,
        extension: '',
        created: '',
        modified: '',
        isFile: false,
        isDirectory: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
});

// ============================================
// MOVE/RENAME FILE TOOL
// ============================================

export const moveFileTool = createTool({
  id: 'move-file',
  name: 'Move or Rename File',
  description: 'Move ou renomeia um arquivo/diretório no workspace',
  inputSchema: z.object({
    source: z.string().describe('Caminho de origem (relativo ao workspace)'),
    destination: z.string().describe('Caminho de destino (relativo ao workspace)'),
    overwrite: z.boolean().optional().default(false).describe('Sobrescrever se existir (padrão: false)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    moved: z.boolean(),
    sourcePath: z.string(),
    destinationPath: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const sourcePath = path.join('./workspace', context.source);
      const destPath = path.join('./workspace', context.destination);
      
      // Verificar se origem existe
      try {
        await fs.access(sourcePath);
      } catch {
        return {
          success: false,
          moved: false,
          sourcePath: context.source,
          destinationPath: context.destination,
          error: `Arquivo de origem não encontrado: ${context.source}`,
        };
      }
      
      // Verificar se destino já existe
      if (!context.overwrite) {
        try {
          await fs.access(destPath);
          return {
            success: false,
            moved: false,
            sourcePath: context.source,
            destinationPath: context.destination,
            error: `Destino já existe. Use overwrite: true para sobrescrever.`,
          };
        } catch {
          // Destino não existe, pode prosseguir
        }
      }
      
      // Criar diretório de destino se necessário
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      
      await fs.rename(sourcePath, destPath);
      
      return {
        success: true,
        moved: true,
        sourcePath: context.source,
        destinationPath: context.destination,
      };
    } catch (error) {
      return {
        success: false,
        moved: false,
        sourcePath: context.source,
        destinationPath: context.destination,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao mover arquivo',
      };
    }
  },
});

// ============================================
// EXPORTAÇÕES
// ============================================

export const systemTools = {
  listWorkspaceFilesTool,
  createDirectoryTool,
  deleteWorkspaceItemTool,
  getFileInfoTool,
  moveFileTool,
};
