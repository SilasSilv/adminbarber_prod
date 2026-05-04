console.log('[WORKER] 🚀 Iniciando processo de lembretes...');
iniciarScheduler();
process.on('SIGINT', () => {
  console.log('[WORKER] Encerrando processo...');
  process.exit(0);
});