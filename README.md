# Quidly

A job board where every application gets an answer. Companies put down a refundable $5 deposit for each applicant. If they don't reply within 72 hours, that $5 goes to the candidate through PayPal.

**Live site:** https://quidly-theta.vercel.app

PayPal runs in sandbox mode, so no real money moves. Judges: the sandbox logins are in the Devpost testing instructions.

## How it works

**For companies**
1. Set up a company profile. Quidly checks it automatically before you can post.
2. Post a role and pay through PayPal: a $49 listing fee plus $5 for each applicant spot.
3. Answer each applicant within 72 hours, with feedback or an interview invite. When you close the role, the unused deposit is refunded.

**For job seekers**
1. Log in with PayPal and upload a resume.
2. Apply with a $2 PayPal hold. Nothing is charged. You can have 5 applications open at once.
3. You get an answer, or $5.

| What happens | The candidate's $2 hold | The company's $5 |
|---|---|---|
| Feedback that passes the AI checks | Released | Kept for the refund |
| Interview invite, then the candidate confirms it | Released | Kept for the refund |
| Candidate reports the invite as not genuine | Stays on hold | Stays locked |
| No reply in 72 hours | Released | Paid to the candidate |

## What's inside

**PayPal (sandbox)**
- **Log In with PayPal:** each account is tied to a PayPal identity, which makes fake sign-ups harder.
- **Orders v2, capture:** the company pays the listing fee and deposit in one payment.
- **Orders v2, authorize and void:** the candidate's $2 hold, released once the company answers.
- **Payouts:** sends the candidate $5 when the company doesn't reply in time. Each payout has a fixed batch ID, so a retry can't pay twice.
- **Refunds:** returns the unused deposit when a role closes.

**Elastic (AI)**
- **Feedback checks:** a rejection is blocked if it reads like a template (semantic search against known form rejections). It is also blocked if it isn't written as real sentences, or isn't about this resume and role (embedding similarity).
- **Match score:** each resume is compared with the role when someone applies, so companies can see the strongest applicants first.

**AG Grid**
- **The reply queue:** the company's reply queue, sorted by deadline and match. It has live countdowns, rows that turn amber and then red as a deadline gets close, status changes that flash, and a live "Deposit at risk" counter.

**Stack**
- **Website:** Next.js on Vercel, in `web/`.
- **API:** Fastify and TypeScript on Render, in `api/`. A deadline checker runs every 2 seconds and handles holds, payouts and their retries.
- **Database:** Postgres with Drizzle. Tests run on PGlite with Vitest.

## Run it locally

You need Node 26, a Postgres database, PayPal sandbox app keys and an Elastic Cloud deployment.

```sh
# API
cd api
cp .env.example .env   # fill in the values
npm install
npm run dev            # runs migrations, adds the sample companies, starts the deadline checker
npm test

# Website
cd web
npm install
API_URL=http://localhost:4000 npm run dev
```

Log In with PayPal returns to the URL set in your PayPal app, so logging in locally needs that URL to point at your machine.

### Demo Mode
With `DEMO_MODE_ENABLED=true`, a job seeker can apply with a 90-second reply window instead of 72 hours. A company can also move any open application to its last 45 seconds with "Skip to 45s" in the reply queue. That lets you watch the $5 payout happen without waiting 3 days.

## License

MIT
