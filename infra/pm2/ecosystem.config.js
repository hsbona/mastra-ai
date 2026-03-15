// ============================================================
// ⚠️  PRODUÇÃO APENAS - NÃO USE EM DESENVOLVIMENTO
// ============================================================
// Este arquivo é para deploy em produção apenas.
// Em desenvolvimento, use: ./scripts/mastra-studio.sh
//
// Por que não usar em dev?
// - autorestart: true reinicia o processo automaticamente
// - Interfere no fluxo de desenvolvimento (start/stop manual)
// - O modo 'pnpm run dev' já tem hot-reload nativo
//
// Uso correto (produção):
//   cd /root/dev/xpertia/mastra-ai/Xpert && pm2 start ../infra/pm2/ecosystem.config.js
//   pm2 save
//   pm2 startup systemd
// ============================================================

module.exports = {
  apps: [
    {
      // Identificação
      name: 'xpertia-mastra',
      
      // Execução
      cwd: '/root/dev/xpertia/mastra-ai/Xpert',
      script: 'pnpm',
      args: 'mastra dev',
      interpreter: 'none',
      
      // Ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 4111,
        HOST: '127.0.0.1'  // Só acessível via localhost/SSH tunnel
      },
      
      // Recursos
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '8G',
      
      // Node.js performance
      node_args: [
        '--max-old-space-size=8192',  // 8GB heap para Node.js
        '--optimize-for-size'
      ],
      
      // Logs
      log_file: '/var/log/xpertia/mastra-combined.log',
      out_file: '/var/log/xpertia/mastra-out.log',
      error_file: '/var/log/xpertia/mastra-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_rotate_interval: '1d',
      log_rotate_keep: 30,
      
      // Política de restart
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      
      // Monitoramento
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist', '.tmp'],
      
      // Health check
      health_check_grace_period: 30000,
      kill_timeout: 10000,
      listen_timeout: 30000,
      
      // Métricas (desabilitado)
      pmx: false,
      automation: false,
    }
  ]
};
