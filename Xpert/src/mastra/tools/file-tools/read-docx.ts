/**
 * Read DOCX Tool
 * 
 * Extrai texto de documentos Word (.docx) usando mammoth.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveFilePath } from './utils';

export const readDOCXTool = createTool({
  id: 'read-docx',
  description: 'Extrai texto de documentos Word (.docx). Arquivos devem estar em Xpert/workspace/uploads/',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/documento.docx)'),
    extractHtml: z.boolean().optional().describe('Retornar conteúdo em HTML (padrão: false)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    text: z.string(),
    html: z.string().optional(),
    headings: z.array(z.object({
      level: z.number(),
      text: z.string(),
    })),
    metadata: z.object({
      fileName: z.string(),
      wordCount: z.number(),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ filePath, extractHtml }) => {
    try {
      const fullPath = resolveFilePath(filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const htmlResult = extractHtml 
        ? await mammoth.convertToHtml({ buffer: fileBuffer })
        : { value: '' };
      
      const text = result.value;
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      
      // Extrair headings simples
      const lines = text.split('\n');
      const headings: Array<{ level: number; text: string }> = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 0 && trimmed.length < 100) {
          if (/^[A-Z][A-Z\s]+$/.test(trimmed) || trimmed.endsWith(':')) {
            headings.push({ level: 1, text: trimmed });
          }
        }
      });
      
      return {
        success: true,
        text,
        html: extractHtml ? htmlResult.value : undefined,
        headings,
        metadata: {
          fileName: path.basename(filePath),
          wordCount: words.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        headings: [],
        metadata: { fileName: '', wordCount: 0 },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ler DOCX',
      };
    }
  },
});
