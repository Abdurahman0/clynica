import React from 'react'
import ReactDOM from 'react-dom/client'
import { initializeServices } from './services/registry'
import './i18n'
import './styles/tailwind.css'

const configuredBaseUrl = (
	import.meta.env.VITE_API_BASE_URL ||
	import.meta.env.VITE_API_URL ||
	'http://localhost:8000'
).trim()

const useApiProxy =
	import.meta.env.DEV &&
	configuredBaseUrl.length > 0 &&
	import.meta.env.VITE_API_USE_PROXY !== 'false'

const apiBaseUrl = useApiProxy ? window.location.origin : configuredBaseUrl

initializeServices(apiBaseUrl)

try {
	const storedTheme = window.localStorage.getItem('renaissance-clinic-theme')

	if (storedTheme === 'dark' || storedTheme === 'light') {
		document.documentElement.dataset.theme = storedTheme
	}
} catch {
	// Ignore storage access issues and fall back to the default theme.
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

void import('./App').then(({ default: App }) => {
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	)
})
