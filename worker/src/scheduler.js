export function iniciarScheduler() {
  console.log('[SCHEDULER] ⏱️ Scheduler iniciado. Verificando a cada 1 minuto.');
  processarLembretes();
  setInterval(() => {
    processarLembretes();
  }, 60000);
}