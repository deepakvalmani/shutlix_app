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

export const otpTemplate = (otp: string, purpose: string) => `
<div style="font-family:sans-serif;padding:20px;">
  <h2>${purpose === 'reset' ? 'Reset your password' : 'Verify your email'}</h2>
  <p>Your code is: <strong>${otp}</strong></p>
</div>`;

export const welcomeTemplate = (name: string, orgName: string, orgCode: string) => `
<div style="font-family:sans-serif;padding:20px;">
  <h2>Welcome, ${name}!</h2>
  <p>Your organisation ${orgName} is ready. Code: <strong>${orgCode}</strong></p>
</div>`;
