import type { AirQuality } from '../types'

type AirQualityCardProps = {
  airQuality: AirQuality
}

export function AirQualityCard({ airQuality }: AirQualityCardProps) {
  return (
    <section className="air-card">
      <p className="eyebrow">Воздух</p>
      <h3>Качество воздуха</h3>
      <p className="air-copy">Текущая оценка и концентрация мелких частиц.</p>

      <div className="air-grid">
        <div className="air-metric">
          <span className="air-label">Индекс AQI</span>
          <span className="aqi-value">{airQuality.aqi}</span>
          <span className="aqi-pill">{airQuality.label}</span>
        </div>
        <div className="air-metric">
          <span className="air-label">PM2.5</span>
          <span className="aqi-value">{airQuality.pm2_5} µg/m³</span>
        </div>
        <div className="air-metric">
          <span className="air-label">PM10</span>
          <span className="aqi-value">{airQuality.pm10} µg/m³</span>
        </div>
      </div>

      <p className="aqi-note">Данные получаются из бесплатного API качества воздуха.</p>
    </section>
  )
}
