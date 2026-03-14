/**
 * File Tools - Sprint 2
 * Tools para leitura e escrita de arquivos (PDF, DOCX, XLSX)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// READ PDF TOOL
// ============================================

/**
 * Resolve o caminho do arquivo tentando múltiplas estratégias
 * O Mastra pode executar de diretórios diferentes, então tentamos várias opções
 * 
 * DIRETÓRIO OFICIAL DE UPLOADS: Xpert/workspace/uploads/
 * Todo arquivo para leitura DEVE estar em workspace/uploads/ ou workspace/outputs/
 */
async function resolveFilePath(filePath: string): Promise<{ fullPath: string; attempted: string[] }> {
  const attempted: string[] = [];
  
  // Se já for caminho absoluto, usar diretamente
  if (path.isAbsolute(filePath)) {
    return { fullPath: filePath, attempted: [filePath] };
  }
  
  // Estratégias para resolver o caminho (em ordem de prioridade)
  // IMPORTANTE: O diretório de trabalho oficial é Xpert/
  // O arquivo deve estar em Xpert/workspace/uploads/ ou Xpert/workspace/outputs/
  
  // Detectar a raiz do projeto (onde está a pasta workspace/)
  const cwd = process.cwd();
  const isInSrcMastra = cwd.includes('/src/mastra') || cwd.includes('\\src\\mastra');
  
  const strategies = [
    // 1. Se estamos em src/mastra/public/ ou similar, subir até a raiz do projeto
    isInSrcMastra ? path.resolve(cwd, '../../../workspace', filePath) : null,
    // 2. Caminho absoluto direto à partir da raiz do projeto detectada
    path.resolve(cwd, '../../workspace', filePath),
    // 3. Direto como está (se já incluir workspace/)
    path.resolve(cwd, filePath),
    // 4. A partir da raiz do projeto (quando cwd é Xpert/)
    path.resolve(cwd, 'workspace', filePath),
    // 5. Subindo 1 nível (se cwd for Xpert/src/mastra/)
    path.resolve(cwd, '../workspace', filePath),
    // 6. Subindo 2 níveis (se cwd for Xpert/src/mastra/tools/)
    path.resolve(cwd, '../../workspace', filePath),
    // 7. A partir do diretório do arquivo atual (__dirname)
    path.resolve(__dirname, '../../workspace', filePath),
    // 8. Usando import.meta.url (ES modules)
    path.resolve(new URL('.', import.meta.url).pathname, '../../workspace', filePath),
    // 9. Subindo 3 níveis + caminho direto
    path.resolve(cwd, '../../..', filePath),
    // 10. Diretamente no workspace/ (para compatibilidade)
    path.resolve(cwd, '../..', filePath),
  ].filter((s): s is string => s !== null);  // Remove nulls
  
  for (const candidate of strategies) {
    attempted.push(candidate);
    try {
      await fs.access(candidate);
      // Arquivo encontrado!
      console.log(`[resolveFilePath] ✅ Arquivo encontrado: ${candidate}`);
      return { fullPath: candidate, attempted };
    } catch {
      // Não existe neste caminho, tentar próximo
      continue;
    }
  }
  
  // Nenhum caminho funcionou, retornar o primeiro (para mensagem de erro)
  return { fullPath: strategies[0], attempted };
}

export const readPDFTool = createTool({
  id: 'read-pdf',
  description: 'Extrai texto de arquivos PDF. IMPORTANTE: Os arquivos devem estar em Xpert/workspace/uploads/. Use caminho relativo a workspace/ (ex: uploads/arquivo.pdf)',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/Lei_8112_1ed.pdf). O arquivo DEVE estar em Xpert/workspace/uploads/'),
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
  execute: async ({ filePath, startPage, endPage }: { 
    filePath: string; 
    startPage?: number; 
    endPage?: number;
  }) => {
    const fileName = path.basename(filePath);
    
    // Resolver caminho usando múltiplas estratégias
    const { fullPath, attempted } = await resolveFilePath(filePath);
    
    // Log para debug
    console.log(`[readPDFTool] filePath: ${filePath}`);
    console.log(`[readPDFTool] process.cwd(): ${process.cwd()}`);
    console.log(`[readPDFTool] Caminhos tentados: ${attempted.join(', ')}`);
    console.log(`[readPDFTool] Usando: ${fullPath}`);
    
    // Validar parâmetros de página
    const start = startPage && startPage > 0 ? startPage - 1 : 0; // Converter para 0-indexed
    const end = endPage && endPage > 0 ? endPage - 1 : null;
    
    try {
      // Verificar se arquivo existe antes de tentar ler
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          text: '',
          metadata: { totalPages: 0, extractedPages: 0, fileName },
          error: `❌ ARQUIVO NÃO ENCONTRADO: '${filePath}'\n\n` +
                 `📁 DIRETÓRIO OFICIAL: Xpert/workspace/uploads/\n\n` +
                 `✅ COMO USAR:\n` +
                 `  • Coloque o arquivo em: Xpert/workspace/uploads/\n` +
                 `  • Use o caminho: uploads/nome-do-arquivo.pdf\n\n` +
                 `🔍 Caminhos tentados:\n` +
                 attempted.map((p, i) => `  ${i + 1}. ${p}`).join('\n') + `\n\n` +
                 `⚠️  Verifique:\n` +
                 `  • O arquivo existe em Xpert/workspace/uploads/?\n` +
                 `  • O nome do arquivo está correto (incluindo maiúsculas/minúsculas)?\n` +
                 `  • Você usou o formato: uploads/nome-do-arquivo.pdf?\n` +
                 `  • process.cwd() atual: ${process.cwd()}`,
        };
      }

      // Verificar se é um arquivo PDF válido
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
      
      // Extrair texto usando pdf2json com timeout e suporte a range de páginas
      const result = await new Promise<{ text: string; totalPages: number; extractedPages: number }>((resolve, reject) => {
        const pdfParser = new PDFParser();
        let timeoutId: NodeJS.Timeout;
        
        // Timeout de 15 segundos
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
          
          // Determinar range de páginas a extrair
          const actualEnd = end !== null && end < totalPages ? end : totalPages - 1;
          const pageStart = Math.min(start, totalPages - 1);
          const pageEnd = Math.max(pageStart, actualEnd);
          
          // Extrair texto das páginas selecionadas
          let extractedText = '';
          const pagesToProcess = pdfData.Pages?.slice(pageStart, pageEnd + 1) || [];
          
          pagesToProcess.forEach((page: any, idx: number) => {
            const pageNum = pageStart + idx + 1; // 1-indexed para exibição
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
      
      // Verificar se extraiu texto
      if (!result.text || result.text.trim().length === 0) {
        return {
          success: false,
          text: '',
          metadata: { 
            totalPages: result.totalPages, 
            extractedPages: 0, 
            fileName,
          },
          error: `❌ PDF SEM TEXTO EXTRAÍVEL: O arquivo '${fileName}' possui ${result.totalPages} página(s), mas não foi possível extrair texto. ` +
                 `O PDF pode ser uma imagem digitalizada ou estar protegido.`,
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
      // Identificar tipo específico de erro
      let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao ler PDF';
      
      if (errorMessage.includes('InvalidPDF')) {
        errorMessage = `❌ PDF INVÁLIDO: O arquivo '${fileName}' não é um PDF válido ou está corrompido.`;
      } else if (errorMessage.includes('encrypted') || errorMessage.includes('password')) {
        errorMessage = `❌ PDF PROTEGIDO: O arquivo '${fileName}' está protegido por senha e não pode ser lido.`;
      } else if (errorMessage.includes('ENOENT')) {
        errorMessage = `❌ ARQUIVO NÃO ENCONTRADO: '${filePath}' não existe em workspace/.`;
      } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
        errorMessage = `❌ PERMISSÃO NEGADA: Sem acesso para ler '${fileName}'.`;
      } else {
        errorMessage = `❌ ERRO AO LER PDF '${fileName}': ${errorMessage}`;
      }
      
      return {
        success: false,
        text: '',
        metadata: { totalPages: 0, extractedPages: 0, fileName },
        error: errorMessage,
      };
    }
  },
});

// ============================================
// READ DOCX TOOL
// ============================================

export const readDOCXTool = createTool({
  id: 'read-docx',
  description: 'Extrai texto de documentos Word (.docx). IMPORTANTE: Os arquivos devem estar em Xpert/workspace/uploads/. Use caminho relativo a workspace/ (ex: uploads/arquivo.docx)',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/documento.docx). O arquivo DEVE estar em Xpert/workspace/uploads/'),
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
  execute: async ({ filePath, extractHtml }: { filePath: string; extractHtml?: boolean }) => {
    try {
      const { fullPath } = await resolveFilePath(filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const htmlResult = extractHtml 
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

// ============================================
// READ EXCEL TOOL
// ============================================

export const readExcelTool = createTool({
  id: 'read-excel',
  description: 'Lê planilhas Excel (.xlsx, .xls) e CSV. IMPORTANTE: Os arquivos devem estar em Xpert/workspace/uploads/. Use caminho relativo a workspace/ (ex: uploads/planilha.xlsx)',
  inputSchema: z.object({
    filePath: z.string().describe('Caminho do arquivo relativo à pasta workspace/ (ex: uploads/dados.xlsx). O arquivo DEVE estar em Xpert/workspace/uploads/'),
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
  execute: async ({ filePath, sheetName, range, headerRow }: { filePath: string; sheetName?: string; range?: string; headerRow?: number }) => {
    try {
      const { fullPath } = await resolveFilePath(filePath);
      const fileBuffer = await fs.readFile(fullPath);
      
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      const targetSheet = sheetName || sheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];
      
      if (!worksheet) {
        throw new Error(`Sheet '${targetSheet}' não encontrada. Sheets disponíveis: ${sheetNames.join(', ')}`);
      }
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: headerRow ? headerRow - 1 : 0,
        range: range,
        defval: null,
      });
      
      // Extrair nomes das colunas
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
      // Determinar o diretório de saída baseado no cwd
      // O workspace deve estar na raiz do projeto Xpert/
      let outputDir: string;
      
      // Tentar múltiplas estratégias para encontrar/criar o diretório workspace
      const cwd = process.cwd();
      const strategies = [
        path.resolve(cwd, 'workspace/outputs', context.outputPath),
        path.resolve(cwd, '../workspace/outputs', context.outputPath),
        path.resolve(cwd, '../../workspace/outputs', context.outputPath),
        path.resolve(__dirname, '../../../workspace/outputs', context.outputPath),
      ];
      
      // Usar a primeira estratégia que funcione (ou a primeira se nenhuma existir)
      outputDir = strategies[0];
      
      // Tentar encontrar um diretório workspace existente
      for (const candidate of strategies) {
        const parentWorkspace = path.dirname(path.dirname(candidate));
        try {
          await fs.access(parentWorkspace);
          outputDir = candidate;
          break;
        } catch {
          continue;
        }
      }
      
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
      // Determinar o diretório de saída baseado no cwd
      let outputDir: string;
      
      const cwd = process.cwd();
      const strategies = [
        path.resolve(cwd, 'workspace/outputs', context.outputPath),
        path.resolve(cwd, '../workspace/outputs', context.outputPath),
        path.resolve(cwd, '../../workspace/outputs', context.outputPath),
        path.resolve(__dirname, '../../../workspace/outputs', context.outputPath),
      ];
      
      outputDir = strategies[0];
      
      for (const candidate of strategies) {
        const parentWorkspace = path.dirname(path.dirname(candidate));
        try {
          await fs.access(parentWorkspace);
          outputDir = candidate;
          break;
        } catch {
          continue;
        }
      }
      
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

// ============================================
// LIST WORKSPACE FILES TOOL
// ============================================

export const listWorkspaceFilesTool = createTool({
  id: 'list-workspace-files',
  description: 'Lista todos os arquivos disponíveis no diretório workspace/uploads/ e workspace/outputs/',
  inputSchema: z.object({
    directory: z.enum(['uploads', 'outputs', 'all']).optional().describe('Diretório a listar (padrão: all)'),
    extension: z.string().optional().describe('Filtrar por extensão (ex: .pdf, .docx)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    files: z.array(z.object({
      name: z.string(),
      path: z.string(),
      size: z.number(),
      modified: z.string(),
      extension: z.string(),
    })),
    totalCount: z.number(),
    directories: z.array(z.string()),
    error: z.string().optional(),
  }),
  execute: async ({ 
    directory = 'all',
    extension 
  }: { 
    directory?: 'uploads' | 'outputs' | 'all';
    extension?: string;
  }) => {
    const attemptedDirs: string[] = [];
    const allFiles: Array<{
      name: string;
      path: string;
      size: number;
      modified: string;
      extension: string;
    }> = [];
    
    const dirsToList: string[] = [];
    
    if (directory === 'all' || directory === 'uploads') {
      dirsToList.push('uploads');
    }
    if (directory === 'all' || directory === 'outputs') {
      dirsToList.push('outputs');
    }
    
    for (const dir of dirsToList) {
      // Tentar múltiplas estratégias para encontrar o diretório
      const strategies = [
        path.resolve(process.cwd(), 'workspace', dir),
        path.resolve(process.cwd(), '../workspace', dir),
        path.resolve(process.cwd(), '../../workspace', dir),
        path.resolve(process.cwd(), '../../../workspace', dir),
        path.resolve(__dirname, '../../workspace', dir),
      ];
      
      let foundDir: string | null = null;
      
      for (const candidate of strategies) {
        attemptedDirs.push(candidate);
        try {
          const stats = await fs.stat(candidate);
          if (stats.isDirectory()) {
            foundDir = candidate;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!foundDir) {
        continue; // Diretório não encontrado, tentar próximo
      }
      
      try {
        const entries = await fs.readdir(foundDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile()) {
            const fileExt = path.extname(entry.name).toLowerCase();
            
            // Filtrar por extensão se especificado
            if (extension && !entry.name.toLowerCase().endsWith(extension.toLowerCase())) {
              continue;
            }
            
            const filePath = path.join(foundDir, entry.name);
            const stats = await fs.stat(filePath);
            
            allFiles.push({
              name: entry.name,
              path: `workspace/${dir}/${entry.name}`,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              extension: fileExt,
            });
          }
        }
      } catch (error) {
        console.error(`[listWorkspaceFilesTool] Erro ao ler ${dir}:`, error);
      }
    }
    
    // Ordenar por data de modificação (mais recente primeiro)
    allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return {
      success: allFiles.length > 0,
      files: allFiles,
      totalCount: allFiles.length,
      directories: [...new Set(allFiles.map(f => path.dirname(f.path)))],
      error: allFiles.length === 0 ? 
        `Nenhum arquivo encontrado em workspace/${directory}/. Diretórios tentados: ${attemptedDirs.join(', ')}` : 
        undefined,
    };
  },
});

// Exportar todas as tools
export const fileTools = {
  readPDFTool,
  readDOCXTool,
  readExcelTool,
  writeDOCXTool,
  writeExcelTool,
  listWorkspaceFilesTool,
};
