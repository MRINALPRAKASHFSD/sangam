import { useEffect } from 'react'
import { useMe } from './auth'

const KEY = 'sangam.theme'
type Theme = 'dark' | 'light' | 'system'

export function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f7f6fb' : '#07060B')
  localStorage.setItem(KEY, theme)
}

applyTheme((localStorage.getItem(KEY) as Theme | null) ?? 'dark')

const RTL = new Set(['ur'])

/** Keeps <html> theme, lang and dir in sync with the signed-in user's preferences. */
export function ThemeSync() {
  const { data } = useMe()
  const theme = data?.prefs.theme as Theme | undefined
  const lang = data?.prefs.language
  useEffect(() => { if (theme) applyTheme(theme) }, [theme])
  useEffect(() => {
    if (!lang) return
    document.documentElement.lang = lang
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr'
  }, [lang])
  return null
}
