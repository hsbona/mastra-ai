#!/usr/bin/env tsx
/**
 * Script para indexar um único documento na base de conhecimento RAG
 * 
 * Uso:
 *   pnpm tsx scripts/index-document.ts <caminho-do-arquivo> [--index=nome-do-indice]
 * 
 * Exemplos:
 *   pnpm tsx scripts/index-document.ts workspace/uploads/documento.pdf
 *   pnpm tsx scripts/index-document.ts workspace/uploads/documento.pdf --index=meu-indice
 */

import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

import { indexDocument, listIndexes } from '../src/mastra/rag/index.js';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Indexador de Documentos - Xpert-Gov RAG

Uso:
  pnpm tsx scripts/index-document.ts <caminho-do-arquivo> [opções]

Opções:
  --index=<nome>     Nome do índice (padrão: 'default')
  --list             Listar índices existentes
  --help, -h         Mostrar esta ajuda

Exemplos:
  pnpm tsx scripts/index-document.ts knowledge-base/legislacao/Lei_8112_1ed.pdf
  pnpm tsx scripts/index-document.ts knowledge-base/legislacao/CF88.pdf --index=constituicao
    `);
    process.exit(0);
  }

  // Listar índices
  if (args.includes('--list')) {
    try {
      const indexes = await listIndexes();
      console.log('\n📂 Índices disponíveis:');
      if (indexes.length === 0) {
        console.log('   Nenhum índice encontrado.');
      } else {
        indexes.forEach(idx => console.log(`   • ${idx}`));
      }
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro ao listar índices:', error);
      process.exit(1);
    }
  }

  const filePath = args.find(arg => !arg.startsWith('--'));
  
  if (!filePath) {
    console.error('❌ Erro: Caminho do arquivo não especificado.');
    console.log('Use --help para ver as opções disponíveis.');
    process.exit(1);
  }

  // Parsear opções
  const indexArg = args.find(arg => arg.startsWith('--index='));
  const indexName = indexArg ? indexArg.replace('--index=', '') : 'default';

  console.log(`\n📄 Indexando documento...`);
  console.log(`   Arquivo: ${filePath}`);
  console.log(`   Índice: ${indexName}`);
  console.log('');

  try {
    const result = await indexDocument(filePath, indexName);
    
    console.log('✅ Documento indexado com sucesso!');
    console.log(`   ID: ${result.documentId}`);
    console.log(`   Chunks indexados: ${result.chunksIndexed}`);
    console.log(`   Índice: ${result.indexName}`);
    console.log('');
  } catch (error) {
    console.error('❌ Erro ao indexar documento:', error);
    process.exit(1);
  }
}

main();
