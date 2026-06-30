import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getRouteByPathname } from '../config/routes'
import { useAuth } from '../auth'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'
import { createThemePalette } from '../lib/theme-palette'

function isHexColor(value: string | undefined): value is string {
  return Boolean(value && /^#?[0-9a-f]{6}$/i.test(value));
}

function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!isHexColor(value)) {
    return fallback;
  }

  return value.startsWith('#') ? value : `#${value}`;
}

function hexToRgba(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function AppShell() {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light',
  )
  const location = useLocation()

  useEffect(() => {
    if (!isSidebarOpen) {
      return
    }

    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches) {
      return
    }

    setIsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    const syncThemeMode = () =>
      setThemeMode(root.dataset.theme === 'dark' ? 'dark' : 'light')

    syncThemeMode()

    const observer = new MutationObserver(syncThemeMode)
    observer.observe(root, {
      attributeFilter: ['data-theme'],
      attributes: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const currentRoute = useMemo(
    () => getRouteByPathname(location.pathname),
    [location.pathname],
  )
  const isChatRoute = currentRoute?.id === 'chats'
  const showTopbarRouteMeta =
    currentRoute?.id === 'chats' || currentRoute?.id === 'dashboard'
  const shellAccentColor = normalizeHexColor(currentUser?.color, '#6366f1')
  const isDarkTheme = themeMode === 'dark'

  useLayoutEffect(() => {
    const root = document.documentElement
    const palette = createThemePalette(shellAccentColor, themeMode)
    const previousValues = Object.fromEntries(
      Object.keys(palette).map(property => [property, root.style.getPropertyValue(property)]),
    )

    Object.entries(palette).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    return () => {
      Object.entries(previousValues).forEach(([property, value]) => {
        if (value) root.style.setProperty(property, value)
        else root.style.removeProperty(property)
      })
    }
  }, [shellAccentColor, themeMode])

  const shellBackgroundStyle = useMemo(
    () => ({
      backgroundImage: isDarkTheme
        ? [
            `radial-gradient(circle at 12% -6%, ${hexToRgba(shellAccentColor, 0.34)}, transparent 28%)`,
            `radial-gradient(circle at 86% 8%, ${hexToRgba(shellAccentColor, 0.24)}, transparent 24%)`,
            `radial-gradient(circle at 50% 100%, ${hexToRgba(shellAccentColor, 0.14)}, transparent 34%)`,
            'linear-gradient(180deg, rgba(4,8,15,0.98), rgba(8,12,20,0.96) 52%, rgba(6,10,18,0.98))',
          ].join(', ')
        : [
            `radial-gradient(circle at 10% -10%, ${hexToRgba(shellAccentColor, 0.24)}, transparent 30%)`,
            `radial-gradient(circle at 92% 6%, ${hexToRgba(shellAccentColor, 0.18)}, transparent 26%)`,
            `radial-gradient(circle at 50% 100%, ${hexToRgba(shellAccentColor, 0.12)}, transparent 38%)`,
            'linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.96) 54%, rgba(236,242,248,0.98))',
          ].join(', '),
    }),
    [isDarkTheme, shellAccentColor],
  )

  return (
    <div
      className="app-shell--nova relative flex h-dvh w-full overflow-hidden bg-background-default"
      style={shellBackgroundStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage: isDarkTheme
            ? [
                `radial-gradient(circle at 18% 16%, ${hexToRgba(shellAccentColor, 0.16)}, transparent 18%)`,
                `radial-gradient(circle at 82% 22%, ${hexToRgba(shellAccentColor, 0.12)}, transparent 16%)`,
              ].join(', ')
            : [
                `radial-gradient(circle at 16% 14%, ${hexToRgba(shellAccentColor, 0.14)}, transparent 18%)`,
                `radial-gradient(circle at 84% 20%, ${hexToRgba(shellAccentColor, 0.1)}, transparent 16%)`,
              ].join(', '),
        }}
      />
      <div
        className={[
          'fixed inset-0 z-40 bg-background-overlay transition-opacity duration-base min-[960px]:hidden',
          isSidebarOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
      />

      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="relative flex h-dvh min-w-0 w-full flex-1 flex-col overflow-hidden bg-transparent">
        <AppTopbar
          title={
            currentRoute
              ? t(`routes.${currentRoute.id}.title`, { defaultValue: currentRoute.title })
              : t('common.appName')
          }
          subtitle={
            currentRoute
              ? t(`routes.${currentRoute.id}.description`, {
                  defaultValue: currentRoute.description,
                })
              : ''
          }
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
          onRefreshCurrentPage={() => setRefreshCounter((current) => current + 1)}
          showRouteMeta={showTopbarRouteMeta}
        />

        <main
          className={[
            'app-content-scroll--nova relative flex-1 overscroll-contain',
            isChatRoute
              ? 'overflow-hidden min-[1024px]:overflow-y-auto'
              : 'overflow-y-auto',
          ].join(' ')}
        >
          <div
            className={[
              'relative',
              isChatRoute
                ? 'h-full px-0 py-0 min-[960px]:px-7 min-[960px]:pb-8 min-[960px]:pt-4'
                : 'px-3 pb-5 pt-3 min-[640px]:px-4 min-[640px]:pb-6 min-[640px]:pt-4 min-[960px]:px-7 min-[960px]:pb-8 min-[960px]:pt-4',
            ].join(' ')}
          >
          <div
            className={['mx-auto w-full max-w-page min-w-0', isChatRoute ? 'h-full' : ''].join(' ')}
          >
            <Outlet key={`${location.pathname}:${refreshCounter}`} />
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppShell
