# Domain Email + Contact Delivery Checklist

Use this checklist when enabling production contact delivery via Resend.

## 1) Domain Setup

- Choose a sender subdomain (recommended: `mail.getmediatools.com`).
- Add Resend-provided DNS records:
- SPF `TXT`
- DKIM `CNAME` records
- Return-Path / tracking records if required
- Verify domain status in Resend dashboard.

## 2) Inbound / Support Inbox

- Create a support mailbox (for example `support@getmediatools.com`).
- Configure forwarding or mailbox hosting so your team can read replies.
- Confirm DMARC policy for the root domain (recommended starting point: `p=none` then tighten).

## 3) Backend Environment Variables

Set on the API runtime:

- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL` (for example `GetMediaTools <hello@mail.getmediatools.com>`)
- `CONTACT_TO_EMAIL` (for example `support@getmediatools.com`)
- `CLOUDFLARE_TURNSTILE_SECRET`
- `REDIS_URL`

## 4) Frontend Environment Variables

Set on the frontend runtime:

- `PUBLIC_API_URL`
- `PUBLIC_TURNSTILE_SITE_KEY`

## 5) Verification

- Submit one test message from the legal contact page.
- Confirm:
- Turnstile challenge is required.
- Message appears in support inbox.
- `Reply-To` points to the submitter email.
- Rate limiting returns `429` after threshold.

## 6) Monitoring

- Track contact endpoint status codes and rate-limit hits.
- Alert on sustained spikes in `429`, `5xx`, or Turnstile verification failures.
