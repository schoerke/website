# GDPR-Compliant Tracking Design for Next.js App Router

- **Date:** 2025-11-11
- **Status**: Draft

## Overview

This document describes the design and implementation plan for GDPR-compliant analytics, error monitoring, and custom
event tracking in a Next.js (App Router) project using Google Analytics (GA4), Sentry, and Cookiebot. All sensitive IDs
and keys are managed via environment variables.

---

## Goals

- Analytics (Google Analytics/GA4) with custom events
- Error monitoring (Sentry)
- Strict GDPR compliance: explicit consent, data minimization, opt-out, and clear documentation
- No tracking before user consent
- All configuration via environment variables

---

## 1. Environment Variable Setup

Create a `.env.local` file (not committed) and a `.env.local.example` (committed, no secrets):

```env
# .env.local.example
NEXT_PUBLIC_COOKIEBOT_ID=
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## 2. `src/app/layout.tsx` (Cookiebot & Google Analytics)

```tsx
// src/app/layout.tsx
import SentryConsentInit from '../components/SentryConsentInit'

export default function RootLayout({ children }) {
  const cookiebotId = process.env.NEXT_PUBLIC_COOKIEBOT_ID
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID

  return (
    <html lang="en">
      <head>
        {/* Cookiebot */}
        <script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid={cookiebotId}
          data-blockingmode="auto"
          type="text/javascript"
          async
        />
        {/* Google Analytics (blocked until consent) */}
        <script
          type="text/plain"
          data-cookieconsent="statistics"
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
        />
        <script
          type="text/plain"
          data-cookieconsent="statistics"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', { anonymize_ip: true });
            `,
          }}
        />
      </head>
      <body>
        {children}
        {/* Sentry consent-aware init */}
        <SentryConsentInit />
      </body>
    </html>
  )
}
```

---

## 3. `src/components/SentryConsentInit.tsx` (Consent-Aware Sentry Init)

```tsx
'use client'

import { useEffect } from 'react'

export default function SentryConsentInit() {
  useEffect(() => {
    function initSentry() {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          // ...other Sentry config as needed
        })
      })
    }

    function checkConsent() {
      if (typeof window !== 'undefined' && window.Cookiebot && window.Cookiebot.consents.statistics) {
        initSentry()
      }
    }

    window.addEventListener('CookiebotOnAccept', checkConsent)
    checkConsent()

    return () => {
      window.removeEventListener('CookiebotOnAccept', checkConsent)
    }
  }, [])

  return null
}
```

---

## 4. `src/utils/trackEvent.ts` (Consent-Aware Custom Event Utility)

```typescript
// src/utils/trackEvent.ts
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    Cookiebot?: { consents: { statistics: boolean } }
  }
}

/**
 * Tracks a custom event in Google Analytics, only if user has given consent.
 * @param eventName - The name of the event (e.g., 'signup_button_click')
 * @param params - Additional event parameters (e.g., { method: 'Google' })
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && window.Cookiebot?.consents.statistics) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }
  }
}
```

---

## 5. Example Usage in a Component

```tsx
// src/components/SignupButton.tsx
'use client'

import { trackEvent } from '../utils/trackEvent'

const SignupButton: React.FC = () => {
  const handleClick = () => {
    trackEvent('signup_button_click', { method: 'Google', location: 'header' })
    // ...other signup logic
  }

  return <button onClick={handleClick}>Sign up with Google</button>
}

export default SignupButton
```

---

## 6. Implementation Checklist

- [ ] Add `.env.local` with real values (never commit secrets)
- [ ] Add `.env.local.example` to repo
- [ ] Add Cookiebot script to `layout.tsx` using env variable
- [ ] Add GA4 scripts to `layout.tsx` using env variable and Cookiebot consent
- [ ] Add `SentryConsentInit` to `layout.tsx` and implement consent-aware Sentry init
- [ ] Use `trackEvent` utility for all custom events
- [ ] Test: No tracking before consent, tracking works after consent, no PII sent

---

**End of design.**
