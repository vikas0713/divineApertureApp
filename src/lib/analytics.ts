type AnalyticsValue = string | number | boolean

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
let enabled = false

export function initializeAnalytics() {
  if (!measurementId || enabled) return
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
  enabled = true
}

export function track(eventName: string, parameters: Record<string, AnalyticsValue> = {}) {
  if (!enabled || !window.gtag) return
  window.gtag('event', eventName, parameters)
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
