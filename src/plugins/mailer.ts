
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
      // Nodemailer's defaults (2min connect, 10min socket) mean an
      // unreachable/blocked SMTP host stalls every cold Payload init
      // (e.g. one per static-generation worker) for minutes. Fail fast
      // instead - a slow real SMTP server isn't the case we need to
      // tolerate here.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  })
