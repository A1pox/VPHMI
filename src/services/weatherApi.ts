import { DEFAULT_CITY, MOCK_SEARCH_RESULTS, MOCK_WEATHER_BUNDLE } from '../data/mockWeather'
import type { AirQuality, CityOption, ForecastItem, WeatherBundle } from '../types'
import { formatAqiLabel } from '../utils/formatters'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

type GeocodingResponse = {
  results?: Array<{
    id: number
    name: string
    country: string
    admin1?: string
    latitude: number
    longitude: number
    timezone?: string
  }>
}

type GeocodingResult = NonNullable<GeocodingResponse['results']>[number]

type ForecastResponse = {
  timezone: string
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
    is_day: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
    weather_code: number[]
    wind_speed_10m: number[]
  }
}

type AirResponse = {
  hourly: {
    time: string[]
    european_aqi: number[]
    pm2_5: number[]
    pm10: number[]
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const toCityOption = (item: GeocodingResult): CityOption => ({
  id: String(item.id),
  name: item.name,
  country: item.country,
  admin1: item.admin1,
  latitude: item.latitude,
  longitude: item.longitude,
  timezone: item.timezone ?? DEFAULT_CITY.timezone,
})

const selectEveryThirdHour = (hourly: ForecastResponse['hourly']): ForecastItem[] =>
  hourly.time
    .map((time, index) => ({
      time,
      temperature: Math.round(hourly.temperature_2m[index]),
      precipitationProbability: Math.round(hourly.precipitation_probability[index] ?? 0),
      weatherCode: hourly.weather_code[index],
      windSpeed: Math.round(hourly.wind_speed_10m[index]),
    }))
    .filter((_, index) => index % 3 === 0)
    .slice(0, 8)

const resolveAirQuality = (response: AirResponse): AirQuality => {
  const aqi = Math.round(response.hourly.european_aqi[0] ?? 0)
  const pm2_5 = Number((response.hourly.pm2_5[0] ?? 0).toFixed(1))
  const pm10 = Number((response.hourly.pm10[0] ?? 0).toFixed(1))

  return {
    aqi,
    pm2_5,
    pm10,
    label: formatAqiLabel(aqi),
  }
}

export const searchCities = async (query: string): Promise<CityOption[]> => {
  if (useMocks) {
    await wait(150)

    return MOCK_SEARCH_RESULTS.filter((city) =>
      city.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'ru')
  url.searchParams.set('format', 'json')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('City search failed')
  }

  const data = (await response.json()) as GeocodingResponse
  return (data.results ?? []).map(toCityOption)
}

export const loadWeatherBundle = async (city: CityOption): Promise<WeatherBundle> => {
  if (useMocks) {
    await wait(250)
    return {
      ...MOCK_WEATHER_BUNDLE,
      city,
      timezone: city.timezone,
    }
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
  forecastUrl.searchParams.set('latitude', String(city.latitude))
  forecastUrl.searchParams.set('longitude', String(city.longitude))
  forecastUrl.searchParams.set(
    'hourly',
    'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
  )
  forecastUrl.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
  )
  forecastUrl.searchParams.set('forecast_days', '5')
  forecastUrl.searchParams.set('timezone', city.timezone)

  const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  airUrl.searchParams.set('latitude', String(city.latitude))
  airUrl.searchParams.set('longitude', String(city.longitude))
  airUrl.searchParams.set('hourly', 'european_aqi,pm2_5,pm10')
  airUrl.searchParams.set('forecast_days', '1')
  airUrl.searchParams.set('timezone', city.timezone)

  const [forecastResponse, airResponse] = await Promise.all([fetch(forecastUrl), fetch(airUrl)])

  if (!forecastResponse.ok || !airResponse.ok) {
    throw new Error('Weather request failed')
  }

  const forecastData = (await forecastResponse.json()) as ForecastResponse
  const airData = (await airResponse.json()) as AirResponse

  return {
    city,
    timezone: forecastData.timezone,
    updatedAt: forecastData.current.time,
    current: {
      temperature: Math.round(forecastData.current.temperature_2m),
      apparentTemperature: Math.round(forecastData.current.apparent_temperature),
      humidity: Math.round(forecastData.current.relative_humidity_2m),
      windSpeed: Math.round(forecastData.current.wind_speed_10m),
      precipitationProbability: Math.round(forecastData.hourly.precipitation_probability[0] ?? 0),
      weatherCode: forecastData.current.weather_code,
      isDay: Boolean(forecastData.current.is_day),
    },
    forecast: selectEveryThirdHour(forecastData.hourly),
    airQuality: resolveAirQuality(airData),
  }
}
