import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Check, X, Eye, EyeOff, User, BookOpen, ChevronRight, Star, Clock, Flame, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  username: string;
  avatarColor: string;
  createdAt: string;
}

interface ChildProgress {
  childId: string;
  childName: string;
  surahsCompleted: number;
  totalSurahs: number;
  averageAccuracy: number;
  totalTimeMinutes: number;
  currentStreak: number;
  stars: number;
}

const AVATAR_COLORS = ["#FFD93D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

export function ChildrenManager() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    username: "",
    password: "",
    avatarColor: AVATAR_COLORS[0],
  });

  const { data: childrenData = [], isLoading } = useQuery<ChildProfile[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const res = await fetch("/api/children", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch children");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      setShowAddForm(false);
      resetForm();
      toast.success("Ilmaha waa la diiwaan geliyay!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/children/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      setEditingId(null);
      resetForm();
      toast.success("Waa la cusbooneysiiyay!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/children/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      toast.success("Waa la tirtiray");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", age: "", username: "", password: "", avatarColor: AVATAR_COLORS[0] });
    setShowPassword(false);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.age || !formData.username) {
      toast.error("Buuxi magaca, da'da, iyo username");
      return;
    }
    if (editingId) {
      const updateData: any = {
        name: formData.name,
        age: formData.age,
        avatarColor: formData.avatarColor,
        username: formData.username,
      };
      if (formData.password) updateData.password = formData.password;
      updateMutation.mutate({ id: editingId, data: updateData });
    } else {
      if (!formData.password) {
        toast.error("Password waa lagama maarmaan");
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const startEdit = (child: ChildProfile) => {
    setEditingId(child.id);
    setFormData({
      name: child.name,
      age: String(child.age),
      username: child.username,
      password: "",
      avatarColor: child.avatarColor,
    });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-4" data-testid="children-manager">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Carruurta (Quraanka)
        </h3>
        {!showAddForm && (
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowAddForm(true); }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
            data-testid="button-add-child"
          >
            <Plus className="w-4 h-4" />
            Ku dar
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-200">
          <h4 className="font-semibold text-sm text-blue-800">
            {editingId ? "Wax ka beddel" : "Ilmo cusub ku dar"}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Magaca</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Axmed"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                data-testid="input-child-name"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Da'da (sano)</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(f => ({ ...f, age: e.target.value }))}
                placeholder="7"
                min="3"
                max="15"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                data-testid="input-child-age"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(f => ({ ...f, username: e.target.value }))}
              placeholder="axmed2019"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              data-testid="input-child-username-form"
            />
          </div>

          <div className="relative">
            <label className="text-xs text-gray-600 mb-1 block">
              Password {editingId && "(iska daa haddaadan beddelin)"}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
              placeholder={editingId ? "Password cusub (optional)" : "Password"}
              className="w-full px-3 py-2 rounded-lg border text-sm pr-10"
              data-testid="input-child-password-form"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-7 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">Midabka</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData(f => ({ ...f, avatarColor: color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.avatarColor === color ? "border-blue-600 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  data-testid={`button-color-${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-blue-700 disabled:opacity-50"
              data-testid="button-save-child"
            >
              <Check className="w-4 h-4" />
              {editingId ? "Kaydi" : "Ku dar"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
              className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
              data-testid="button-cancel-child"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Monitoring Dashboard */}
      {childrenData.length > 0 && (
        <div className="space-y-2" data-testid="children-monitoring">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            Horumarka Ilmaha
          </h4>
          {childrenData.map((child) => (
            <ChildProgressCard key={child.id} child={child} />
          ))}
        </div>
      )}

      {/* Children list */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
      ) : childrenData.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Wali ilmo kuma darin</p>
          <p className="text-gray-400 text-xs mt-1">Riix "Ku dar" si aad ilmahaaga u diiwaangeliso</p>
        </div>
      ) : (
        <div className="space-y-2">
          {childrenData.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-xl p-3 border flex items-center gap-3 shadow-sm"
              data-testid={`card-child-${child.id}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: child.avatarColor }}
              >
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{child.name}</p>
                <p className="text-gray-400 text-xs">@{child.username} · {child.age} sano</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(child)}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                  data-testid={`button-edit-child-${child.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Ma hubtaa inaad tirtirayso ${child.name}?`)) {
                      deleteMutation.mutate(child.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  data-testid={`button-delete-child-${child.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link to child login */}
      {childrenData.length > 0 && (
        <button
          onClick={() => setLocation("/child-login")}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-3 flex items-center justify-between hover:opacity-90 transition-all"
          data-testid="button-goto-child-login"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span className="font-medium text-sm">Ilmaha u fur Quraanka Caruurta</span>
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function ChildProgressCard({ child }: { child: ChildProfile }) {
  const { data: progress } = useQuery<ChildProgress>({
    queryKey: ["child-progress", child.id],
    queryFn: async () => {
      const res = await fetch(`/api/children/${child.id}/progress`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const pct = progress ? Math.round((progress.surahsCompleted / progress.totalSurahs) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-100" data-testid={`progress-card-${child.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: child.avatarColor }}
        >
          {child.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-sm">{child.name}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center">
        <div>
          <div className="flex items-center justify-center gap-0.5 text-purple-600">
            <BookOpen className="w-3 h-3" />
            <span className="text-sm font-bold">{progress?.surahsCompleted ?? 0}</span>
          </div>
          <p className="text-[10px] text-gray-500">Suuro</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-0.5 text-green-600">
            <BarChart3 className="w-3 h-3" />
            <span className="text-sm font-bold">{progress?.averageAccuracy ?? 0}%</span>
          </div>
          <p className="text-[10px] text-gray-500">Saxnaan</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-0.5 text-yellow-600">
            <Star className="w-3 h-3" />
            <span className="text-sm font-bold">{progress?.stars ?? 0}</span>
          </div>
          <p className="text-[10px] text-gray-500">Xiddigaha</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-0.5 text-orange-600">
            <Flame className="w-3 h-3" />
            <span className="text-sm font-bold">{progress?.currentStreak ?? 0}</span>
          </div>
          <p className="text-[10px] text-gray-500">Streak</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-0.5 text-blue-600">
            <Clock className="w-3 h-3" />
            <span className="text-sm font-bold">{progress?.totalTimeMinutes ?? 0}m</span>
          </div>
          <p className="text-[10px] text-gray-500">Waqtiga</p>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
          <span>Horumarka guud</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-purple-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
