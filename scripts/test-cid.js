const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testCid() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');

  const info = await transporter.sendMail({
    from: `"NexusHR Security" <${user}>`,
    to: 'anigokala3@gmail.com',
    subject: 'Verification Code with Original Logo',
    html: `
      <div style="background-color: #070b14; padding: 30px; text-align: center; font-family: sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
          <tr>
            <td align="center" valign="middle" style="width: 56px; height: 56px; background-color: #ffffff; border-radius: 50%; padding: 8px;">
              <img src="cid:nexushr-logo" alt="NexusHR" width="40" height="40" style="width: 40px; height: 40px; border-radius: 50%; display: block; object-fit: contain; margin: 0 auto;" />
            </td>
          </tr>
        </table>
        <h2 style="color: #ffffff;">NexusHR Original Logo Test</h2>
        <p style="color: #5eead4; font-size: 24px; font-weight: bold; letter-spacing: 6px;">942183</p>
      </div>
    `,
    attachments: [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'nexushr-logo'
      }
    ]
  });

  console.log('SUCCESS! MessageId:', info.messageId);
}

testCid().catch(console.error);

