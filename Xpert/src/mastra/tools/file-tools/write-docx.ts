/**
 * Write DOCX Tool
 * 
 * Cria documentos Word (.docx) com formatação básica.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workspace } from '../../workspace-config';

export const writeDOCXTool = createTool({
  id: 'write-docx',
  description: 'Cria documentos Word (.docx) com formatação básica. Salva em workspace/outputs/',
  inputSchema: z.object({
    fileName: z.string().describe('Nome do arquivo (sem extensão)'),
    outputPath: z.string().describe('Caminho relativo à pasta workspace/outputs/ (ex: summaries/)'),
    content: z.array(z.object({
      type: z.enum(['heading', 'paragraph', 'text']),
      text: z.string(),
      level: z.number().optional(),
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
      const outputDir = path.join(workspace.filesystem.basePath, 'outputs', context.outputPath);
      
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
