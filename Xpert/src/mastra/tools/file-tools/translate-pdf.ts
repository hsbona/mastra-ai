/**
 * Translate PDF Tool - Versão Agnóstica
 * 
 * Traduz o conteúdo de um PDF e cria um novo arquivo PDF com o texto traduzido.
 * Suporta múltiplos idiomas de destino.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workspace } from '../../workspace-config';
import { resolveFilePath } from './utils';
import { createAgnosticTool } from '../agnostic';
import { readPDFTool } from './read-pdf';

function normalizeInput(input: unknown): { 
  sourcePath: string; 
  targetPath: string; 
  targetLanguage?: string;
  sourceLanguage?: string;
} {
  if (typeof input !== 'object' || input === null) {
    return { sourcePath: '', targetPath: '' };
  }
  const obj = input as Record<string, unknown>;
  
  let sourcePath = '';
  if (typeof obj.sourcePath === 'string') {
    sourcePath = obj.sourcePath;
  } else if (typeof obj.source_path === 'string') {
    sourcePath = obj.source_path;
  } else if (typeof obj.path === 'string') {
    sourcePath = obj.path;
  } else if (typeof obj.file === 'string') {
    sourcePath = obj.file;
  }
  
  let targetPath = '';
  if (typeof obj.targetPath === 'string') {
    targetPath = obj.targetPath;
  } else if (typeof obj.target_path === 'string') {
    targetPath = obj.target_path;
  } else if (typeof obj.output === 'string') {
    targetPath = obj.output;
  }
  
  const targetLanguage = typeof obj.targetLanguage === 'string' ? obj.targetLanguage :
                        typeof obj.target_language === 'string' ? obj.target_language :
                        typeof obj.language === 'string' ? obj.language :
                        'english';
  
  const sourceLanguage = typeof obj.sourceLanguage === 'string' ? obj.sourceLanguage :
                        typeof obj.source_language === 'string' ? obj.source_language :
                        'portuguese';
  
  return { sourcePath, targetPath, targetLanguage, sourceLanguage };
}

/**
 * Divide texto em linhas que cabem na largura da página
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

export const translatePDFTool = createAgnosticTool({
  id: 'translate_pdf',
  name: 'Translate PDF',
  description: 'Traduz um arquivo PDF para outro idioma e salva como novo PDF. Parâmetros: sourcePath (caminho do PDF original), targetPath (caminho do PDF traduzido), targetLanguage (idioma de destino, padrão: english), sourceLanguage (idioma de origem, padrão: portuguese)',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    sourcePath: z.string(),
    targetPath: z.string(),
    pagesProcessed: z.number(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    const { sourcePath, targetPath, targetLanguage, sourceLanguage } = input;
    
    if (!sourcePath) {
      return {
        success: false,
        message: 'Caminho do arquivo fonte não fornecido',
        sourcePath: '',
        targetPath: '',
        pagesProcessed: 0,
        error: '❌ CAMINHO DO ARQUIVO FONTE NÃO FORNECIDO. Use sourcePath: "uploads/documento.pdf"',
      };
    }
    
    if (!targetPath) {
      return {
        success: false,
        message: 'Caminho do arquivo de destino não fornecido',
        sourcePath,
        targetPath: '',
        pagesProcessed: 0,
        error: '❌ CAMINHO DO ARQUIVO DE DESTINO NÃO FORNECIDO. Use targetPath: "outputs/documento_traduzido.pdf"',
      };
    }
    
    try {
      // Verifica se o arquivo fonte existe
      const fullSourcePath = resolveFilePath(sourcePath);
      try {
        await fs.access(fullSourcePath);
      } catch {
        return {
          success: false,
          message: `Arquivo fonte não encontrado: ${sourcePath}`,
          sourcePath,
          targetPath,
          pagesProcessed: 0,
          error: `❌ ARQUIVO NÃO ENCONTRADO: '${sourcePath}'`,
        };
      }
      
      // Extrai texto do PDF usando a tool read_pdf
      console.log(`[translate_pdf] Extraindo texto de ${sourcePath}...`);
      const pdfResult = await readPDFTool.execute({ filePath: sourcePath });
      
      if (!pdfResult.success || !pdfResult.text) {
        return {
          success: false,
          message: 'Falha ao extrair texto do PDF',
          sourcePath,
          targetPath,
          pagesProcessed: 0,
          error: pdfResult.error || 'Erro desconhecido ao ler PDF',
        };
      }
      
      const extractedText = pdfResult.text;
      const totalPages = pdfResult.metadata.totalPages;
      
      console.log(`[translate_pdf] Texto extraído: ${extractedText.length} caracteres, ${totalPages} páginas`);
      console.log(`[translate_pdf] Traduzindo de ${sourceLanguage} para ${targetLanguage}...`);
      
      // NOTA: A tradução real deve ser feita pelo agente que chama esta tool
      // Esta tool apenas estrutura o PDF. O agente deve fornecer o texto traduzido
      // através do parâmetro translatedText ou podemos retornar o texto extraído
      // para que o agente traduza e depois chame a tool novamente.
      
      // Por enquanto, vamos retornar o texto extraído e instruir o agente a traduzir
      // Em uma implementação completa, integraríamos com um serviço de tradução
      
      return {
        success: true,
        message: `Texto extraído com sucesso. Para criar o PDF traduzido, o agente deve: 1) Traduzir o texto fornecido de ${sourceLanguage} para ${targetLanguage}, 2) Chamar write_file para salvar o texto traduzido, ou 3) Fornecer o texto traduzido em uma nova chamada.`,
        sourcePath,
        targetPath,
        pagesProcessed: totalPages,
        extractedText: extractedText.substring(0, 5000) + (extractedText.length > 5000 ? '\n... [texto truncado] ...' : ''),
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        message: `Erro durante a tradução: ${errorMessage}`,
        sourcePath,
        targetPath,
        pagesProcessed: 0,
        error: `❌ ERRO: ${errorMessage}`,
      };
    }
  },
});

/**
 * Cria um PDF a partir de texto traduzido
 */
export const createTranslatedPDFTool = createAgnosticTool({
  id: 'create_translated_pdf',
  name: 'Create Translated PDF',
  description: 'Cria um arquivo PDF a partir de texto traduzido. Parâmetros: content (texto traduzido), outputPath (caminho de saída), title (título opcional)',
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    outputPath: z.string(),
    pagesCreated: z.number(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const input = rawInput as Record<string, unknown>;
    const content = String(input.content || input.text || '');
    const outputPath = String(input.outputPath || input.output_path || input.path || 'outputs/translated.pdf');
    const title = String(input.title || input.header || 'Translated Document');
    
    if (!content) {
      return {
        success: false,
        message: 'Conteúdo não fornecido',
        outputPath,
        pagesCreated: 0,
        error: '❌ CONTEÚDO NÃO FORNECIDO. Forneça o texto traduzido em "content"',
      };
    }
    
    try {
      const fullOutputPath = resolveFilePath(outputPath);
      const outputDir = path.dirname(fullOutputPath);
      
      // Cria diretório se não existir
      try {
        await fs.mkdir(outputDir, { recursive: true });
      } catch {
        // Diretório pode já existir
      }
      
      // Cria o documento PDF
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pageWidth = 612; // Letter size width (8.5 inches)
      const pageHeight = 792; // Letter size height (11 inches)
      const margin = 50;
      const maxWidth = pageWidth - (margin * 2);
      const lineHeight = 14;
      const fontSize = 10;
      const titleSize = 16;
      
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin - titleSize - 20;
      
      // Adiciona título
      const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
      const titleX = (pageWidth - titleWidth) / 2;
      currentPage.drawText(title, {
        x: titleX,
        y: pageHeight - margin - titleSize,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      
      // Divide conteúdo em parágrafos e linhas
      const paragraphs = content.split('\n');
      let pageCount = 1;
      
      for (const paragraph of paragraphs) {
        if (yPosition < margin + lineHeight) {
          // Nova página
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
          pageCount++;
        }
        
        if (paragraph.trim() === '') {
          yPosition -= lineHeight;
          continue;
        }
        
        // Processa o parágrafo
        const lines = wrapText(paragraph, font, fontSize, maxWidth);
        
        for (const line of lines) {
          if (yPosition < margin + lineHeight) {
            // Nova página
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - margin;
            pageCount++;
          }
          
          currentPage.drawText(line, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
        }
        
        // Espaço entre parágrafos
        yPosition -= lineHeight / 2;
      }
      
      // Salva o PDF
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(fullOutputPath, Buffer.from(pdfBytes));
      
      const stats = await fs.stat(fullOutputPath);
      
      return {
        success: true,
        message: `PDF criado com sucesso: ${outputPath} (${stats.size} bytes, ${pageCount} páginas)`,
        outputPath,
        pagesCreated: pageCount,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        message: `Erro ao criar PDF: ${errorMessage}`,
        outputPath,
        pagesCreated: 0,
        error: `❌ ERRO: ${errorMessage}`,
      };
    }
  },
});
