import { emailService } from '../services/emailService';

export interface EmailConfiguration {
  sendgridApiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Initialize email service with environment variables
 * This should be called once during app initialization
 */
export const initializeEmailService = (): boolean => {
  try {
    // Get configuration from environment variables
    const config = {
      sendgridApiKey: process.env['REACT_APP_SENDGRID_API_KEY'] || '',
      fromEmail: process.env['REACT_APP_FROM_EMAIL'] || 'noreply@bitcoinoptions.io',
      fromName: process.env['REACT_APP_FROM_NAME'] || 'Bitcoin Options Platform'
    };

    // Check if SendGrid API key is provided
    if (!config.sendgridApiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not found in environment variables');
      console.warn('📧 Email service will use console fallback for development');
      return false;
    }

    // Initialize email service
    emailService.initialize({
      apiKey: config.sendgridApiKey,
      fromEmail: config.fromEmail,
      fromName: config.fromName
    });

    console.log('✅ Email service initialized for production');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error);
    console.warn('📧 Email service will use console fallback for development');
    return false;
  }
};

/**
 * Get email service status
 */
export const getEmailServiceStatus = () => {
  return emailService.getStatus();
};

/**
 * Check if email service is production-ready
 */
export const isEmailServiceProductionReady = (): boolean => {
  const status = emailService.getStatus();
  return status.configured && status.service === 'SendGrid';
};
