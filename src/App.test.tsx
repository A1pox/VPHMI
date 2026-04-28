import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders weather dashboard heading and air quality block', async () => {
    render(<App />)

    expect(await screen.findByText(/Прогноз на несколько дней/i)).toBeInTheDocument()
    expect(await screen.findByText(/Качество воздуха/i)).toBeInTheDocument()
  })
})
