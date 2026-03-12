/**
 * File Tools - Sprint 2
 * Tools para leitura e escrita de arquivos (PDF, DOCX, XLSX)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// READ PDF TOOL
// ============================================

export const readPDFTool = createTool({
  id: 'read-pdf',
  description: 'Extrai texto de arquivos PDF com suporte a seleção de páginas',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo PDF relativo à pasta workspace/'),
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
    }),
    error: z.string().optional(),
  }),
  execute: async ({ filePath, startPage, endPage }: { filePath: string; startPage?: number; endPage?: number }) => {
    try {
      const fullPath = path.join('./workspace', filePath);
      
      // Extrair texto usando pdf2json
      const text = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', (errData) => {
          reject(new Error(errData.parserError || 'Erro ao parsear PDF'));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          // Extrair texto de todas as páginas
          let extractedText = '';
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((r: any) => {
                      if (r.T) {
                        // Decodificar URI encoding (se necessário)
                        try {
                          extractedText += decodeURIComponent(r.T) + ' ';
                        } catch {
                          // Se falhar, usar texto como está
                          extractedText += r.T + ' ';
                        }
                      }
                    });
                  }
                });
                extractedText += '\n';
              }
            });
          }
          resolve(extractedText.trim());
        });
        
        pdfParser.loadPDF(fullPath);
      });
      
      // Contar páginas usando pdf-lib (já está carregado)
      const fileBuffer = await fs.readFile(fullPath);
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      return {
        success: true,
        text: text,
        metadata: {
          totalPages,
          extractedPages: totalPages,
          fileName: path.basename(filePath),
        },
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        metadata: { totalPages: 0, extractedPages: 0, fileName: '' },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao ler PDF',
      };
    }
  },
});

// ============================================
// READ DOCX TOOL
// ============================================

export const readDOCXTool = createTool({
  id: 'read-docx',
  description: 'Extrai texto de documentos Word (.docx) mantendo estrutura',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo DOCX relativo à pasta workspace/'),
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
  execute: async ({ context }) => {
    try {
      const fullPath = path.join('./workspace', context.filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const htmlResult = context.extractHtml 
        ? await mammoth.convertToHtml({ buffer: fileBuffer })
        : { value: '' };
      
      const text = result.value;
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      
      // Extrair headings simples (linhas que parecem títulos)
      const lines = text.split('\n');
      const headings: Array<{ level: number; text: string }> = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 0 && trimmed.length < 100) {
          // Detectar possíveis headings por padrões comuns
          if (/^[A-Z][A-Z\s]+$/.test(trimmed) || trimmed.endsWith(':')) {
            headings.push({ level: 1, text: trimmed });
          }
        }
      });
      
      return {
        success: true,
        text,
        html: context.extractHtml ? htmlResult.value : undefined,
        headings,
        metadata: {
          fileName: path.basename(context.filePath),
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

// ============================================
// READ EXCEL TOOL
// ============================================

export const readExcelTool = createTool({
  id: 'read-excel',
  description: 'Lê planilhas Excel (.xlsx, .xls) e CSV, retorna dados como array de objetos',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo Excel/CSV relativo à pasta workspace/'),
    sheetName: z.string().optional().describe('Nome da sheet (padrão: primeira sheet)'),
    range: z.string().optional().describe('Range de células (ex: A1:D10)'),
    headerRow: z.number().optional().describe('Linha do header (1-indexed, padrão: 1)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.array(z.record(z.any())),
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
  execute: async ({ context }) => {
    try {
      const fullPath = path.join('./workspace', context.filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      const targetSheet = context.sheetName || sheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];
      
      if (!worksheet) {
        throw new Error(`Sheet '${targetSheet}' não encontrada. Sheets disponíveis: ${sheetNames.join(', ')}`);
      }
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: context.headerRow ? context.headerRow - 1 : 0,
        range: context.range,
        defval: null,
      });
      
      // Extrair nomes das colunas
      const columnNames = worksheet['!ref'] 
        ? XLSX.utils.sheet_to_json(worksheet, { header: 1, range: context.range })[0] as string[]
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
          fileName: path.basename(context.filePath),
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

// ============================================
// WRITE DOCX TOOL
// ============================================

export const writeDOCXTool = createTool({
  id: 'write-docx',
  description: 'Cria documentos Word (.docx) com formatação básica',
  inputSchema: z.object({
    fileName: z.string().describe('Nome do arquivo (sem extensão)'),
    outputPath: z.string().describe('Caminho relativo à pasta workspace/outputs/'),
    content: z.array(z.object({
      type: z.enum(['heading', 'paragraph', 'text']),
      text: z.string(),
      level: z.number().optional(), // para headings
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
    })),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    metadata: z.object({
      fileName: z.string(),
      fullPath: z.string(),
      paragraphCount: z.number(),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const outputDir = path.join('./workspace/outputs', context.outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      const fileName = context.fileName.endsWith('.docx') ? context.fileName : `${context.fileName}.docx`;
      const fullPath = path.join(outputDir, fileName);
      
      const children: Paragraph[] = [];
      
      for (const item of context.content) {
        if (item.type === 'heading') {
          children.push(
            new Paragraph({
              text: item.text,
              heading: item.level === 1 ? HeadingLevel.HEADING_1 : 
                       item.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            })
          );
        } else if (item.type === 'paragraph') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.text,
                  bold: item.bold,
                  italics: item.italic,
                }),
              ],
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.text,
                  bold: item.bold,
                  italics: item.italic,
                }),
              ],
            })
          );
        }
      }
      
      const doc = new Document({
        sections: [{ children }],
      });
      
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(fullPath, buffer);
      
      return {
        success: true,
        filePath: path.join(context.outputPath, fileName),
        metadata: {
          fileName,
          fullPath,
          paragraphCount: children.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        filePath: '',
        metadata: { fileName: '', fullPath: '', paragraphCount: 0 },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar DOCX',
      };
    }
  },
});

// ============================================
// WRITE EXCEL TOOL
// ============================================

export const writeExcelTool = createTool({
  id: 'write-excel',
  description: 'Cria planilhas Excel (.xlsx) a partir de arrays de objetos',
  inputSchema: z.object({
    fileName: z.string().describe('Nome do arquivo (sem extensão)'),
    outputPath: z.string().describe('Caminho relativo à pasta workspace/outputs/'),
    sheets: z.array(z.object({
      name: z.string().describe('Nome da sheet'),
      data: z.array(z.record(z.any())).describe('Array de objetos (cada objeto é uma linha)'),
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
      const outputDir = path.join('./workspace/outputs', context.outputPath);
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

// Exportar todas as tools
export const fileTools = {
  readPDFTool,
  readDOCXTool,
  readExcelTool,
  writeDOCXTool,
  writeExcelTool,
};
