import nodemailer from "nodemailer";

// Lazy transporter - created on first use to ensure env vars are loaded
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

// Verify SMTP connection on startup
if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
  console.warn(
    "[EMAIL] ⚠️ SMTP credentials not configured - emails will NOT be sent!",
  );
} else {
  const t = getTransporter();
  if (t) {
    t.verify((error, success) => {
      if (error) {
        console.error("[EMAIL] ❌ SMTP connection failed:", error.message);
      } else {
        console.log(
          "[EMAIL] ✅ SMTP connection verified - ready to send emails",
        );
      }
    });
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  emailType?: string; // For better logging
}

// Helper function to log with timestamp
function logEmail(message: string, success: boolean = true) {
  const timestamp = new Date().toISOString();
  const icon = success ? "✅" : "❌";
  console.log(`[EMAIL] ${icon} [${timestamp}] ${message}`);
}

// Retry mechanism - try up to maxRetries times
async function sendWithRetry(
  mailOptions: nodemailer.SendMailOptions,
  emailType: string,
  maxRetries: number = 2,
): Promise<boolean> {
  const emailTransporter = getTransporter();

  if (!emailTransporter) {
    logEmail(
      `${emailType} to ${mailOptions.to} SKIPPED - no transporter available`,
      false,
    );
    return false;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await emailTransporter.sendMail(mailOptions);
      logEmail(
        `${emailType} sent to ${mailOptions.to} (attempt ${attempt}/${maxRetries})`,
      );
      return true;
    } catch (error: any) {
      lastError = error;
      logEmail(
        `${emailType} to ${mailOptions.to} FAILED (attempt ${attempt}/${maxRetries}): ${error.message}`,
        false,
      );

      if (attempt < maxRetries) {
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  logEmail(
    `${emailType} to ${mailOptions.to} PERMANENTLY FAILED after ${maxRetries} attempts: ${lastError?.message}`,
    false,
  );
  return false;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const emailType = options.emailType || "General Email";

  // Check if SMTP credentials are configured
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    logEmail(
      `${emailType} to ${options.to} SKIPPED - SMTP not configured`,
      false,
    );
    return false;
  }

  const mailOptions = {
    from: `"Barbaarintasan Academy" <${process.env.SMTP_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  return sendWithRetry(mailOptions, emailType);
}

export async function sendSubscriptionReminderEmail(
  email: string,
  customerName: string,
  courseName: string,
  daysRemaining: number,
  hoursRemaining?: number,
): Promise<boolean> {
  let subject: string;
  if (hoursRemaining !== undefined && hoursRemaining <= 25) {
    subject = `⚠️ Koorsadaada "${courseName}" waxay dhamaanaysaa ${hoursRemaining} saacadood ka dib!`;
  } else if (daysRemaining === 0) {
    subject = `⚠️ Koorsadaada "${courseName}" maanta ayay dhamaanaysaa!`;
  } else {
    subject = `⏰ Koorsadaada "${courseName}" waxay dhamaanaysaa ${daysRemaining} maalmood ka dib`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .cta-button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Barbaarintasan Academy</h1>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="warning">
            <strong>⚠️ Xasuusin Muhiim ah:</strong><br>
            ${
              hoursRemaining !== undefined && hoursRemaining <= 25
                ? `Koorsadaada "<strong>${courseName}</strong>" waxay dhamaataysaa <strong>${hoursRemaining} saacadood</strong>!`
                : daysRemaining === 0
                  ? `Koorsadaada "<strong>${courseName}</strong>" <strong>maanta</strong> ayay dhamaataysaa!`
                  : `Koorsadaada "<strong>${courseName}</strong>" waxay dhamaataysaa <strong>${daysRemaining} maalmood</strong>.`
            }
          </div>
          
          <p>Si aad u sii waddato koorsada, fadlan bixi lacagta bisha ee <strong>$30</strong>.</p>
          
          <h3>📱 Qaabka Lacag Bixinta:</h3>
          <ul>
            <li><strong>EVC Plus:</strong> 0907790584</li>
            <li><strong>Zaad:</strong> 0907790584</li>
            <li><strong>E-Dahab:</strong> 0907790584</li>
          </ul>
          
          <p>Kadib markii aad lacagta bixiso, nagala soo xiriir WhatsApp: <strong>0907790584</strong></p>
          
          <p>Haddii aadan lacagta bixin, koorsada waa lagaa xiri doonaa marka wakhtigaagu dhamaado.</p>
          
          <p style="text-align: center;">
            <a href="https://appbarbaarintasan.com/" class="cta-button">Gal App-ka 📱</a>
          </p>
          
          <p>Mahadsanid,<br><strong>Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    emailType: "SUBSCRIPTION_REMINDER",
  });
}

export async function sendSubscriptionExpiredEmail(
  email: string,
  customerName: string,
  courseName: string,
): Promise<boolean> {
  const subject = `❌ Koorsadaadi "${courseName}" way dhammaatay`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .cta-button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .expired { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Barbaarintasan Academy</h1>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="expired">
            <strong>❌ Wakhtigaagi koorsada wuu dhammaaday:</strong><br>
            Koorsadaada "<strong>${courseName}</strong>" way xirantahay sababtoo ah wakhtigaagii wuu dhammaaday.
          </div>
          
          <p>Si aad dib ugu furto koorsada, fadlan bixi lacagta bisha ee <strong>$30</strong>.</p>
          
          <h3>📱 Qaabka Lacag Bixinta:</h3>
          <ul>
            <li><strong>EVC Plus:</strong> 0907790584</li>
            <li><strong>Zaad:</strong> 0907790584</li>
            <li><strong>E-Dahab:</strong> 0907790584</li>
          </ul>
          
          <p>Kadib markii aad lacagta bixiso, nagala soo xiriir WhatsApp: <strong>0907790584</strong></p>
          
          <p style="text-align: center;">
            <a href="https://appbarbaarintasan.com/" class="cta-button">Gal App-ka 📱</a>
          </p>
          
          <p>Mahadsanid,<br><strong>Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    emailType: "SUBSCRIPTION_EXPIRED",
  });
}

export async function sendPurchaseConfirmationEmail(
  email: string,
  customerName: string,
  courseName: string,
  planType: string,
  amount: number,
  courseSlug?: string,
): Promise<boolean> {
  const planLabels: Record<string, string> = {
    onetime: "Hal Mar (Lifetime)",
    monthly: "Bilaha",
    yearly: "Sanada",
  };

  const subject = `🎉 Hambalyo! Koorsada "${courseName}" waa laguu fasaxay - Bilow Hadda!`;
  
  const courseUrl = courseSlug 
    ? `https://appbarbaarintasan.com/course/${courseSlug}`
    : "https://appbarbaarintasan.com/";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #dcfce7; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; text-align: center; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #f97316; color: white; padding: 18px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 20px 0; font-size: 18px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .congrats { font-size: 24px; color: #16a34a; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Hambalyo Mahadsanid!</h1>
          <p>Barbaarintasan Academy</p>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="success">
            <p class="congrats">🎊 Koorsada waa laguu fasaxay oo waa kuu furan tahay! 🎊</p>
            <strong>Waad bilaabi kartaa hadda!</strong><br>
            <p style="margin-top: 10px; font-size: 18px;">Guul ayaan kuu rajaynaynaa! 💪</p>
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0;">📚 Koorsadaada:</h3>
            <p><strong>Koorsada:</strong> ${courseName}</p>
            <p><strong>Nooca:</strong> ${planLabels[planType] || planType}</p>
            <p><strong>Lacagta:</strong> $${amount}</p>
          </div>
          
          <p style="text-align: center; font-size: 16px;">Hadda waxaad bilaabi kartaa barashada! Riix button-ka hoose si aad u bilowdo.</p>
          
          <p style="text-align: center;">
            <a href="${courseUrl}" class="cta-button">🚀 Bilow Koorsada Hadda!</a>
          </p>
          
          <p>Haddii aad wax su'aalo ah qabtid, nagala soo xiriir:</p>
          <ul>
            <li>📱 WhatsApp: 0907790584</li>
            <li>📧 Email: info@barbaarintasan.com</li>
          </ul>
          
          <p>Mahadsanid inaad na dooratay,<br><strong>Guruubka Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    emailType: "PURCHASE_CONFIRMATION",
  });
}

export async function sendPaymentPendingEmail(
  email: string,
  customerName: string,
  courseName: string,
  amount: number,
): Promise<boolean> {
  const subject = `⏳ Lacag bixintaadi waan la helay - Waan hubin doonnaa ee sug wax yar!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .pending { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏳ Mahadsanid!</h1>
          <p>Barbaarintasan Academy</p>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="pending">
            <strong>⏳ Lacag bixintaadi waa la helay!</strong><br>
            Waxaan hubinaysaa lacag bixintaada, wax yar sug waan kuu furi doonaa koorsadaada.
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0;">📚 Faahfaahinta Codsigaaga:</h3>
            <p><strong>Koorsada:</strong> ${courseName}</p>
            <p><strong>Lacagta:</strong> $${amount}</p>
          </div>
          
          <p>Inta badana <strong>1-2 saacadood</strong> gudahood ayaan kuu celin doonaa. Marka la ansixiyo email kale ayaad heli doontaa.</p>
          
          <p>Haddii aad wax su'aalo ah qabtid, nagala soo xiriir:</p>
          <ul>
            <li>📱 WhatsApp: 0907790584</li>
            <li>📧 Email: info@barbaarintasan.com</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="https://appbarbaarintasan.com/" class="cta-button">Gal App-ka 📱</a>
          </p>
          
          <p>Mahadsanid inaad na dooratay,<br><strong>Guruubka Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, emailType: "PAYMENT_PENDING" });
}

export async function sendWelcomeEmail(
  email: string,
  customerName: string,
): Promise<boolean> {
  const subject = `🎓 Ku soo dhawoow Barbaarintasan Academy, ${customerName}!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .welcome { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .cta-button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Ku soo dhawoow!</h1>
          <p>Barbaarintasan Academy</p>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="welcome">
            <strong>🎉 Akoonkaaga waa la sameeyay!</strong><br>
            Waad ku mahadsantahay iska diiwaangelintaada Barbaarintasan Academy.
          </div>
          
          <p>Barbaarintasan waa goob waxbarasho oo loogu talagalay waalidka Soomaaliyeed. Waxaan ku siinaysaa:</p>
          <ul>
            <li>📚 Koorsooyinka ugu wanaagsan ee barbaarinta carruurta</li>
            <li>🎥 Muuqaallo faahfaahsan oo Af-Soomaali ah</li>
            <li>📝 Su'aallo iyo hawlgallo waxbarasho</li>
            <li>🎓 Shahaadooyin markii aad dhameysato</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="https://appbarbaarintasan.com/" class="cta-button">Arag Koorsooyinka 📖</a>
          </p>
          
          <p>Mahadsanid,<br><strong>Guruubka Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, emailType: "WELCOME" });
}

export async function sendPasswordResetEmail(
  email: string,
  customerName: string,
  resetToken: string,
): Promise<boolean> {
  const resetBaseUrl = process.env.APP_BASE_URL || "https://appbarbaarintasan.com";
  const resetLink = `${resetBaseUrl}/reset-password/${resetToken}`;
  const subject = `🔐 Password-kaaga cusbooneysii - Barbaarintasan Academy`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .cta-button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password-kaaga cusbooneysii</h1>
          <p>Barbaarintasan Academy</p>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <p>Waxaad codsatay inaad password-kaaga cusbooneysid.</p>
          
          <div class="warning">
            <strong>⏰ Xasuusin Muhiim ah:</strong><br>
            Link-kan wuxuu dhacayaa <strong>1 saac</strong> gudahood. Haddii aanad codsan, iska indha tir email-kan.
          </div>
          
          <p style="text-align: center;">
            <a href="${resetLink}" class="cta-button">Cusbooneysii Password-kaaga 🔑</a>
          </p>
          
          <p>Haddii button-ka aanuu shaqayn, koobi link-kan browser-kaaga:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px; font-size: 12px;">${resetLink}</p>
          
          <p>Mahadsanid,<br><strong>Guruubka Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, emailType: "PASSWORD_RESET" });
}

export async function sendAdminPromotionEmail(
  email: string,
  customerName: string,
): Promise<boolean> {
  const adminUrl = process.env.APP_BASE_URL || "https://appbarbaarintasan.com";
  const adminLink = `${adminUrl}/admin`;
  const subject = `🎉 Hambalyo! Waxaad noqotay Admin - Barbaarintasan Academy`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .cta-button { display: inline-block; background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Hambalyo!</h1>
          <p>Waxaad noqotay Admin</p>
        </div>
        <div class="content">
          <h2>Asalaamu Aleykum ${customerName}! 👋</h2>
          
          <div class="highlight">
            <strong>🔐 Waxaad noqotay Admin!</strong><br>
            Hadda waxaad maamuli kartaa Barbaarintasan Academy.
          </div>
          
          <p>Sidaa Admin ahaan waxaad samayn kartaa:</p>
          <ul>
            <li>📚 Ku dar ama wax ka beddel koorsooyinka</li>
            <li>👥 Maamul waalidka diiwaangashan</li>
            <li>💳 Ansixiso lacagaha la bixiyey</li>
            <li>📊 Arag xogta iyo statistics-ka</li>
          </ul>
          
          <p><strong>Sida loo galo Admin:</strong></p>
          <ol>
            <li>Gal website-ka Barbaarintasan</li>
            <li>Guji link-ka hoose</li>
            <li>Isticmaal email-kaaga iyo password-kaagii hore</li>
          </ol>
          
          <p style="text-align: center;">
            <a href="${adminLink}" class="cta-button">Gal Admin Page 🔑</a>
          </p>
          
          <p>Mahadsanid,<br><strong>Guruubka Barbaarintasan Academy</strong></p>
        </div>
        <div class="footer">
          <p>© 2024 Barbaarintasan Academy. Dhammaan xuquuqaha way dhowran yihiin.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, emailType: "ADMIN_PROMOTION" });
}
