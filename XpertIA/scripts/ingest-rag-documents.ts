#!/usr/bin/env tsx
/**
 * Script de ingestão de documentos para RAG
 * 
 * Uso: pnpm tsx scripts/ingest-rag-documents.ts
 * 
 * Este script:
 * 1. Lista documentos em docs/rag/
 * 2. Processa e indexa cada documento no PgVector (esquema xpertia_rag)
 * 3. Move documentos processados com sucesso para docs/rag/processados/
 */

// ============================================
// IMPORTS BÁSICOS (módulos que não dependem de env)
// ============================================

import { readdirSync, statSync, renameSync, existsSync, readFileSync } from 'fs';
import { join, basename, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================

// Carregar variáveis de ambiente do .env
config({ path: join(__dirname, '../.env') });

// Configurar DATABASE_URL diretamente para o esquema RAG correto
process.env.DATABASE_URL = 'postgresql://xpertia:xpertia_dev@127.0.0.1:5432/xpertia';

// Usar provider OpenRouter com OpenAI embeddings
process.env.EMBEDDING_PROVIDER = 'openrouter';

// Módulos do Mastra serão importados dinamicamente após configurar env

// ============================================
// CONFIGURAÇÃO
// ============================================

// Caminho dos documentos (fora do workspace, na pasta docs/rag)
const DOCS_DIR = join(__dirname, '../../docs/rag');
const PROCESSED_DIR = join(DOCS_DIR, 'processados');
const INDEX_NAME = 'legislacao';

// Processar todos os arquivos PDF restantes

// Extensões suportadas
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];

// ============================================
// TIPOS
// ============================================

interface IngestResult {
  fileName: string;
  filePath: string;
  success: boolean;
  chunksIndexed?: number;
  documentId?: string;
  error?: string;
  durationMs: number;
}

interface ChunkMetadata {
  text: string;
  source: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  totalChunks: number;
}

// Tipo do provider (será carregado dinamicamente)
type EmbeddingProviderType = {
  config: { model: string; dimensions: number };
  healthCheck(): Promise<boolean>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Exibe barra de progresso
 */
function showProgress(current: number, total: number, prefix: string = 'Progresso'): void {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const empty = 30 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  process.stdout.write(`\r   ${prefix}: [${bar}] ${percent}% (${current}/${total})`);
}

/**
 * Lista documentos elegíveis para ingestão
 */
function listDocuments(): string[] {
  const files = readdirSync(DOCS_DIR);
  
  return files.filter(file => {
    const ext = extname(file).toLowerCase();
    const filePath = join(DOCS_DIR, file);
    
    // Ignorar diretórios (como 'processados')
    if (!existsSync(filePath)) return false;
    
    const stats = statSync(filePath);
    
    // Apenas arquivos (não diretórios) com extensão suportada
    return stats.isFile() && SUPPORTED_EXTENSIONS.includes(ext);
  });
}

/**
 * Formata bytes para tamanho legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formata tempo em ms para string legível
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins}m ${secs}s`;
}

/**
 * Move arquivo para pasta de processados
 */
function moveToProcessed(filePath: string): string {
  const fileName = basename(filePath);
  const destPath = join(PROCESSED_DIR, fileName);
  
  // Se já existe, adiciona timestamp
  const finalDest = existsSync(destPath) 
    ? join(PROCESSED_DIR, `${Date.now()}_${fileName}`)
    : destPath;
  
  renameSync(filePath, finalDest);
  return finalDest;
}

/**
 * Extrai título do documento a partir do nome do arquivo
 */
function extractTitle(fileName: string): string {
  // Remove extensão e converte underscores/tracos para espaços
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gera ID único do documento
 */
function generateDocumentId(fileName: string): string {
  const timestamp = Date.now();
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
  return `${baseName}_${timestamp}`;
}

/**
 * Health check do provider de embeddings
 */
async function checkProvider(): Promise<{ provider: EmbeddingProviderType; healthy: boolean }> {
  const { getEmbeddingProvider } = await import('../src/mastra/rag');
  const provider = getEmbeddingProvider();
  
  console.log(`\n🔌 Provider Configurado:`);
  console.log(`   Modelo: ${provider.config.model}`);
  console.log(`   Dimensões: ${provider.config.dimensions}`);
  console.log(`   Tipo: OpenRouter (OpenAI text-embedding-3-small)`);
  
  const healthy = await provider.healthCheck();
  return { provider, healthy };
}

/**
 * Processa documento com feedback detalhado
 */
async function processDocumentWithFeedback(
  filePath: string, 
  indexName: string,
  provider: EmbeddingProviderType
): Promise<{ chunksIndexed: number; documentId: string; title: string }> {
  const fileName = basename(filePath);
  const stats = statSync(filePath);
  
  console.log(`\n📄 ARQUIVO: ${fileName}`);
  console.log(`   Tamanho: ${formatBytes(stats.size)}`);
  console.log(`   Caminho: ${filePath}`);
  
  // 1. Ler PDF
  console.log(`\n   📖 Lendo arquivo PDF...`);
  const { processDocument } = await import('../src/mastra/rag');
  const document = await processDocument(filePath);
  console.log(`   ✅ PDF lido: ${formatBytes(document.text.length)} de texto extraído`);
  
  // 2. Criar chunks
  console.log(`\n   ✂️  Criando chunks...`);
  const { chunkDocument } = await import('../src/mastra/rag');
  const chunks = await chunkDocument(document.text, filePath);
  console.log(`   ✅ ${chunks.length} chunks criados`);
  
  // 3. Preparar metadados
  const title = extractTitle(fileName);
  const documentId = generateDocumentId(fileName);
  
  console.log(`\n   📋 Metadados:`);
  console.log(`      Título: ${title}`);
  console.log(`      Document ID: ${documentId}`);
  
  // 4. Gerar embeddings com progresso
  console.log(`\n   🧠 Gerando embeddings (OpenRouter → OpenAI text-embedding-3-small)...`);
  console.log(`      Processando ${chunks.length} chunks:\n`);
  
  const batchSize = 100; // OpenRouter suporta batches grandes
  const embeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    
    showProgress(i + batch.length, chunks.length, `      Chunk ${i + 1}-${Math.min(i + batch.length, chunks.length)} de ${chunks.length}`);
    
    try {
      const batchEmbeddings = await provider.generateEmbeddings(batch.map(c => c.content));
      embeddings.push(...batchEmbeddings);
    } catch (error) {
      console.error(`\n   ❌ Erro no batch ${batchNum}:`, error);
      throw error;
    }
  }
  
  process.stdout.write('\n'); // Nova linha após progresso
  console.log(`   ✅ ${embeddings.length} embeddings gerados`);
  
  // 5. Criar índice se não existir
  console.log(`\n   💾 Indexando no PostgreSQL (esquema: xpertia_rag)...`);
  const { pgVector, ensureIndex } = await import('../src/mastra/rag');
  
  // Criar índice se não existir
  console.log(`   📝 Verificando índice "${indexName}"...`);
  await ensureIndex(indexName);
  console.log(`   ✅ Índice pronto`);
  
  // 6. Batch insert em lotes menores para evitar timeout
  const BATCH_UPSERT_SIZE = 100; // Lotes de 100 chunks
  const totalBatches = Math.ceil(chunks.length / BATCH_UPSERT_SIZE);
  
  console.log(`   💾 Inserindo em lotes de ${BATCH_UPSERT_SIZE} chunks (${totalBatches} lotes)...`);
  
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_UPSERT_SIZE;
    const end = Math.min(start + BATCH_UPSERT_SIZE, chunks.length);
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
    
    process.stdout.write(`\r      Lote ${batchIdx + 1}/${totalBatches} (chunks ${start + 1}-${end})...`);
    
    await pgVector.upsert({
      indexName,
      vectors: batchEmbeddings,
      metadata: batchMetadata,
      ids: batchIds,
    });
  }
  
  process.stdout.write('\n');
  console.log(`   ✅ ${chunks.length} chunks persistidos no índice "${indexName}"`)
  
  return { chunksIndexed: chunks.length, documentId, title };
}

// ============================================
// INGESTÃO PRINCIPAL
// ============================================

async function ingestDocuments(): Promise<void> {
  const startTime = Date.now();
  
  console.log('='.repeat(70));
  console.log('📚 INGESTÃO DE DOCUMENTOS RAG - OPENROUTER + OPENAI EMBEDDINGS');
  console.log('='.repeat(70));
  
  console.log('\n🔧 Configuração:');
  console.log('   DATABASE_URL: postgresql://xpertia:***@127.0.0.1:5432/xpertia');
  console.log('   Esquema RAG: xpertia_rag');
  console.log('   Índice:', INDEX_NAME);
  console.log('   Provider: OpenRouter (OpenAI text-embedding-3-small)');
  
  // 1. Verificar provider
  const { provider, healthy } = await checkProvider();
  if (!healthy) {
    console.error('\n❌ Provider de embeddings não está saudável.');
    console.error('   Verifique a OPENROUTER_API_KEY no .env');
    process.exit(1);
  }
  console.log('   ✅ Provider saudável');
  
  // 2. Listar documentos
  const documents = listDocuments();
  console.log(`\n📂 Documentos encontrados: ${documents.length}`);
  documents.forEach(doc => {
    const stats = statSync(join(DOCS_DIR, doc));
    console.log(`   • ${doc} (${formatBytes(stats.size)})`);
  });
  
  if (documents.length === 0) {
    console.log('\n✅ Nenhum documento pendente para processar.');
    return;
  }
  
  // 3. Processar documentos um por vez
  console.log(`\n${'='.repeat(70)}`);
  console.log('🚀 INICIANDO PROCESSAMENTO (um documento por vez)');
  console.log('='.repeat(70));
  
  const results: IngestResult[] = [];
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const filePath = join(DOCS_DIR, doc);
    
    console.log(`\n📄 DOCUMENTO ${i + 1} de ${documents.length}: ${doc}`);
    console.log('   (Processando separadamente para evitar timeout...)');
    
    const docStartTime = Date.now();
    
    try {
      const result = await processDocumentWithFeedback(filePath, INDEX_NAME, provider);
      const durationMs = Date.now() - docStartTime;
      
      results.push({
        fileName: doc,
        filePath,
        success: true,
        chunksIndexed: result.chunksIndexed,
        documentId: result.documentId,
        durationMs,
      });
      
      // Mover para processados
      console.log(`\n   📁 Movendo arquivo para pasta de processados...`);
      const destPath = moveToProcessed(filePath);
      console.log(`   ✅ Arquivo movido para: ${basename(destPath)}`);
      
      // Pausa entre documentos para liberar recursos
      if (i < documents.length - 1) {
        console.log('   ⏳ Pausa de 2s antes do próximo documento...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      const durationMs = Date.now() - docStartTime;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      results.push({
        fileName: doc,
        filePath,
        success: false,
        error: errorMsg,
        durationMs,
      });
      
      console.error(`\n   ❌ ERRO no documento ${doc}: ${errorMsg}`);
    }
    
    console.log(''); // Linha em branco entre documentos
  }
  
  // 4. Relatório Final
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunksIndexed || 0), 0);
  
  console.log(`\n✅ SUCESSO: ${successful.length}/${results.length} documento(s)`);
  console.log(`❌ FALHAS: ${failed.length}/${results.length} documento(s)`);
  
  if (successful.length > 0) {
    console.log(`\n📦 DETALHES DO DOCUMENTO PROCESSADO:`);
    successful.forEach(r => {
      console.log(`   Arquivo: ${r.fileName}`);
      console.log(`   Chunks indexados: ${r.chunksIndexed}`);
      console.log(`   Document ID: ${r.documentId}`);
      console.log(`   Tempo de processamento: ${formatDuration(r.durationMs)}`);
      console.log(`   Taxa: ${r.chunksIndexed ? (r.durationMs / r.chunksIndexed).toFixed(0) : 0}ms/chunk`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n⚠️  DOCUMENTOS COM ERRO:`);
    failed.forEach(f => {
      console.log(`   • ${f.fileName}`);
      console.log(`     Erro: ${f.error}`);
    });
  }
  
  console.log(`\n⏱️  TEMPO TOTAL: ${formatDuration(totalDuration)}`);
  
  // 5. Verificação no banco
  console.log(`\n${'='.repeat(70)}`);
  console.log('🔍 VERIFICAÇÃO NO BANCO DE DADOS');
  console.log('='.repeat(70));
  
  try {
    const { listIndexes } = await import('../src/mastra/rag');
    const indexes = await listIndexes();
    
    console.log(`\n   Índices existentes:`);
    indexes.forEach(idx => console.log(`   • ${idx}`));
    
    if (successful.length > 0 && successful[0].documentId) {
      console.log(`\n   ✅ Documento "${successful[0].documentId}"`);
      console.log(`      ${successful[0].chunksIndexed} chunks persistidos com sucesso!`);
    }
    
  } catch (error) {
    console.log(`   ⚠️  Não foi possível verificar estatísticas do índice`);
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Exit code baseado no resultado
  process.exit(failed.length > 0 ? 1 : 0);
}

// ============================================
// EXECUÇÃO
// ============================================

// Garantir que pasta processados existe
if (!existsSync(PROCESSED_DIR)) {
  console.error(`❌ Pasta de destino não existe: ${PROCESSED_DIR}`);
  process.exit(1);
}

ingestDocuments().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
