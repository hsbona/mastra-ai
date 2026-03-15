/**
 * Read Excel Tool - Versão Agnóstica
 * 
 * Lê planilhas Excel (.xlsx, .xls) e CSV usando xlsx.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveFilePath } from './utils';
import { createAgnosticTool } from '../agnostic';

function normalizeInput(input: unknown): { 
  filePath: string; 
  sheetName?: string; 
  range?: string; 
  headerRow?: number;
} {
  if (typeof input !== 'object' || input === null) {
    return { filePath: '' };
  }
  const obj = input as Record<string, unknown>;
  
  let filePath = '';
  if (typeof obj.filePath === 'string') {
    filePath = obj.filePath;
  } else if (typeof obj.path === 'string') {
    filePath = obj.path;
  } else if (typeof obj.file === 'string') {
    filePath = obj.file;
  }
  
  const sheetName = typeof obj.sheetName === 'string' ? obj.sheetName :
                   typeof obj.sheet === 'string' ? obj.sheet : undefined;
  
  const range = typeof obj.range === 'string' ? obj.range : undefined;
  
  const headerRow = typeof obj.headerRow === 'number' ? obj.headerRow :
                   typeof obj.headerRow === 'string' ? parseInt(obj.headerRow, 10) || undefined :
                   typeof obj.header === 'number' ? obj.header :
                   typeof obj.header === 'string' ? parseInt(obj.header, 10) || undefined :
                   undefined;
  
  return { filePath, sheetName, range, headerRow };
}

export const readExcelTool = createAgnosticTool({
  id: 'read-excel',
  name: 'Read Excel',
  description: 'Lê planilhas Excel (.xlsx, .xls) e CSV. Arquivos devem estar em workspace/uploads/',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.array(z.record(z.string(), z.any())),
    summary: z.object({
      totalRows: z.number(),
      totalColumns: z.number(),
      sheetNames: z.array(z.string()),
      columnNames: z.array(z.string()),
    }),
    metadata: z.object({
      fileName: z.string(),
    }),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    const filePath = input.filePath;
    const sheetName = input.sheetName;
    const range = input.range;
    const headerRow = input.headerRow;
    
    if (!filePath) {
      return {
        success: false,
        data: [],
        summary: {
          totalRows: 0,
          totalColumns: 0,
          sheetNames: [],
          columnNames: [],
        },
        metadata: { fileName: '' },
        error: '❌ CAMINHO DO ARQUIVO NÃO FORNECIDO. Use filePath: "uploads/dados.xlsx"',
      };
    }
    
    try {
      const fullPath = resolveFilePath(filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      const targetSheet = sheetName || sheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];
      
      if (!worksheet) {
        throw new Error(`Sheet '${targetSheet}' não encontrada. Sheets disponíveis: ${sheetNames.join(', ')}`);
      }
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: headerRow ? headerRow - 1 : 0,
        range: range,
        defval: null,
      });
      
      const columnNames = worksheet['!ref'] 
        ? XLSX.utils.sheet_to_json(worksheet, { header: 1, range })[0] as string[]
        : [];
      
      const summary = {
        totalRows: jsonData.length,
        totalColumns: columnNames.length,
        sheetNames,
        columnNames: columnNames.map(c => String(c)),
      };
      
      return {
        success: true,
        data: jsonData as Record<string, any>[],
        summary,
        metadata: {
          fileName: path.basename(filePath),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        summary: {
          totalRows: 0,
          totalColumns: 0,
          sheetNames: [],
          columnNames: [],
        },
        metadata: { fileName: path.basename(filePath) || '' },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ler Excel',
      };
    }
  },
});
