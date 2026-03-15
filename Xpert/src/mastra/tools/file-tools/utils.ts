/**
 * File Tools Utilities
 * 
 * Funções utilitárias compartilhadas entre as ferramentas de arquivo.
 */

import * as path from 'path';
import { workspace } from '../../workspace-config';

/**
 * Resolve o caminho do arquivo relativo ao workspace.
 * Usa o basePath configurado no workspace do Mastra.
 */
export function resolveFilePath(filePath: string): string {
  const basePath = workspace.filesystem.basePath;
  
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  return path.join(basePath, filePath);
}
