import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  action: () => void
  danger?: boolean
  separator?: boolean
}

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Adjust position so menu stays inside viewport
  const style: React.CSSProperties = { position: 'fixed', left: x, top: y, zIndex: 1000 }

  return (
    <div className="context-menu" style={style} ref={ref}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="context-menu-sep" />
        ) : (
          <button
            key={i}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
