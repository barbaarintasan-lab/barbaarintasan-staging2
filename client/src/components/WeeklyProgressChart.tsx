import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { TrendingUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  days: {
    date: string;
    dayName: string;
    lessonsCompleted: number;
  }[];
  totalLessons: number;
  todayDate: string;
}

const SOMALI_DAYS_SHORT = ["Ax", "Is", "Ta", "Ar", "Kh", "Ji", "Sa"];

export function WeeklyProgressChart({ className = "" }: { className?: string }) {
  const { data, isLoading } = useQuery<WeeklyData>({
    queryKey: ["/api/parent/weekly-progress"],
    queryFn: async () => {
      const res = await fetch("/api/parent/weekly-progress", { credentials: "include" });
      if (!res.ok) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          days.push({
            date: d.toISOString().split("T")[0],
            dayName: SOMALI_DAYS_SHORT[i],
            lessonsCompleted: 0,
          });
        }
        
        return {
          weekStart: startOfWeek.toISOString().split("T")[0],
          weekEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          days,
          totalLessons: 0,
        };
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-blue-200 rounded w-1/3" />
            <div className="h-32 bg-blue-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayDate = data?.todayDate || "";
  const chartData = data?.days.map((d, i) => ({
    name: SOMALI_DAYS_SHORT[i],
    lessons: d.lessonsCompleted,
    isToday: d.date === todayDate,
  })) || [];

  const maxLessons = Math.max(...chartData.map(d => d.lessons), 1);

  return (
    <Card className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-lg", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-800">Horumarka Usbuucan</CardTitle>
              <p className="text-xs text-gray-500">Casharada aad dhamaysay</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-blue-100 px-3 py-1.5 rounded-full">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-blue-700">{data?.totalLessons || 0}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                domain={[0, maxLessons + 1]}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-800">
                          {payload[0].value} cashar
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="lessons" 
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isToday 
                      ? "url(#todayGradient)" 
                      : entry.lessons > 0 
                        ? "url(#activeGradient)" 
                        : "#e2e8f0"
                    }
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-b from-blue-500 to-indigo-600" />
              <span>Wax baad baratay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-b from-orange-500 to-orange-600" />
              <span>Maanta</span>
            </div>
          </div>
          <span className="text-gray-400">{data?.weekStart} - {data?.weekEnd}</span>
        </div>
      </CardContent>
    </Card>
  );
}
