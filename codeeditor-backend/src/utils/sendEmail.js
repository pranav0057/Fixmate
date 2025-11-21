// src/utils/sendEmail.js
import nodemailer from "nodemailer";
export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",  // Gmail is used as the SMTP service
    host: "smtp.gmail.com",  // SMTP server address for Gmail
    port: 587,  // Port for TLS
    secure: false,  // Set to false for TLS (true for SSL)
    auth: {
      user: process.env.EMAIL_USER,  // Your Gmail email
      pass: process.env.EMAIL_PASS,  // Your App Password
    },
    tls: {
      rejectUnauthorized: false,  // Allow to bypass unauthorized certificates (if needed)
    },
  });

  const mailOptions = {
    from: `FixMate Support <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};