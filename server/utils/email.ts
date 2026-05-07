import https from 'https';

/**
 * Gmail REST API Email Sender
 * Uses OAuth2 Refresh Token for non-interactive server-side emailing
 * No SMTP needed.
 */

async function getAccessToken() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Gmail OAuth2 credentials missing (Client ID, Secret, or Refresh Token)');
    }

    const data = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }).toString();

    return new Promise<string>((resolve, reject) => {
        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data),
            },
        }, (res) => {
            let resp = '';
            res.on('data', chunk => resp += chunk);
            res.on('end', () => {
                const parsed = JSON.parse(resp);
                if (parsed.access_token) resolve(parsed.access_token);
                else reject(new Error('Failed to obtain access token: ' + resp));
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    try {
        const accessToken = await getAccessToken();
        const user = process.env.GMAIL_USER || 'admin@shuttlix.com';

        // Base64Url encode the raw email
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const emailContent = [
            `From: ShutliX <${user}>`,
            `To: ${to}`,
            `Subject: ${utf8Subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            html
        ].join('\r\n');

        const base64EncodedEmail = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const data = JSON.stringify({ raw: base64EncodedEmail });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'gmail.googleapis.com',
                path: `/gmail/v1/users/${user}/messages/send`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                }
            }, (res) => {
                let resp = '';
                res.on('data', chunk => resp += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log(`✅ Email sent to ${to}`);
                        resolve({ success: true, data: JSON.parse(resp) });
                    } else {
                        console.error('❌ Gmail API error:', resp);
                        reject(new Error(`Gmail send failed: ${resp}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    } catch (err: any) {
        console.error('📧 sendEmail Failed:', err.message);
        return { success: false, error: err.message };
    }
};

export const otpTemplate = (otp: string, purpose: string) => {
  const isReset = purpose === 'reset';
  const title = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const subtitle = isReset
    ? 'We received a request to reset your ShutliX password. Use the code below to continue.'
    : 'Welcome to ShutliX! Use the code below to verify your email address and complete your registration.';
  const actionLabel = isReset ? 'Password Reset Code' : 'Email Verification Code';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;border:1px solid #2a2d3a;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;">
                    <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">🚌 SHUTLIX</span>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:12px 0 0;letter-spacing:0.5px;">Smart Shuttle Management Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="color:#f1f1f3;font-size:22px;font-weight:700;margin:0 0 12px;">${title}</h1>
              <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 32px;">${subtitle}</p>

              <!-- OTP Label -->
              <p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">${actionLabel}</p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f1117;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;">
                    <span style="color:#a5b4fc;font-size:42px;font-weight:800;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</span>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="background:#1e2030;border-left:3px solid #f59e0b;border-radius:6px;padding:14px 16px;">
                    <p style="color:#fbbf24;font-size:12px;margin:0;">⏱ This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:12px;margin:28px 0 0;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Your account won't be affected.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#13151f;padding:24px 40px;border-top:1px solid #2a2d3a;text-align:center;">
              <p style="color:#4b5563;font-size:11px;margin:0 0 6px;letter-spacing:0.5px;">© 2026 SHUTLIX MOBILITY CORPORATION</p>
              <p style="color:#374151;font-size:10px;margin:0;">This is an automated message. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const welcomeTemplate = (name: string, orgName: string, orgCode: string) => `
<div style="font-family:sans-serif;padding:20px;">
  <h2>Welcome, ${name}!</h2>
  <p>Your organisation ${orgName} is ready. Code: <strong>${orgCode}</strong></p>
</div>`;
