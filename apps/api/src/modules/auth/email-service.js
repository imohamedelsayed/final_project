function createEmailService({ config, logger }) {
  const sentEmails = [];

  async function sendVerificationEmail({ to, name, code }) {
    const subject = 'Pixel Store — Verify your email';
    const textContent = `Hello ${name},\n\nYour email verification code for Pixel Store is: ${code}\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please ignore this email.`;

    // 1. If in test mode or no provider configured, record in-memory and log safely
    if (config.NODE_ENV === 'test' || !config.EMAIL_PROVIDER || !config.EMAIL_API_KEY) {
      sentEmails.push({ to, name, code, subject, textContent, sentAt: new Date() });
      if (logger) {
        logger.info(
          { to, delivery: 'simulated_in_memory' },
          'Email verification OTP dispatched (simulated/in-memory)'
        );
      }
      return { success: true, provider: 'in_memory' };
    }

    // 2. Real provider delivery: Brevo
    if (config.EMAIL_PROVIDER === 'brevo') {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.EMAIL_API_KEY
        },
        body: JSON.stringify({
          sender: { name: 'Pixel Store', email: config.EMAIL_FROM || 'noreply@pixelstore.com' },
          to: [{ email: to, name }],
          subject,
          textContent
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        if (logger) {
          logger.error({ status: response.status, errText }, 'Brevo email delivery failed');
        }
        throw new Error(`Email delivery failed via Brevo: ${response.statusText}`);
      }

      const resData = await response.json().catch(() => ({}));
      return { success: true, provider: 'brevo', messageId: resData.messageId };
    }

    // 3. Real provider delivery: Resend
    if (config.EMAIL_PROVIDER === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          from: config.EMAIL_FROM || 'Pixel Store <noreply@pixelstore.com>',
          to: [to],
          subject,
          text: textContent
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        if (logger) {
          logger.error({ status: response.status, errText }, 'Resend email delivery failed');
        }
        throw new Error(`Email delivery failed via Resend: ${response.statusText}`);
      }

      const resData = await response.json().catch(() => ({}));
      return { success: true, provider: 'resend', messageId: resData.id };
    }

    throw new Error(`Unsupported EMAIL_PROVIDER: ${config.EMAIL_PROVIDER}`);
  }

  function getSentEmails() {
    return [...sentEmails];
  }

  function getLastSentEmail() {
    return sentEmails[sentEmails.length - 1] || null;
  }

  function clearSentEmails() {
    sentEmails.length = 0;
  }

  return {
    sendVerificationEmail,
    getSentEmails,
    getLastSentEmail,
    clearSentEmails
  };
}

module.exports = { createEmailService };
