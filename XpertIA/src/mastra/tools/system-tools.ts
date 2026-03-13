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
// GET FILE INFO TOOL
// ============================================

export const getFileInfoTool = createTool({
  id: 'get-file-info',
  name: 'Get File Info',
  description: 'Obtém informações detalhadas sobre um arquivo (tamanho, datas, tipo). Aceita caminhos absolutos ou relativos ao workspace.',
  inputSchema: z.object({
    path: z.string().describe('Caminho do arquivo (absoluto ou relativo ao workspace)'),
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
      const isAbsolute = path.isAbsolute(context.path);
      const fullPath = isAbsolute ? context.path : path.join('./workspace', context.path);
      
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
// EXPORTAÇÕES
// ============================================

export const systemTools = {
  listWorkspaceFilesTool,
  createDirectoryTool,
  getFileInfoTool,
};
