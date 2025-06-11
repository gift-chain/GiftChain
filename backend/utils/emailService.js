const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendGiftCodeEmail = async (to, { rawCode, token, amount, expiry, message }) => {
  try {
    await transporter.sendMail({
      from: `"GiftChain" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Exclusive GiftChain Code",
      text: `Welcome to GiftChain! Your gift details:\nCode: ${rawCode}\nToken: ${token}\nAmount: ${amount}\nExpiry: ${new Date(expiry).toLocaleString()}\nMessage: ${message || "No message provided."}\nUse this code to unlock your blockchain-powered gift at GiftChain.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <!-- Header with Logo -->
          <div style="text-align: center; padding: 20px; background-color: #ffffff; border-bottom: 2px solid #007bff;">
            <img src="https://via.placeholder.com/150x50?text=GiftChain+Logo" alt="GiftChain Logo" style="max-width: 150px;">
            <h1 style="color: #007bff; font-size: 24px; margin: 10px 0;">Welcome to GiftChain</h1>
          </div>

          <!-- Intro Section -->
          <div style="background-color: #ffffff; padding: 20px; margin-top: 10px; border-radius: 5px;">
            <h2 style="color: #333; font-size: 20px;">Blockchain Gifts Reimagined</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              At GiftChain, we're revolutionizing gifting with blockchain technology. Your unique gift code unlocks a secure, transparent, and exciting gift experience. Thank you for joining us!
            </p>
          </div>

          <!-- Gift Details Section -->
          <div style="background-color: #ffffff; padding: 20px; margin: 10px 0; border-radius: 5px;">
            <h3 style="color: #333; font-size: 18px; margin: 0 0 10px;">Your Gift Details</h3>
            <p style="font-size: 32px; font-weight: bold; color: #007bff; background-color: #e9ecef; padding: 10px 20px; border-radius: 5px; text-align: center; letter-spacing: 2px;">
              ${rawCode}
            </p>
            <p style="color: #555; font-size: 16px; margin: 10px 0;"><strong>Token:</strong> ${token}</p>
            <p style="color: #555; font-size: 16px; margin: 10px 0;"><strong>Amount:</strong> ${amount}</p>
            <p style="color: #555; font-size: 16px; margin: 10px 0;"><strong>Expiry:</strong> ${new Date(expiry).toLocaleString()}</p>
            ${message ? `<p style="color: #555; font-size: 16px; margin: 10px 0;"><strong>Message:</strong> ${message}</p>` : ""}
          </div>

          <!-- Instructions -->
          <div style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              Use this code to redeem your gift on the GiftChain platform. Visit our website <a>https://gift-chain.vercel.app/</a> and enter the code to unlock your blockchain-powered gift. For support, contact us at <a href="mailto:support@giftchain.com" style="color: #007bff; text-decoration: none;">support@giftchain.com</a>.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; font-size: 14px; color: #777;">
            <p>© ${new Date().getFullYear()} GiftChain. All rights reserved.</p>
            <p><a href="https://giftchain.com" style="color: #007bff; text-decoration: none;">Visit GiftChain</a> | <a href="mailto:support@giftchain.com" style="color: #007bff; text-decoration: none;">Contact Us</a></p>
          </div>
        </div>
      `,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email to ${to}`);
  }
};

module.exports = { sendGiftCodeEmail };