import { Resend } from 'resend';
import { generateAIReply, shouldAutoReply } from './utils/ai-reply.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Inbound Email Webhook Handler
 * Receives email.received events from Resend and sends AI-powered auto-replies
 *
 * [CP01] KISS: Simple webhook → fetch email → AI reply → send
 * [EH02] User-friendly error handling
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    // [SC02] Validate webhook payload
    const { type, data } = req.body;

    if (type !== 'email.received') {
      console.log('[INBOUND] Ignoring non-received event:', type);
      return res.status(200).json({ ok: true, message: 'Event ignored' });
    }

    if (!data?.email_id) {
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Missing email_id in webhook data'
      });
    }

    const { email_id, from, to, subject } = data;

    // [EH01] Log incoming email (domain only, no sensitive data)
    console.log('[INBOUND] Received email:', {
      email_id,
      from_domain: from.split('@')[1],
      to,
      subject,
    });

    // Fetch full email content from Resend Inbound API
    let emailContent;
    try {
      // Use the Resend SDK's emails.get() method for inbound emails
      emailContent = await resend.emails.get(email_id);
    } catch (error) {
      console.error('[INBOUND] Failed to fetch email content:', error.message);
      throw new Error(`Email retrieval failed: ${error.message}`);
    }

    // Extract text/html content
    const emailData = {
      from: emailContent.from || from,
      subject: emailContent.subject || subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    // Check if we should auto-reply
    if (!shouldAutoReply(emailData)) {
      console.log('[INBOUND] Auto-reply skipped for:', from);
      return res.status(200).json({
        ok: true,
        message: 'Auto-reply skipped (no-reply or auto-responder detected)'
      });
    }

    // Generate AI-powered reply
    let replyText;
    try {
      replyText = await generateAIReply(emailData);
    } catch (error) {
      console.error('[INBOUND] AI reply generation failed:', error.message);
      // Don't fail the webhook - just log and skip reply
      return res.status(200).json({
        ok: true,
        message: 'AI reply generation failed',
        error: error.message
      });
    }

    // Send reply via Resend
    try {
      const replyEmail = await resend.emails.send({
        from: (process.env.INBOUND_EMAIL || 'KINN <ki@in.kinn.at>').trim(),
        to: from,
        subject: `Re: ${subject}`,
        text: replyText,
        // Set reply_to in case user replies again
        reply_to: 'ki@in.kinn.at',
      });

      console.log('[INBOUND] Reply sent successfully:', {
        reply_id: replyEmail.id,
        to: from,
      });

      return res.status(200).json({
        ok: true,
        message: 'Auto-reply sent',
        email_id,
        reply_id: replyEmail.id,
      });

    } catch (error) {
      console.error('[INBOUND] Failed to send reply:', error.message);
      throw new Error(`Reply sending failed: ${error.message}`);
    }

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[INBOUND] Webhook processing error:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] Return 200 to prevent Resend retries for permanent failures
    // Only return 500 for temporary failures that should retry
    const shouldRetry = error.message.includes('temporary') ||
                        error.message.includes('timeout');

    return res.status(shouldRetry ? 500 : 200).json({
      error: 'Webhook processing failed',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.stack })
    });
  }
}
