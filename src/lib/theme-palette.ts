export type ThemeMode = 'light' | 'dark'

type Rgb = readonly [number, number, number]

interface PaletteColors {
	primary: string
	accent: string
	highlight: string
}

export interface ThemePalette {
	'--color-primary': string
	'--color-primary-foreground': string
	'--color-primary-accent': string
	'--color-primary-soft': string
	'--color-primary-strong': string
	'--color-text-accent': string
	'--color-border-accent': string
	'--color-theme-highlight': string
}

const PRESET_PALETTES: Record<string, Record<ThemeMode, PaletteColors>> = {
	'#6366f1': {
		light: { primary: '#7c3aed', accent: '#db2777', highlight: '#0891b2' },
		dark: { primary: '#38bdf8', accent: '#a78bfa', highlight: '#f0abfc' },
	},
	'#0f766e': {
		light: { primary: '#0369a1', accent: '#4f46e5', highlight: '#7c3aed' },
		dark: { primary: '#5eead4', accent: '#7dd3fc', highlight: '#c4b5fd' },
	},
	'#059669': {
		light: { primary: '#0f766e', accent: '#2563eb', highlight: '#0891b2' },
		dark: { primary: '#6ee7b7', accent: '#67e8f9', highlight: '#93c5fd' },
	},
	'#c2418c': {
		light: { primary: '#9333ea', accent: '#e11d48', highlight: '#4f46e5' },
		dark: { primary: '#f0abfc', accent: '#fda4af', highlight: '#c4b5fd' },
	},
	'#d97706': {
		light: { primary: '#c2410c', accent: '#dc2626', highlight: '#7c3aed' },
		dark: { primary: '#fda4af', accent: '#fcd34d', highlight: '#c4b5fd' },
	},
	'#475569': {
		light: { primary: '#2563eb', accent: '#7c3aed', highlight: '#0891b2' },
		dark: { primary: '#60a5fa', accent: '#a78bfa', highlight: '#67e8f9' },
	},
}

function hexToRgb(hexColor: string): Rgb {
	const normalized = hexColor.replace('#', '')
	return [
		Number.parseInt(normalized.slice(0, 2), 16),
		Number.parseInt(normalized.slice(2, 4), 16),
		Number.parseInt(normalized.slice(4, 6), 16),
	]
}

function rgbToHsl([red, green, blue]: Rgb): [number, number, number] {
	const r = red / 255
	const g = green / 255
	const b = blue / 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const lightness = (max + min) / 2

	if (max === min) {
		return [215, 0.58, lightness]
	}

	const delta = max - min
	const saturation = delta / (1 - Math.abs(2 * lightness - 1))
	let hue = 0

	if (max === r) hue = 60 * (((g - b) / delta) % 6)
	else if (max === g) hue = 60 * ((b - r) / delta + 2)
	else hue = 60 * ((r - g) / delta + 4)

	return [(hue + 360) % 360, saturation, lightness]
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
	const segment = hue / 60
	const secondary = chroma * (1 - Math.abs((segment % 2) - 1))
	const [r1, g1, b1] =
		segment < 1 ? [chroma, secondary, 0]
			: segment < 2 ? [secondary, chroma, 0]
				: segment < 3 ? [0, chroma, secondary]
					: segment < 4 ? [0, secondary, chroma]
						: segment < 5 ? [secondary, 0, chroma]
							: [chroma, 0, secondary]
	const match = lightness - chroma / 2

	return [
		Math.round((r1 + match) * 255),
		Math.round((g1 + match) * 255),
		Math.round((b1 + match) * 255),
	]
}

function mix(color: Rgb, target: Rgb, targetWeight: number): Rgb {
	return [
		Math.round(color[0] * (1 - targetWeight) + target[0] * targetWeight),
		Math.round(color[1] * (1 - targetWeight) + target[1] * targetWeight),
		Math.round(color[2] * (1 - targetWeight) + target[2] * targetWeight),
	]
}

function toChannels(color: Rgb): string {
	return color.join(' ')
}

function createFallbackPalette(backgroundColor: string, mode: ThemeMode): Record<keyof PaletteColors, Rgb> {
	const [hue, saturation] = rgbToHsl(hexToRgb(backgroundColor))
	const primaryHue = (hue + (mode === 'light' ? 28 : -28) + 360) % 360
	const accentHue = (hue + (mode === 'light' ? -38 : 42) + 360) % 360
	const highlightHue = (hue + 70) % 360
	const themeSaturation = Math.max(saturation, mode === 'light' ? 0.62 : 0.7)

	return {
		primary: hslToRgb(primaryHue, themeSaturation, mode === 'light' ? 0.4 : 0.7),
		accent: hslToRgb(accentHue, themeSaturation, mode === 'light' ? 0.48 : 0.74),
		highlight: hslToRgb(highlightHue, themeSaturation, mode === 'light' ? 0.43 : 0.72),
	}
}

function normalizePaletteColors(colors: PaletteColors): Record<keyof PaletteColors, Rgb> {
	return {
		primary: colors.primary.startsWith('#') ? hexToRgb(colors.primary) : hexToRgb(`#${colors.primary}`),
		accent: colors.accent.startsWith('#') ? hexToRgb(colors.accent) : hexToRgb(`#${colors.accent}`),
		highlight: colors.highlight.startsWith('#') ? hexToRgb(colors.highlight) : hexToRgb(`#${colors.highlight}`),
	}
}

export function createThemePalette(backgroundColor: string, mode: ThemeMode): ThemePalette {
	const normalizedBackground = backgroundColor.toLowerCase()
	const configured = PRESET_PALETTES[normalizedBackground]?.[mode]
	const colors = configured
		? normalizePaletteColors(configured)
		: createFallbackPalette(normalizedBackground, mode)

	const foreground: Rgb = mode === 'light' ? [255, 255, 255] : [15, 23, 42]
	const soft = mix(colors.primary, mode === 'light' ? [255, 255, 255] : [10, 14, 23], mode === 'light' ? 0.82 : 0.66)
	const strong = mix(colors.primary, mode === 'light' ? [0, 0, 0] : [255, 255, 255], mode === 'light' ? 0.16 : 0.12)
	const border = mix(colors.primary, mode === 'light' ? [255, 255, 255] : [10, 14, 23], mode === 'light' ? 0.58 : 0.28)

	return {
		'--color-primary': toChannels(colors.primary),
		'--color-primary-foreground': toChannels(foreground),
		'--color-primary-accent': toChannels(colors.accent),
		'--color-primary-soft': toChannels(soft),
		'--color-primary-strong': toChannels(strong),
		'--color-text-accent': toChannels(colors.primary),
		'--color-border-accent': toChannels(border),
		'--color-theme-highlight': toChannels(colors.highlight),
	}
}
