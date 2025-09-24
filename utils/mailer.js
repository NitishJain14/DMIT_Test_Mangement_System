const nodemailer = require("nodemailer");

// Create transporter (reusable)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // from .env
    pass: process.env.EMAIL_PASS, // from .env
  },
});

// Reusable send email function
async function sendEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Email send error:", error);
    throw error;
  }
}

// Specific template: Welcome Email
async function sendWelcomeEmail({ to, name, email, password, special_id, role, creatorName }) {
  const subject = `Welcome! Your ${role} account is ready`;
  const html = `
    <h3>Hello ${name},</h3>
    <p>Your account has been created successfully. Here are your details:</p>
    <ul>
      <li><b>Email:</b> ${email}</li>
      <li><b>Special ID:</b> ${special_id}</li>
      <li><b>Password:</b> ${password}</li>
      <li><b>Role:</b> ${role}</li>
      <li><b>Created By:</b> ${creatorName}</li>
    </ul>
    <p>You can now login using these credentials.</p>
  `;

  return await sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendWelcomeEmail };
