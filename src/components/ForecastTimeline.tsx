import type { ForecastItem } from '../types'
import { formatDay, formatHour, getWeatherLabel } from '../utils/formatters'

type ForecastTimelineProps = {
  forecast: ForecastItem[]
  timezone: string
}

export function ForecastTimeline({ forecast, timezone }: ForecastTimelineProps) {
  return (
    <section className="timeline-card">
      <p className="eyebrow">Прогноз</p>
      <h3>Срез по 3 часа</h3>
      <p className="forecast-meta">Следующие интервалы для планирования дня и вечера.</p>

      <div className="timeline-grid">
        {forecast.map((item) => (
          <article key={item.time} className="forecast-item">
            <span className="forecast-time">{formatDay(item.time, timezone)}</span>
            <strong>{formatHour(item.time, timezone)}</strong>
            <p>{getWeatherLabel(item.weatherCode)}</p>
            <div className="forecast-temp">{item.temperature}°</div>
            <p className="meta">
              Осадки {item.precipitationProbability}% · Ветер {item.windSpeed} км/ч
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
