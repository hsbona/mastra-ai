import { readPDFTool } from '../src/mastra/tools/file-tools';

async function test() {
  console.log('Testando leitura de PDF...');
  try {
    const result = await readPDFTool.execute(
      { filePath: 'uploads/Lei_8112_1ed.pdf' },
      { toolCallId: 'test', messages: [] }
    );
    console.log('Resultado:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Erro:', error);
  }
}

test();
