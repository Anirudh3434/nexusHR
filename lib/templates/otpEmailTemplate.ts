export interface OtpEmailProps {
  userName: string;
  otp: string;
  companyName?: string;
  companyLogo?: string;
  expiryMinutes?: number;
}

export function generateOtpEmailHtml({
  userName,
  otp,
  companyName = "NexusHR Workspace",
  companyLogo,
  expiryMinutes = 10,
}: OtpEmailProps): string {
  const formattedOtp = otp.split("").join(" ");
  const currentYear = new Date().getFullYear();
  const requestTime = new Date().toUTCString();
  const logoSrc = companyLogo || "cid:nexushr-logo";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code - ${companyName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #070b14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #f1f5f9;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #070b14;
      padding: 40px 16px;
    }
    .main-card {
      max-width: 540px;
      margin: 0 auto;
      background: #0d1527;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header-bar {
      padding: 36px 32px 28px;
      text-align: center;
      background: linear-gradient(180deg, #131f38 0%, #0d1527 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #ffffff;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
    }
    .logo-img {
      width: 34px;
      height: 34px;
      object-fit: contain;
      border-radius: 50%;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #14b8a6;
      margin-top: 4px;
    }
    .content-body {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .lead-text {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 28px;
    }
    .otp-card {
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
      border: 1px solid rgba(20, 184, 166, 0.25);
      border-radius: 16px;
      padding: 28px 20px;
      text-align: center;
      margin: 24px 0 28px;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5eead4;
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: 'SF Mono', Consolas, 'Roboto Mono', Monaco, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #ffffff;
      text-shadow: 0 2px 10px rgba(20, 184, 166, 0.5);
      margin: 0 0 10px;
      padding-left: 12px; /* balance out trailing letter spacing */
    }
    .expiry-tag {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #facc15;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.25);
      border-radius: 20px;
      padding: 4px 12px;
      margin-top: 6px;
    }
    .info-list {
      background: #090e1c;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .info-item {
      font-size: 12px;
      line-height: 1.6;
      color: #94a3b8;
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .info-item:last-child {
      margin-bottom: 0;
    }
    .security-notice {
      border-left: 3px solid #14b8a6;
      padding-left: 12px;
      margin-top: 20px;
      font-size: 12px;
      line-height: 1.5;
      color: #64748b;
    }
    .footer-bar {
      padding: 24px 32px;
      background: #090e1c;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      text-align: center;
      font-size: 11px;
      line-height: 1.6;
      color: #475569;
    }
    .footer-links a {
      color: #64748b;
      text-decoration: underline;
      margin: 0 6px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      
      <!-- Header -->
      <div class="header-bar">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
          <tr>
            <td align="center" valign="middle" style="width: 58px; height: 58px; background-color: #ffffff; border-radius: 50%; padding: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);">
              <img src="${logoSrc}" alt="${companyName}" width="42" height="42" style="width: 42px; height: 42px; border-radius: 50%; display: block; object-fit: contain; margin: 0 auto; border: 0;" />
            </td>
          </tr>
        </table>
        <h1 class="brand-title">${companyName}</h1>
        <div class="brand-subtitle">One-Time Password (OTP) Verification</div>
      </div>

      <!-- Body -->
      <div class="content-body">
        <div class="greeting">Hello ${userName},</div>
        <p class="lead-text">
          We received a request to verify your identity and reset your account password for <strong>${companyName}</strong>. Please enter the verification code below to proceed:
        </p>

        <!-- OTP Highlight Box -->
        <div class="otp-card">
          <div class="otp-label">Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="expiry-tag">⏱️ Valid for ${expiryMinutes} minutes</div>
        </div>

        <!-- Instructions & Security -->
        <div class="info-list">
          <div style="font-size: 12px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">
            🔒 Security Protocol:
          </div>
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 6px;">
            • Never share this 6-digit code with anyone, including NexusHR support staff.
          </div>
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            • If you did not request this verification, your password has not been changed. You can safely disregard this email or notify your system administrator.
          </div>
        </div>

        <div class="security-notice">
          Sent from NexusHR Automated Security Gateway at ${requestTime}.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-bar">
        <div style="margin-bottom: 8px;">
          &copy; ${currentYear} NexusHR Enterprise Platform. All rights reserved.
        </div>
        <div class="footer-links">
          <span>Enterprise Grade Security</span> &bull; 
          <span>Multi-Tenant Isolation</span> &bull; 
          <span>Encrypted Transit</span>
        </div>
      </div>

    </div>
  </div>
</body>
</html>
`;
}
