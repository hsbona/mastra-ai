#!/usr/bin/env tsx
/**
 * Script de ingestão de documentos para RAG - Versão 2
 * 
 * Melhorias:
 * - Ordem específica de documentos
 * - Batches de 10 chunks
 * - Processamento documento por documento (ler → embedar → salvar → mover)
 * - Saída em tempo real
 * - Sem timeout (executar como serviço)
 * 
 * Uso: pnpm tsx scripts/ingest-rag-documents-v2.ts
 */

import { readdirSync, statSync, renameSync, existsSync, readFileSync } from 'fs';
import { join, basename, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================

config({ path: join(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definido no .env');
}

process.env.EMBEDDING_PROVIDER = 'openrouter';

// ============================================
// CONFIGURAÇÃO
// ============================================

const DOCS_DIR = join(__dirname, '../../docs/rag');
const PROCESSED_DIR = join(DOCS_DIR, 'processados');
const INDEX_NAME = 'legislacao';

// Ordem específica dos documentos
const DOCUMENT_ORDER = [
  'Lei_8112_1ed.pdf',
  'Lei_licitacoes_contratos_administrativos_2ed.pdf',
  'CF88_Livro_EC91_2016.pdf',
];

// Tamanho do batch de chunks (reduzido para 10)
const CHUNK_BATCH_SIZE = 10;
const EMBEDDING_BATCH_SIZE = 10;

// ============================================
// TIPOS
// ============================================

type EmbeddingProviderType = {
  generateEmbeddings: (texts: string[]) => Promise<number[][]>;
};

type ChunkInfo = {
  content: string;
  metadata?: Record<string, any>;
};

type ChunkMetadata = {
  text: string;
  source: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  totalChunks: number;
};

type IngestResult = {
  fileName: string;
  filePath: string;
  success: boolean;
  chunksIndexed?: number;
  documentId?: string;
  error?: string;
  durationMs: number;
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`[${timestamp()}] ${icons[level]} ${message}`);
}

function logProgress(current: number, total: number, prefix: string = ''): void {
  const percentage = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
  process.stdout.write(`\r${prefix}[${bar}] ${percentage}% (${current}/${total})`);
}

function extractTitle(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateDocumentId(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '');
  return `${base}_${Date.now()}`;
}

// ============================================
// FUNÇÕES DE BANCO DE DADOS
// ============================================

async function clearExistingData(): Promise<void> {
  log('Limpando dados existentes do índice...', 'info');
  try {
    const { pgVector } = await import('../src/mastra/rag');
    // Deletar todos os documentos do índice
    await pgVector.deleteIndex(INDEX_NAME);
    log('Índice anterior removido', 'success');
    
    // Recriar índice
    const { ensureIndex } = await import('../src/mastra/rag');
    await ensureIndex(INDEX_NAME);
    log('Novo índice criado', 'success');
  } catch (error) {
    log(`Aviso ao limpar dados: ${error}`, 'warn');
  }
}

// ============================================
// PROCESSAMENTO DE DOCUMENTO
// ============================================

async function processDocumentInBatches(
  filePath: string,
  indexName: string,
  provider: EmbeddingProviderType
): Promise<{ chunksIndexed: number; documentId: string; title: string }> {
  const fileName = basename(filePath);
  const stats = statSync(filePath);
  
  console.log('\n' + '='.repeat(70));
  log(`PROCESSANDO: ${fileName}`, 'info');
  console.log('='.repeat(70));
  console.log(`   📁 Arquivo: ${filePath}`);
  console.log(`   📊 Tamanho: ${formatBytes(stats.size)}`);
  console.log('');
  
  // 1. Ler PDF
  log('📖 Etapa 1/4: Lendo arquivo PDF...', 'info');
  const { processDocument } = await import('../src/mastra/rag');
  const document = await processDocument(filePath);
  log(`PDF lido: ${formatBytes(document.text.length)} de texto`, 'success');
  console.log('');
  
  // 2. Criar chunks
  log('✂️ Etapa 2/4: Criando chunks...', 'info');
  const { chunkDocument } = await import('../src/mastra/rag');
  const chunks = await chunkDocument(document.text, filePath);
  log(`${chunks.length} chunks criados`, 'success');
  console.log('');
  
  // 3. Preparar metadados
  const title = extractTitle(fileName);
  const documentId = generateDocumentId(fileName);
  
  log(`📋 Documento: "${title}"`, 'info');
  log(`🆔 ID: ${documentId}`, 'info');
  console.log('');
  
  // 4. Gerar embeddings em batches de 10
  log(`🧠 Etapa 3/4: Gerando embeddings (batches de ${EMBEDDING_BATCH_SIZE})...`, 'info');
  const embeddings: number[][] = [];
  const totalChunks = chunks.length;
  
  for (let i = 0; i < totalChunks; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalChunks / EMBEDDING_BATCH_SIZE);
    
    logProgress(i + batch.length, totalChunks, `   Batch ${batchNum}/${totalBatches}: `);
    
    try {
      const batchEmbeddings = await provider.generateEmbeddings(batch.map(c => c.content));
      embeddings.push(...batchEmbeddings);
    } catch (error) {
      console.log('');
      log(`Erro no batch ${batchNum}: ${error}`, 'error');
      throw error;
    }
  }
  
  console.log('');
  log(`${embeddings.length} embeddings gerados`, 'success');
  console.log('');
  
  // 5. Salvar no PostgreSQL em batches de 10
  log(`💾 Etapa 4/4: Salvando no PostgreSQL (batches de ${CHUNK_BATCH_SIZE})...`, 'info');
  const { pgVector } = await import('../src/mastra/rag');
  const totalSaveBatches = Math.ceil(chunks.length / CHUNK_BATCH_SIZE);
  
  for (let batchIdx = 0; batchIdx < totalSaveBatches; batchIdx++) {
    const start = batchIdx * CHUNK_BATCH_SIZE;
    const end = Math.min(start + CHUNK_BATCH_SIZE, chunks.length);
    const batchChunks = chunks.slice(start, end);
    const batchEmbeddings = embeddings.slice(start, end);
    
    const batchIds = batchChunks.map((_, idx) => `${documentId}_${start + idx}`);
    const batchMetadata: ChunkMetadata[] = batchChunks.map((chunk, idx) => ({
      text: chunk.content,
      source: filePath,
      documentId,
      title,
      chunkIndex: start + idx,
      totalChunks: chunks.length,
    }));
    
    logProgress(batchIdx + 1, totalSaveBatches, `   Salvando batch ${batchIdx + 1}/${totalSaveBatches}: `);
    
    await pgVector.upsert({
      indexName,
      vectors: batchEmbeddings,
      metadata: batchMetadata,
      ids: batchIds,
    });
  }
  
  console.log('');
  log(`${chunks.length} chunks persistidos no índice "${indexName}"`, 'success');
  
  return { chunksIndexed: chunks.length, documentId, title };
}

function moveToProcessed(filePath: string): string {
  const fileName = basename(filePath);
  const destPath = join(PROCESSED_DIR, fileName);
  
  // Se arquivo já existe em processados, adicionar timestamp
  if (existsSync(destPath)) {
    const timestamp = Date.now();
    const newName = `${fileName.replace('.pdf', '')}_${timestamp}.pdf`;
    const newDestPath = join(PROCESSED_DIR, newName);
    renameSync(filePath, newDestPath);
    return newDestPath;
  }
  
  renameSync(filePath, destPath);
  return destPath;
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function ingestDocuments(): Promise<void> {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  console.log('📚 INGESTÃO DE DOCUMENTOS RAG - SERVIÇO');
  console.log('='.repeat(70));
  console.log('   Modo: Documento por documento (ler → embedar → salvar → mover)');
  console.log('   Batch size: 10 chunks');
  console.log('   Ordem: Especificada pelo usuário');
  console.log('='.repeat(70));
  
  // Verificar provider
  log('Verificando provider de embeddings...', 'info');
  const { getEmbeddingProvider } = await import('../src/mastra/rag');
  const provider = getEmbeddingProvider();
  
  try {
    const testEmbedding = await provider.generateEmbeddings(['test']);
    if (testEmbedding.length === 1 && testEmbedding[0].length === 1536) {
      log('Provider OpenRouter (OpenAI text-embedding-3-small) está saudável', 'success');
    }
  } catch (error) {
    log(`Provider não está saudável: ${error}`, 'error');
    process.exit(1);
  }
  
  // Limpar dados existentes
  await clearExistingData();
  console.log('');
  
  // Verificar documentos
  const availableDocs = readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.pdf'))
    .filter(f => !f.startsWith('.'));
  
  console.log('📂 Documentos disponíveis:');
  availableDocs.forEach(doc => {
    const stats = statSync(join(DOCS_DIR, doc));
    console.log(`   • ${doc} (${formatBytes(stats.size)})`);
  });
  console.log('');
  
  // Filtrar apenas documentos na ordem especificada
  const documentsToProcess = DOCUMENT_ORDER.filter(doc => availableDocs.includes(doc));
  const skippedDocs = DOCUMENT_ORDER.filter(doc => !availableDocs.includes(doc));
  
  if (skippedDocs.length > 0) {
    log(`Documentos não encontrados (pulando): ${skippedDocs.join(', ')}`, 'warn');
  }
  
  if (documentsToProcess.length === 0) {
    log('Nenhum documento para processar.', 'warn');
    return;
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log(`🚀 INICIANDO PROCESSAMENTO (${documentsToProcess.length} documentos)`);
  console.log('='.repeat(70));
  
  const results: IngestResult[] = [];
  
  // Processar cada documento na ordem especificada
  for (let i = 0; i < documentsToProcess.length; i++) {
    const docName = documentsToProcess[i];
    const filePath = join(DOCS_DIR, docName);
    const docStartTime = Date.now();
    
    console.log('\n');
    console.log('#'.repeat(70));
    console.log(`# DOCUMENTO ${i + 1} de ${documentsToProcess.length}: ${docName}`);
    console.log('#'.repeat(70));
    
    try {
      // Processar documento completo
      const result = await processDocumentInBatches(filePath, INDEX_NAME, provider);
      const durationMs = Date.now() - docStartTime;
      
      results.push({
        fileName: docName,
        filePath,
        success: true,
        chunksIndexed: result.chunksIndexed,
        documentId: result.documentId,
        durationMs,
      });
      
      // Mover para processados
      console.log('');
      log('📁 Movendo arquivo para pasta de processados...', 'info');
      const destPath = moveToProcessed(filePath);
      log(`Arquivo movido para: ${basename(destPath)}`, 'success');
      
      // Estatísticas do documento
      console.log('');
      console.log('─'.repeat(70));
      console.log(`✅ DOCUMENTO "${docName}" CONCLUÍDO`);
      console.log(`   • Chunks indexados: ${result.chunksIndexed}`);
      console.log(`   • Document ID: ${result.documentId}`);
      console.log(`   • Tempo: ${formatDuration(durationMs)}`);
      console.log(`   • Taxa: ${(durationMs / result.chunksIndexed).toFixed(0)}ms/chunk`);
      console.log('─'.repeat(70));
      
    } catch (error) {
      const durationMs = Date.now() - docStartTime;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      results.push({
        fileName: docName,
        filePath,
        success: false,
        error: errorMsg,
        durationMs,
      });
      
      console.log('');
      console.log('─'.repeat(70));
      log(`ERRO no documento "${docName}": ${errorMsg}`, 'error');
      console.log('─'.repeat(70));
    }
    
    // Pausa entre documentos
    if (i < documentsToProcess.length - 1) {
      console.log('');
      log('⏳ Pausa de 3s antes do próximo documento...', 'info');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Relatório Final
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunksIndexed || 0), 0);
  
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(70));
  console.log('');
  console.log(`✅ SUCESSO: ${successful.length}/${results.length} documento(s)`);
  console.log(`❌ FALHAS: ${failed.length}/${results.length} documento(s)`);
  console.log(`📦 TOTAL DE CHUNKS: ${totalChunks}`);
  console.log('');
  
  if (successful.length > 0) {
    console.log('DETALHES DOS DOCUMENTOS PROCESSADOS:');
    console.log('');
    successful.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.fileName}`);
      console.log(`     Chunks: ${r.chunksIndexed} | Tempo: ${formatDuration(r.durationMs)} | Taxa: ${(r.durationMs / (r.chunksIndexed || 1)).toFixed(0)}ms/chunk`);
    });
  }
  
  if (failed.length > 0) {
    console.log('');
    console.log('⚠️ DOCUMENTOS COM ERRO:');
    failed.forEach(f => {
      console.log(`   • ${f.fileName}: ${f.error}`);
    });
  }
  
  console.log('');
  console.log(`⏱️ TEMPO TOTAL: ${formatDuration(totalDuration)}`);
  console.log('='.repeat(70));
  
  // Exit code
  process.exit(failed.length > 0 ? 1 : 0);
}

// ============================================
// EXECUÇÃO
// ============================================

// Verificar pasta de processados
if (!existsSync(PROCESSED_DIR)) {
  console.error(`❌ Pasta de destino não existe: ${PROCESSED_DIR}`);
  process.exit(1);
}

// Executar
ingestDocuments().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
