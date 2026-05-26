const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter if SMTP settings are present
const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter = null;
if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Sends a premium verification OTP email.
 * Falls back to console log if SMTP is not configured.
 * @param {string} email 
 * @param {string} otp 
 * @param {string} type - 'verification' | 'reset'
 */
const sendOtpEmail = async (email, otp, type = 'verification') => {
    const subject = type === 'verification' 
        ? 'Verify Your LinkUp Account' 
        : 'Reset Your LinkUp Password';

    const titleText = type === 'verification'
        ? 'Account Verification'
        : 'Password Reset Request';

    const descText = type === 'verification'
        ? 'Thank you for choosing LinkUp! Use the OTP verification code below to activate your account.'
        : 'We received a request to reset your password. Use the OTP code below to set a new password.';

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0f; color: #e4e4e7; padding: 40px 20px; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background: rgba(20, 20, 23, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 32px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); backdrop-filter: blur(12px);">
                <h1 style="margin: 0 0 10px 0; background: linear-gradient(to right, #60a5fa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">LinkUp</h1>
                <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin-bottom: 24px;">${titleText}</h2>
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">${descText}</p>
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.4);">${otp}</span>
                </div>
                <p style="color: #71717a; font-size: 12px; line-height: 1.5; margin: 0;">This OTP code is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
            </div>
            <div style="margin-top: 24px; color: #71717a; font-size: 11px;">
                © 2026 LinkUp Messaging. All rights reserved.
            </div>
        </div>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"LinkUp" <noreply@linkup.chat>',
                to: email,
                subject: subject,
                html: htmlContent,
            });
            console.log(`[EmailService] OTP Email sent successfully to ${email}`);
            return true;
        } catch (error) {
            console.error('[EmailService] SMTP error sending email:', error);
            // Fall back to console log if SMTP fails
        }
    }

    // High fidelity Terminal Fallback
    console.log('\n' + '='.repeat(50));
    console.log('  LINKUP EMAIL SERVICE (DEVELOPMENT MODE)');
    console.log('='.repeat(50));
    console.log(`  To:      ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Type:    ${type.toUpperCase()}`);
    console.log(' ');
    console.log('  ┌──────────────────────────────────────────┐');
    console.log(`  │   YOUR OTP CODE IS:    ${otp}             │`);
    console.log('  └──────────────────────────────────────────┘');
    console.log(' ');
    console.log('  (Please configure SMTP in your backend .env');
    console.log('   to receive actual emails.)');
    console.log('='.repeat(50) + '\n');
    return false;
};

module.exports = {
    sendOtpEmail
};
