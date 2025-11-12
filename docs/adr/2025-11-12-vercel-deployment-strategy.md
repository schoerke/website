# ADR: Vercel Deployment Strategy for Next.js/Payload Monorepo

**Status:** Accepted

## Context

The project consists of a monorepo containing a Next.js frontend and a Payload CMS backend. The goal is to optimize for
cost, maintain preview deployments, and avoid unnecessary complexity. Vercel offers the best integration and developer
experience for Next.js and Payload CMS, but its Free plan only supports repositories owned by personal GitHub accounts,
not organization accounts. The current repository is in a GitHub organization, which would require a Vercel Pro
subscription to deploy.

## Decision

Move the repository from the GitHub organization to a personal GitHub account. This enables continued use of Vercel’s
Free plan, including production and preview deployments, without incurring additional costs or losing core features. The
Vercel project will be updated to point to the new repository location.

## Consequences

**Positive:**

- No additional hosting costs (remain on Vercel Free plan)
- Seamless integration with Next.js and Payload CMS
- Retain preview deployments and production deploys
- Simpler workflow, no need to migrate to a new platform

**Negative:**

- Lose GitHub organization-level features (e.g., org permissions, team management)
- If team collaboration or org-level features are needed in the future, may require moving back to an org and upgrading
  to Vercel Pro

## Alternatives Considered

- **Cloudflare Pages:** Not compatible with full Payload CMS backend (no Node.js server support)
- **Railway/Render:** Support org repos and Node.js, but less integrated with Next.js/Payload and may introduce cold
  starts or other workflow changes
- **Vercel Pro:** Allows org repos but incurs monthly cost
- **Manual Deploys/Other Hosts:** More complex, lose Vercel’s seamless preview/production workflow
