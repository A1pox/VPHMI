import type { CityOption, WeatherBundle } from '../types'

export const DEFAULT_CITY: CityOption = {
  id: 'novosibirsk-ru',
  name: 'Новосибирск',
  country: 'Россия',
  admin1: 'Новосибирская область',
  latitude: 55.0415,
  longitude: 82.9346,
  timezone: 'Asia/Novosibirsk',
}

export const MOCK_SEARCH_RESULTS: CityOption[] = [
  DEFAULT_CITY,
  {
    id: 'moscow-ru',
    name: 'Москва',
    country: 'Россия',
    admin1: 'Москва',
    latitude: 55.7522,
    longitude: 37.6156,
    timezone: 'Europe/Moscow',
  },
  {
    id: 'saint-petersburg-ru',
    name: 'Санкт-Петербург',
    country: 'Россия',
    admin1: 'Санкт-Петербург',
    latitude: 59.9386,
    longitude: 30.3141,
    timezone: 'Europe/Moscow',
  },
]

export const MOCK_WEATHER_BUNDLE: WeatherBundle = {
  city: DEFAULT_CITY,
  timezone: 'Asia/Novosibirsk',
  updatedAt: '2026-04-15T12:00:00+07:00',
  current: {
    temperature: 13,
    apparentTemperature: 11,
    humidity: 51,
    windSpeed: 16,
    precipitationProbability: 18,
    weatherCode: 2,
    isDay: true,
  },
  forecast: [
    {
      time: '2026-04-15T15:00:00+07:00',
      temperature: 14,
      weatherCode: 2,
      precipitationProbability: 18,
      windSpeed: 15,
    },
    {
      time: '2026-04-15T18:00:00+07:00',
      temperature: 10,
      weatherCode: 3,
      precipitationProbability: 25,
      windSpeed: 13,
    },
    {
      time: '2026-04-15T21:00:00+07:00',
      temperature: 7,
      weatherCode: 61,
      precipitationProbability: 64,
      windSpeed: 18,
    },
    {
      time: '2026-04-16T00:00:00+07:00',
      temperature: 5,
      weatherCode: 63,
      precipitationProbability: 70,
      windSpeed: 20,
    },
    {
      time: '2026-04-16T03:00:00+07:00',
      temperature: 6,
      weatherCode: 3,
      precipitationProbability: 30,
      windSpeed: 11,
    },
    {
      time: '2026-04-16T06:00:00+07:00',
      temperature: 9,
      weatherCode: 2,
      precipitationProbability: 12,
      windSpeed: 9,
    },
    {
      time: '2026-04-16T09:00:00+07:00',
      temperature: 13,
      weatherCode: 1,
      precipitationProbability: 10,
      windSpeed: 12,
    },
    {
      time: '2026-04-16T12:00:00+07:00',
      temperature: 16,
      weatherCode: 0,
      precipitationProbability: 8,
      windSpeed: 14,
    },
  ],
  airQuality: {
    aqi: 34,
    pm2_5: 8.4,
    pm10: 13.2,
    label: 'Хорошее',
  },
}
