import type { ThemeDescriptor } from '../types'

const weatherLabels: Record<number, string> = {
  0: 'Ясно',
  1: 'Преимущественно ясно',
  2: 'Переменная облачность',
  3: 'Пасмурно',
  45: 'Туман',
  48: 'Туман с изморозью',
  51: 'Слабая морось',
  53: 'Морось',
  55: 'Сильная морось',
  61: 'Небольшой дождь',
  63: 'Дождь',
  65: 'Ливень',
  71: 'Небольшой снег',
  73: 'Снег',
  75: 'Сильный снег',
  80: 'Ливневый дождь',
  95: 'Гроза',
}

export const getWeatherLabel = (code: number) => weatherLabels[code] ?? 'Переменная погода'

export const describeTheme = (
  code = 0,
  isDay = true,
): ThemeDescriptor => {
  if (code >= 95) {
    return { name: 'storm', title: 'Грозовой фронт', icon: '⛈️' }
  }

  if ([71, 73, 75].includes(code)) {
    return { name: 'snow', title: 'Снежный день', icon: '❄️' }
  }

  if ([51, 53, 55, 61, 63, 65, 80].includes(code)) {
    return { name: 'rain', title: 'Дождевой ритм', icon: '🌧️' }
  }

  if ([2, 3, 45, 48].includes(code)) {
    return { name: 'clouds', title: 'Облачный горизонт', icon: '☁️' }
  }

  return {
    name: 'clear',
    title: isDay ? 'Солнечная сцена' : 'Ночной воздух',
    icon: isDay ? '☀️' : '🌙',
  }
}

export const formatUpdatedAt = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))

export const formatHour = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))

export const formatDay = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(new Date(value))

export const formatCityLabel = (admin1?: string, country?: string) =>
  [admin1, country].filter(Boolean).join(', ')

export const formatAqiLabel = (aqi: number) => {
  if (aqi <= 20) {
    return 'Отличное'
  }

  if (aqi <= 40) {
    return 'Хорошее'
  }

  if (aqi <= 60) {
    return 'Умеренное'
  }

  if (aqi <= 80) {
    return 'Плохое'
  }

  return 'Очень плохое'
}
