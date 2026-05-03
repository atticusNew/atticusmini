import sgMail from '@sendgrid/mail';

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface VerificationEmail {
  to: string;
  code: string;
  subject?: string;
  template?: string;
}

export class EmailService {
  private isConfigured: boolean = false;
  private config: EmailConfig | null = null;

  /**
   * Initialize email service with SendGrid configuration
   */
  initialize(config: EmailConfig): void {
    try {
      if (!config.apiKey || !config.fromEmail || !config.fromName) {
        throw new Error('Missing required email configuration');
      }

      sgMail.setApiKey(config.apiKey);
      this.config = config;
      this.isConfigured = true;

      console.log('✅ Email service initialized with SendGrid');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send verification code via email
   */
  async sendVerificationCode(emailData: VerificationEmail): Promise<void> {
    if (!this.isConfigured || !this.config) {
      throw new Error('Email service not configured');
    }

    try {
      const { to, code, subject = 'Verify Your Bitcoin Options Account', template } = emailData;

      // Create email content
      const htmlContent = template || this.generateVerificationEmail(code);
      const textContent = this.generateTextVerificationEmail(code);

      const msg = {
        to: to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
        trackingSettings: {
          clickTracking: {
            enable: false,
            enableText: false
          }
        }
      };

      await sgMail.send(msg);
      console.log(`✅ Verification email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HTML email template for verification
   */
  private generateVerificationEmail(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #f4d03f; }
          .code { background: #f8f9fa; border: 2px solid #f4d03f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .verification-code { font-size: 32px; font-weight: bold; color: #f4d03f; letter-spacing: 5px; font-family: monospace; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Bitcoin Options Platform</div>
          </div>
          
          <h2>Verify Your Account</h2>
          <p>Thank you for signing up! Please use the verification code below to complete your account setup:</p>
          
          <div class="code">
            <div class="verification-code">${code}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. Never share this code with anyone.
          </div>
          
          <p>If you didn't request this verification code, please ignore this email.</p>
          
          <div class="footer">
            <p>This is an automated message from Bitcoin Options Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for verification
   */
  private generateTextVerificationEmail(code: string): string {
    return `
Bitcoin Options Platform - Account Verification

Thank you for signing up! Please use the verification code below to complete your account setup:

Verification Code: ${code}

⚠️ Security Notice: This code will expire in 10 minutes. Never share this code with anyone.

If you didn't request this verification code, please ignore this email.

This is an automated message from Bitcoin Options Platform
    `.trim();
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; service: string } {
    return {
      configured: this.isConfigured,
      service: 'SendGrid'
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
