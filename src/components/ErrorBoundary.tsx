'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, info)
    }
    // TODO: Integrate with error tracking service (e.g. Sentry)
    // Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen&nbsp;/&nbsp;Something went wrong</h1>
              <p className="mt-2">Bitte laden Sie die Seite neu.&nbsp;/&nbsp;Please reload the page.</p>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
