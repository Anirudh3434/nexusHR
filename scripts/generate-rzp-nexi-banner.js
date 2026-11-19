const sharp = require('sharp');

async function createMinimalPortraitBanner() {
  const width = 640;
  const height = 900;

  // Background SVG with black top to blend perfectly with the official logo
  const bgSvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#000000"/>
          <stop offset="28%" stop-color="#000000"/>
          <stop offset="55%" stop-color="#081427"/>
          <stop offset="100%" stop-color="#030711"/>
        </linearGradient>

        <radialGradient id="nexiHalo" cx="50%" cy="56%" r="42%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#0284c7" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Background Fill -->
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect width="${width}" height="${height}" fill="url(#nexiHalo)"/>

      <!-- Ambient Decorative Concentric Rings -->
      <circle cx="320" cy="500" r="230" fill="none" stroke="rgba(56, 189, 248, 0.08)" stroke-width="1.5"/>
      <circle cx="320" cy="500" r="170" fill="none" stroke="rgba(99, 102, 241, 0.12)" stroke-width="1" stroke-dasharray="6 6"/>

      <!-- Minimal Bottom Pill -->
      <g transform="translate(195, 820)">
        <rect width="250" height="42" rx="21" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1"/>
        <circle cx="24" cy="21" r="4" fill="#10b981"/>
        <text x="38" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.5">
          Direct 24/7 Bank Payouts
        </text>
      </g>
    </svg>
  `;

  // Scale the exact user-provided RazorpayX Payroll logo to 370px width
  const logo = await sharp('public/images/razorpayx_payroll_logo.png')
    .resize(370, null, { fit: 'contain' })
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();

  // Scale the exact authentic Nexi mascot
  const nexiAvatar = await sharp('public/images/mascot/nexi_success_avatar.png')
    .resize(550, 550, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite
  await sharp(Buffer.from(bgSvg))
    .composite([
      {
        input: logo,
        top: 60,
        left: Math.round((width - logoMeta.width) / 2),
      },
      {
        input: nexiAvatar,
        top: 175,
        left: 45,
      }
    ])
    .png()
    .toFile('public/images/razorpayx_nexi_payroll.png');

  await sharp('public/images/razorpayx_nexi_payroll.png')
    .jpeg({ quality: 95 })
    .toFile('public/images/razorpayx_nexi_payroll.jpg');

  console.log('Successfully generated seamless portrait banner!');
}

createMinimalPortraitBanner().catch(err => {
  console.error(err);
  process.exit(1);
});
