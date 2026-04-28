import type { CityOption } from '../types'
import { formatCityLabel } from '../utils/formatters'

type SearchBarProps = {
  query: string
  suggestions: CityOption[]
  isSearching: boolean
  onQueryChange: (value: string) => void
  onSelect: (city: CityOption) => void
  onSubmit: () => Promise<void> | void
}

export function SearchBar({
  query,
  suggestions,
  isSearching,
  onQueryChange,
  onSelect,
  onSubmit,
}: SearchBarProps) {
  return (
    <div className="search-panel">
      <div className="search-form">
        <input
          aria-label="Город"
          placeholder="Введи город"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void onSubmit()
            }
          }}
        />

        <button type="button" onClick={() => void onSubmit()}>
          Найти
        </button>
      </div>

      <p className="search-hint">
        {isSearching ? 'Ищу города…' : 'Прогноз, визуальная тема и воздух обновляются автоматически.'}
      </p>

      {suggestions.length > 0 ? (
        <div className="suggestions" aria-label="Подсказки городов">
          {suggestions.map((city) => (
            <button key={city.id} type="button" onClick={() => onSelect(city)}>
              <span className="suggestion-title">{city.name}</span>
              <span className="meta">{formatCityLabel(city.admin1, city.country)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
