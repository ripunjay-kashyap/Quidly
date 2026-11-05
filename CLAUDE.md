# Quidly

Guaranteed-response job board for a hackathon, built around PayPal.

## Read First
Local developer docs, not tracked in git:
- `docs/implementation-plan.md`: stack, deployment, money rules, schedule and cut list
- `docs/roughplan.md`: product spec, outcomes, data model, endpoints and demo script

## Layout
- `web/`: Next.js frontend on Vercel. Read `web/AGENTS.md` before changing it.
- `api/`: Fastify backend and deadline poller on Render.

## Commands
- Backend: `cd api && npm run dev`, `npm run typecheck`
- Frontend: `cd web && npm run dev`, `npm run build`
- PayPal sandbox test: `cd api && npm run spike:paypal`

## Rules
- Build for the demo script, and don't build roadmap items.
- Follow the money rules in the implementation plan.
- Use PayPal sandbox only, and never commit secrets.
