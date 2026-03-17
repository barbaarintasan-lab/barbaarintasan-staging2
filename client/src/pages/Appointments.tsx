import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Clock, Phone, CheckCircle, Video, ArrowLeft, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { useTranslation } from "react-i18next";

interface AvailableDate {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface Appointment {
  id: string;
  parentId: string;
  teacherName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  topic: string | null;
  status: string;
  meetingLink: string | null;
  createdAt: string;
}

export default function Appointments() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { parent } = useParentAuth();
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [topic, setTopic] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/parent/appointments"],
    queryFn: async () => {
      const res = await fetch("/api/parent/appointments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: availableDates = [], isLoading: isLoadingDates } = useQuery<AvailableDate[]>({
    queryKey: ["/api/available-dates"],
    queryFn: async () => {
      const res = await fetch("/api/available-dates", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch available time slots for selected date (excludes booked times)
  const { data: availableTimesFromApi = [], isLoading: isLoadingTimes } = useQuery<string[]>({
    queryKey: ["/api/availability", appointmentDate],
    queryFn: async () => {
      if (!appointmentDate) return [];
      const res = await fetch(`/api/availability/${appointmentDate}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!appointmentDate,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: { appointmentDate: string; appointmentTime: string; topic: string }) => {
      const res = await fetch("/api/parent/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/appointments"] });
      toast.success("Ballanta waa la diray! Waxaad heli doontaa jawaab dhakhso ah.");
      setAppointmentDate("");
      setAppointmentTime("");
      setTopic("");
      setShowForm(false);
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay - Fadlan isku day mar kale");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate || !appointmentTime) {
      toast.error("Fadlan dooro taariikhda iyo waqtiga");
      return;
    }
    createAppointmentMutation.mutate({
      appointmentDate,
      appointmentTime,
      topic,
    });
  };

  // Reset time selection when date changes
  useEffect(() => {
    setAppointmentTime("");
  }, [appointmentDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-500">Sugaya</Badge>;
      case "approved":
        return <Badge className="bg-green-500">La Ogolaaday</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">La Diiday</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Dhacday</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const availableDatesSet = new Set(availableDates.map((d) => d.date));
  const selectedDateInfo = availableDates.find((d) => d.date === appointmentDate);

  const monthNames = ["Janaayo", "Febraayo", "Maarso", "Abriil", "Maayo", "Juun", "Luuliyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofembar", "Desembar"];
  const dayLabels = ["Ax", "Is", "Ta", "Ar", "Kh", "Ji", "Sa"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateTimeSlots = (startTime: string, endTime: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    return slots;
  };

  // Generate all possible time slots for the selected date
  const allTimeSlots = selectedDateInfo 
    ? generateTimeSlots(selectedDateInfo.startTime, selectedDateInfo.endTime)
    : [];
  
  // Set of available times from the API (already filters out booked)
  const availableTimesSet = new Set(availableTimesFromApi);

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md mx-auto text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fadlan Gal</h2>
          <p className="text-gray-600 mb-4">Si aad u sameyso ballan, waa inaad galaa akoonkaaga.</p>
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700">Gal ama Isdiiwaangeli</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="p-2 hover:bg-gray-100 rounded-full" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900">Balan Qabso</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Macalimiinta Barbaarintasan Academy</h3>
              </div>
            </div>
            <p className="text-sm text-white/90 mb-4">
              Haddii aad rabto inaad la hadashid Macalimiinta oo aad weydiisid su'aalo ku saabsan ilmahaaga ama Adiga naftaada, fadlan ka sameeyso ballan halkaan.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                <Video className="w-3 h-3" /> Zoom/Google Meet
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> 30 daqiiqo
              </span>
            </div>
          </CardContent>
        </Card>

        {!showForm ? (
          <Button 
            onClick={() => setShowForm(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            data-testid="btn-new-appointment"
          >
            <Calendar className="w-5 h-5 mr-2" />
            RIIX HALKA
          </Button>
        ) : (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Samee Ballan
              </CardTitle>
              <CardDescription>Dooro taariikhda iyo waqtiga aad rabto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Dooro Maalin Banaan *</Label>
                  {isLoadingDates ? (
                    <p className="text-sm text-gray-500 mt-2">Maalmaha la helayo...</p>
                  ) : availableDates.length === 0 ? (
                    <div className="bg-orange-50 text-orange-700 p-4 rounded-lg mt-2 text-sm">
                      Hadda waqti banaan ma jiro. Fadlan hubi mar kale.
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 mt-2">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-3">
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          data-testid="button-prev-month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h4>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          data-testid="button-next-month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Day Labels */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {dayLabels.map((label, idx) => (
                          <div key={idx} className="text-center text-xs font-medium text-gray-400 py-1">
                            {label}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {days.map((date, idx) => {
                          if (!date) {
                            return <div key={idx} className="h-9" />;
                          }
                          
                          const dateStr = formatDateLocal(date);
                          const isAvailable = availableDatesSet.has(dateStr);
                          const isPast = date < today;
                          const isSelected = dateStr === appointmentDate;
                          const isToday = date.getTime() === today.getTime();
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => isAvailable && !isPast && setAppointmentDate(dateStr)}
                              disabled={!isAvailable || isPast}
                              className={`
                                h-9 rounded-lg text-sm font-medium transition-all
                                ${isPast || !isAvailable ? 'text-gray-300 cursor-not-allowed bg-gray-100' : ''}
                                ${isAvailable && !isPast && !isSelected ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-600' : ''}
                                ${isToday && !isSelected ? 'ring-1 ring-gray-400' : ''}
                              `}
                              data-testid={`calendar-date-${dateStr}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                          <span className="text-xs text-gray-500">Banaan</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-gray-100 border"></div>
                          <span className="text-xs text-gray-500">La ma heli karo</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {appointmentDate && (
                    <p className="text-sm text-blue-600 mt-2 font-medium">
                      Taariikhda la doortay: {appointmentDate}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Waqtiga *</Label>
                  {!appointmentDate ? (
                    <p className="text-sm text-gray-500 mt-2">Fadlan dooro maalin marka hore</p>
                  ) : isLoadingTimes ? (
                    <p className="text-sm text-gray-500 mt-2">Wakhtiyada la helayo...</p>
                  ) : allTimeSlots.length === 0 ? (
                    <p className="text-sm text-orange-600 mt-2">Waqti la heli karo ma jiro maalintaas.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {allTimeSlots.map((time) => {
                          const isAvailable = availableTimesSet.has(time);
                          const isSelected = appointmentTime === time;
                          
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => isAvailable && setAppointmentTime(time)}
                              disabled={!isAvailable}
                              className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : isAvailable
                                    ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                    : "bg-red-50 text-red-500 border-red-200 cursor-not-allowed line-through"
                              }`}
                              data-testid={`btn-time-${time}`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                      {/* Time Legend */}
                      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-green-50 border border-green-300"></div>
                          <span className="text-xs text-gray-500">Banaan</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-red-50 border border-red-200"></div>
                          <span className="text-xs text-gray-500">La qaatay</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="topic">Mawduuca (Ikhtiyaari)</Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Maxaad rabta inaad ka hadasho? Tusaale: Dhaqanka ilmaha, barashada, iwm..."
                    className="mt-1"
                    rows={3}
                    data-testid="input-topic"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Ka noqo
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAppointmentMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    data-testid="btn-submit-appointment"
                  >
                    {createAppointmentMutation.isPending ? "Diraya..." : "Dir Codsiga"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Ballannadayda ({appointments.length})
          </h2>

          {isLoading ? (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Weli ballan ma samaysan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {appointment.appointmentDate} - {appointment.appointmentTime}
                        </p>
                        <p className="text-sm text-gray-600">{appointment.teacherName}</p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    {appointment.topic && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Mawduuca:</strong> {appointment.topic}
                      </p>
                    )}

                    {appointment.status === "approved" && appointment.meetingLink && (
                      <a
                        href={appointment.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors mt-2"
                      >
                        <Video className="w-4 h-4" />
                        Ku Biir Kulanka
                      </a>
                    )}

                    {appointment.status === "pending" && (
                      <p className="text-xs text-orange-600 mt-2">
                        Codsigaaga waa la hubinayaa. Waxaad heli doontaa jawaab dhakhso ah.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
