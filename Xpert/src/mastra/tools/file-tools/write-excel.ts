/**
 * Write Excel Tool
 * 
 * Cria planilhas Excel (.xlsx) a partir de arrays de objetos.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workspace } from '../../workspace-config';

export const writeExcelTool = createTool({
  id: 'write-excel',
  description: 'Cria planilhas Excel (.xlsx) a partir de arrays de objetos. Salva em workspace/outputs/',
  inputSchema: z.object({
    fileName: z.string().describe('Nome do arquivo (sem extensão)'),
    outputPath: z.string().describe('Caminho relativo à pasta workspace/outputs/'),
    sheets: z.array(z.object({
      name: z.string().describe('Nome da sheet'),
      data: z.array(z.record(z.string(), z.any())).describe('Array de objetos (cada objeto é uma linha)'),
    })),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    metadata: z.object({
      fileName: z.string(),
      fullPath: z.string(),
      sheetCount: z.number(),
      totalRows: z.number(),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const outputDir = path.join(workspace.filesystem.basePath, 'outputs', context.outputPath);
      
      await fs.mkdir(outputDir, { recursive: true });
      
      const fileName = context.fileName.endsWith('.xlsx') ? context.fileName : `${context.fileName}.xlsx`;
      const fullPath = path.join(outputDir, fileName);
      
      const workbook = XLSX.utils.book_new();
      let totalRows = 0;
      
      for (const sheet of context.sheets) {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        
        // Formatar headers em negrito
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellRef]) {
            worksheet[cellRef].s = { font: { bold: true } };
          }
        }
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        totalRows += sheet.data.length;
      }
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      await fs.writeFile(fullPath, buffer);
      
      return {
        success: true,
        filePath: path.join(context.outputPath, fileName),
        metadata: {
          fileName,
          fullPath,
          sheetCount: context.sheets.length,
          totalRows,
        },
      };
    } catch (error) {
      return {
        success: false,
        filePath: '',
        metadata: { fileName: '', fullPath: '', sheetCount: 0, totalRows: 0 },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar Excel',
      };
    }
  },
});
