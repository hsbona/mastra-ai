/**
 * Write DOCX Tool - Versão Agnóstica
 * 
 * Cria documentos Word (.docx) com formatação básica.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workspace } from '../../workspace-config';
import { createAgnosticTool } from '../agnostic';

interface ContentItem {
  type: 'heading' | 'paragraph' | 'text';
  text: string;
  level?: number;
  bold?: boolean;
  italic?: boolean;
}

function normalizeInput(input: unknown): { fileName: string; outputPath: string; content: ContentItem[] } {
  if (typeof input !== 'object' || input === null) {
    return { fileName: '', outputPath: '', content: [] };
  }
  const obj = input as Record<string, unknown>;
  
  // Extrai fileName
  let fileName = '';
  if (typeof obj.fileName === 'string') {
    fileName = obj.fileName;
  } else if (typeof obj.filename === 'string') {
    fileName = obj.filename;
  } else if (typeof obj.name === 'string') {
    fileName = obj.name;
  }
  
  // Extrai outputPath
  let outputPath = '';
  if (typeof obj.outputPath === 'string') {
    outputPath = obj.outputPath;
  } else if (typeof obj.path === 'string') {
    outputPath = obj.path;
  } else if (typeof obj.output === 'string') {
    outputPath = obj.output;
  }
  
  // Extrai content
  let content: ContentItem[] = [];
  if (Array.isArray(obj.content)) {
    content = obj.content.map((item: any) => ({
      type: item.type || 'paragraph',
      text: String(item.text || ''),
      level: typeof item.level === 'number' ? item.level : undefined,
      bold: item.bold === true,
      italic: item.italic === true || item.italics === true,
    }));
  }
  
  return { fileName, outputPath, content };
}

export const writeDOCXTool = createAgnosticTool({
  id: 'write-docx',
  name: 'Write DOCX',
  description: 'Cria documentos Word (.docx) com formatação básica. Salva em workspace/outputs/',
  inputSchema: z.record(z.any()),
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
  execute: async (rawInput) => {
    const input = normalizeInput(rawInput);
    const fileName = input.fileName;
    const outputPath = input.outputPath;
    const content = input.content;
    
    if (!fileName) {
      return {
        success: false,
        filePath: '',
        metadata: { fileName: '', fullPath: '', paragraphCount: 0 },
        error: '❌ NOME DO ARQUIVO NÃO FORNECIDO. Use fileName: "documento"',
      };
    }
    
    try {
      const outputDir = path.join(workspace.filesystem.basePath, 'outputs', outputPath);
      
      await fs.mkdir(outputDir, { recursive: true });
      
      const finalFileName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
      const fullPath = path.join(outputDir, finalFileName);
      
      const children: Paragraph[] = [];
      
      for (const item of content) {
        if (item.type === 'heading') {
          children.push(
            new Paragraph({
              text: item.text,
              heading: item.level === 1 ? HeadingLevel.HEADING_1 : 
                       item.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
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
        filePath: path.join(outputPath, finalFileName),
        metadata: {
          fileName: finalFileName,
          fullPath,
          paragraphCount: children.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        filePath: '',
        metadata: { fileName: fileName || '', fullPath: '', paragraphCount: 0 },
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar DOCX',
      };
    }
  },
});
