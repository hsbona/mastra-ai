/**
 * Read Excel Tool
 * 
 * Lê planilhas Excel (.xlsx, .xls) e CSV usando xlsx.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveFilePath } from './utils';

export const readExcelTool = createTool({
  id: 'read-excel',
  description: 'Lê planilhas Excel (.xlsx, .xls) e CSV. Arquivos devem estar em Xpert/workspace/uploads/',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/dados.xlsx)'),
    sheetName: z.string().optional().describe('Nome da sheet (padrão: primeira sheet)'),
    range: z.string().optional().describe('Range de células (ex: A1:D10)'),
    headerRow: z.number().optional().describe('Linha do header (1-indexed, padrão: 1)'),
  }),
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
  execute: async ({ filePath, sheetName, range, headerRow }) => {
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
        metadata: { fileName: '' },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ler Excel',
      };
    }
  },
});
