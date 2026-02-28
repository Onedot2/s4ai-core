// Email service for S4Ai - powered by Cloudflare Email Routing + Mailgun
// Inbound: noreply@getbrains4ai.com (Cloudflare Email Routing)
// Outbound: Mailgun API (free 100 emails/day) or SMTP fallback

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';


class EmailService {
  constructor() {
    this.enabled = false;
    this.provider = null; // 'mailgun' or 'smtp'
    this.transporter = null; // For SMTP
    this.mailgunDomain = null; // For Mailgun
    this.mailgunApiKey = null; // For Mailgun
    this.fromAddress = process.env.SMTP_FROM_ADDRESS || 'noreply@getbrains4ai.com';
    this.replyTo = process.env.SMTP_REPLY_TO || 'bradleylevitan@gmail.com';
    
    // Initialize with Mailgun first, fallback to SMTP
    this.initializeMailgun() || this.initializeSMTP();
  }

  /**
   * Initialize Mailgun API provider (preferred)
   */
  initializeMailgun() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (apiKey && domain) {
      try {
        this.mailgunApiKey = apiKey;
        this.mailgunDomain = domain;
        this.provider = 'mailgun';
        this.enabled = true;
        logger.info('[EmailService] ✅ Mailgun configured successfully');
        logger.info(`[EmailService] Provider: Mailgun`);
        logger.info(`[EmailService] Domain: ${domain}`);
        logger.info(`[EmailService] From: ${this.fromAddress}`);
        return true;
      } catch (err) {
        logger.warn('[EmailService] ⚠️ Mailgun initialization failed:', err.message);
        return false;
      }
    }
    return false;
  }

  /**
   * Initialize SMTP transporter as fallback
   */
  initializeSMTP() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465, // true for 465, false for other ports
          auth: {
            user,
            pass
          }
        });
        this.provider = 'smtp';
        this.enabled = true;
        logger.info('[EmailService] ✅ SMTP configured successfully');
        logger.info(`[EmailService] Provider: SMTP (${host})`);
        logger.info(`[EmailService] From: ${this.fromAddress}`);
        return true;
      } catch (err) {
        logger.warn('[EmailService] ⚠️ SMTP initialization failed:', err.message);
        return false;
      }
    } else {
      logger.info('[EmailService] ⏭️ Email not configured (missing credentials)');
      logger.info('[EmailService] Configure one of these:');
      logger.info('  Mailgun (Recommended): MAILGUN_API_KEY + MAILGUN_DOMAIN');
      logger.info('  OR SMTP: SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASSWORD');
    }
    return false;
  }

  /**
   * Send email via configured provider (Mailgun or SMTP)
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} options.html - HTML body (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, text, html }) {
    if (!this.enabled) {
      logger.warn('[EmailService] ⚠️ Email not sent - no provider configured');
      return { success: false, error: 'Email provider not configured' };
    }

    try {
      if (this.provider === 'mailgun') {
        return await this.sendViaMailgun({ to, subject, text, html });
      } else if (this.provider === 'smtp') {
        return await this.sendViaSMTP({ to, subject, text, html });
      }
    } catch (err) {
      logger.error('[EmailService] ❌ Failed to send email:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send email via Mailgun API
   */
  async sendViaMailgun({ to, subject, text, html }) {
    const fetch = (await import('node-fetch')).default;
    
    const auth = Buffer.from(`api:${this.mailgunApiKey}`).toString('base64');
    const data = new URLSearchParams({
      from: `S4Ai Brain <${this.fromAddress}>`,
      to,
      subject,
      text,
      html: html || text
    });

    const response = await fetch(`https://api.mailgun.net/v3/${this.mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.info('[EmailService] ✅ Email sent via Mailgun:', result.id);
    return { success: true, messageId: result.id, provider: 'mailgun' };
  }

  /**
   * Send email via SMTP fallback
   */
  async sendViaSMTP({ to, subject, text, html }) {
    const mailOptions = {
      from: `S4Ai Brain <${this.fromAddress}>`,
      replyTo: this.replyTo,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await this.transporter.sendMail(mailOptions);
    logger.info('[EmailService] ✅ Email sent via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  }

  /**
   * Send system notification email
   * @param {string} to - Recipient email
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} level - Notification level (info, warning, error)
   */
  async sendNotification(to, title, message, level = 'info') {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };

    const subject = `${emoji[level] || '📧'} ${title} - S4Ai`;
    const text = `${title}\n\n${message}\n\n---\nS4Ai Autonomous Brain System\nhttps://getbrains4ai.com`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${emoji[level] || '📧'} ${title}</h2>
        <p style="color: #666; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          S4Ai Autonomous Brain System<br>
          <a href="https://getbrains4ai.com">getbrains4ai.com</a>
        </p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send system health alert
   * @param {Object} healthData - Health metrics data
   */
  async sendHealthAlert(healthData) {
    if (!this.enabled) return;

    const to = this.replyTo; // Send to admin
    const title = 'System Health Alert';
    const message = `
      S4Ai health metrics have triggered an alert:
      
      Health: ${healthData.health}%
      Ambition Level: ${healthData.ambitionLevel || 'N/A'}
      Curiosity Level: ${healthData.curiosityLevel || 'N/A'}
      
      Please review the system status at https://getbrains4ai.com
    `;

    return this.sendNotification(to, title, message, 'warning');
  }

  /**
   * Send deployment notification
   * @param {string} version - Deployment version
   * @param {boolean} success - Deployment success status
   */
  async sendDeploymentNotification(version, success = true) {
    if (!this.enabled) return;

    const to = this.replyTo;
    const title = success ? 'Deployment Successful' : 'Deployment Failed';
    const level = success ? 'success' : 'error';
    const message = `
      S4Ai version ${version} has been ${success ? 'successfully deployed' : 'failed to deploy'}.
      
      ${success ? 'All systems operational.' : 'Please check logs for details.'}
    `;

    return this.sendNotification(to, title, message, level);
  }

  /**
   * Send Genesis verification alert
   * @param {Object} verification - Verification result
   */
  async sendGenesisAlert(verification) {
    if (!this.enabled || verification.intact) return; // Only send if integrity compromised

    const to = this.replyTo;
    const title = '🚨 Genesis Integrity Alert';
    const message = `
      Genesis protocol verification has detected an integrity issue:
      
      Status: ${verification.intact ? 'INTACT' : 'COMPROMISED'}
      Missing Files: ${verification.missing?.join(', ') || 'None'}
      
      Immediate action required: Review Genesis files at:
      https://github.com/Onedot2/PWAI/tree/main/src/agent-365-io/tasks
    `;

    return this.sendNotification(to, title, message, 'error');
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
