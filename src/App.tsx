import { useCallback, useEffect, useRef, useState, startTransition } from 'react'
import './App.css'
import { AirQualityCard } from './components/AirQualityCard'
import { CurrentConditions } from './components/CurrentConditions'
import { ForecastTimeline } from './components/ForecastTimeline'
import { SearchBar } from './components/SearchBar'
import { DEFAULT_CITY } from './data/mockWeather'
import { searchCities, loadWeatherBundle } from './services/weatherApi'
import type { CityOption, WeatherBundle } from './types'
import { describeTheme, formatUpdatedAt } from './utils/formatters'

const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000

function App() {
  const [query, setQuery] = useState(DEFAULT_CITY.name)
  const [selectedCity, setSelectedCity] = useState<CityOption>(DEFAULT_CITY)
  const [suggestions, setSuggestions] = useState<CityOption[]>([])
  const [bundle, setBundle] = useState<WeatherBundle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const theme = describeTheme(bundle?.current.weatherCode, bundle?.current.isDay)

  const refreshWeather = useCallback(async (city: CityOption, silent = false) => {
    if (!silent) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError(null)

    try {
      const nextBundle = await loadWeatherBundle(city)

      if (!mountedRef.current) {
        return
      }

      setBundle(nextBundle)
    } catch {
      if (!mountedRef.current) {
        return
      }

      setError('Не удалось обновить погоду. Попробуй выбрать город ещё раз.')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    void refreshWeather(selectedCity)
  }, [selectedCity, refreshWeather])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshWeather(selectedCity, true)
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [selectedCity, refreshWeather])

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      setSuggestions([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)

      try {
        const nextSuggestions = await searchCities(trimmedQuery)

        if (mountedRef.current) {
          setSuggestions(nextSuggestions)
        }
      } catch {
        if (mountedRef.current) {
          setSuggestions([])
        }
      } finally {
        if (mountedRef.current) {
          setIsSearching(false)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  const handleSelectCity = (city: CityOption) => {
    startTransition(() => {
      setSelectedCity(city)
      setQuery(city.name)
      setSuggestions([])
    })
  }

  const handleSubmit = async () => {
    const firstSuggestion = suggestions[0]

    if (firstSuggestion) {
      handleSelectCity(firstSuggestion)
      return
    }

    await refreshWeather(selectedCity)
  }

  return (
    <main className={`app theme-${theme.name}`}>
      <section className="shell">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Погода</p>
            <h1>Прогноз на несколько дней с качеством воздуха</h1>
            <p className="hero-copy">
              Погода по выбранному городу, прогноз по 3 часа и информация о качестве
              воздуха.
            </p>
          </div>

          <SearchBar
            query={query}
            suggestions={suggestions}
            isSearching={isSearching}
            onQueryChange={setQuery}
            onSelect={handleSelectCity}
            onSubmit={handleSubmit}
          />
        </header>

        {error ? <p className="status error">{error}</p> : null}
        {isRefreshing ? <p className="status">Данные обновляются по расписанию…</p> : null}

        {isLoading || !bundle ? (
          <section className="loading-card" aria-live="polite">
            <p>Собираю свежий прогноз для {selectedCity.name}…</p>
          </section>
        ) : (
          <>
            <CurrentConditions
              city={bundle.city}
              current={bundle.current}
              theme={theme}
              updatedAt={formatUpdatedAt(bundle.updatedAt, bundle.timezone)}
            />

            <section className="dashboard-grid">
              <ForecastTimeline forecast={bundle.forecast} timezone={bundle.timezone} />
              <AirQualityCard airQuality={bundle.airQuality} />
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default App
