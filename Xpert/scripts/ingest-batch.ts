#!/usr/bin/env tsx
/**
 * Script de ingestão em batch de documentos RAG
 * 
 * Características:
 * - Processa múltiplos documentos em sequência
 * - Batches de 5 chunks para embeddings
 * - Move documentos processados para subpasta 'processados'
 * 
 * Uso:
 *   pnpm tsx scripts/ingest-batch.ts
 */

import { readdirSync, renameSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

import { RAG_SCHEMA } from '../src/mastra/config/database';

// ============================================
// CONFIGURAÇÃO
// ============================================
const DOCS_DIR = join(__dirname, '../../docs/rag');
const PROCESSED_DIR = join(DOCS_DIR, 'processados');
const INDEX_NAME = 'legislacao';
const SCHEMA = RAG_SCHEMA;
const BATCH_SIZE = 5; // Apenas 5 chunks por vez

// Ordem dos documentos
const DOCUMENT_ORDER = [
  'Lei_8112_1ed.pdf',
  'Lei_licitacoes_contratos_administrativos_2ed.pdf',
  'CF88_Livro_EC91_2016.pdf',
];

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(msg: string): void {
  console.log(`[${timestamp()}] ${msg}`);
}

// ============================================
// FUNÇÕES DO BANCO
// ============================================
async function limparDados(): Promise<void> {
  log('🗑️ Limpando dados existentes...');
  const { pgVector } = await import('../src/mastra/rag');
  try {
    // Deletar documento por documento (sem transação grande)
    const result = await pgVector.query({
      indexName: INDEX_NAME,
      queryVector: new Array(1536).fill(0),
      topK: 10000,
    });
    
    if (result && Array.isArray(result)) {
      for (const item of result) {
        if (item.id) {
          await pgVector.deleteIndex(INDEX_NAME);
          break; // DeleteIndex remove tudo do índice
        }
      }
    }
    log('✅ Dados limpos');
  } catch (e) {
    // Se falhar, tentar criar índice novo
    log('⚠️ Limpando via recreate...');
  }
}

// ============================================
// PROCESSAMENTO DE DOCUMENTO
// ============================================
async function processarDocumento(filePath: string): Promise<number> {
  const fileName = basename(filePath);
  log(`\n📄 ${fileName}`);
  
  // 1. Ler PDF
  log('  📖 Lendo PDF...');
  const { processDocument } = await import('../src/mastra/rag');
  const document = await processDocument(filePath);
  log(`  ✅ ${formatBytes(document.text.length)} de texto`);
  
  // 2. Criar chunks
  log('  ✂️ Criando chunks...');
  const { chunkDocument } = await import('../src/mastra/rag');
  const chunks = await chunkDocument(document.text, filePath);
  log(`  ✅ ${chunks.length} chunks`);
  
  // 3. Gerar embeddings em batches de 5
  log('  🧠 Gerando embeddings (batches de 5)...');
  const { getEmbeddingProvider } = await import('../src/mastra/rag');
  const provider = getEmbeddingProvider();
  
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    process.stdout.write(`\r    Progresso: ${Math.min(i + 5, chunks.length)}/${chunks.length}`);
    const batchEmbeddings = await provider.generateEmbeddings(batch.map(c => c.content));
    embeddings.push(...batchEmbeddings);
    // Pequena pausa entre batches para não sobrecarregar
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('');
  log(`  ✅ ${embeddings.length} embeddings gerados`);
  
  // 4. Salvar no banco - BATCHES DE 5 (sem transação longa)
  log('  💾 Salvando no banco (batches de 5, commit imediato)...');
  const { pgVector } = await import('../src/mastra/rag');
  const documentId = `${fileName.replace('.pdf', '')}_${Date.now()}`;
  const title = fileName.replace('.pdf', '').replace(/[_-]/g, ' ');
  
  let salvos = 0;
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
  
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, chunks.length);
    const batchChunks = chunks.slice(start, end);
    const batchEmbeddings = embeddings.slice(start, end);
    
    const batchIds = batchChunks.map((_, idx) => `${documentId}_${start + idx}`);
    const batchMetadata = batchChunks.map((chunk, idx) => ({
      text: chunk.content,
      source: filePath,
      documentId,
      title,
      chunkIndex: start + idx,
      totalChunks: chunks.length,
    }));
    
    process.stdout.write(`\r    Batch ${batchIdx + 1}/${totalBatches} (chunks ${start + 1}-${end})...`);
    
    try {
      await pgVector.upsert({
        indexName: INDEX_NAME,
        vectors: batchEmbeddings,
        metadata: batchMetadata,
        ids: batchIds,
      });
      salvos += batchChunks.length;
      // Pequena pausa entre commits
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      console.log('');
      log(`  ⚠️ Erro no batch ${batchIdx + 1}: ${err}`);
      // Tentar um por um
      for (let i = 0; i < batchChunks.length; i++) {
        try {
          await pgVector.upsert({
            indexName: INDEX_NAME,
            vectors: [batchEmbeddings[i]],
            metadata: [batchMetadata[i]],
            ids: [batchIds[i]],
          });
          salvos++;
        } catch (e) {
          log(`    ❌ Falha no chunk ${start + i}`);
        }
      }
    }
  }
  
  console.log('');
  log(`  ✅ ${salvos}/${chunks.length} chunks salvos`);
  
  return salvos;
}

function moverParaProcessados(filePath: string): void {
  const fileName = basename(filePath);
  const destPath = join(PROCESSED_DIR, fileName);
  if (existsSync(destPath)) {
    const newName = `${fileName.replace('.pdf', '')}_${Date.now()}.pdf`;
    renameSync(filePath, join(PROCESSED_DIR, newName));
  } else {
    renameSync(filePath, destPath);
  }
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('📚 INGESTÃO SIMPLIFICADA - BATCHES DE 5 CHUNKS');
  console.log(`📁 Schema: ${SCHEMA}`);
  console.log('='.repeat(70));
  
  // Limpar dados
  await limparDados();
  
  // Verificar documentos
  const disponiveis = readdirSync(DOCS_DIR).filter(f => f.endsWith('.pdf'));
  const paraProcessar = DOCUMENT_ORDER.filter(d => disponiveis.includes(d));
  
  log(`\n📂 ${paraProcessar.length} documentos para processar:`);
  paraProcessar.forEach(d => console.log(`   • ${d}`));
  
  // Processar cada um
  const resultados: { doc: string; chunks: number }[] = [];
  
  for (const docName of paraProcessar) {
    const filePath = join(DOCS_DIR, docName);
    try {
      const chunks = await processarDocumento(filePath);
      resultados.push({ doc: docName, chunks });
      moverParaProcessados(filePath);
      log(`  📁 Movido para processados`);
    } catch (err) {
      log(`  ❌ ERRO: ${err}`);
    }
    console.log('');
  }
  
  // Resumo
  console.log('='.repeat(70));
  console.log('📊 RESUMO');
  console.log('='.repeat(70));
  resultados.forEach(r => {
    console.log(`✅ ${r.doc}: ${r.chunks} chunks`);
  });
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
