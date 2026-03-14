import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

/**
 * Agente de conversação simples para testes
 * 
 * Um agente básico sem ferramentas, apenas para verificar
 * a comunicação com a LLM via Mastra Studio.
 */
export const chatAgent = new Agent({
  id: 'chat-agent',
  name: 'Chat Agent',
  description: 'Agente de conversação simples para testes. Responde perguntas gerais e mantém contexto da conversa.',
  
  instructions: `
Você é um assistente de conversação amigável e prestativo.

DIRETRIZES:
- Responda de forma clara, objetiva e cordial
- Mantenha o contexto da conversa
- Se não souber algo, admita honestamente
- Use português do Brasil
- Seja conciso mas completo nas respostas
`,
  
  model: 'groq/meta-llama/llama-4-scout-17b-16e-instruct',
  
  // Sem tools - apenas conversação
  tools: {},
  
  // Memória para manter contexto
  memory: new Memory(),
});
