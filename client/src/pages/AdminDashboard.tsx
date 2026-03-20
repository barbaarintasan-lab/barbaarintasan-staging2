import React, { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatsCard } from "@/components/admin/StatsCard"
import { AdminTable, type Column } from "@/components/admin/AdminTable"
import { UsageChart } from "@/components/admin/UsageChart"
import { Users, BookOpen, TrendingUp, Activity, BarChart3, Calendar } from "lucide-react"

interface AdminStatsResponse {
  totalParents: number
  totalChildren: number
  totalEnrollments: number
  activeChildren: number
  parentsThisMonth: number
  childrenThisMonth: number
  averageEngagement: number
  topCourses: Array<{ courseId: string; title: string; enrollments: number }>
}

interface ParentData {
  id: string
  name: string
  email: string
  children_count: number
  courses_enrolled: number
  createdAt: string
}

interface ChildData {
  id: string
  name: string
  age: number
  parent_name: string
  quran_progress: number
  total_game_score: number
  last_active: string
}

interface AnalyticsData {
  date: string
  active_users: number
  completed_lessons: number
  games_played: number
}

export function AdminDashboard() {
  const [parentPage, setParentPage] = useState(1)
  const [childPage, setChildPage] = useState(1)
  const [searchParents, setSearchParents] = useState("")
  const [searchChildren, setSearchChildren] = useState("")

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json() as Promise<AdminStatsResponse>
    },
  })

  // Fetch parents
  const { data: parentsData, isLoading: parentsLoading } = useQuery({
    queryKey: ["admin-parents", parentPage, searchParents],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(parentPage),
        pageSize: "10",
        search: searchParents,
      })
      const res = await fetch(`/api/admin/parents?${params}`)
      if (!res.ok) throw new Error("Failed to fetch parents")
      return res.json() as Promise<{
        data: ParentData[]
        total: number
      }>
    },
  })

  // Fetch children
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ["admin-children", childPage, searchChildren],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(childPage),
        pageSize: "10",
        search: searchChildren,
      })
      const res = await fetch(`/api/admin/children?${params}`)
      if (!res.ok) throw new Error("Failed to fetch children")
      return res.json() as Promise<{
        data: ChildData[]
        total: number
      }>
    },
  })

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const params = new URLSearchParams({
        days: "30",
      })
      const res = await fetch(`/api/admin/analytics?${params}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json() as Promise<AnalyticsData[]>
    },
  })

  const parentColumns: Column<ParentData>[] = [
    {
      key: "name",
      label: "Name",
    },
    {
      key: "email",
      label: "Email",
      render: (value) => (
        <div className="max-w-xs truncate text-sm">{value}</div>
      ),
    },
    {
      key: "children_count",
      label: "Children",
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "courses_enrolled",
      label: "Courses",
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (value) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const childColumns: Column<ChildData>[] = [
    {
      key: "name",
      label: "Name",
    },
    {
      key: "age",
      label: "Age",
      render: (value) => <span>{value} years</span>,
    },
    {
      key: "parent_name",
      label: "Parent",
    },
    {
      key: "quran_progress",
      label: "Quran Progress",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm">{value}%</span>
        </div>
      ),
    },
    {
      key: "total_game_score",
      label: "Game Score",
      render: (value) => <span className="font-medium">{value}</span>,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform activity and manage users
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Parents"
          value={stats?.totalParents || 0}
          description="Active parent accounts"
          icon={<Users className="h-4 w-4" />}
          trend={
            stats?.parentsThisMonth ? (stats.parentsThisMonth / (stats.totalParents || 1)) * 10 : 0
          }
          trendLabel="This month"
        />
        <StatsCard
          title="Total Children"
          value={stats?.totalChildren || 0}
          description="Child profiles"
          icon={<BookOpen className="h-4 w-4" />}
          trend={
            stats?.childrenThisMonth ? (stats.childrenThisMonth / (stats.totalChildren || 1)) * 10 : 0
          }
          trendLabel="This month"
        />
        <StatsCard
          title="Active Children"
          value={stats?.activeChildren || 0}
          description="Active in last 7 days"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatsCard
          title="Avg Engagement"
          value={`${stats?.averageEngagement || 0}%`}
          description="Platform engagement"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Courses</CardTitle>
              <CardDescription>
                Most popular courses by enrollment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topCourses && stats.topCourses.length > 0 ? (
                  stats.topCourses.map((course, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.courseId}
                        </p>
                      </div>
                      <span className="text-lg font-semibold">
                        {course.enrollments}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No course data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parents Tab */}
        <TabsContent value="parents" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search parents..."
              value={searchParents}
              onChange={(e) => {
                setSearchParents(e.target.value)
                setParentPage(1)
              }}
              className="max-w-xs"
            />
          </div>
          <AdminTable
            title="Parents List"
            columns={parentColumns}
            data={parentsData?.data || []}
            isLoading={parentsLoading}
            page={parentPage}
            pageSize={10}
            totalCount={parentsData?.total || 0}
            onPageChange={setParentPage}
            emptyMessage="No parents found"
          />
        </TabsContent>

        {/* Children Tab */}
        <TabsContent value="children" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search children..."
              value={searchChildren}
              onChange={(e) => {
                setSearchChildren(e.target.value)
                setChildPage(1)
              }}
              className="max-w-xs"
            />
          </div>
          <AdminTable
            title="Children List"
            columns={childColumns}
            data={childrenData?.data || []}
            isLoading={childrenLoading}
            page={childPage}
            pageSize={10}
            totalCount={childrenData?.total || 0}
            onPageChange={setChildPage}
            emptyMessage="No children found"
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            <UsageChart
              title="Active Users Over Time"
              description="Daily active children (last 30 days)"
              data={
                analyticsData?.map((d) => ({
                  name: d.date,
                  "Active Users": d.active_users,
                })) || []
              }
              type="line"
              dataKey="Active Users"
              xAxisKey="name"
              isLoading={analyticsLoading}
            />
            <UsageChart
              title="Completed Lessons"
              description="Daily lesson completions (last 30 days)"
              data={
                analyticsData?.map((d) => ({
                  name: d.date,
                  "Lessons Completed": d.completed_lessons,
                })) || []
              }
              type="bar"
              dataKey="Lessons Completed"
              xAxisKey="name"
              isLoading={analyticsLoading}
            />
            <UsageChart
              title="Games Played"
              description="Daily game plays (last 30 days)"
              data={
                analyticsData?.map((d) => ({
                  name: d.date,
                  "Games Played": d.games_played,
                })) || []
              }
              type="bar"
              dataKey="Games Played"
              xAxisKey="name"
              isLoading={analyticsLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
