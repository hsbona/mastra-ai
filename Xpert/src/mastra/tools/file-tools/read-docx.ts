/**
 * Read DOCX Tool - Versão Agnóstica
 * 
 * Extrai texto de documentos Word (.docx) usando mammoth.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import { resolveFilePath } from './utils';
import { createAgnosticTool } from '../agnostic';

function normalizeInput(input: unknown): { filePath: string; extractHtml?: boolean } {
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
  
  const extractHtml = obj.extractHtml === true || obj.extractHtml === 'true' || obj.html === true;
  
  return { filePath, extractHtml };
}

export const readDOCXTool = createAgnosticTool({
  id: 'read-docx',
  name: 'Read DOCX',
  description: 'Extrai texto de documentos Word (.docx). Arquivos devem estar em workspace/uploads/',
  inputSchema: z.record(z.any()),
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
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    const filePath = input.filePath;
    const extractHtml = input.extractHtml;
    
    if (!filePath) {
      return {
        success: false,
        text: '',
        headings: [],
        metadata: { fileName: '', wordCount: 0 },
        error: '❌ CAMINHO DO ARQUIVO NÃO FORNECIDO. Use filePath: "uploads/documento.docx"',
      };
    }
    
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
        metadata: { fileName: path.basename(filePath) || '', wordCount: 0 },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ler DOCX',
      };
    }
  },
});
