import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Radio, Plus, Play, Square, Users, Calendar, Trash2, ArrowLeft, Bell, BellOff, LogIn } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface VoiceRoom {
  id: string;
  title: string;
  description: string | null;
  hostId: string;
  status: "scheduled" | "live" | "ended";
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxSpeakers: number;
  createdAt: string;
}

interface VoiceSpacesAdminProps {
  onBack?: () => void;
}

export function VoiceSpacesAdmin({ onBack }: VoiceSpacesAdminProps) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    maxSpeakers: 5,
    notifyParents: false,
  });

  const { data: rooms = [], isLoading } = useQuery<VoiceRoom[]>({
    queryKey: ["/api/voice-rooms"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newRoom) => 
      apiRequest("POST", "/api/voice-rooms", data),
    onSuccess: () => {
      toast.success("Sheeko cusub ayaa la abuuray!");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
      setShowCreateDialog(false);
      setNewRoom({ title: "", description: "", scheduledAt: "", maxSpeakers: 5, notifyParents: false });
    },
    onError: () => {
      toast.error("Waa la waayay in la abuuro Sheekada");
    },
  });

  const startMutation = useMutation({
    mutationFn: (roomId: string) => 
      apiRequest("POST", `/api/voice-rooms/${roomId}/start`),
    onSuccess: () => {
      toast.success("Sheekada waa la bilaabay!");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
    },
  });

  const endMutation = useMutation({
    mutationFn: (roomId: string) => 
      apiRequest("POST", `/api/voice-rooms/${roomId}/end`),
    onSuccess: () => {
      toast.success("Sheekada waa la joojiyay");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roomId: string) => 
      apiRequest("DELETE", `/api/voice-rooms/${roomId}`),
    onSuccess: () => {
      toast.success("Sheekada waa la tirtiray!");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-rooms"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Waa la waayay in la tirtiro Sheekada");
    },
  });

  const handleCreate = () => {
    if (!newRoom.title.trim()) {
      toast.error("Fadlan ku dar cinwaanka");
      return;
    }
    createMutation.mutate(newRoom);
  };

  const liveRooms = rooms.filter((r) => r.status === "live");
  const scheduledRooms = rooms.filter((r) => r.status === "scheduled");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold">Kulan & Sheeko - Maamulka</h2>
          </div>
        </div>
        {rooms.length > 0 && (
          <Button onClick={() => setShowCreateDialog(true)} data-testid="create-voice-room-button">
            <Plus className="w-4 h-4 mr-2" />
            Abuuro Sheeko Cusub
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Soo dejinaya...</div>
      ) : (
        <div className="space-y-6">
          {liveRooms.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Hadda Socda ({liveRooms.length})
              </h3>
              <div className="grid gap-4">
                {liveRooms.map((room) => (
                  <VoiceRoomCard
                    key={room.id}
                    room={room}
                    onStart={() => startMutation.mutate(room.id)}
                    onEnd={() => endMutation.mutate(room.id)}
                    onDelete={() => deleteMutation.mutate(room.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {scheduledRooms.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                La Qorsheeyay ({scheduledRooms.length})
              </h3>
              <div className="grid gap-4">
                {scheduledRooms.map((room) => (
                  <VoiceRoomCard
                    key={room.id}
                    room={room}
                    onStart={() => startMutation.mutate(room.id)}
                    onEnd={() => endMutation.mutate(room.id)}
                    onDelete={() => deleteMutation.mutate(room.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {rooms.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Radio className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Ma jiro Sheeko</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Abuuro Sheeko cusub si waalidku u ku soo biiraan
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Abuuro Sheeko
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abuuro Sheeko Cusub</DialogTitle>
            <DialogDescription>
              Samee Voice Space cusub oo waalidku ay ku soo biiri karaan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Cinwaanka</Label>
              <Input
                id="title"
                placeholder="Tusaale: Su'aalaha Waalidka"
                value={newRoom.title}
                onChange={(e) => setNewRoom({ ...newRoom, title: e.target.value })}
                data-testid="voice-room-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Sharaxaad (ikhtiyaari)</Label>
              <Textarea
                id="description"
                placeholder="Waa maxay ujeedada kulanka?"
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                data-testid="voice-room-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Wakhtiga (ama ka tag oo hadda bilaab)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={newRoom.scheduledAt}
                onChange={(e) => setNewRoom({ ...newRoom, scheduledAt: e.target.value })}
                data-testid="voice-room-schedule-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSpeakers">Tirada ugu badan ee hadlayaasha</Label>
              <Input
                id="maxSpeakers"
                type="number"
                min={1}
                max={20}
                value={newRoom.maxSpeakers}
                onChange={(e) => setNewRoom({ ...newRoom, maxSpeakers: parseInt(e.target.value) || 5 })}
                data-testid="voice-room-max-speakers-input"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {newRoom.notifyParents ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="notifyParents" className="font-medium cursor-pointer">
                    Waalidka u dir notification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {newRoom.notifyParents 
                      ? "Waalidka waxay helayaan ogeysiis" 
                      : "Ogeysiis lama diri doono"
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="notifyParents"
                checked={newRoom.notifyParents}
                onCheckedChange={(checked) => setNewRoom({ ...newRoom, notifyParents: checked })}
                data-testid="voice-room-notify-toggle"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Jooji
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                data-testid="confirm-create-voice-room-button"
              >
                {createMutation.isPending ? "Abuuraya..." : newRoom.scheduledAt ? "La Qorshee" : "Hadda Bilaab"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RsvpInfo {
  id: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  createdAt: string;
}

interface RsvpResponse {
  count: number;
  rsvps: RsvpInfo[];
}

function VoiceRoomCard({ 
  room, 
  onStart, 
  onEnd,
  onDelete,
  isDeleting 
}: { 
  room: VoiceRoom; 
  onStart: () => void; 
  onEnd: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const [showAttendees, setShowAttendees] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: rsvpData } = useQuery<RsvpResponse>({
    queryKey: [`/api/voice-rooms/${room.id}/rsvps`],
    enabled: room.status === "scheduled",
  });

  return (
    <Card data-testid={`admin-voice-room-${room.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{room.title}</CardTitle>
            {room.description && (
              <CardDescription className="mt-1">{room.description}</CardDescription>
            )}
          </div>
          <Badge variant={room.status === "live" ? "destructive" : "secondary"}>
            {room.status === "live" ? (
              <>
                <Radio className="w-3 h-3 mr-1" />
                LIVE
              </>
            ) : (
              <>
                <Calendar className="w-3 h-3 mr-1" />
                La qorsheeyay
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {room.scheduledAt && (
              <span>
                {format(new Date(room.scheduledAt), "dd MMM yyyy, HH:mm")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {room.status === "scheduled" && (
              <>
                <Button size="sm" onClick={onStart} data-testid={`start-room-${room.id}`}>
                  <Play className="w-4 h-4 mr-1" />
                  Bilaab
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  data-testid={`delete-room-${room.id}`}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {room.status === "live" && (
              <>
                <Link href={`/sheeko?room=${room.id}&admin=1`}>
                  <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" data-testid={`join-room-admin-${room.id}`}>
                    <LogIn className="w-4 h-4 mr-1" />
                    Soo Gal
                  </Button>
                </Link>
                <Button size="sm" variant="destructive" onClick={onEnd} data-testid={`end-room-${room.id}`}>
                  <Square className="w-4 h-4 mr-1" />
                  Jooji
                </Button>
              </>
            )}
            {room.status === "ended" && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                data-testid={`delete-room-${room.id}`}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Tirtir
              </Button>
            )}
          </div>
        </div>

        {/* Attendees section for scheduled rooms */}
        {room.status === "scheduled" && rsvpData && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowAttendees(!showAttendees)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">{rsvpData.count} qof ayaa imaanaya</span>
              <ArrowLeft className={`w-4 h-4 ml-auto transition-transform ${showAttendees ? '-rotate-90' : 'rotate-180'}`} />
            </button>
            
            {showAttendees && rsvpData.rsvps && rsvpData.rsvps.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {rsvpData.rsvps.map((rsvp) => (
                  <div key={rsvp.id} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/50 rounded">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {rsvp.parentName?.charAt(0) || "?"}
                    </div>
                    <span className="flex-1 truncate">{rsvp.parentName || "Aan la aqoon"}</span>
                    <span className="text-muted-foreground text-xs">{rsvp.parentPhone}</span>
                  </div>
                ))}
              </div>
            )}
            
            {showAttendees && (!rsvpData.rsvps || rsvpData.rsvps.length === 0) && (
              <p className="mt-2 text-sm text-muted-foreground italic">Wali qofna ma jiro</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ma hubtaa inaad tirtirto?</DialogTitle>
            <DialogDescription>
              Sheekada "{room.title}" waa la tirtiri doonaa. Tallaabadan lama soo celin karo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Maya, ka noqo
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {isDeleting ? "Tirtirayaa..." : "Haa, tirtir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
