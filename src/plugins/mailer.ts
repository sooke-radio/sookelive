
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import nodemailer from 'nodemailer'

// console.log('SMTP_HOST', process.env.SMTP_HOST)
// console.log('SMTP_PORT', process.env.SMTP_PORT)

export default nodemailerAdapter({
    defaultFromAddress: 'mailer@sookeradio.ca',
    defaultFromName: 'Sooke Radio Society',
    transport: await nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }),
  })
