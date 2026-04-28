import type { CityOption, CurrentWeather, ThemeDescriptor } from '../types'
import { formatCityLabel, getWeatherLabel } from '../utils/formatters'

type CurrentConditionsProps = {
  city: CityOption
  current: CurrentWeather
  theme: ThemeDescriptor
  updatedAt: string
}

export function CurrentConditions({
  city,
  current,
  theme,
  updatedAt,
}: CurrentConditionsProps) {
  return (
    <section className="current-card">
      <div>
        <p className="eyebrow">Текущая погода</p>
        <h2>{city.name}</h2>
        <p className="meta">{formatCityLabel(city.admin1, city.country)}</p>

        <div className="temperature-line">
          <span className="weather-icon" aria-hidden="true">
            {theme.icon}
          </span>
          <div>
            <div className="temperature">{current.temperature}°</div>
            <div className="condition-text">{getWeatherLabel(current.weatherCode)}</div>
          </div>
        </div>

        <p className="meta">Обновлено: {updatedAt}</p>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric-label">Ощущается как</span>
          <span className="metric-value">{current.apparentTemperature}°</span>
        </div>
        <div className="metric">
          <span className="metric-label">Влажность</span>
          <span className="metric-value">{current.humidity}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">Ветер</span>
          <span className="metric-value">{current.windSpeed} км/ч</span>
        </div>
        <div className="metric">
          <span className="metric-label">Вероятность осадков</span>
          <span className="metric-value">{current.precipitationProbability}%</span>
        </div>
      </div>
    </section>
  )
}
