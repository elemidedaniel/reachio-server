const cron     = require('node-cron');
const supabase = require('../config/supabase');
const { runBatch } = require('./mailer');

// Store active cron jobs per user
const jobs = {};

/**
 * Start scheduler for a specific user
 */
const startUserScheduler = (userId, sendTime) => {
  // Stop existing job if any
  stopUserScheduler(userId);

  const [hour, minute] = sendTime.split(':');

  const cronExp = `${minute} ${hour} * * *`;

  jobs[userId] = cron.schedule(cronExp, async () => {
    console.log(`Running batch for user ${userId} at ${sendTime}`);
    await runBatch(userId);
  }, {
    timezone: 'UTC',
  });

  console.log(`Scheduler started for user ${userId} at ${sendTime}`);
};

/**
 * Stop scheduler for a specific user
 */
const stopUserScheduler = (userId) => {
  if (jobs[userId]) {
    jobs[userId].destroy();
    delete jobs[userId];
    console.log(`Scheduler stopped for user ${userId}`);
  }
};

/**
 * Load and start all active schedulers on server boot
 */
const initSchedulers = async () => {
  try {
    const { data: activeSettings } = await supabase
      .from('settings')
      .select('user_id, send_time')
      .eq('scheduler_active', true);

    if (!activeSettings || activeSettings.length === 0) {
      console.log('No active schedulers found');
      return;
    }

    for (const setting of activeSettings) {
      startUserScheduler(setting.user_id, setting.send_time);
    }

    console.log(`Initialized ${activeSettings.length} scheduler(s)`);
  } catch (err) {
    console.error('Scheduler init error:', err.message);
  }
};

module.exports = { startUserScheduler, stopUserScheduler, initSchedulers };