import * as nodemailer from 'nodemailer';

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(options, logger) {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: options.emailServer,
    port: options.emailMode === "ssl" ? 465 : 25,  // 587
    secure: options.emailMode === "ssl", // true for 465, false for other ports
    auth: {
      user: "",
      pass: ""
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: options.emailSender, // sender address
    to: options.emailRecip, // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  logger.success("Message sent: %s", info.messageId);
}
