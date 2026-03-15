/**
 * Read PDF Tool
 * 
 * Extrai texto de arquivos PDF usando pdf2json.
 * Suporta paginação para arquivos grandes.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import PDFParser from 'pdf2json';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workspace } from '../../workspace-config';
import { resolveFilePath } from './utils';

export const readPDFTool = createTool({
  id: 'read-pdf',
  description: 'Extrai texto de arquivos PDF. Arquivos devem estar em Xpert/workspace/uploads/',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/documento.pdf)'),
    startPage: z.number().optional().describe('Página inicial (1-indexed, padrão: 1)'),
    endPage: z.number().optional().describe('Página final (inclusive, padrão: última)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    text: z.string(),
    metadata: z.object({
      totalPages: z.number(),
      extractedPages: z.number(),
      fileName: z.string(),
      requestedStartPage: z.number().optional(),
      requestedEndPage: z.number().optional(),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ filePath, startPage, endPage }) => {
    const fileName = path.basename(filePath);
    const fullPath = resolveFilePath(filePath);
    
    const start = startPage && startPage > 0 ? startPage - 1 : 0;
    const end = endPage && endPage > 0 ? endPage - 1 : null;
    
    try {
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ ARQUIVO NÃO ENCONTRADO: '${filePath}'\n\n📁 Diretório: ${workspace.filesystem.basePath}`,
        };
      }

      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ CAMINHO INVÁLIDO: '${filePath}' não é um arquivo.`,
        };
      }

      if (stats.size === 0) {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ ARQUIVO VAZIO: O arquivo '${fileName}' está vazio (0 bytes).`,
        };
      }
      
      const result = await new Promise<{ text: string; totalPages: number; extractedPages: number }>((resolve, reject) => {
        const pdfParser = new PDFParser();
        let timeoutId: NodeJS.Timeout;
        
        timeoutId = setTimeout(() => {
          reject(new Error('Timeout ao processar PDF (>15s)'));
        }, 15000);
        
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          clearTimeout(timeoutId);
          const errorMsg = errData?.parserError?.message || errData?.parserError || 'Erro desconhecido ao parsear PDF';
          reject(new Error(`PDF parse error: ${errorMsg}`));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          clearTimeout(timeoutId);
          
          const totalPages = pdfData.Pages?.length || 0;
          const actualEnd = end !== null && end < totalPages ? end : totalPages - 1;
          const pageStart = Math.min(start, totalPages - 1);
          const pageEnd = Math.max(pageStart, actualEnd);
          
          let extractedText = '';
          const pagesToProcess = pdfData.Pages?.slice(pageStart, pageEnd + 1) || [];
          
          pagesToProcess.forEach((page: any, idx: number) => {
            const pageNum = pageStart + idx + 1;
            extractedText += `\n--- Página ${pageNum} ---\n`;
            
            if (page.Texts && Array.isArray(page.Texts)) {
              page.Texts.forEach((textItem: any) => {
                if (textItem.R && Array.isArray(textItem.R)) {
                  textItem.R.forEach((r: any) => {
                    if (r.T) {
                      try {
                        extractedText += decodeURIComponent(r.T) + ' ';
                      } catch {
                        extractedText += r.T + ' ';
                      }
                    }
                  });
                }
              });
              extractedText += '\n';
            }
          });
          
          resolve({
            text: extractedText.trim(),
            totalPages,
            extractedPages: pagesToProcess.length,
          });
        });
        
        try {
          pdfParser.loadPDF(fullPath);
        } catch (err) {
          clearTimeout(timeoutId);
          reject(new Error(`Erro ao iniciar parser: ${err}`));
        }
      });
      
      if (!result.text || result.text.trim().length === 0) {
        return {
          success: false,
          text: '',
          metadata: { totalPages: result.totalPages, extractedPages: 0, fileName },
          error: `❌ PDF SEM TEXTO EXTRAÍVEL: O arquivo '${fileName}' pode ser uma imagem digitalizada ou estar protegido.`,
        };
      }
      
      return {
        success: true,
        text: result.text,
        metadata: {
          totalPages: result.totalPages,
          extractedPages: result.extractedPages,
          fileName,
          requestedStartPage: startPage || 1,
          requestedEndPage: endPage || result.totalPages,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao ler PDF';
      
      if (errorMessage.includes('InvalidPDF')) {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ PDF INVÁLIDO: O arquivo '${fileName}' não é um PDF válido ou está corrompido.`,
        };
      }
      
      if (errorMessage.includes('encrypted') || errorMessage.includes('password')) {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ PDF PROTEGIDO: O arquivo '${fileName}' está protegido por senha.`,
        };
      }
      
      return {
        success: false,
        text: '',
        metadata: { totalPages: 0, extractedPages: 0, fileName },
        error: `❌ ERRO AO LER PDF '${fileName}': ${errorMessage}`,
      };
    }
  },
});
