const nodemailer                    = require('nodemailer');
const supabase                      = require('../config/supabase');
const { resolveTemplate, pickTemplate } = require('./templateEngine');
const { resolveCV }                 = require('./cvResolver');
const { createNotification }        = require('./notificationService');

/**
 * Create a nodemailer transporter for a user's Gmail
 */
const createTransporter = (gmail, appPassword) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmail,
      pass: appPassword,
    },
  });
};

/**
 * Send a single email to a company
 */
const sendEmail = async ({ userId, company, template, profile, works, isFollowup = false }) => {
  try {
    if (!profile.gmail || !profile.gmail_app_password) {
      throw new Error('Gmail credentials not configured');
    }

    const transporter = createTransporter(profile.gmail, profile.gmail_app_password);

    const subject = resolveTemplate(template.subject, { company, profile, works });
    const body    = resolveTemplate(template.body,    { company, profile, works });
    const cvUrl   = resolveCV(template, profile);

    const mailOptions = {
      from:    `${profile.full_name} <${profile.gmail}>`,
      to:      company.employee_email,
      subject: subject,
      text:    body,
    };

    // Attach CV if available
    if (cvUrl) {
      mailOptions.attachments = [{
        filename: 'CV.pdf',
        path:     cvUrl,
      }];
    }

    await transporter.sendMail(mailOptions);

    // Log the email
    await supabase.from('email_logs').insert({
      user_id:       userId,
      company_id:    company.id,
      template_id:   template.id,
      subject:       subject,
      body_rendered: body,
      is_followup:   isFollowup,
    });

    // Update company status
    await supabase
      .from('companies')
      .update({
        status:     isFollowup ? 'Followed Up' : 'Sent',
        updated_at: new Date(),
      })
      .eq('id', company.id);

    return { success: true };
  } catch (err) {
    console.error(`Failed to send to ${company.employee_email}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Run a sending batch for a user
 * Sends up to daily_limit emails with interval_minutes between each
 */
const runBatch = async (userId) => {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!settings) return;

    // Get profile + works
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, works(*)')
      .eq('id', userId)
      .single();

    if (!profile?.gmail || !profile?.gmail_app_password) return;

    const works = profile.works || [];

    // Get templates
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId);

    const mainTemplates    = (templates || []).filter(t => !t.is_followup);
    const followupTemplate = (templates || []).find(t => t.is_followup);

    if (mainTemplates.length === 0) {
      await createNotification(userId, 'No email templates found. Add a template to start sending.', 'warning');
      return;
    }

    // Get pending companies (not blacklisted, not yet sent or needing follow-up)
    const { data: pending } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .eq('blacklisted', false)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true })
      .limit(settings.daily_limit);

    // Check for follow-ups due
    const followupDaysAgo = new Date();
    followupDaysAgo.setDate(followupDaysAgo.getDate() - settings.followup_days);

    const { data: followupDue } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .eq('blacklisted', false)
      .eq('status', 'Sent')
      .lt('updated_at', followupDaysAgo.toISOString());

    const toSend = [...(pending || [])];
    let sent     = 0;

    // Send to pending companies
    for (const company of toSend) {
      if (sent >= settings.daily_limit) break;

      // Get previously used template IDs for this company
      const { data: prevLogs } = await supabase
        .from('email_logs')
        .select('template_id')
        .eq('company_id', company.id);

      const usedIds = (prevLogs || []).map(l => l.template_id);
      const template = pickTemplate(mainTemplates, company, usedIds);

      if (!template) continue;

      const result = await sendEmail({ userId, company, template, profile, works });

      if (result.success) {
        sent++;
        if (settings.notify_on_send) {
          await createNotification(
            userId,
            `Email sent to ${company.employee_name} at ${company.name}`,
            'success'
          );
        }

        // Wait interval between emails
        if (sent < toSend.length && settings.interval_minutes > 0) {
          await new Promise(resolve => setTimeout(resolve, settings.interval_minutes * 60 * 1000));
        }
      }
    }

    // Send follow-ups
    if (followupTemplate && followupDue?.length > 0) {
      for (const company of followupDue) {
        if (sent >= settings.daily_limit) break;

        const result = await sendEmail({
          userId, company,
          template: followupTemplate,
          profile, works,
          isFollowup: true,
        });

        if (result.success) {
          sent++;
          await createNotification(
            userId,
            `Follow-up sent to ${company.employee_name} at ${company.name}`,
            'info'
          );
        }
      }
    }

    // Check if list is exhausted
    const { data: remaining } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .eq('blacklisted', false)
      .eq('status', 'Pending');

    if (remaining?.length === 0 && settings.notify_on_exhausted) {
      await createNotification(
        userId,
        'You have reached all companies in your list. Add more to continue outreach.',
        'warning'
      );
    }

    // Daily summary
    if (sent > 0 && settings.daily_summary_email) {
      await sendDailySummary(profile, sent);
    }

    console.log(`Batch complete for ${userId}: ${sent} emails sent`);
  } catch (err) {
    console.error('Batch error:', err.message);
  }
};

/**
 * Send a daily summary email to the user
 */
const sendDailySummary = async (profile, count) => {
  try {
    const transporter = createTransporter(profile.gmail, profile.gmail_app_password);
    await transporter.sendMail({
      from:    `Reachio <${profile.gmail}>`,
      to:      profile.gmail,
      subject: `Reachio — Daily Summary: ${count} emails sent today`,
      text:    `Hi ${profile.full_name},\n\nYour Reachio scheduler sent ${count} email${count !== 1 ? 's' : ''} today.\n\nLog in to see the full report.\n\nReachio`,
    });
  } catch (err) {
    console.error('Summary email error:', err.message);
  }
};

module.exports = { sendEmail, runBatch };