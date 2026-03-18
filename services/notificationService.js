const supabase = require('../config/supabase');

const createNotification = async (userId, message, type = 'info') => {
  try {
    await supabase
      .from('notifications')
      .insert({ user_id: userId, message, type });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { createNotification };