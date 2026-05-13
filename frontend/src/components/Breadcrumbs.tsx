import { Link } from 'react-router-dom'

interface Crumb {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  crumbs: Crumb[]
}

export default function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  return (
    <div className="breadcrumbs">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`}>
          {index > 0 && <span className="breadcrumb-sep"> / </span>}
          {crumb.to ? (
            <Link to={crumb.to} className="breadcrumb-link">
              {crumb.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
