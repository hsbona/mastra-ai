/**
 * Workspace Tools - Versão ULTRA-PERMISSIVA
 * 
 * Aceita QUALQUER formato de entrada do LLM e normaliza.
 * Todas as tools usam createAgnosticTool para compatibilidade com múltiplos LLMs.
 */

import { createAgnosticTool } from './agnostic';
import { z } from 'zod';
import { workspace } from '../workspace-config';

/**
 * Extrai valor primitivo de qualquer estrutura que o LLM enviar.
 * O Llama-4 às vezes envia objetos aninhados ao invés de valores simples.
 */
function extractValue(val: unknown): unknown {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'object') return val;
  
  // Se for array, extrai cada elemento
  if (Array.isArray(val)) {
    return val.map(extractValue).filter(v => v !== undefined);
  }
  
  // Se for objeto, tenta encontrar um valor útil
  const obj = val as Record<string, unknown>;
  const values = Object.values(obj);
  
  // Se objeto vazio, retorna undefined
  if (values.length === 0) return undefined;
  
  // Se tem só um valor, retorna ele
  if (values.length === 1) return extractValue(values[0]);
  
  // Se tem múltiplos valores, retorna o objeto processado
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(obj)) {
    const extracted = extractValue(v);
    if (extracted !== undefined) {
      result[key] = extracted;
    }
  }
  return result;
}

/**
 * Normaliza o input completo da tool.
 */
function normalizeInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) return {};
  
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    const extracted = extractValue(val);
    if (extracted !== undefined) {
      result[key] = extracted;
    }
  }
  return result;
}

/** Listar arquivos - versão ultra-permissiva */
export const listFilesSafe = createAgnosticTool({
  id: 'list_files',
  name: 'List Files',
  description: 'List files and directories in the workspace',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    path: z.string(),
    entries: z.array(z.object({
      name: z.string(),
      type: z.string(),
      size: z.number().optional(),
    })),
    count: z.number(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    console.log('[list_files] Normalized input:', input);
    
    const path = String(input.path || '.');
    const maxDepth = Number(input.maxDepth || 2);
    const showHidden = input.showHidden === true || input.showHidden === 'true';
    const dirsOnly = input.dirsOnly === true || input.dirsOnly === 'true';
    const exclude = input.exclude ? String(input.exclude) : undefined;
    const extension = input.extension ? String(input.extension) : undefined;
    const pattern = input.pattern 
      ? (Array.isArray(input.pattern) ? input.pattern.map(String) : [String(input.pattern)])
      : undefined;
    const respectGitignore = input.respectGitignore !== false && input.respectGitignore !== 'false';
    
    const entries = await workspace.filesystem.readdir(path);
    
    let filtered = entries;
    if (dirsOnly) {
      filtered = filtered.filter(e => e.type === 'directory');
    }
    if (extension) {
      filtered = filtered.filter(e => e.name.endsWith(extension));
    }
    
    return {
      path,
      entries: filtered.map(e => ({
        name: e.name,
        type: e.type,
        size: e.size,
      })),
      count: filtered.length,
    };
  },
});

/** Ler arquivo - versão ultra-permissiva */
export const readFileSafe = createAgnosticTool({
  id: 'read_file',
  name: 'Read File',
  description: 'Read the contents of a file from the workspace',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    path: z.string(),
    content: z.string(),
    totalLines: z.number(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    console.log('[read_file] Normalized input:', input);
    
    const path = String(input.path || '');
    if (!path) {
      throw new Error('Path is required');
    }
    
    const encoding = String(input.encoding || 'utf-8') as any;
    const showLineNumbers = input.showLineNumbers !== false && input.showLineNumbers !== 'false';
    
    const content = await workspace.filesystem.readFile(path, { encoding });
    
    let processed = content;
    const lines = content.split('\n');
    const offset = Number(input.offset || 1);
    const limit = input.limit ? Number(input.limit) : undefined;
    
    if (offset > 1 || limit) {
      const start = offset - 1;
      const end = limit ? start + limit : lines.length;
      processed = lines.slice(start, end).join('\n');
    }
    
    if (showLineNumbers) {
      const startLine = offset;
      processed = processed
        .split('\n')
        .map((line, i) => `${startLine + i}: ${line}`)
        .join('\n');
    }
    
    return {
      path,
      content: processed,
      totalLines: lines.length,
    };
  },
});

/** Criar diretório - versão ultra-permissiva */
export const mkdirSafe = createAgnosticTool({
  id: 'create_directory',
  name: 'Create Directory',
  description: 'Create a directory in the workspace',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    created: z.string(),
    recursive: z.boolean(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    console.log('[create_directory] Normalized input:', input);
    
    const path = String(input.path || '');
    if (!path) {
      throw new Error('Path is required');
    }
    
    const recursive = input.recursive !== false && input.recursive !== 'false';
    await workspace.filesystem.mkdir(path, { recursive });
    
    return { created: path, recursive };
  },
});

/** Escrever arquivo - versão ultra-permissiva */
export const writeFileSafe = createAgnosticTool({
  id: 'write_file',
  name: 'Write File',
  description: 'Write content to a file in the workspace. Creates directories if needed.',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    path: z.string(),
    success: z.boolean(),
    bytesWritten: z.number(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    console.log('[write_file] Normalized input:', input);
    
    const path = String(input.path || '');
    if (!path) {
      throw new Error('Path is required');
    }
    
    const content = String(input.content || '');
    const encoding = (input.encoding as any) || 'utf-8';
    
    await workspace.filesystem.writeFile(path, content, { encoding });
    
    return { 
      path, 
      success: true, 
      bytesWritten: Buffer.byteLength(content, encoding) 
    };
  },
});

/** Informações do arquivo - versão ultra-permissiva */
export const fileStatSafe = createAgnosticTool({
  id: 'file_stat',
  name: 'File Stat',
  description: 'Get metadata about a file or directory',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    path: z.string(),
    exists: z.boolean(),
    type: z.string(),
    size: z.number().optional(),
    modified: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    console.log('[file_stat] Normalized input:', input);
    
    const path = String(input.path || '');
    if (!path) {
      throw new Error('Path is required');
    }
    
    const stat = await workspace.filesystem.stat(path);
    return {
      path,
      exists: true,
      type: stat.type,
      size: stat.size,
      modified: stat.mtime?.toISOString(),
    };
  },
});
