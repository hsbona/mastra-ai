// ============================================================
// PM2 Ecosystem Config - XpertIA Mastra (AMPLIADO)
// ============================================================
// Configuração AMPLIADA para máximo aproveitamento da VPS
// VPS: 24GB RAM | 8 Cores
// Alocação Mastra: 8GB RAM | 3 cores
//
// Uso:
//   cd /opt/xpertia/app && pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup systemd
// ============================================================

module.exports = {
  apps: [
    {
      // Identificação
      name: 'xpertia-mastra',
      
      // Execução
      cwd: '/opt/xpertia/app/XpertIA',
      script: 'node_modules/.bin/mastra',
      args: 'dev',
      interpreter: 'node',
      
      // Ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 4111,
        HOST: '0.0.0.0'
      },
      
      // Recursos AMPLIADOS
      instances: 1,
      exec_mode: 'fork',
      // Limite ampliado: 8GB (reinicia só se estourar)
      max_memory_restart: '8G',
      
      // Logs (mais retenção)
      log_file: '/var/log/xpertia/mastra-combined.log',
      out_file: '/var/log/xpertia/mastra-out.log',
      error_file: '/var/log/xpertia/mastra-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_rotate_interval: '1d',      // Rotacionar logs diariamente
      log_rotate_keep: 30,            // Manter 30 dias de logs
      
      // Política de restart (mais tolerante)
      min_uptime: '10s',
      max_restarts: 10,               // Mais tentativas
      restart_delay: 3000,
      autorestart: true,
      exp_backoff_restart_delay: 100, // Backoff exponencial
      
      // Monitoramento
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist', '.tmp'],
      
      // Performance AMPLIADA
      node_args: [
        '--max-old-space-size=8192',  // 8GB heap para Node.js
        '--optimize-for-size'
      ],
      
      // Health check (via PM2)
      health_check_grace_period: 30000,
      
      // Advanced
      kill_timeout: 10000,            // 10s para graceful shutdown
      listen_timeout: 30000,          // 30s para app iniciar
      
      // Métricas (desabilitado por padrão)
      pmx: false,
      automation: false,
    }
  ]
};
