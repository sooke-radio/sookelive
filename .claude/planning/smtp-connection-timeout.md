# SMTP connection timeout (Nodemailer transport verify fails)

Status: diagnosed, not fixed. Branch: `fix-nodemailer-error`.

## Symptom
`Error verifying Nodemailer transport.` with `ETIMEDOUT` / `command: 'CONN'` in logs.
Occurs on dev (cc-container), stg and prd, so the site cannot send email.

## Diagnosis
- Connection timeout, not auth/config: `src/plugins/mailer.ts` reads `SMTP_*` env correctly.
- `smtp.mailgun.org` resolves, but TCP connects to 25, 465, 587 and 2525 all time out
  from the dev container. Outbound SMTP is blocked at the network level.
- stg/prd show the same error, so the same block is likely there (host firewall,
  provider egress policy, or Docker network rules).

## Fix A: open outbound SMTP (no code change)
Allow **outbound TCP** to `smtp.mailgun.org` (allow by port, IPs change). Nothing inbound.

| Env | `SMTP_PORT` | Mode |
|---|---|---|
| prd | 587 | STARTTLS |
| stg | 2525 | STARTTLS (alt port for hosts blocking 587) |

Also valid: 25 (STARTTLS), 465 (implicit TLS).

Where: provider firewall/security group, host firewall (ufw/firewalld/iptables).
Many VPS providers block outbound 25 (sometimes 465/587) by default; 2525 is the usual workaround.

Verify from the host **and** inside the container (Docker rules can differ):
```bash
nc -vz -w 5 smtp.mailgun.org 587
nc -vz -w 5 smtp.mailgun.org 2525
docker compose exec sookelive-payload sh   # repeat inside
```
If one port connects, set `SMTP_PORT` to it in `.env.stg`/`.env.prd`.

## Fix B: Mailgun HTTP API over 443 (if no SMTP port can be opened)
- Replace nodemailer transport with a custom Payload email adapter
  (`name`, `defaultFromAddress`, `defaultFromName`, `sendEmail`) that POSTs to
  `https://api.mailgun.net/v3/<domain>/messages` (EU region: `api.eu.mailgun.net`).
  Alternative: keep `@payloadcms/email-nodemailer` + `nodemailer-mailgun-transport`.
- Env: drop `SMTP_HOST/PORT/USER/PASS`; add `MAILGUN_API_KEY`, domain, region.
  Update `.env.example`, `.env.stg`, `.env.prd` and the GitHub secrets used by deploy.yml.
- No startup verify handshake, so the log noise/cold-init stalls go away; but
  misconfig only surfaces on send, so log errors from `sendEmail`.
- Same Mailgun account/domain/DKIM; Payload auth emails only need to/subject/html/text.
- Add an msw mock for the Mailgun endpoint if any int test sends mail.

## Optional: dev noise
Add `skipVerify` or a log-only transport fallback in `mailer.ts` for dev so the
blocked-egress error doesn't spam logs. This does not make email send.

## Decision
Try Fix A first (confirm with `nc` on stg/prd). Go to Fix B only if the provider
will not allow any SMTP port.
