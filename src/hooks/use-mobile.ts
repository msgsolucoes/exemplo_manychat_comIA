import * as React from "react"

const MOBILE_BREAKPOINT = 768

const getSnapshot = () =>
  typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false

const getServerSnapshot = () => false

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {}
  }

  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)

  return () => mql.removeEventListener("change", onStoreChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
