import nodemailer from 'nodemailer'
import { config } from "dotenv";

config();

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
})

export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export const sendVerificationEmail = async (email, otp, context = 'verification') => {
  const isPasswordReset = context === 'password-reset';
  
  const mailOptions = {
    from: 'noreply@goonchan.org',
    to: email,
    subject: isPasswordReset ? 'Reset Your Goonchan Password' : 'Verify Your Goonchan Account',
    text: `Your ${isPasswordReset ? 'password reset' : 'verification'} code is: ${otp}\nThis code will expire in 1 hour.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://goonchan.org/logo.png" alt="Goonchan Logo" style="max-width: 150px; height: auto;" onerror="this.style.display='none'">
        </div>
        
        <div style="background-color: white; border-radius: 8px; padding: 25px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #333; font-size: 24px; margin-top: 0; text-align: center; margin-bottom: 20px;">
            ${isPasswordReset ? 'Reset Your Password' : 'Welcome to Goonchan!'}
          </h2>
          
          <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px; text-align: center;">
            ${isPasswordReset ? 
              'We received a request to reset your password. Use the code below to complete the process:' : 
              'Please verify your email address with the code below:'}
          </p>
          
          <div style="background-color: #f2f2f2; padding: 15px; border-radius: 6px; font-size: 28px; text-align: center; letter-spacing: 8px; font-weight: bold; margin: 25px 0; color: #333; border-left: 4px solid #7e57c2;">
            ${otp}
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 5px; text-align: center;">
            This code will expire in 1 hour.
          </p>
          
          <p style="color: #888; font-size: 13px; line-height: 1.5; text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
            ${isPasswordReset ? 
              'If you did not request a password reset, please ignore this email or contact support if you have concerns.' : 
              'If you didn\'t create an account, you can safely ignore this email.'}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Goonchan. All rights reserved.</p>
          <p style="margin-top: 5px;">
            <a href="https://goonchan.org/privacy" style="color: #7e57c2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
            <a href="https://goonchan.org/terms" style="color: #7e57c2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
          </p>
        </div>
      </div>
    `
  }

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email sending error:', error)
        reject(error)
      } else {
        console.log('Verification email sent:', info.response)
        resolve(info)
      }
    })
  })
}