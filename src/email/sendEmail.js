const { transport } = require("../vendor/nodemailer");

module.exports = mailResponse = async ({ recipient, subject, template }) =>
  await transport.sendMail({
    from: "service@beowulf.com",
    to: recipient,
    subject: subject,
    html: template,
  });
