import { describe, expect, it } from 'vitest'
import { describeTheme, formatAqiLabel, getWeatherLabel } from './formatters'

describe('formatters', () => {
  it('returns storm theme for thunderstorm weather code', () => {
    expect(describeTheme(95, true).name).toBe('storm')
  })

  it('maps AQI values to readable labels', () => {
    expect(formatAqiLabel(18)).toBe('Отличное')
    expect(formatAqiLabel(74)).toBe('Плохое')
  })

  it('returns weather labels in russian', () => {
    expect(getWeatherLabel(61)).toContain('дожд')
  })
})
