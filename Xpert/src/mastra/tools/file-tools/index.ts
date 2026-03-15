/**
 * File Tools
 * 
 * Ferramentas especializadas para manipulação de formatos específicos:
 * PDF, DOCX, XLSX.
 * 
 * NOTA: Operações básicas de filesystem (listar, ler texto, escrever, etc.)
 * são fornecidas automaticamente pelo Workspace do Mastra.
 * 
 * Para usar as ferramentas nativas do workspace em um agente:
 * 1. Adicione `workspace` na configuração do Agent
 * 2. As ferramentas estarão disponíveis automaticamente
 */

export { readPDFTool } from './read-pdf';
export { readDOCXTool } from './read-docx';
export { readExcelTool } from './read-excel';
export { writeDOCXTool } from './write-docx';
export { writeExcelTool } from './write-excel';

// Barrel export para conveniência
import { readPDFTool } from './read-pdf';
import { readDOCXTool } from './read-docx';
import { readExcelTool } from './read-excel';
import { writeDOCXTool } from './write-docx';
import { writeExcelTool } from './write-excel';

export const fileTools = {
  readPDFTool,
  readDOCXTool,
  readExcelTool,
  writeDOCXTool,
  writeExcelTool,
};
