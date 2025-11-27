// import nodemailer from "nodemailer";

// export const sendEmail = async (options) => {
//   const transporter = nodemailer.createTransport({
//     port: 465,
//     host: "smtp.gmail.com",  
//     secure: true,  
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//     secure:true,
//   }); 

//   await new Promise((resolve, reject) => {
//     transporter.verify(function (error, success) {
//         if (error) {
//             console.log(error);
//             reject(error);
//         } else {
//             console.log("Server is ready to take our messages");
//             resolve(success);
//         }
//     });
// });

//   const mailOptions = {
//     from: `FixMate Support <${process.env.EMAIL_USER}>`,
//     to: options.email,
//     subject: options.subject,
//     html: options.message,
//   };

//   await new Promise((resolve, reject) => {
//     transporter.sendMail(mailOptions, (err, info) => {
//         if (err) {
//             console.error(err);
//             reject(err);
//         } else {
//             console.log(info);
//             resolve(info);
//         }
//     });
// });
  
// };
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  // 1. Create the transporter (Connects to Brevo)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `FixMate Support <${process.env.SMTP_FROM}>`, // Shows as: FixMate Support <fixmate@gmail.com>
    to: options.email,
    subject: options.subject,
    html: options.message, // HTML content
  };

  // 3. Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully. ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // Throwing error so your controller knows it failed
    throw new Error("Email could not be sent");
  }
};