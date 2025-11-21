
// import nodemailer from "nodemailer";

// export const sendEmail = async (options) => {
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     host: "smtp.gmail.com",  // SMTP server address for Gmail
//     secure: true,  // Set to false for TLS (true for SSL)
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   }); 

//   const mailOptions = {
//     from: `FixMate Support <${process.env.EMAIL_USER}>`,
//     to: options.email,
//     subject: options.subject,
//     html: options.message,
//   };

//   await transporter.sendMail(mailOptions);
// };



import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const { email, subject, message } = options;

  if (!email) {
    throw new Error("Recipient email is required");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // MUST be a Gmail App Password
    },
  });

  const mailOptions = {
    from: `FixMate Support <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject || "No subject provided",
    html: message || "<p>No message content</p>",
  };

  const info = await transporter.sendMail(mailOptions);

  return info;
};