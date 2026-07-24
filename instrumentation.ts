export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { runDailyAnalysis } = await import('./lib/analysis/engine');

    console.log('[Instrumentation] Initializing Daily Performance Analysis Cron...');

    // Runs every day at 12:01 AM
    // Schedule: Minute Hour DayMonth Month DayWeek
    cron.schedule('1 0 * * *', async () => {
      try {
        console.log('[Cron] Triggering daily performance analysis...');
        // Analyze yesterday's data
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await runDailyAnalysis(yesterday);
      } catch (error) {
        console.error('[Cron] Failed to run daily analysis:', error);
      }
    });

    console.log('[Instrumentation] Cron job scheduled successfully (Runs daily at 12:01 AM)');
  }
}
