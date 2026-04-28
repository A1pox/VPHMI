export type CityOption = {
  id: string
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone: string
}

export type CurrentWeather = {
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  precipitationProbability: number
  weatherCode: number
  isDay: boolean
}

export type ForecastItem = {
  time: string
  temperature: number
  weatherCode: number
  precipitationProbability: number
  windSpeed: number
}

export type AirQuality = {
  aqi: number
  pm2_5: number
  pm10: number
  label: string
}

export type WeatherBundle = {
  city: CityOption
  timezone: string
  updatedAt: string
  current: CurrentWeather
  forecast: ForecastItem[]
  airQuality: AirQuality
}

export type ThemeDescriptor = {
  name: 'clear' | 'clouds' | 'rain' | 'snow' | 'storm'
  title: string
  icon: string
}
