// // src/utils/sendEmail.js
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

export const sendEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password, not your real Gmail password
      },
    });

    const mailOptions = {
      from: `FixMate Support <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: message,
    };

    await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(info);
        }
      });
    });

    return res.status(200).json({ message: "Email sent successfully" });

  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({
      message: "Failed to send email",
      error: error.message,
    });
  }
};