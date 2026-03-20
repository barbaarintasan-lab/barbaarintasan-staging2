import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend !== undefined && (
          <div className="text-xs mt-2">
            <span className={trend >= 0 ? "text-green-600" : "text-red-600"}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
            {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
