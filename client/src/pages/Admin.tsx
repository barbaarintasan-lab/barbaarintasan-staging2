import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput, DebouncedTextarea } from "@/components/DebouncedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Video, FileText, Plus, List, LogOut, LayoutDashboard, BookOpen, CreditCard, CheckCircle, XCircle, Clock, Film, HelpCircle, Trash2, Pencil, Home, MessageSquareQuote, MessageSquare, MessageCircle, Star, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Headphones, Send, User, Users, Search, ClipboardList, DollarSign, Edit2, Lock, X, Calendar, GripVertical, Eye, EyeOff, Sparkles, Loader2, Edit, Ban, Brain, Save, Cloud, ExternalLink, Landmark, Bell, Shield, Radio, Megaphone, GraduationCap, RefreshCw, Download, ImageIcon, Volume2, Play, Pause, Settings, Archive, Mic } from "lucide-react";
import AIModerationPanel from "@/components/AIModerationPanel";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUpload } from "@/hooks/use-upload";
import Papa from "papaparse";
import { ExerciseManager } from "@/components/admin/ExerciseManager";
import { VoiceSpacesAdmin } from "@/components/admin/VoiceSpacesAdmin";
import { useTranslation } from "react-i18next";
import type { FlashcardCategory, Flashcard, Parent, Course, Lesson, Module, Hadith, Reciter, ParentMessage, BedtimeStory, QuizQuestion, OpenEndedQuestion, DriveFile, LessonImage } from "@/types/admin";

// Somali day and month names for date formatting
const SOMALI_DAYS: Record<string, string> = {
  'Sunday': 'Axad',
  'Monday': 'Isniin',
  'Tuesday': 'Talaado',
  'Wednesday': 'Arbaco',
  'Thursday': 'Khamiis',
  'Friday': 'Jimce',
  'Saturday': 'Sabti'
};

const SOMALI_MONTHS: Record<number, string> = {
  0: 'Janaayo',
  1: 'Febraayo',
  2: 'Maarso',
  3: 'Abriil',
  4: 'Maajo',
  5: 'Juun',
  6: 'Luuliyo',
  7: 'Ogosto',
  8: 'Sebteembar',
  9: 'Oktoobar',
  10: 'Nofeembar',
  11: 'Diseembar'
};

const COUNTRY_LABELS: Record<string, string> = {
  somalia: "🇸🇴 Soomaaliya",
  djibouti: "🇩🇯 Jabuuti",
  ethiopia: "🇪🇹 Itoobiya",
  kenya: "🇰🇪 Kenya",
  uganda: "🇺🇬 Uganda",
  tanzania: "🇹🇿 Tanzania",
  eritrea: "🇪🇷 Eritrea",
  sudan: "🇸🇩 Suudaan",
  south_sudan: "🇸🇸 Suudaan Koonfur",
  egypt: "🇪🇬 Masar",
  libya: "🇱🇾 Libya",
  tunisia: "🇹🇳 Tuniisiya",
  algeria: "🇩🇿 Aljeeriya",
  morocco: "🇲🇦 Morooko",
  south_africa: "🇿🇦 Koonfur Afrika",
  nigeria: "🇳🇬 Nayjeeriya",
  ghana: "🇬🇭 Ghana",
  cameroon: "🇨🇲 Kaameruun",
  senegal: "🇸🇳 Senegaal",
  mali: "🇲🇱 Maali",
  rwanda: "🇷🇼 Rwanda",
  burundi: "🇧🇮 Burundi",
  congo_drc: "🇨🇩 Kongo (DRC)",
  angola: "🇦🇴 Angola",
  mozambique: "🇲🇿 Mozambique",
  zambia: "🇿🇲 Zambia",
  zimbabwe: "🇿🇼 Zimbabwe",
  botswana: "🇧🇼 Botswana",
  namibia: "🇳🇦 Namibia",
  mauritius: "🇲🇺 Mauritius",
  usa: "🇺🇸 Maraykanka",
  canada: "🇨🇦 Kanada",
  mexico: "🇲🇽 Meksiko",
  brazil: "🇧🇷 Baraasiil",
  argentina: "🇦🇷 Argentina",
  chile: "🇨🇱 Chile",
  colombia: "🇨🇴 Colombia",
  peru: "🇵🇪 Peru",
  venezuela: "🇻🇪 Venezuela",
  ecuador: "🇪🇨 Ecuador",
  uk: "🇬🇧 Ingiriiska",
  germany: "🇩🇪 Jarmalka",
  france: "🇫🇷 Faransiiska",
  italy: "🇮🇹 Talyaaniga",
  spain: "🇪🇸 Isbaaniya",
  portugal: "🇵🇹 Bortuqaal",
  netherlands: "🇳🇱 Holland",
  belgium: "🇧🇪 Beljiyam",
  switzerland: "🇨🇭 Swiiserlaand",
  austria: "🇦🇹 Osteeriya",
  sweden: "🇸🇪 Iswiidhan",
  norway: "🇳🇴 Noorweey",
  denmark: "🇩🇰 Denmark",
  finland: "🇫🇮 Finland",
  ireland: "🇮🇪 Irlandia",
  poland: "🇵🇱 Boolaand",
  czech: "🇨🇿 Jeek",
  hungary: "🇭🇺 Hangari",
  romania: "🇷🇴 Romania",
  bulgaria: "🇧🇬 Bulgaria",
  greece: "🇬🇷 Giriig",
  turkey: "🇹🇷 Turkiga",
  russia: "🇷🇺 Ruushka",
  ukraine: "🇺🇦 Ukraine",
  saudi: "🇸🇦 Sacuudi Carabiya",
  uae: "🇦🇪 Imaaraadka",
  qatar: "🇶🇦 Qadar",
  kuwait: "🇰🇼 Kuwait",
  bahrain: "🇧🇭 Baxrayn",
  oman: "🇴🇲 Cumaan",
  yemen: "🇾🇪 Yaman",
  jordan: "🇯🇴 Urdun",
  lebanon: "🇱🇧 Lubnaan",
  syria: "🇸🇾 Suuriya",
  iraq: "🇮🇶 Ciraaq",
  iran: "🇮🇷 Iiraan",
  israel: "🇮🇱 Israa'iil",
  palestine: "🇵🇸 Falastiin",
  pakistan: "🇵🇰 Bakistaan",
  india: "🇮🇳 Hindiya",
  bangladesh: "🇧🇩 Bangaladesh",
  sri_lanka: "🇱🇰 Sri Lanka",
  nepal: "🇳🇵 Nepal",
  afghanistan: "🇦🇫 Afgaanistaan",
  china: "🇨🇳 Shiinaha",
  japan: "🇯🇵 Jabaan",
  south_korea: "🇰🇷 Kuuriya Koonfur",
  north_korea: "🇰🇵 Kuuriya Waqooyi",
  vietnam: "🇻🇳 Vietnam",
  thailand: "🇹🇭 Tayland",
  malaysia: "🇲🇾 Malaysia",
  singapore: "🇸🇬 Singapore",
  indonesia: "🇮🇩 Indonesia",
  philippines: "🇵🇭 Filibiin",
  australia: "🇦🇺 Awsteeraaliya",
  new_zealand: "🇳🇿 Niyuu Siilaan",
  other: "🌍 Wadan Kale"
};

function getCountryLabel(code: string): string {
  return COUNTRY_LABELS[code?.toLowerCase()] || code || "";
}

function normalizeCountry(country: string | null | undefined): string {
  if (!country) return "";
  const lower = country.toLowerCase().trim();
  // Map common Somali country name variations to their codes
  if (lower === "soomaaliya" || lower === "somali" || lower === "somalia") return "somalia";
  if (lower === "jabuuti" || lower === "djibouti") return "djibouti";
  if (lower === "itoobiya" || lower === "ethiopia") return "ethiopia";
  if (lower === "kenya" || lower === "kiinya") return "kenya";
  if (lower === "masar" || lower === "egypt") return "egypt";
  return lower;
}

function formatSomaliDateTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const somaliDay = SOMALI_DAYS[dayName] || dayName;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${somaliDay} ${day}.${month}.${year} Saacadda ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function FlashcardManager() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", nameEnglish: "", iconEmoji: "", description: "" });
  const [flashcardForm, setFlashcardForm] = useState({ nameSomali: "", nameEnglish: "", imageUrl: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingFlashcard, setEditingFlashcard] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setFlashcardForm(prev => ({ ...prev, imageUrl: response.objectPath }));
      toast.success("Sawirka waa la soo galiyay!");
    },
    onError: (error) => {
      toast.error("Sawirka lama soo galin karin: " + error.message);
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Fadlan dooro sawir (image file)");
        return;
      }
      await uploadFile(file);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const { data: categories = [], isLoading: loadingCategories } = useQuery<FlashcardCategory[]>({
    queryKey: ["/api/admin/flashcard-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flashcard-categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: flashcards = [], isLoading: loadingFlashcards } = useQuery<Flashcard[]>({
    queryKey: ["/api/admin/flashcard-categories", selectedCategoryId, "flashcards"],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const res = await fetch(`/api/admin/flashcard-categories/${selectedCategoryId}/flashcards`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch flashcards");
      return res.json();
    },
    enabled: !!selectedCategoryId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryForm) => {
      const res = await fetch("/api/admin/flashcard-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories"] });
      setCategoryForm({ name: "", nameEnglish: "", iconEmoji: "", description: "" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof categoryForm> }) => {
      const res = await fetch(`/api/admin/flashcard-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories"] });
      setEditingCategory(null);
      setCategoryForm({ name: "", nameEnglish: "", iconEmoji: "", description: "" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/flashcard-categories/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete category");
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories"] });
      // Clear selected category if it was deleted
      if (selectedCategoryId === deletedId) {
        setSelectedCategoryId(null);
      }
    },
  });

  const createFlashcardMutation = useMutation({
    mutationFn: async (data: { categoryId: string; nameSomali: string; nameEnglish?: string; imageUrl: string }) => {
      const res = await fetch("/api/admin/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create flashcard");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories", selectedCategoryId, "flashcards"] });
      setFlashcardForm({ nameSomali: "", nameEnglish: "", imageUrl: "" });
    },
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof flashcardForm> }) => {
      const res = await fetch(`/api/admin/flashcards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update flashcard");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories", selectedCategoryId, "flashcards"] });
      setEditingFlashcard(null);
      setFlashcardForm({ nameSomali: "", nameEnglish: "", imageUrl: "" });
    },
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/flashcards/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete flashcard");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories", selectedCategoryId, "flashcards"] });
    },
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const handleGenerateAIFlashcards = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/admin/flashcards/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate AI flashcards");
      }
      const result = await res.json();
      toast.success(`Waad ku guulaysatay! ${result.generated} flashcard cusub ayaa la sameeyay.`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flashcard-categories"] });
    } catch (error: any) {
      toast.error(error.message || "Khalad ayaa dhacay");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCreateCategory = () => {
    if (!categoryForm.name.trim()) return;
    createCategoryMutation.mutate(categoryForm);
  };

  const handleEditCategory = (cat: FlashcardCategory) => {
    setEditingCategory(cat.id);
    setCategoryForm({ name: cat.name, nameEnglish: cat.nameEnglish || "", iconEmoji: cat.iconEmoji || "", description: cat.description || "" });
  };

  const handleSaveCategory = () => {
    if (!editingCategory || !categoryForm.name.trim()) return;
    updateCategoryMutation.mutate({ id: editingCategory, data: categoryForm });
  };

  const handleCreateFlashcard = () => {
    if (!selectedCategoryId || !flashcardForm.nameSomali.trim() || !flashcardForm.imageUrl.trim()) return;
    createFlashcardMutation.mutate({
      categoryId: selectedCategoryId,
      nameSomali: flashcardForm.nameSomali,
      nameEnglish: flashcardForm.nameEnglish || undefined,
      imageUrl: flashcardForm.imageUrl,
    });
  };

  const handleEditFlashcard = (card: Flashcard) => {
    setEditingFlashcard(card.id);
    setFlashcardForm({ nameSomali: card.nameSomali, nameEnglish: card.nameEnglish || "", imageUrl: card.imageUrl });
  };

  const handleSaveFlashcard = () => {
    if (!editingFlashcard || !flashcardForm.nameSomali.trim()) return;
    updateFlashcardMutation.mutate({ id: editingFlashcard, data: flashcardForm });
  };

  return (
    <div className="space-y-6">
      {/* AI Generation Button */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-purple-800">AI Flashcard Generator</h3>
          <p className="text-sm text-purple-600">Samee 3 flashcard cusub oo sawirkooda AI sameeyo</p>
        </div>
        <Button
          onClick={handleGenerateAIFlashcards}
          disabled={isGeneratingAI}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="button-generate-ai-flashcards"
        >
          {isGeneratingAI ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Waa la sameynayaa...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Flashcards</>
          )}
        </Button>
      </div>

      {/* Categories Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Qaybaha (Categories)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Magaca (Somali)"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            data-testid="input-category-name"
          />
          <Input
            placeholder="English Name (Optional)"
            value={categoryForm.nameEnglish}
            onChange={(e) => setCategoryForm({ ...categoryForm, nameEnglish: e.target.value })}
            data-testid="input-category-name-english"
          />
          <Input
            placeholder="Emoji 🍎"
            value={categoryForm.iconEmoji}
            onChange={(e) => setCategoryForm({ ...categoryForm, iconEmoji: e.target.value })}
            data-testid="input-category-emoji"
          />
          {editingCategory ? (
            <div className="flex gap-2">
              <Button onClick={handleSaveCategory} disabled={updateCategoryMutation.isPending} data-testid="button-save-category">
                Kaydi
              </Button>
              <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", nameEnglish: "", iconEmoji: "", description: "" }); }}>
                Ka noqo
              </Button>
            </div>
          ) : (
            <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending || !categoryForm.name.trim()} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-1" /> Ku Dar Qayb
            </Button>
          )}
        </div>

        {/* Categories List */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {loadingCategories ? (
            <p>Loading...</p>
          ) : (
            categories.map((cat: FlashcardCategory) => (
              <div
                key={cat.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCategoryId === cat.id ? "bg-blue-100 border-blue-500" : "bg-white hover:bg-gray-50"}`}
                onClick={() => setSelectedCategoryId(cat.id)}
                data-testid={`category-item-${cat.id}`}
              >
                <div className="text-2xl text-center mb-1">{cat.iconEmoji || "📚"}</div>
                <div className="text-center font-medium text-sm">{cat.name}</div>
                <div className="text-center text-xs text-gray-500">{cat.nameEnglish}</div>
                <div className="flex justify-center gap-1 mt-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} data-testid={`button-edit-category-${cat.id}`}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(cat.id); }} data-testid={`button-delete-category-${cat.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flashcards Section */}
      {selectedCategoryId && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4">Kaararka: {categories.find((c: FlashcardCategory) => c.id === selectedCategoryId)?.name}</h3>
          
          {/* Add/Edit Flashcard Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Magaca Soomaaliga"
              value={flashcardForm.nameSomali}
              onChange={(e) => setFlashcardForm({ ...flashcardForm, nameSomali: e.target.value })}
              data-testid="input-flashcard-somali"
            />
            <Input
              placeholder="English Name (Optional)"
              value={flashcardForm.nameEnglish}
              onChange={(e) => setFlashcardForm({ ...flashcardForm, nameEnglish: e.target.value })}
              data-testid="input-flashcard-english"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Sawirka URL"
                value={flashcardForm.imageUrl}
                onChange={(e) => setFlashcardForm({ ...flashcardForm, imageUrl: e.target.value })}
                data-testid="input-flashcard-image"
                className="flex-1"
              />
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-image"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {progress}%</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" /> Upload</>
                )}
              </Button>
            </div>
            {editingFlashcard ? (
              <div className="flex gap-2">
                <Button onClick={handleSaveFlashcard} disabled={updateFlashcardMutation.isPending} data-testid="button-save-flashcard">
                  Kaydi
                </Button>
                <Button variant="outline" onClick={() => { setEditingFlashcard(null); setFlashcardForm({ nameSomali: "", nameEnglish: "", imageUrl: "" }); }}>
                  Ka noqo
                </Button>
              </div>
            ) : (
              <Button onClick={handleCreateFlashcard} disabled={createFlashcardMutation.isPending || !flashcardForm.nameSomali.trim() || !flashcardForm.imageUrl.trim()} data-testid="button-add-flashcard">
                <Plus className="w-4 h-4 mr-1" /> Ku Dar Kaar
              </Button>
            )}
          </div>

          {/* Flashcards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {loadingFlashcards ? (
              <p>Loading...</p>
            ) : flashcards.length === 0 ? (
              <p className="col-span-full text-center text-gray-500 py-8">Weli kaaro ma jiraan. Ku dar mid cusub!</p>
            ) : (
              flashcards.map((card: Flashcard) => (
                <div key={card.id} className="bg-white rounded-lg border p-3 text-center" data-testid={`flashcard-item-${card.id}`}>
                  <img src={card.imageUrl} alt={card.nameSomali} className="w-full h-24 object-cover rounded-lg mb-2" />
                  <div className="font-bold text-lg">{card.nameSomali}</div>
                  {card.nameEnglish && <div className="text-sm text-gray-500">{card.nameEnglish}</div>}
                  <div className="flex justify-center gap-1 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEditFlashcard(card)} data-testid={`button-edit-flashcard-${card.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteFlashcardMutation.mutate(card.id)} data-testid={`button-delete-flashcard-${card.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Form states
  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedVideoPath, setUploadedVideoPath] = useState("");
  const [textContent, setTextContent] = useState("");
  const [moduleNumber, setModuleNumber] = useState("1");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showNewModuleInput, setShowNewModuleInput] = useState(false);
  
  // New course states (used for quick add form on upload page)
  const [showNewCourseInput, setShowNewCourseInput] = useState(false);
  
  // Edit course prices state
  const [editingCoursePrices, setEditingCoursePrices] = useState<string | null>(null);
  const [editPriceOneTime, setEditPriceOneTime] = useState("");
  const [editPriceMonthly, setEditPriceMonthly] = useState("");
  const [editPriceYearly, setEditPriceYearly] = useState("");
  const [duration, setDuration] = useState("");
  const [lessonType, setLessonType] = useState<"video" | "text" | "quiz" | "assignment" | "live" | "sawirro" | "audio">("video");
  
  // Inline quiz fields for lesson type = quiz
  const [inlineQuizTitle, setInlineQuizTitle] = useState("");
  const [inlineQuizDescription, setInlineQuizDescription] = useState("");
  const [inlineQuizQuestions, setInlineQuizQuestions] = useState<QuizQuestion[]>([]);
  const [inlineQuestion, setInlineQuestion] = useState("");
  const [inlineOptions, setInlineOptions] = useState(["", "", "", ""]);
  const [inlineCorrectAnswer, setInlineCorrectAnswer] = useState(0);
  const [inlineExplanation, setInlineExplanation] = useState("");
  // New quiz question form fields
  const [newQuizQuestion, setNewQuizQuestion] = useState("");
  const [newQuizOption1, setNewQuizOption1] = useState("");
  const [newQuizOption2, setNewQuizOption2] = useState("");
  const [newQuizOption3, setNewQuizOption3] = useState("");
  const [newQuizOption4, setNewQuizOption4] = useState("");
  const [newQuizCorrectAnswer, setNewQuizCorrectAnswer] = useState(0);
  const [newQuizExplanation, setNewQuizExplanation] = useState("");
  // AI quiz generation
  const [aiQuizContent, setAiQuizContent] = useState("");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [aiQuizNumQuestions, setAiQuizNumQuestions] = useState("5");
  const [aiQuizType, setAiQuizType] = useState<"multiple_choice" | "true_false" | "mixed">("multiple_choice");
  // Edit quiz question
  const [editingQuizIndex, setEditingQuizIndex] = useState<number | null>(null);
  const [editQuizQuestion, setEditQuizQuestion] = useState("");
  const [editQuizOptions, setEditQuizOptions] = useState(["", "", "", ""]);
  const [editQuizCorrectAnswer, setEditQuizCorrectAnswer] = useState(0);
  const [editQuizExplanation, setEditQuizExplanation] = useState("");
  // AI Cashar Tools states
  const [aiLessonTopic, setAiLessonTopic] = useState("");
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [lessonVoice, setLessonVoice] = useState<"ubax" | "muuse">("muuse");
  const [isGeneratingLessonAudio, setIsGeneratingLessonAudio] = useState(false);
  const [showLessonAiSettings, setShowLessonAiSettings] = useState(false);
  const [lessonAiPrompt, setLessonAiPrompt] = useState("");
  const [isPlayingLessonAudio, setIsPlayingLessonAudio] = useState(false);
  const lessonAudioRef = useRef<HTMLAudioElement | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  // Open-ended (text-only) questions - Su'aalo qoraal ah oo keliya
  const [openEndedQuestions, setOpenEndedQuestions] = useState<OpenEndedQuestion[]>([]);
  const [newOpenEndedQuestion, setNewOpenEndedQuestion] = useState("");
  const [newOpenEndedHint, setNewOpenEndedHint] = useState("");
  const [editingOpenEndedIndex, setEditingOpenEndedIndex] = useState<number | null>(null);
  const [editOpenEndedQuestion, setEditOpenEndedQuestion] = useState("");
  const [editOpenEndedHint, setEditOpenEndedHint] = useState("");
  
  // Inline assignment fields for lesson type = assignment
  const [inlineAssignmentTitle, setInlineAssignmentTitle] = useState("");
  const [inlineAssignmentDescription, setInlineAssignmentDescription] = useState("");
  
  // Live lesson states
  const [isLiveLesson, setIsLiveLesson] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [liveDate, setLiveDate] = useState("");
  const [liveDateTime, setLiveDateTime] = useState("");
  const [liveTimezone, setLiveTimezone] = useState("Africa/Mogadishu");
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  
  // Edit lesson state
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonOrder, setEditingLessonOrder] = useState<number | null>(null);
  
  // Lesson unlock settings
  const [unlockType, setUnlockType] = useState<"immediate" | "date" | "days_after_enrollment" | "days_after_previous">("immediate");
  const [unlockDate, setUnlockDate] = useState("");
  const [unlockDaysAfter, setUnlockDaysAfter] = useState("");
  const [videoWatchRequired, setVideoWatchRequired] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("upload");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [isGeneratingDhambaal, setIsGeneratingDhambaal] = useState(false);
  const [isGeneratingMaaweelo, setIsGeneratingMaaweelo] = useState(false);
  const [isSeedingContent, setIsSeedingContent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Lesson accessibility report
  const [showAccessibilityReport, setShowAccessibilityReport] = useState(false);
  const [accessibilityReport, setAccessibilityReport] = useState<any>(null);
  const [isLoadingAccessibilityReport, setIsLoadingAccessibilityReport] = useState(false);
  const [isExportingUsersWP, setIsExportingUsersWP] = useState(false);
  
  // Content Creator states
  const [contentType, setContentType] = useState<"dhambaal" | "sheeko">("dhambaal");
  const [contentPrompt, setContentPrompt] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedTitleSomali, setEditedTitleSomali] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedKeyPoints, setEditedKeyPoints] = useState("");
  const [editedMoralLesson, setEditedMoralLesson] = useState("");
  const [editedCharacterName, setEditedCharacterName] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<"muuse" | "ubax">("muuse");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [contentStep, setContentStep] = useState<1 | 2>(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [importResult, setImportResult] = useState<{ dhambaal: number; maaweelo: number; skipped: number } | null>(null);
  
  // New parents notification badge
  const [newParentsCount, setNewParentsCount] = useState(0);
  const lastViewedParentsRef = useRef<string | null>(null);
  
  // Testimonial states
  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialLocation, setTestimonialLocation] = useState("");
  const [testimonialCourseTag, setTestimonialCourseTag] = useState("");
  const [testimonialRating, setTestimonialRating] = useState("5");
  const [testimonialMessage, setTestimonialMessage] = useState("");
  const [testimonialIsPublished, setTestimonialIsPublished] = useState(true);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);

  // Course management states
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("general");
  const [newCourseOrder, setNewCourseOrder] = useState("0");
  const [newCourseAgeRange, setNewCourseAgeRange] = useState("");
  const [newCourseImageUrl, setNewCourseImageUrl] = useState("");
  const [newCoursePriceOneTime, setNewCoursePriceOneTime] = useState("");
  const [newCoursePriceMonthly, setNewCoursePriceMonthly] = useState("");
  const [newCoursePriceYearly, setNewCoursePriceYearly] = useState("");
  const [newCourseComingSoonMessage, setNewCourseComingSoonMessage] = useState("");
  const [newCourseIsLive, setNewCourseIsLive] = useState(false);
  const [newCourseContentReady, setNewCourseContentReady] = useState(false);
  const [newCourseIsFree, setNewCourseIsFree] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);
  const [uploadingCourseImageId, setUploadingCourseImageId] = useState<string | null>(null);
  const [reorderingCourseId, setReorderingCourseId] = useState<string | null>(null);

  // Telegram referral (parent feedback) states
  const [parentFeedbackName, setParentFeedbackName] = useState("");
  const [parentFeedbackUsername, setParentFeedbackUsername] = useState("");
  const [parentFeedbackGroup, setParentFeedbackGroup] = useState("");
  const [parentFeedbackNotes, setParentFeedbackNotes] = useState("");

  // Quiz states
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState("");
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<{question: string; options: string[]; correctAnswer: number; explanation: string}[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentOptions, setCurrentOptions] = useState(["", "", "", ""]);
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState(0);
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [quizSearchTerm, setQuizSearchTerm] = useState("");

  // Assignment states
  const [selectedCourseForAssignment, setSelectedCourseForAssignment] = useState("");
  const [selectedLessonForAssignment, setSelectedLessonForAssignment] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState("");
  
  // Daily Tips states
  const [tipAgeRange, setTipAgeRange] = useState("0-6");
  const [tipTitle, setTipTitle] = useState("");
  const [tipContent, setTipContent] = useState("");
  const [tipCategory, setTipCategory] = useState("");
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  
  // Tip Scheduling states
  const [scheduleType, setScheduleType] = useState<"day" | "week">("day");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledWeek, setScheduledWeek] = useState("");
  const [selectedTipForSchedule, setSelectedTipForSchedule] = useState("");
  const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState("none");
  const [schedulePriority, setSchedulePriority] = useState("0");
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  
  // Milestones states
  const [milestoneAgeRange, setMilestoneAgeRange] = useState("0-6");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneCategory, setMilestoneCategory] = useState("Jirka");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // Parent management state
  const [parentSearchQuery, setParentSearchQuery] = useState("");
  const [parentCountryFilter, setParentCountryFilter] = useState("all");
  const [parentGroupFilter, setParentGroupFilter] = useState(false);
  const [parentCourseFilter, setParentCourseFilter] = useState<string | null>(null);
  const [paidParentFilter, setPaidParentFilter] = useState<string | null>(null);
  const [selectedParentForEnrollment, setSelectedParentForEnrollment] = useState<string | null>(null);
  const [enrollmentCourseId, setEnrollmentCourseId] = useState("");
  const [enrollmentPlanType, setEnrollmentPlanType] = useState("lifetime");
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; amount: number } | null>(null);
  const [adminToggleConfirm, setAdminToggleConfirm] = useState<{parent: Parent, makeAdmin: boolean} | null>(null);
  const [hostToggleConfirm, setHostToggleConfirm] = useState<{parent: Parent, makeHost: boolean} | null>(null);

  // Lesson AI Images state
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenerateCount, setImageGenerateCount] = useState("3");

  // Resource (Maktabadda) states
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceFileUrl, setResourceFileUrl] = useState("");
  const [resourceFileType, setResourceFileType] = useState<"pdf" | "image" | "audio" | "video">("pdf");
  const [resourceCategory, setResourceCategory] = useState<"guide" | "checklist" | "infographic" | "audio">("guide");
  const [resourceAgeRange, setResourceAgeRange] = useState("");
  
  // Quran Reciters states (Shiikhyada Quraanka)
  const [reciterName, setReciterName] = useState("");
  const [reciterNameSomali, setReciterNameSomali] = useState("");
  const [reciterAudioBaseUrl, setReciterAudioBaseUrl] = useState("");
  const [reciterImageUrl, setReciterImageUrl] = useState("");
  const [reciterOrder, setReciterOrder] = useState("1");
  
  // Hadith states (40 Xadiis)
  const [hadithNumber, setHadithNumber] = useState("1");
  const [hadithArabicText, setHadithArabicText] = useState("");
  const [hadithSomaliText, setHadithSomaliText] = useState("");
  const [hadithSource, setHadithSource] = useState("");
  const [hadithNarrator, setHadithNarrator] = useState("");
  const [hadithTopic, setHadithTopic] = useState("");
  const [editingHadith, setEditingHadith] = useState<Hadith | null>(null);
  const [editHadithSomaliText, setEditHadithSomaliText] = useState("");
  const [hadithSearchQuery, setHadithSearchQuery] = useState("");
  const [hadithFilterBook, setHadithFilterBook] = useState<string>("all");
  
  // Parenting Books state
  const [parentingBookTitle, setParentingBookTitle] = useState("");
  const [parentingBookDescription, setParentingBookDescription] = useState("");
  const [parentingBookUrl, setParentingBookUrl] = useState("");
  const [parentingBookImageUrl, setParentingBookImageUrl] = useState("");
  
  // Children's Books state
  const [childrenBookTitle, setChildrenBookTitle] = useState("");
  const [childrenBookDescription, setChildrenBookDescription] = useState("");
  const [childrenBookUrl, setChildrenBookUrl] = useState("");
  const [childrenBookImageUrl, setChildrenBookImageUrl] = useState("");
  
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setUploadedVideoPath(response.objectPath);
      setVideoUrl("");
      toast.success("Video-ga waa la soo geliyey!");
    },
    onError: (error) => {
      toast.error("Khalad: " + error.message);
    }
  });

  const queryClient = useQueryClient();

  // Check auth status on mount - check both admin users and parent admins
  useEffect(() => {
    const checkAuth = async () => {
      // First check regular admin session
      try {
        const adminRes = await fetch("/api/auth/me", { credentials: "include" });
        if (adminRes.ok) {
          setIsLoggedIn(true);
          return;
        }
      } catch {}
      
      // Then check if logged-in parent is an admin
      try {
        const parentRes = await fetch("/api/auth/parent/me", { credentials: "include" });
        if (parentRes.ok) {
          const parentData = await parentRes.json();
          if (parentData.parent?.isAdmin) {
            setIsLoggedIn(true);
            return;
          }
        }
      } catch {}
      
      setIsLoggedIn(false);
    };
    
    checkAuth();
  }, []);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLoginError(data.error || "Magaca ama lambarka ayaa qaldan");
        return;
      }

      setIsLoggedIn(true);
      toast.success("Waad soo gashay!");
    } catch (error) {
      setLoginError("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setIsLoggedIn(false);
      setUsername("");
      setPassword("");
      toast.success("Waad ka baxday!");
    } catch (error) {
      toast.error("Khalad ayaa dhacay");
    }
  };

  // Generate Dhambaalka Waalidka Handler
  const handleGenerateDhambaal = async () => {
    if (isGeneratingDhambaal) return;
    
    // Confirmation dialog
    const confirmed = window.confirm("Ma hubtaa inaad samayso Dhambaal cusub?");
    if (!confirmed) return;
    
    setIsGeneratingDhambaal(true);
    try {
      const res = await fetch("/api/admin/generate-dhambaal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Dhambaalka waa la sameeyay!");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/parent-messages"] });
      } else {
        toast.error(data.error || "Khalad ayaa dhacay");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsGeneratingDhambaal(false);
    }
  };

  // Generate Maaweelada Caruurta Handler
  const handleGenerateMaaweelo = async () => {
    if (isGeneratingMaaweelo) return;
    
    // Confirmation dialog
    const confirmed = window.confirm("Ma hubtaa inaad samayso Sheeko cusub?");
    if (!confirmed) return;
    
    setIsGeneratingMaaweelo(true);
    try {
      const res = await fetch("/api/admin/generate-maaweelo", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Sheekada waa la sameeyay!");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bedtime-stories"] });
      } else {
        toast.error(data.error || "Khalad ayaa dhacay");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsGeneratingMaaweelo(false);
    }
  };

  // Seed Content for Production Handler
  const handleSeedContent = async () => {
    if (isSeedingContent) return;
    
    const confirmed = window.confirm("Ma hubtaa inaad ku darto content-ka production-ka?");
    if (!confirmed) return;
    
    setIsSeedingContent(true);
    try {
      const res = await fetch("/api/admin/seed-content", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Content-ka waa la sameeyay!");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/parent-messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bedtime-stories"] });
      } else {
        toast.error(data.error || "Khalad ayaa dhacay");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsSeedingContent(false);
    }
  };

  // Export Content Handler
  const handleExportContent = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/export-content", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bsa-content-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Waa la soo dejiyay! ${data.parentMessages?.length || 0} Dhambaal iyo ${data.bedtimeStories?.length || 0} Sheeko`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export-ku wuu fashilmay");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUsersWP = async () => {
    if (isExportingUsersWP) return;
    setIsExportingUsersWP(true);
    try {
      const res = await fetch("/api/admin/export-users-wp", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bsa-users-wp-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Waa la soo dejiyay! ${data.totalUsers} users (${data.totalWithEnrollments} enrolled)`);
    } catch (error) {
      console.error("WordPress users export error:", error);
      toast.error(error instanceof Error ? error.message : "Export-ku wuu fashilmay");
    } finally {
      setIsExportingUsersWP(false);
    }
  };

  // Import Content Handler
  const handleImportContent = async () => {
    if (isImporting) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch("/api/admin/import-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok) {
          toast.success(result.message || "Content-ka waa la soo dejiyay!");
          queryClient.invalidateQueries({ queryKey: ["/api/admin/parent-messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/bedtime-stories"] });
        } else {
          toast.error(result.error || "Import-ku wuu fashilmay");
        }
      } catch (error) {
        console.error("JSON import error:", error);
        toast.error("File-ka JSON-ka ma aha sax");
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  // Content Creator Handlers
  const handleGenerateContent = async () => {
    if (isGeneratingContent || !contentPrompt.trim()) {
      if (!contentPrompt.trim()) {
        toast.error("Fadlan ku qor mawduuca");
      }
      return;
    }
    
    setIsGeneratingContent(true);
    setGeneratedContent(null);
    setGeneratedAudioBase64(null);
    
    try {
      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: contentType,
          customPrompt: contentPrompt
        }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGeneratedContent(data.content);
        // Populate edit fields
        if (contentType === "dhambaal") {
          setEditedTitle(data.content.title || "");
          setEditedContent(data.content.content || "");
          setEditedKeyPoints(data.content.keyPoints || "");
        } else {
          setEditedTitle(data.content.title || "");
          setEditedTitleSomali(data.content.titleSomali || "");
          setEditedContent(data.content.content || "");
          setEditedMoralLesson(data.content.moralLesson || "");
          setEditedCharacterName(data.content.characterName || "");
        }
        setContentStep(1);
        toast.success("Qoraalka waa la sameeyay!");
      } else {
        toast.error(data.error || "Khalad ayaa dhacay");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (isGeneratingAudio || !editedContent.trim()) {
      if (!editedContent.trim()) {
        toast.error("Qoraalka waa loo baahan yahay");
      }
      return;
    }
    
    setIsGeneratingAudio(true);
    
    try {
      // For Dhambaal, include key points in the audio text
      let audioText = editedContent;
      if (contentType === "dhambaal" && editedKeyPoints.trim()) {
        audioText = `${editedContent}\n\nQodobyo Muhiim ah:\n${editedKeyPoints}`;
      }
      
      const res = await fetch("/api/admin/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: audioText,
          voiceName: selectedVoice
        }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGeneratedAudioBase64(data.audioBase64);
        setContentStep(2);
        toast.success(`Codka waa la sameeyay! (${data.voice})`);
      } else {
        toast.error(data.error || "Codka lama sameyn karin");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (uploadedImages.length + files.length > 5) {
      toast.error("Ugu badnaan 5 sawir ayaad soo gelin kartaa");
      return;
    }
    
    setIsUploadingImage(true);
    
    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(file);
        const imageBase64 = await base64Promise;
        
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            imageBase64,
            fileName: `${Date.now()}_${file.name}`,
            mimeType: file.type,
            type: contentType
          }),
        });
        
        const data = await res.json();
        if (res.ok && data.imageUrl) {
          setUploadedImages(prev => [...prev, data.imageUrl]);
          toast.success("Sawirka waa la soo geliyay!");
        } else {
          toast.error(data.error || "Sawirka lama soo gelin karin");
        }
      } catch (error) {
        toast.error("Khalad - sawirka lama soo gelin karin");
      }
    }
    
    setIsUploadingImage(false);
    e.target.value = '';
  };

  const handleSaveContent = async () => {
    if (isSavingContent) return;
    
    setIsSavingContent(true);
    
    try {
      const payload: any = {
        type: contentType,
        title: editedTitle,
        content: editedContent,
        isPublished: true,
        audioBase64: generatedAudioBase64,
        images: uploadedImages
      };
      
      if (contentType === "dhambaal") {
        payload.keyPoints = editedKeyPoints;
      } else {
        payload.titleSomali = editedTitleSomali;
        payload.moralLesson = editedMoralLesson;
        payload.characterName = editedCharacterName;
        payload.characterType = "sahabi";
      }
      
      const res = await fetch("/api/admin/save-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || "Waa la kaydiyay!");
        // Reset form completely
        resetContentCreator();
        // Refresh lists
        queryClient.invalidateQueries({ queryKey: ["/api/admin/parent-messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bedtime-stories"] });
      } else {
        toast.error(data.error || "Keydi ma sameyn karin");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsSavingContent(false);
    }
  };

  const resetContentCreator = () => {
    setContentPrompt("");
    setGeneratedContent(null);
    setEditedTitle("");
    setEditedTitleSomali("");
    setEditedContent("");
    setEditedKeyPoints("");
    setEditedMoralLesson("");
    setEditedCharacterName("");
    setGeneratedAudioBase64(null);
    setUploadedImages([]);
    setContentStep(1);
  };

  // Import content from Google Drive
  const handleImportFromGoogleDrive = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const response = await fetch("/api/admin/import/all", {
        method: "POST",
        credentials: "include"
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setImportResult({
          dhambaal: data.imported.dhambaal,
          maaweelo: data.imported.maaweelo,
          skipped: data.imported.skipped
        });
        toast.success(`Import guul: ${data.imported.dhambaal} dhambaal, ${data.imported.maaweelo} sheeko`);
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/parent-messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bedtime-stories"] });
      } else {
        toast.error(data.message || "Import khalad");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Khalad ayaa dhacay import-ga");
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateAiImages = async () => {
    if (!editedContent.trim()) {
      toast.error("Fadlan marka hore qor qoraalka (Qoraalka)");
      return;
    }
    
    if (uploadedImages.length >= 5) {
      toast.error("Ugu badnaan 5 sawir ayaad ku dari kartaa");
      return;
    }
    
    setIsGeneratingAiImage(true);
    const successfulImages: string[] = [];
    const imagesToGenerate = 5 - uploadedImages.length;
    
    try {
      toast.info(`${imagesToGenerate} sawir ayaa la soo samaynayaa... Fadlan sug.`);
      
      for (let i = 0; i < imagesToGenerate; i++) {
        // Create varied prompts from the content for each image
        const promptVariations = [
          `Somali family illustration: ${editedContent.slice(0, 200)}`,
          `Educational Islamic art style showing: ${editedTitle || editedContent.slice(0, 150)}`,
          `Somali mother and child learning scene inspired by: ${editedContent.slice(0, 180)}`,
          `Warm family moment illustration: ${editedContent.slice(50, 250)}`,
          `Islamic educational artwork depicting: ${editedContent.slice(100, 300)}`
        ];
        
        const prompt = promptVariations[i] || promptVariations[0];
        
        try {
          const generateRes = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ prompt }),
          });
          
          const generateData = await generateRes.json();
          
          if (!generateRes.ok || !generateData.b64_json) {
            console.error(`Image ${i + 1} generation failed:`, generateData.error);
            continue;
          }
          
          const uploadRes = await fetch("/api/admin/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              imageBase64: generateData.b64_json,
              fileName: `ai_generated_${Date.now()}_${i}.png`,
              mimeType: "image/png",
              type: contentType
            }),
          });
          
          const uploadData = await uploadRes.json();
          
          if (uploadRes.ok && uploadData.imageUrl) {
            successfulImages.push(uploadData.imageUrl);
            setUploadedImages(prev => [...prev, uploadData.imageUrl]);
          }
        } catch (err) {
          console.error(`Error generating image ${i + 1}:`, err);
        }
      }
      
      if (successfulImages.length > 0) {
        toast.success(`${successfulImages.length} sawir ayaa si guul leh loo sameeyay!`);
      } else {
        toast.error("Sawirada lama soo saari karin. Fadlan mar kale isku day.");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan mar kale isku day.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch lessons
  const { data: lessons = [], refetch: refetchLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Count only lessons with actual content (not empty placeholders)
  const lessonsWithContent = useMemo(() => {
    return lessons.filter((lesson: any) => 
      lesson.videoUrl || 
      lesson.textContent || 
      lesson.liveUrl || 
      lesson.assignmentRequirements
    );
  }, [lessons]);

  // Fetch modules for selected course
  const { data: courseModules = [], refetch: refetchModules } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const res = await fetch(`/api/courses/${selectedCourseId}/modules`);
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
    enabled: isLoggedIn && !!selectedCourseId,
  });

  // Fetch all modules for all courses (for lesson list display)
  const { data: allModules = [] } = useQuery({
    queryKey: ["allModules"],
    queryFn: async () => {
      const res = await fetch("/api/modules");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Drag and drop state
  const [draggedLesson, setDraggedLesson] = useState<any>(null);

  // Fetch payment submissions
  const { data: paymentSubmissions = [], refetch: refetchPayments } = useQuery({
    queryKey: ["paymentSubmissions"],
    queryFn: async () => {
      const res = await fetch("/api/payment-submissions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch payment methods for display
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch testimonials
  const { data: testimonialsList = [], refetch: refetchTestimonials } = useQuery({
    queryKey: ["adminTestimonials"],
    queryFn: async () => {
      const res = await fetch("/api/admin/testimonials", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch testimonials");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch telegram referrals (parent feedback)
  const { data: telegramReferrals = [], refetch: refetchTelegramReferrals } = useQuery({
    queryKey: ["telegramReferrals"],
    queryFn: async () => {
      const res = await fetch("/api/telegram-referrals", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch telegram referrals");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all quizzes for admin listing
  const { data: allQuizzes = [], refetch: refetchQuizzes } = useQuery({
    queryKey: ["adminQuizzes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/quizzes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all assignments for admin listing
  const { data: allAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["adminAssignments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all assignment submissions for admin
  const { data: assignmentSubmissions = [] } = useQuery({
    queryKey: ["adminAssignmentSubmissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assignment-submissions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assignment submissions");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all daily tips for admin
  const { data: dailyTips = [], refetch: refetchDailyTips, isError: dailyTipsError, error: dailyTipsErrorMsg, isLoading: isLoadingDailyTips } = useQuery({
    queryKey: ["adminDailyTips"],
    queryFn: async () => {
      const res = await fetch("/api/admin/daily-tips", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Fadhigaagu wuu dhacay. Fadlan dib u soo gal.");
        throw new Error("Failed to fetch daily tips");
      }
      return res.json();
    },
    enabled: isLoggedIn,
    retry: false,
  });

  // Fetch all tip schedules for admin
  const { data: tipSchedules = [], refetch: refetchTipSchedules, isError: tipSchedulesError, error: tipSchedulesErrorMsg, isLoading: isLoadingTipSchedules } = useQuery({
    queryKey: ["adminTipSchedules"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tip-schedules", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Fadhigaagu wuu dhacay. Fadlan dib u soo gal.");
        throw new Error("Failed to fetch tip schedules");
      }
      return res.json();
    },
    enabled: isLoggedIn,
    retry: false,
  });

  // Fetch all milestones for admin
  const { data: milestonesList = [], refetch: refetchMilestones } = useQuery({
    queryKey: ["adminMilestones"],
    queryFn: async () => {
      const res = await fetch("/api/admin/milestones", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all parents for admin
  const { data: parentsList = [], refetch: refetchParents } = useQuery({
    queryKey: ["adminParents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parents");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all enrollments for admin
  const { data: enrollmentsList = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ["adminEnrollments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/enrollments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all resources for admin (Maktabadda)
  const { data: resourcesList = [], refetch: refetchResources } = useQuery({
    queryKey: ["adminResources"],
    queryFn: async () => {
      const res = await fetch("/api/resources/admin", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch Google Drive files for Maktabadda
  const { data: driveFilesList = [], isLoading: driveFilesLoading } = useQuery<DriveFile[]>({
    queryKey: ["adminDriveFiles"],
    queryFn: async () => {
      const res = await fetch("/api/drive/maktabada", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch drive files");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch Quran Reciters for admin (Shiikhyada Quraanka)
  const { data: recitersList = [], refetch: refetchReciters } = useQuery<Reciter[]>({
    queryKey: ["adminQuranReciters"],
    queryFn: async () => {
      const res = await fetch("/api/quran-reciters/admin", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reciters");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch Hadiths for admin (40 Xadiis)
  const { data: hadithsList = [], refetch: refetchHadiths } = useQuery<Hadith[]>({
    queryKey: ["adminHadiths"],
    queryFn: async () => {
      const res = await fetch("/api/hadiths/admin", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hadiths");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch Parenting Books
  const { data: parentingBooksList = [], refetch: refetchParentingBooks } = useQuery<Array<{ id: string; title: string; description: string; url: string; imageUrl: string }>>({
    queryKey: ["adminParentingBooks"],
    queryFn: async () => {
      const res = await fetch("/api/resources?category=parenting-books", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parenting books");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch Children's Books
  const { data: childrenBooksList = [], refetch: refetchChildrenBooks } = useQuery<Array<{ id: string; title: string; description: string; url: string; imageUrl: string }>>({
    queryKey: ["adminChildrenBooks"],
    queryFn: async () => {
      const res = await fetch("/api/resources?category=children-books", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch children books");
      return res.json();
    },
    enabled: isLoggedIn,
  });

  // Fetch all parent messages (including unpublished for admin)
  const { data: parentMessages = [], isLoading: isLoadingMessages, refetch: refetchParentMessages } = useQuery<ParentMessage[]>({
    queryKey: ["/api/admin/parent-messages"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parent-messages", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parent messages");
      return res.json();
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Fetch all bedtime stories (including unpublished for admin)
  const { data: bedtimeStories = [], isLoading: isLoadingStories, refetch: refetchBedtimeStories } = useQuery<BedtimeStory[]>({
    queryKey: ["/api/admin/bedtime-stories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bedtime-stories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bedtime stories");
      return res.json();
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // State for editing parent messages and bedtime stories
  const [editingParentMessage, setEditingParentMessage] = useState<any>(null);
  const [editingBedtimeStory, setEditingBedtimeStory] = useState<any>(null);

  // Update parent message mutation
  const updateParentMessageMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; content?: string; keyPoints?: string; isPublished?: boolean; messageDate?: string }) => {
      const res = await fetch(`/api/parent-messages/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      refetchParentMessages();
      toast.success("Dhambaalka waa la cusboonaysiiyay!");
    },
  });

  // Generate parent message audio mutation
  const generateParentMessageAudioMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent-messages/${id}/generate-audio`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: () => {
      refetchParentMessages();
      toast.success("Audio-ga waa la sameeyay!");
    },
  });

  // Update bedtime story mutation
  const updateBedtimeStoryMutation = useMutation({
    mutationFn: async (data: { id: string; titleSomali?: string; content?: string; moralLesson?: string; isPublished?: boolean; storyDate?: string }) => {
      const res = await fetch(`/api/bedtime-stories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      refetchBedtimeStories();
      toast.success("Sheekada waa la cusboonaysiiyay!");
    },
  });

  // Generate bedtime story audio mutation
  const generateBedtimeStoryAudioMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bedtime-stories/${id}/generate-audio`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: () => {
      refetchBedtimeStories();
      toast.success("Audio-ga waa la sameeyay!");
    },
  });

  // Republish parent message mutation (updates timestamp)
  const republishParentMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent-messages/${id}/republish`, { 
        method: "POST", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to republish");
      return res.json();
    },
    onSuccess: () => {
      refetchParentMessages();
      setEditingParentMessage(null);
      toast.success("Dhambaalka dib ayaa loo fasaxay!");
      // Scroll to top of parent messages list
      setTimeout(() => {
        document.querySelector('[data-testid="parent-messages-list"]')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
  });

  // Republish bedtime story mutation (updates timestamp)
  const republishBedtimeStoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bedtime-stories/${id}/republish`, { 
        method: "POST", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to republish");
      return res.json();
    },
    onSuccess: () => {
      refetchBedtimeStories();
      toast.success("Sheekada dib ayaa loo fasaxay!");
    },
  });

  // Send Telegram notification mutation
  const sendTelegramNotificationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/send-telegram-notification", { 
        method: "POST", 
        credentials: "include" 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notification");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Fariinta Telegram waa la diray!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fariinta lama diri karin");
    },
  });

  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'message' | 'story'; id: string; title: string } | null>(null);
  const [telegramPreview, setTelegramPreview] = useState<{ type: 'dhambaal' | 'maaweelo'; title: string; message: string } | null>(null);

  // Generate Telegram message for parent messages (dhambaal)
  const generateDhambaalTelegramMessage = (title: string) => {
    const baseUrl = "https://appbarbaarintasan.com";
    return `📖 *${title}*

🎧 Halka ka Dhagayso maanta:
${baseUrl}/dhambaal`;
  };

  // Generate Telegram message for bedtime stories (maaweelo)
  const generateMaaweloTelegramMessage = (title: string) => {
    const baseUrl = "https://appbarbaarintasan.com";
    return `🌙 *${title}*

🎧 Halka ka Dhagayso maanta:
${baseUrl}/maaweelo`;
  };

  // Delete parent message mutation
  const deleteParentMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/parent-messages/${id}`, { 
        method: "DELETE", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      refetchParentMessages();
      toast.success("Dhambaalka waa la tirtiray!");
      setDeleteConfirmation(null);
    },
    onError: () => {
      toast.error("Tirtirka ma guulaysan");
    }
  });

  // Delete bedtime story mutation
  const deleteBedtimeStoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/bedtime-stories/${id}`, { 
        method: "DELETE", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      refetchBedtimeStories();
      toast.success("Sheekada waa la tirtiray!");
      setDeleteConfirmation(null);
    },
    onError: () => {
      toast.error("Tirtirka ma guulaysan");
    }
  });

  // Calculate new parents count based on last viewed time
  useEffect(() => {
    if (parentsList.length > 0) {
      const lastViewed = localStorage.getItem("adminLastViewedParents");
      lastViewedParentsRef.current = lastViewed;
      
      if (lastViewed) {
        const lastViewedDate = new Date(lastViewed);
        const newParents = parentsList.filter((p: any) => {
          if (!p.createdAt) return false;
          const parentDate = new Date(p.createdAt);
          return parentDate > lastViewedDate;
        });
        setNewParentsCount(newParents.length);
      } else {
        // First time viewing - show all as new
        setNewParentsCount(parentsList.length);
      }
    }
  }, [parentsList]);

  // Mark parents as viewed when tab is opened
  useEffect(() => {
    if (activeTab === "parents") {
      localStorage.setItem("adminLastViewedParents", new Date().toISOString());
      setNewParentsCount(0);
    }
  }, [activeTab]);

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/payment-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update payment");
      return res.json();
    },
    onSuccess: (_, { status }) => {
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ["golden-membership-sold"] });
      if (status === "approved") {
        toast.success("Lacag bixinta waa la oggolaaday!");
      } else {
        toast.success("Lacag bixinta waa la diiday!");
      }
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete rejected payment submission mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-submissions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete payment");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ["golden-membership-sold"] });
      toast.success("Lacag bixinta waa la tirtiray!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khalad ayaa dhacay");
    },
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (data: { title: string; courseId: string; description: string; category: string; order: number; priceOneTime?: number; priceMonthly?: number; priceYearly?: number }) => {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create course");
      return res.json();
    },
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setSelectedCourseId(newCourse.id);
      setNewCourseTitle("");
      setNewCourseId("");
      setNewCourseDescription("");
      setNewCourseCategory("general");
      setNewCoursePriceOneTime("");
      setNewCoursePriceMonthly("");
      setNewCoursePriceYearly("");
      setShowNewCourseInput(false);
      toast.success("Koorsada cusub waa lagu daray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Update course prices mutation
  const updateCoursePricesMutation = useMutation({
    mutationFn: async (data: { id: string; priceOneTime?: number | null; priceMonthly?: number | null; priceYearly?: number | null }) => {
      const res = await fetch(`/api/courses/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceOneTime: data.priceOneTime,
          priceMonthly: data.priceMonthly,
          priceYearly: data.priceYearly,
        }),
      });
      if (!res.ok) throw new Error("Failed to update course prices");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setEditingCoursePrices(null);
      setEditPriceOneTime("");
      setEditPriceMonthly("");
      setEditPriceYearly("");
      toast.success("Qiimaha koorsada waa la cusboonaysiiyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Toggle course visibility mutation
  const toggleCourseVisibilityMutation = useMutation({
    mutationFn: async (data: { id: string; isLive: boolean }) => {
      const res = await fetch(`/api/courses/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isLive: data.isLive }),
      });
      if (!res.ok) throw new Error("Failed to update course visibility");
      return res.json();
    },
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(updatedCourse.isLive ? "Koorsada waa la furay!" : "Koorsada waa la qariyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Toggle course content ready mutation
  const toggleContentReadyMutation = useMutation({
    mutationFn: async (data: { id: string; contentReady: boolean }) => {
      const res = await fetch(`/api/courses/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentReady: data.contentReady }),
      });
      if (!res.ok) throw new Error("Failed to update content ready status");
      return res.json();
    },
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(updatedCourse.contentReady ? "Koorsada content waa diyaar!" : "Koorsada content weli diyaar maaha!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: { courseId: string; title: string; order: number }) => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create module");
      return res.json();
    },
    onSuccess: (newModule) => {
      refetchModules();
      queryClient.invalidateQueries({ queryKey: ["allModules"] });
      setSelectedModuleId(newModule.id);
      setModuleNumber(String(newModule.order || 1)); // Update legacy moduleNumber
      setNewModuleTitle("");
      setShowNewModuleInput(false);
      toast.success("Qaybta cusub waa lagu daray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; order?: number } }) => {
      const res = await fetch(`/api/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update module");
      return res.json();
    },
    onSuccess: () => {
      refetchModules();
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["allModules"] });
      toast.success("Qaybta waa la cusbooneysiiyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/modules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete module");
      return res.json();
    },
    onSuccess: () => {
      refetchModules();
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["allModules"] });
      toast.success("Qaybta waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // State for editing module in list
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  // Create testimonial mutation
  const createTestimonialMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create testimonial");
      return res.json();
    },
    onSuccess: () => {
      refetchTestimonials();
      toast.success("Waayo-aragnimada waa lagu daray!");
      resetTestimonialForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Update testimonial mutation
  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update testimonial");
      return res.json();
    },
    onSuccess: () => {
      refetchTestimonials();
      toast.success("Waayo-aragnimada waa la cusboonaysiiyay!");
      resetTestimonialForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete testimonial mutation
  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete testimonial");
      return res.json();
    },
    onSuccess: () => {
      refetchTestimonials();
      toast.success("Waayo-aragnimada waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create telegram referral (parent feedback) mutation
  const createTelegramReferralMutation = useMutation({
    mutationFn: async (data: { parentName: string; telegramUsername?: string; telegramGroupName?: string; notes?: string }) => {
      const res = await fetch("/api/admin/telegram-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create parent feedback");
      return res.json();
    },
    onSuccess: () => {
      refetchTelegramReferrals();
      toast.success("Feedback-ka waalidka waa lagu daray!");
      setParentFeedbackName("");
      setParentFeedbackUsername("");
      setParentFeedbackGroup("");
      setParentFeedbackNotes("");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete telegram referral mutation
  const deleteTelegramReferralMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/telegram-referrals/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete parent feedback");
      return res.json();
    },
    onSuccess: () => {
      refetchTelegramReferrals();
      toast.success("Feedback-ka waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Daily Tips mutations
  const createTipMutation = useMutation({
    mutationFn: async (data: { ageRange: string; title: string; content: string; category?: string }) => {
      const res = await fetch("/api/admin/daily-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tip");
      return res.json();
    },
    onSuccess: () => {
      refetchDailyTips();
      toast.success("Talada waa la abuuray!");
      resetTipForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const updateTipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/daily-tips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update tip");
      return res.json();
    },
    onSuccess: () => {
      refetchDailyTips();
      toast.success("Talada waa la cusboonaysiiyay!");
      resetTipForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteTipMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/daily-tips/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete tip");
      return res.json();
    },
    onSuccess: () => {
      refetchDailyTips();
      toast.success("Talada waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const resetTipForm = () => {
    setTipAgeRange("0-6");
    setTipTitle("");
    setTipContent("");
    setTipCategory("");
    setEditingTipId(null);
  };

  const handleEditTip = (tip: any) => {
    setEditingTipId(tip.id);
    setTipAgeRange(tip.ageRange);
    setTipTitle(tip.title);
    setTipContent(tip.content);
    setTipCategory(tip.category || "");
  };

  const handleSubmitTip = () => {
    const data = {
      ageRange: tipAgeRange,
      title: tipTitle,
      content: tipContent,
      category: tipCategory || undefined,
    };
    if (editingTipId) {
      updateTipMutation.mutate({ id: editingTipId, data });
    } else {
      createTipMutation.mutate(data);
    }
  };

  // Course management functions
  const resetCourseForm = () => {
    setNewCourseTitle("");
    setNewCourseId("");
    setNewCourseDescription("");
    setNewCourseCategory("general");
    setNewCourseOrder("0");
    setNewCourseAgeRange("");
    setNewCourseImageUrl("");
    setNewCoursePriceOneTime("");
    setNewCoursePriceMonthly("");
    setNewCoursePriceYearly("");
    setNewCourseComingSoonMessage("");
    setNewCourseIsLive(false);
    setNewCourseContentReady(false);
    setNewCourseIsFree(false);
    setEditingCourseId(null);
  };

  const handleEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setNewCourseTitle(course.title || "");
    setNewCourseId(course.courseId || "");
    setNewCourseDescription(course.description || "");
    setNewCourseCategory(course.category || "general");
    setNewCourseOrder(String(course.order || 0));
    setNewCourseAgeRange(course.ageRange || "");
    setNewCourseImageUrl(course.imageUrl || "");
    setNewCoursePriceOneTime(course.priceOneTime ? String(course.priceOneTime) : "");
    setNewCoursePriceMonthly(course.priceMonthly ? String(course.priceMonthly) : "");
    setNewCoursePriceYearly(course.priceYearly ? String(course.priceYearly) : "");
    setNewCourseComingSoonMessage(course.comingSoonMessage || "");
    setNewCourseIsLive(course.isLive || false);
    setNewCourseContentReady(course.contentReady || false);
    setNewCourseIsFree(course.isFree || false);
    // Scroll to the form at the top so user can see it
    setTimeout(() => {
      const formElement = document.querySelector('[data-testid="input-course-title"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleCourseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Fadlan dooro sawir (image file)");
      return;
    }
    
    setUploadingCourseImage(true);
    try {
      // Request presigned URL
      const urlRes = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `course-${Date.now()}-${file.name}`,
          size: file.size,
          contentType: file.type,
        }),
      });
      
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      
      // Upload directly to storage
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      
      // Set the image URL to the object path
      setNewCourseImageUrl(objectPath);
      toast.success("Sawirka waa la soo geliyay!");
    } catch (error) {
      console.error("Course image upload error:", error);
      toast.error(error instanceof Error ? error.message : "Sawirka ma soo gelin");
    } finally {
      setUploadingCourseImage(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDirectCourseImageUpload = async (courseId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Fadlan dooro sawir (image file)");
      return;
    }
    
    setUploadingCourseImageId(courseId);
    try {
      // Request presigned URL
      const urlRes = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `course-${courseId}-${Date.now()}-${file.name}`,
          size: file.size,
          contentType: file.type,
        }),
      });
      
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      
      // Upload directly to storage
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      
      // Save the image URL to the course directly
      const saveRes = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: objectPath }),
      });
      
      if (!saveRes.ok) throw new Error("Failed to save course image");
      
      toast.success("Sawirka waa la geliyay!");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    } catch (error) {
      console.error("Course image save error:", error);
      toast.error(error instanceof Error ? error.message : "Sawirka ma soo gelin");
    } finally {
      setUploadingCourseImageId(null);
    }
  };

  const handleSaveCourse = async () => {
    setSavingCourse(true);
    try {
      const courseData = {
        title: newCourseTitle,
        courseId: newCourseId,
        description: newCourseDescription || null,
        category: newCourseCategory,
        order: parseInt(newCourseOrder) || 0,
        ageRange: newCourseAgeRange || null,
        imageUrl: newCourseImageUrl || null,
        priceOneTime: newCoursePriceOneTime ? parseInt(newCoursePriceOneTime) : null,
        priceMonthly: newCoursePriceMonthly ? parseInt(newCoursePriceMonthly) : null,
        priceYearly: newCoursePriceYearly ? parseInt(newCoursePriceYearly) : null,
        comingSoonMessage: newCourseComingSoonMessage || null,
        isLive: newCourseIsLive,
        contentReady: newCourseContentReady,
        isFree: newCourseIsFree,
      };

      const url = editingCourseId 
        ? `/api/admin/courses/${editingCourseId}`
        : "/api/admin/courses";
      const method = editingCourseId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save course");
      }

      toast.success(editingCourseId ? "Koorsada waa la bedelay" : "Koorsada cusub waa lagu daray");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetCourseForm();
    } catch (error) {
      console.error("Course save error:", error);
      toast.error(error instanceof Error ? error.message : "Khalad ayaa dhacay");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Ma hubtaa inaad tirtirto koorsadan?")) return;
    
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Koorsada waa la tirtiray");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    } catch (error) {
      toast.error("Khalad ayaa dhacay");
    }
  };

  const handleReorderCourse = async (courseId: string, direction: 'up' | 'down') => {
    if (reorderingCourseId) return;
    
    const sortedCourses = [...courses].sort((a, b) => a.order - b.order);
    const currentIndex = sortedCourses.findIndex((c) => c.id === courseId);
    
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedCourses.length - 1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentCourse = sortedCourses[currentIndex];
    const swapCourse = sortedCourses[swapIndex];
    
    setReorderingCourseId(courseId);
    
    try {
      const res1 = await fetch(`/api/admin/courses/${currentCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order: swapCourse.order }),
      });
      if (!res1.ok) throw new Error("Failed to update first course");
      
      const res2 = await fetch(`/api/admin/courses/${swapCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order: currentCourse.order }),
      });
      if (!res2.ok) throw new Error("Failed to update second course");
      
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    } catch (error) {
      toast.error("Khalad ayaa dhacay marka la bedelayay order-ka");
    } finally {
      setReorderingCourseId(null);
    }
  };

  // Tip Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: async (data: { tipId: string; scheduleType: string; scheduledDate?: string; weekNumber?: number; courseId?: string; priority: number; isActive: boolean }) => {
      const res = await fetch("/api/admin/tip-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      return res.json();
    },
    onSuccess: () => {
      refetchTipSchedules();
      toast.success("Jadwalka waa la abuuray!");
      resetScheduleForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/tip-schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      return res.json();
    },
    onSuccess: () => {
      refetchTipSchedules();
      toast.success("Jadwalka waa la cusboonaysiiyay!");
      resetScheduleForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/tip-schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      return res.json();
    },
    onSuccess: () => {
      refetchTipSchedules();
      toast.success("Jadwalka waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const resetScheduleForm = () => {
    setScheduleType("day");
    setScheduledDate("");
    setScheduledWeek("");
    setSelectedTipForSchedule("");
    setSelectedCourseForSchedule("none");
    setSchedulePriority("0");
    setEditingScheduleId(null);
  };

  const handleEditSchedule = (schedule: any) => {
    setEditingScheduleId(schedule.id);
    setScheduleType(schedule.scheduleType);
    setScheduledDate(schedule.scheduledDate || "");
    setScheduledWeek(schedule.weekNumber?.toString() || "");
    setSelectedTipForSchedule(schedule.tipId);
    setSelectedCourseForSchedule(schedule.courseId || "none");
    setSchedulePriority(schedule.priority?.toString() || "0");
  };

  const handleSubmitSchedule = () => {
    const data = {
      tipId: selectedTipForSchedule,
      scheduleType,
      scheduledDate: scheduleType === "day" ? scheduledDate : undefined,
      weekNumber: scheduleType === "week" ? parseInt(scheduledWeek) : undefined,
      courseId: selectedCourseForSchedule && selectedCourseForSchedule !== "none" ? selectedCourseForSchedule : undefined,
      priority: parseInt(schedulePriority) || 0,
      isActive: true,
    };
    if (editingScheduleId) {
      updateScheduleMutation.mutate({ id: editingScheduleId, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  // Milestones mutations
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: { ageRange: string; title: string; description?: string; category?: string }) => {
      const res = await fetch("/api/admin/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create milestone");
      return res.json();
    },
    onSuccess: () => {
      refetchMilestones();
      toast.success("Horumarinta waa la abuuray!");
      resetMilestoneForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update milestone");
      return res.json();
    },
    onSuccess: () => {
      refetchMilestones();
      toast.success("Horumarinta waa la cusboonaysiiyay!");
      resetMilestoneForm();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/milestones/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete milestone");
      return res.json();
    },
    onSuccess: () => {
      refetchMilestones();
      toast.success("Horumarinta waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete parent mutation
  const deleteParentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/parents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete parent");
      return res.json();
    },
    onSuccess: () => {
      refetchParents();
      refetchEnrollments();
      toast.success("Akoonka waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Toggle parent admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      const res = await fetch(`/api/admin/parents/${id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAdmin }),
      });
      if (!res.ok) throw new Error("Failed to update admin status");
      return res.json();
    },
    onSuccess: (_, { isAdmin }) => {
      refetchParents();
      toast.success(isAdmin ? "Waalidka waa admin noqday!" : "Admin-nimada waa laga saaray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Toggle parent host status mutation (for Sheeko)
  const toggleHostMutation = useMutation({
    mutationFn: async ({ id, canHostSheeko }: { id: string; canHostSheeko: boolean }) => {
      const res = await fetch(`/api/admin/parents/${id}/host`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ canHostSheeko }),
      });
      if (!res.ok) throw new Error("Failed to update host status");
      return res.json();
    },
    onSuccess: (_, { canHostSheeko }) => {
      refetchParents();
      toast.success(canHostSheeko ? "Waalidka waa host noqday!" : "Host-nimada waa laga saaray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create enrollment mutation
  const createEnrollmentMutation = useMutation({
    mutationFn: async (data: { parentId: string; courseId: string; planType: string; accessEnd?: string }) => {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create enrollment");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchEnrollments();
      toast.success("Koorsada waa loo furay!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khalad ayaa dhacay");
    },
  });

  // Delete enrollment mutation
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete enrollment");
      return res.json();
    },
    onSuccess: () => {
      refetchEnrollments();
      toast.success("Koorsada waa loo xiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create resource mutation (Maktabadda)
  const createResourceMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; fileUrl: string; fileType: string; category?: string; ageRange?: string }) => {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create resource");
      return res.json();
    },
    onSuccess: () => {
      refetchResources();
      setResourceTitle("");
      setResourceDescription("");
      setResourceFileUrl("");
      toast.success("Agabka waa la soo geliyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete resource mutation (Maktabadda)
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete resource");
      return res.json();
    },
    onSuccess: () => {
      refetchResources();
      toast.success("Agabka waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Fetch lesson accessibility report
  const fetchAccessibilityReport = async () => {
    setIsLoadingAccessibilityReport(true);
    try {
      const res = await fetch("/api/admin/lesson-accessibility-report", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch accessibility report");
      const data = await res.json();
      setAccessibilityReport(data);
      setShowAccessibilityReport(true);
    } catch (error) {
      console.error("Error fetching accessibility report:", error);
      toast.error("Lama soo saari karin warbixinta casharada");
    } finally {
      setIsLoadingAccessibilityReport(false);
    }
  };

  // Delete Google Drive file mutation
  const deleteDriveFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/drive/file/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete drive file");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDriveFiles"] });
      toast.success("File-ka Google Drive waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay - file-ka ma tirtiri karin");
    },
  });

  // Create Quran Reciter mutation (Shiikhyada Quraanka)
  const createReciterMutation = useMutation({
    mutationFn: async (data: { name: string; nameSomali?: string; audioBaseUrl: string; imageUrl?: string; order?: number }) => {
      const res = await fetch("/api/quran-reciters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create reciter");
      return res.json();
    },
    onSuccess: () => {
      refetchReciters();
      setReciterName("");
      setReciterNameSomali("");
      setReciterAudioBaseUrl("");
      setReciterImageUrl("");
      setReciterOrder("1");
      toast.success("Shiikhga waa la soo geliyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete Quran Reciter mutation
  const deleteReciterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quran-reciters/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete reciter");
      return res.json();
    },
    onSuccess: () => {
      refetchReciters();
      toast.success("Shiikhga waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create Hadith mutation (40 Xadiis)
  const createHadithMutation = useMutation({
    mutationFn: async (data: { number: number; arabicText: string; somaliText: string; source?: string; narrator?: string; topic?: string }) => {
      const res = await fetch("/api/hadiths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create hadith");
      return res.json();
    },
    onSuccess: () => {
      refetchHadiths();
      setHadithNumber((parseInt(hadithNumber) + 1).toString());
      setHadithArabicText("");
      setHadithSomaliText("");
      setHadithSource("");
      setHadithNarrator("");
      setHadithTopic("");
      toast.success("Xadiiska waa la soo geliyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete Hadith mutation
  const deleteHadithMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hadiths/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete hadith");
      return res.json();
    },
    onSuccess: () => {
      refetchHadiths();
      toast.success("Xadiiska waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Update Hadith mutation (for adding Somali translation)
  const updateHadithMutation = useMutation({
    mutationFn: async ({ id, somaliText }: { id: string; somaliText: string }) => {
      const res = await fetch(`/api/hadiths/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ somaliText }),
      });
      if (!res.ok) throw new Error("Failed to update hadith");
      return res.json();
    },
    onSuccess: () => {
      refetchHadiths();
      setEditingHadith(null);
      setEditHadithSomaliText("");
      toast.success("Turjumaada waa la keydiyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create Parenting Book mutation
  const createParentingBookMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; fileUrl: string; imageUrl?: string }) => {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          fileType: "pdf",
          category: "parenting-books",
        }),
      });
      if (!res.ok) throw new Error("Failed to create book");
      return res.json();
    },
    onSuccess: () => {
      refetchParentingBooks();
      setParentingBookTitle("");
      setParentingBookDescription("");
      setParentingBookUrl("");
      setParentingBookImageUrl("");
      toast.success("Buugga waa la soo geliyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Create Children's Book mutation
  const createChildrenBookMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; fileUrl: string; imageUrl?: string }) => {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          fileType: "pdf",
          category: "children-books",
        }),
      });
      if (!res.ok) throw new Error("Failed to create book");
      return res.json();
    },
    onSuccess: () => {
      refetchChildrenBooks();
      setChildrenBookTitle("");
      setChildrenBookDescription("");
      setChildrenBookUrl("");
      setChildrenBookImageUrl("");
      toast.success("Buugga waa la soo geliyey!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Delete Resource (Book) mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete book");
      return res.json();
    },
    onSuccess: () => {
      refetchParentingBooks();
      refetchChildrenBooks();
      toast.success("Buugga waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Update enrollment status mutation
  const updateEnrollmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update enrollment");
      return res.json();
    },
    onSuccess: () => {
      refetchEnrollments();
      toast.success("Xaalada waa la cusboonaysiiyay!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Edit payment mutation (for notes/refund)
  const editPaymentMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: string; notes?: string }) => {
      const res = await fetch(`/api/admin/payment-submissions/${id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to edit payment");
      return res.json();
    },
    onSuccess: () => {
      refetchPayments();
      refetchEnrollments();
      toast.success("Lacag bixinta waa la cusboonaysiiyay!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const resetMilestoneForm = () => {
    setMilestoneAgeRange("0-6");
    setMilestoneTitle("");
    setMilestoneDescription("");
    setMilestoneCategory("Jirka");
    setEditingMilestoneId(null);
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneAgeRange(milestone.ageRange);
    setMilestoneTitle(milestone.title);
    setMilestoneDescription(milestone.description || "");
    setMilestoneCategory(milestone.category || "Jirka");
  };

  const handleSubmitMilestone = () => {
    const data = {
      ageRange: milestoneAgeRange,
      title: milestoneTitle,
      description: milestoneDescription || undefined,
      category: milestoneCategory || undefined,
    };
    if (editingMilestoneId) {
      updateMilestoneMutation.mutate({ id: editingMilestoneId, data });
    } else {
      createMilestoneMutation.mutate(data);
    }
  };

  const resetTestimonialForm = () => {
    setTestimonialName("");
    setTestimonialLocation("");
    setTestimonialCourseTag("");
    setTestimonialRating("5");
    setTestimonialMessage("");
    setTestimonialIsPublished(true);
    setEditingTestimonialId(null);
  };

  const handleEditTestimonial = (testimonial: any) => {
    setEditingTestimonialId(testimonial.id);
    setTestimonialName(testimonial.name);
    setTestimonialLocation(testimonial.location || "");
    setTestimonialCourseTag(testimonial.courseTag || "");
    setTestimonialRating(String(testimonial.rating));
    setTestimonialMessage(testimonial.message);
    setTestimonialIsPublished(testimonial.isPublished);
  };

  const handleSubmitTestimonial = () => {
    const data = {
      name: testimonialName,
      location: testimonialLocation || null,
      courseTag: testimonialCourseTag && testimonialCourseTag !== "none" ? testimonialCourseTag : null,
      rating: parseInt(testimonialRating),
      message: testimonialMessage,
      isPublished: testimonialIsPublished,
    };

    if (editingTestimonialId) {
      updateTestimonialMutation.mutate({ id: editingTestimonialId, data });
    } else {
      createTestimonialMutation.mutate(data);
    }
  };

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(lessonData),
      });
      if (res.status === 401) {
        throw new Error("Session expired");
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create lesson");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchLessons();
      toast.success("Casharka waa lagu daray!");
      // Reset form
      setLessonTitle("");
      setSelectedCourseId("");
      setVideoUrl("");
      setTextContent("");
      setModuleNumber("1");
      setDuration("");
    },
    onError: (error: Error) => {
      if (error.message === "Session expired") {
        toast.error("Session-kaagu wuu dhammaaday. Fadlan mar kale soo gal.");
        setIsLoggedIn(false);
      } else {
        toast.error("Khalad ayaa dhacay: " + error.message);
      }
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      return res.json();
    },
    onSuccess: () => {
      refetchLessons();
      toast.success("Casharka waa la tiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Reorder lessons mutation
  const reorderLessonsMutation = useMutation({
    mutationFn: async ({ courseId, orderedIds }: { courseId: string; orderedIds: string[] }) => {
      const res = await fetch(`/api/courses/${courseId}/lessons/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder lessons");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["lessons", variables.courseId] });
      toast.success("Casharada waa la kala horeeyay!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  // Helper function to move lesson up or down
  const moveLesson = (lesson: any, direction: 'up' | 'down') => {
    const courseLessons = lessons
      .filter((l: any) => l.courseId === lesson.courseId)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    
    const currentIndex = courseLessons.findIndex((l: any) => l.id === lesson.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === courseLessons.length - 1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reordered = [...courseLessons];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
    
    reorderLessonsMutation.mutate({
      courseId: lesson.courseId,
      orderedIds: reordered.map((l: any) => l.id),
    });
  };

  // Drag and drop handlers for lesson reordering
  const handleDragStart = (e: React.DragEvent, lesson: any) => {
    setDraggedLesson(lesson);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lesson.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetLesson: any) => {
    e.preventDefault();
    if (!draggedLesson || draggedLesson.id === targetLesson.id) {
      setDraggedLesson(null);
      return;
    }
    if (draggedLesson.courseId !== targetLesson.courseId) {
      toast.error("Casharada koorsooyinka kala duwan lama kala beddeli karo");
      setDraggedLesson(null);
      return;
    }

    const courseLessons = lessons
      .filter((l: any) => l.courseId === draggedLesson.courseId)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    const draggedIndex = courseLessons.findIndex((l: any) => l.id === draggedLesson.id);
    const targetIndex = courseLessons.findIndex((l: any) => l.id === targetLesson.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedLesson(null);
      return;
    }

    const reordered = [...courseLessons];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    reorderLessonsMutation.mutate({
      courseId: draggedLesson.courseId,
      orderedIds: reordered.map((l: any) => l.id),
    });

    setDraggedLesson(null);
  };

  const handleDragEnd = () => {
    setDraggedLesson(null);
  };

  // Helper to get module name for a lesson
  const getModuleName = (lesson: any) => {
    if (!lesson.moduleId) return null;
    const module = allModules.find((m: any) => m.id === lesson.moduleId);
    return module?.title || null;
  };

  // Group lessons by module within a course
  const groupLessonsByModule = (courseLessons: any[]) => {
    const groups: { moduleId: string | null; moduleName: string | null; lessons: any[] }[] = [];
    const moduleMap = new Map<string | null, any[]>();
    
    courseLessons.forEach((lesson) => {
      const moduleId = lesson.moduleId || null;
      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, []);
      }
      moduleMap.get(moduleId)!.push(lesson);
    });

    // Sort modules by order from allModules
    const sortedModuleIds: (string | null)[] = [];
    allModules
      .filter((m: any) => moduleMap.has(m.id))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .forEach((m: any) => sortedModuleIds.push(m.id));
    
    // Add null (unassigned) at the end if it exists
    if (moduleMap.has(null)) {
      sortedModuleIds.push(null);
    }
    
    // Add any remaining module IDs that weren't in allModules
    moduleMap.forEach((_, moduleId) => {
      if (!sortedModuleIds.includes(moduleId)) {
        sortedModuleIds.push(moduleId);
      }
    });

    sortedModuleIds.forEach((moduleId) => {
      const module = moduleId ? allModules.find((m: any) => m.id === moduleId) : null;
      groups.push({
        moduleId,
        moduleName: module?.title || null,
        lessons: moduleMap.get(moduleId) || [],
      });
    });

    return groups;
  };

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error("Failed to update lesson");
      return res.json();
    },
    onSuccess: () => {
      refetchLessons();
      toast.success("Casharka waa la cusbooneysiiyey!");
      resetForm();
    },
    onError: (error: Error) => {
      if (error.message === "Session expired") {
        toast.error("Session-kaagu wuu dhammaaday. Fadlan mar kale soo gal.");
        setIsLoggedIn(false);
      } else {
        toast.error("Khalad ayaa dhacay: " + error.message);
      }
    },
  });

  // Helper to reset form
  const resetForm = () => {
    setLessonTitle("");
    setSelectedCourseId("");
    setVideoUrl("");
    setUploadedVideoPath("");
    setTextContent("");
    setModuleNumber("1");
    setSelectedModuleId("");
    setNewModuleTitle("");
    setShowNewModuleInput(false);
    setDuration("");
    setLessonType("video");
    setIsLiveLesson(false);
    setLiveUrl("");
    setLiveDate("");
    setLiveDateTime("");
    setLiveTimezone("Africa/Mogadishu");
    setEditingLessonId(null);
    setEditingLessonOrder(null);
    // Reset inline quiz fields
    setInlineQuizTitle("");
    setInlineQuizDescription("");
    setInlineQuizQuestions([]);
    setOpenEndedQuestions([]);
    setInlineQuestion("");
    setInlineOptions(["", "", "", ""]);
    setInlineCorrectAnswer(0);
    setInlineExplanation("");
    // Reset inline assignment fields
    setInlineAssignmentTitle("");
    setInlineAssignmentDescription("");
    // Reset unlock settings
    setUnlockType("immediate");
    setUnlockDate("");
    setUnlockDaysAfter("");
    setVideoWatchRequired(true);
    // Reset lesson images
    setLessonImages([]);
  };

  // Helper to go back to list after editing
  const handleBackToList = () => {
    resetForm();
    setActiveTab("list");
  };

  // Helper to populate form for editing
  const startEditingLesson = (lesson: any) => {
    setEditingLessonId(lesson.id);
    setEditingLessonOrder(lesson.order || 1);
    setLessonTitle(lesson.title || "");
    setSelectedCourseId(lesson.courseId || "");
    setVideoUrl(lesson.videoUrl || "");
    // For quiz lessons, don't set textContent (it's JSON) - parse it as quiz questions
    if (lesson.lessonType === "quiz" && lesson.textContent) {
      try {
        const parsed = JSON.parse(lesson.textContent);
        const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        const openEnded = parsed.openEndedQuestions || [];
        setInlineQuizQuestions(questions);
        setOpenEndedQuestions(openEnded);
        setTextContent(""); // Don't show JSON in text editor
      } catch {
        setInlineQuizQuestions([]);
        setOpenEndedQuestions([]);
        setTextContent("");
      }
    } else {
      setTextContent(lesson.textContent || "");
      setInlineQuizQuestions([]);
      setOpenEndedQuestions([]);
    }
    setModuleNumber(String(lesson.moduleNumber || 1));
    setSelectedModuleId(lesson.moduleId || "");
    setDuration(lesson.duration || "");
    setLessonType(lesson.lessonType || "video");
    setIsLiveLesson(lesson.isLive || false);
    setLiveUrl(lesson.liveUrl || "");
    setLiveDate(lesson.liveDate || "");
    setLiveTimezone(lesson.liveTimezone || "Africa/Mogadishu");
    setInlineAssignmentDescription(lesson.assignmentRequirements || "");
    // Load unlock settings
    setUnlockType(lesson.unlockType || "immediate");
    setUnlockDate(lesson.unlockDate || "");
    setUnlockDaysAfter(lesson.unlockDaysAfter ? String(lesson.unlockDaysAfter) : "");
    setVideoWatchRequired(lesson.videoWatchRequired !== false);
    // Set liveDateTime for the datetime-local input (if liveDate is ISO format)
    if (lesson.liveDate && lesson.liveDate.includes('T')) {
      // Already in datetime-local format (e.g., "2026-01-17T21:00")
      setLiveDateTime(lesson.liveDate);
    } else if (lesson.liveDate) {
      // Try to parse from other formats
      const parsed = new Date(lesson.liveDate);
      if (!isNaN(parsed.getTime())) {
        setLiveDateTime(parsed.toISOString().slice(0, 16));
      } else {
        setLiveDateTime("");
      }
    } else {
      setLiveDateTime("");
    }
    // Switch to upload tab to show the form
    setActiveTab("upload");
    toast.info("Casharka waa la soo qaaday - wax ka badal oo riix 'Cusboonaysii'");
    
    // Fetch lesson images
    fetch(`/api/lessons/${lesson.id}/images`, { credentials: "include" })
      .then(res => res.json())
      .then(images => setLessonImages(images || []))
      .catch(() => setLessonImages([]));
  };

  // Generate AI images for lesson
  const handleGenerateAIImages = async () => {
    if (!editingLessonId) {
      toast.error("Marka hore kaydi casharka");
      return;
    }
    setIsGeneratingImages(true);
    try {
      const res = await fetch(`/api/admin/lessons/${editingLessonId}/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count: parseInt(imageGenerateCount) })
      });
      if (!res.ok) throw new Error("Failed to generate images");
      const data = await res.json();
      setLessonImages(prev => [...prev, ...data.images]);
      toast.success(`${data.generated} sawir AI ayaa la sameeyay!`);
    } catch (error) {
      toast.error("Khalad baa dhacay samaynta sawirada");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Delete lesson image
  const handleDeleteLessonImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/admin/lesson-images/${imageId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete image");
      setLessonImages(prev => prev.filter(img => img.id !== imageId));
      toast.success("Sawirka waa la tirtiray");
    } catch (error) {
      toast.error("Khalad baa dhacay tirtirista sawirada");
    }
  };

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (data: { lessonId: string; title: string; description: string; questions: any[] }) => {
      // First create the quiz
      const quizRes = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonId: data.lessonId,
          title: data.title,
          description: data.description,
          passingScore: 70,
          order: 0,
        }),
      });
      if (!quizRes.ok) throw new Error("Failed to create quiz");
      const quiz = await quizRes.json();
      
      // Then create questions
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        await fetch("/api/quiz-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            quizId: quiz.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            order: i,
          }),
        });
      }
      return quiz;
    },
    onSuccess: () => {
      toast.success("Quiz-ka waa la sameeyey!");
      setSelectedLessonForQuiz("");
      setQuizTitle("");
      setQuizDescription("");
      setQuizQuestions([]);
      refetchQuizzes();
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete quiz");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Quiz-ka waa la tirtiray!");
      refetchQuizzes();
    },
    onError: () => {
      toast.error("Quiz-ka lama tirtiri karin");
    },
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { lessonId: string; title: string; description: string }) => {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create assignment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hawlgalka waa la sameeyey!");
      setSelectedLessonForAssignment("");
      setAssignmentTitle("");
      setAssignmentDescription("");
      refetchAssignments();
    },
    onError: () => {
      toast.error("Hawlgalka lama samayn karin");
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete assignment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hawlgalka waa la tirtiray!");
      refetchAssignments();
    },
    onError: () => {
      toast.error("Hawlgalka lama tirtiri karin");
    },
  });

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForAssignment || !assignmentTitle) {
      toast.error("Fadlan buuxi cashar iyo magaca hawlgalka");
      return;
    }
    createAssignmentMutation.mutate({
      lessonId: selectedLessonForAssignment,
      title: assignmentTitle,
      description: assignmentDescription,
    });
  };

  // Update assignment submission status mutation
  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: string; feedback?: string }) => {
      const res = await fetch(`/api/admin/assignment-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, feedback }),
      });
      if (!res.ok) throw new Error("Failed to update submission");
      return res.json();
    },
    onSuccess: (_, { status }) => {
      if (status === "approved") {
        toast.success("Hawlgalka waa la ansixiyey!");
      } else if (status === "revision_needed") {
        toast.success("Waxaa loo diray dib u eegis!");
      }
      queryClient.invalidateQueries({ queryKey: ["adminAssignmentSubmissions"] });
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const addQuestionToList = () => {
    if (!currentQuestion || currentOptions.some(o => !o.trim())) {
      toast.error("Fadlan buuxi su'aasha iyo dhammaan xulashooyinka");
      return;
    }
    setQuizQuestions([...quizQuestions, {
      question: currentQuestion,
      options: [...currentOptions],
      correctAnswer: currentCorrectAnswer,
      explanation: currentExplanation,
    }]);
    setCurrentQuestion("");
    setCurrentOptions(["", "", "", ""]);
    setCurrentCorrectAnswer(0);
    setCurrentExplanation("");
    toast.success("Su'aasha waa la daray!");
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForQuiz || !quizTitle || quizQuestions.length === 0) {
      toast.error("Fadlan dooro casharka, geli cinwaanka, oo ku dar su'aalo");
      return;
    }
    createQuizMutation.mutate({
      lessonId: selectedLessonForQuiz,
      title: quizTitle,
      description: quizDescription,
      questions: quizQuestions,
    });
  };

  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (createLessonMutation.isPending || updateLessonMutation.isPending) {
      return;
    }

    if (!lessonTitle) {
      toast.error("⚠️ Fadlan geli CINWAANKA CASHARKA!");
      return;
    }
    if (!selectedCourseId) {
      toast.error("⚠️ Fadlan dooro KOORSADA!");
      return;
    }

    if (editingLessonId) {
      // Update existing lesson - preserve order and only send changed fields
      const updateData: any = {
        courseId: selectedCourseId,
        title: lessonTitle,
        description: "",
        videoUrl: uploadedVideoPath || videoUrl || null,
        textContent: lessonType !== "quiz" ? (textContent || null) : null,
        moduleId: selectedModuleId || null,
        moduleNumber: parseInt(moduleNumber) || 1, // Legacy support
        duration: duration || null,
        order: editingLessonOrder || 1,
        isLive: lessonType === "live",
        lessonType: lessonType,
        unlockType: unlockType,
        unlockDate: unlockType === "date" ? unlockDate : null,
        unlockDaysAfter: (unlockType === "days_after_enrollment" || unlockType === "days_after_previous") && unlockDaysAfter ? parseInt(unlockDaysAfter) : null,
        videoWatchRequired: videoWatchRequired,
      };
      // Only include live fields if it's a live lesson
      if (lessonType === "live") {
        updateData.liveUrl = liveUrl || null;
        updateData.liveDate = liveDate || null;
        updateData.liveTimezone = liveTimezone || "Africa/Mogadishu";
      }
      // Include assignment requirements if it's an assignment
      if (lessonType === "assignment") {
        updateData.assignmentRequirements = inlineAssignmentDescription || null;
      }
      // Include quiz data if it's a quiz lesson
      if (lessonType === "quiz" && (inlineQuizQuestions.length > 0 || openEndedQuestions.length > 0)) {
        updateData.quizData = {
          title: inlineQuizTitle || lessonTitle,
          description: inlineQuizDescription || "",
          questions: inlineQuizQuestions,
          openEndedQuestions: openEndedQuestions,
        };
      }
      updateLessonMutation.mutate({ id: editingLessonId, data: updateData });
    } else {
      // Create new lesson
      const lessonData: any = {
        courseId: selectedCourseId,
        title: lessonTitle,
        description: "",
        videoUrl: lessonType === "video" ? (uploadedVideoPath || videoUrl || null) : null,
        textContent: textContent || null,
        moduleId: selectedModuleId || null,
        moduleNumber: parseInt(moduleNumber) || 1, // Legacy support
        duration: duration || null,
        order: lessons.length + 1,
        isLive: lessonType === "live",
        lessonType: lessonType,
        liveUrl: lessonType === "live" ? liveUrl : null,
        liveDate: lessonType === "live" ? liveDate : null,
        liveTimezone: lessonType === "live" ? liveTimezone : null,
        assignmentRequirements: lessonType === "assignment" ? inlineAssignmentDescription : null,
        unlockType: unlockType,
        unlockDate: unlockType === "date" ? unlockDate : null,
        unlockDaysAfter: (unlockType === "days_after_enrollment" || unlockType === "days_after_previous") && unlockDaysAfter ? parseInt(unlockDaysAfter) : null,
        videoWatchRequired: videoWatchRequired,
        // Include quiz data if it's a quiz lesson
        quizData: lessonType === "quiz" && (inlineQuizQuestions.length > 0 || openEndedQuestions.length > 0) ? {
          title: inlineQuizTitle || lessonTitle,
          description: inlineQuizDescription || "",
          questions: inlineQuizQuestions,
          openEndedQuestions: openEndedQuestions,
        } : null,
      };
      createLessonMutation.mutate(lessonData);
      setUploadedVideoPath("");
      setIsLiveLesson(false);
      setLiveUrl("");
      setLiveDate("");
      setLiveDateTime("");
      setLiveTimezone("Africa/Mogadishu");
      // Reset quiz fields
      setInlineQuizTitle("");
      setInlineQuizDescription("");
      setInlineQuizQuestions([]);
      setOpenEndedQuestions([]);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-4 font-body">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" data-testid="button-back-home">
              <Home className="w-4 h-4 mr-2" /> Hoyga
            </Button>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border-none">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                 <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 font-display">Maamulka Barbaarintasan</CardTitle>
              <CardDescription>Fadlan gali magacaaga iyo lambarkaaga sirta ah</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Magaca (Username)</Label>
                  <Input 
                    id="username" 
                    placeholder="Gali magacaaga" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lambarka Sirta (Password)</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                    data-testid="input-password"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-500">{loginError}</p>
                )}
                <Button type="submit" className="w-full h-11 font-bold text-md mt-2" data-testid="button-login">
                  Gal Maamulka
                </Button>
                <p className="text-xs text-center text-gray-500 mt-4">
                  Isticmaal <strong>admin</strong> iyo <strong>admin</strong> si aad u tijaabiso.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-3 py-3 sm:px-6 sm:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-none">Admin</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Barbaarintasan Academy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm px-2 sm:px-3" data-testid="button-home">
                <Home className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Hoyga</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3" data-testid="button-logout">
              <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Ka Bax</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6">
        {/* Admin Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <DebouncedInput
              placeholder="Raadi... (Koorsooyin, Casharado, Waalidiinta, Lacagta...)"
              value={adminSearchQuery}
              onChange={setAdminSearchQuery}
              className="pl-10 h-12 text-base bg-white border-gray-200 focus:border-blue-400"
              debounceMs={150}
              data-testid="input-admin-search"
            />
            {adminSearchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setAdminSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Search Results */}
          {adminSearchQuery.length >= 2 && (
            <div className="mt-2 bg-white rounded-lg border shadow-lg max-h-96 overflow-y-auto">
              {/* Courses Results */}
              {courses.filter((c: any) => 
                c.title?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                c.courseId?.toLowerCase().includes(adminSearchQuery.toLowerCase())
              ).length > 0 && (
                <div className="p-2 border-b">
                  <p className="text-xs font-semibold text-gray-500 px-2 mb-1">KOORSOOYIN</p>
                  {courses.filter((c: any) => 
                    c.title?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    c.courseId?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                  ).slice(0, 5).map((course: any) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setActiveTab("list");
                        setSelectedCourseId(course.id);
                        setAdminSearchQuery("");
                      }}
                    >
                      <BookOpen className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{course.title}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Lessons Results */}
              {lessons.filter((l: any) => 
                l.title?.toLowerCase().includes(adminSearchQuery.toLowerCase())
              ).length > 0 && (
                <div className="p-2 border-b">
                  <p className="text-xs font-semibold text-gray-500 px-2 mb-1">CASHARADA</p>
                  {lessons.filter((l: any) => 
                    l.title?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                  ).slice(0, 5).map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setActiveTab("list");
                        setSelectedCourseId(lesson.courseId);
                        setAdminSearchQuery("");
                      }}
                    >
                      <Video className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Parents Results */}
              {parentsList.filter((p: any) => 
                p.fullName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                p.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                p.phone?.includes(adminSearchQuery)
              ).length > 0 && (
                <div className="p-2 border-b">
                  <p className="text-xs font-semibold text-gray-500 px-2 mb-1">WAALIDIINTA</p>
                  {parentsList.filter((p: any) => 
                    p.fullName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    p.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    p.phone?.includes(adminSearchQuery)
                  ).slice(0, 5).map((parent: any) => (
                    <div
                      key={parent.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setActiveTab("parents");
                        setParentSearchQuery(parent.fullName || parent.email || "");
                        setAdminSearchQuery("");
                      }}
                    >
                      <User className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="text-sm">{parent.fullName || "Waalid"}</span>
                        <span className="text-xs text-gray-500 ml-2">{parent.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Payments Results */}
              {paymentSubmissions.filter((p: any) => 
                p.parentName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                p.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                p.phone?.includes(adminSearchQuery) ||
                p.referenceCode?.toLowerCase().includes(adminSearchQuery.toLowerCase())
              ).length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 px-2 mb-1">LACAG BIXINTA</p>
                  {paymentSubmissions.filter((p: any) => 
                    p.parentName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    p.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    p.phone?.includes(adminSearchQuery) ||
                    p.referenceCode?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                  ).slice(0, 5).map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => {
                        setActiveTab("payments");
                        setAdminSearchQuery("");
                      }}
                    >
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <div>
                        <span className="text-sm">{payment.parentName}</span>
                        <span className={`text-xs ml-2 ${payment.status === 'pending' ? 'text-orange-500' : payment.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>
                          {payment.status === 'pending' ? 'Sugaysa' : payment.status === 'approved' ? 'La ansixiyay' : 'La diiday'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No Results */}
              {courses.filter((c: any) => c.title?.toLowerCase().includes(adminSearchQuery.toLowerCase())).length === 0 &&
               lessons.filter((l: any) => l.title?.toLowerCase().includes(adminSearchQuery.toLowerCase())).length === 0 &&
               parentsList.filter((p: any) => p.fullName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.email?.toLowerCase().includes(adminSearchQuery.toLowerCase())).length === 0 &&
               paymentSubmissions.filter((p: any) => p.parentName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.referenceCode?.toLowerCase().includes(adminSearchQuery.toLowerCase())).length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Waxba lama helin "{adminSearchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
            <Card 
              className="border-none shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab("list")}
              data-testid="card-lessons"
            >
                <CardContent className="p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Video className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Casharada</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-900" data-testid="text-total-lessons">{lessonsWithContent.length}</h3>
                    </div>
                </CardContent>
            </Card>
            <Card 
              className="border-none shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab("list")}
              data-testid="card-courses"
            >
                <CardContent className="p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Koorsooyin</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-900" data-testid="text-total-courses">{courses.length}</h3>
                    </div>
                </CardContent>
            </Card>
            <Card 
              className="border-none shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab("payments")}
              data-testid="card-payments"
            >
                <CardContent className="p-3 sm:p-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Sugaysa</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-900" data-testid="text-pending-payments">
                          {paymentSubmissions.filter((p: any) => p.status === "pending").length}
                        </h3>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Navigation Buttons - Grouped */}
        <div className="mb-6">
          {/* Category Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
            <Button
              variant={["upload", "list", "assignments", "exercises", "course-manager"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={() => setActiveTab("course-manager")}
              data-testid="nav-casharada"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Cashar</span>
            </Button>
            <Button
              variant={["payments", "pricing"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all relative"
              onClick={() => setActiveTab("payments")}
              data-testid="nav-lacagta"
            >
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Lacag</span>
              {paymentSubmissions.filter((p: any) => p.status === "pending").length > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-orange-500 text-[10px] px-1 min-w-4 h-4">{paymentSubmissions.filter((p: any) => p.status === "pending").length}</Badge>
              )}
            </Button>
            <Button
              variant={["parents", "appointments", "parent-progress", "assessment-insights"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all relative"
              onClick={() => setActiveTab("parents")}
              data-testid="nav-waalidka"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Waalid</span>
              {newParentsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-green-500 text-[10px] px-1 min-w-4 h-4">{newParentsCount}</Badge>
              )}
            </Button>
            <Button
              variant={["testimonials", "parent-feedback", "tips", "ai-tips", "announcements", "push-notifications", "parent-messages", "bedtime-stories", "content-creator"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={() => setActiveTab("content-creator")}
              data-testid="nav-content"
            >
              <MessageSquareQuote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Qoraal</span>
            </Button>
            <Button
              variant={["voice-spaces", "ai-moderation"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all relative"
              onClick={() => setActiveTab("voice-spaces")}
              data-testid="nav-sheeko"
            >
              <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Sheeko</span>
            </Button>
            <Button
              variant={["homepage", "resources", "milestones", "flashcards", "parent-community", "email-test", "meet-events"].includes(activeTab) ? "default" : "outline"}
              className="flex items-center justify-center gap-1.5 h-10 text-xs sm:text-sm px-2 sm:px-3 rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={() => setActiveTab("homepage")}
              data-testid="nav-settings"
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dejin</span>
            </Button>
          </div>
          
          {/* Sub-navigation based on category */}
          <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-gray-200">
            {/* Casharada sub-tabs */}
            {["upload", "list", "assignments", "exercises", "course-manager"].includes(activeTab) && (
              <>
                <Button
                  variant={activeTab === "course-manager" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("course-manager")}
                  data-testid="tab-course-manager"
                >
                  <BookOpen className="w-3 h-3 mr-1" /> Koorsooyin
                </Button>
                <Button
                  variant={activeTab === "upload" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("upload")}
                  data-testid="tab-upload"
                >
                  <Upload className="w-3 h-3 mr-1" /> Cashar Cusub
                </Button>
                <Button
                  variant={activeTab === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("list")}
                  data-testid="tab-list"
                >
                  <List className="w-3 h-3 mr-1" /> Liiska
                </Button>
                <Button
                  variant={activeTab === "assignments" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("assignments")}
                  data-testid="tab-assignments"
                >
                  <ClipboardList className="w-3 h-3 mr-1" /> Hawlgal
                </Button>
                <Button
                  variant={activeTab === "exercises" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("exercises")}
                  data-testid="tab-exercises"
                >
                  <Brain className="w-3 h-3 mr-1" /> Exercises
                </Button>
              </>
            )}
            
            {/* Lacagta sub-tabs */}
            {["payments", "pricing", "finance"].includes(activeTab) && (
              <>
                <Button
                  variant={activeTab === "payments" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("payments")}
                  data-testid="tab-payments"
                >
                  <CreditCard className="w-3 h-3 mr-1" /> Lacag Bixinta
                  {paymentSubmissions.filter((p: any) => p.status === "pending").length > 0 && (
                    <Badge className="ml-1 bg-orange-500 text-xs px-1">{paymentSubmissions.filter((p: any) => p.status === "pending").length}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "pricing" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("pricing")}
                  data-testid="tab-pricing"
                >
                  <DollarSign className="w-3 h-3 mr-1" /> Qiimaha
                </Button>
                <Button
                  variant={activeTab === "finance" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("finance")}
                  data-testid="tab-finance"
                >
                  <DollarSign className="w-3 h-3 mr-1" /> Xisaab
                </Button>
              </>
            )}
            
            {/* Waalidka sub-tabs */}
            {["parents", "appointments", "parent-progress", "assessment-insights"].includes(activeTab) && (
              <>
                <Button
                  variant={activeTab === "parents" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("parents")}
                  data-testid="tab-parents"
                >
                  <User className="w-3 h-3 mr-1" /> Waalidka
                  {newParentsCount > 0 && (
                    <Badge className="ml-1 bg-green-500 text-xs px-1">{newParentsCount}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "appointments" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("appointments")}
                  data-testid="tab-appointments"
                >
                  <Clock className="w-3 h-3 mr-1" /> Ballamo
                </Button>
                <Button
                  variant={activeTab === "parent-progress" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("parent-progress")}
                  data-testid="tab-parent-progress"
                >
                  <LayoutDashboard className="w-3 h-3 mr-1" /> Horumarka
                </Button>
                <Button
                  variant={activeTab === "assessment-insights" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("assessment-insights")}
                  data-testid="tab-assessment-insights"
                >
                  <Brain className="w-3 h-3 mr-1" /> Qiimaynta
                </Button>
              </>
            )}
            
            {/* Content sub-tabs */}
            {["testimonials", "parent-feedback", "tips", "ai-tips", "announcements", "push-notifications", "parent-messages", "bedtime-stories", "content-creator"].includes(activeTab) && (
              <>
                <Button
                  variant={activeTab === "content-creator" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  onClick={() => setActiveTab("content-creator")}
                  data-testid="tab-content-creator"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Samee Cusub
                </Button>
                <Button
                  variant={activeTab === "parent-messages" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("parent-messages")}
                  data-testid="tab-parent-messages"
                >
                  <FileText className="w-3 h-3 mr-1" /> Dhambaalka
                </Button>
                <Button
                  variant={activeTab === "bedtime-stories" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("bedtime-stories")}
                  data-testid="tab-bedtime-stories"
                >
                  <BookOpen className="w-3 h-3 mr-1" /> Maaweelo
                </Button>
                <Button
                  variant={activeTab === "tips" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("tips")}
                  data-testid="tab-tips"
                >
                  <FileText className="w-3 h-3 mr-1" /> Talo
                </Button>
                <Button
                  variant={activeTab === "ai-tips" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("ai-tips")}
                  data-testid="tab-ai-tips"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> AI Talo
                </Button>
                <Button
                  variant={activeTab === "testimonials" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("testimonials")}
                  data-testid="tab-testimonials"
                >
                  <MessageSquareQuote className="w-3 h-3 mr-1" /> Feedback
                </Button>
                <Button
                  variant={activeTab === "parent-feedback" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("parent-feedback")}
                  data-testid="tab-parent-feedback"
                >
                  <Send className="w-3 h-3 mr-1" /> Telegram
                </Button>
                <Button
                  variant={activeTab === "announcements" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("announcements")}
                  data-testid="tab-announcements"
                >
                  <MessageSquareQuote className="w-3 h-3 mr-1" /> Ogeeysiisyada
                </Button>
                <Button
                  variant={activeTab === "push-notifications" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("push-notifications")}
                  data-testid="tab-push-notifications"
                >
                  <Bell className="w-3 h-3 mr-1" /> Push
                </Button>
              </>
            )}
            
            {/* Settings sub-tabs */}
            {["homepage", "resources", "milestones", "flashcards", "parent-community", "email-test", "meet-events"].includes(activeTab) && (
              <>
                <Button
                  variant={activeTab === "homepage" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("homepage")}
                  data-testid="tab-homepage"
                >
                  <LayoutDashboard className="w-3 h-3 mr-1" /> Bogga Hore
                </Button>
                <Button
                  variant={activeTab === "parent-community" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("parent-community")}
                  data-testid="tab-parent-community"
                >
                  <Users className="w-3 h-3 mr-1" /> Baraha Waalidiinta
                </Button>
                <Button
                  variant={activeTab === "resources" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("resources")}
                  data-testid="tab-resources"
                >
                  <FileText className="w-3 h-3 mr-1" /> Maktabadda
                </Button>
                <Button
                  variant={activeTab === "milestones" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("milestones")}
                  data-testid="tab-milestones"
                >
                  <Star className="w-3 h-3 mr-1" /> Horumar
                </Button>
                <Button
                  variant={activeTab === "flashcards" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("flashcards")}
                  data-testid="tab-flashcards"
                >
                  <BookOpen className="w-3 h-3 mr-1" /> Kaararka
                </Button>
                <Button
                  variant={activeTab === "email-test" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("email-test")}
                  data-testid="tab-email-test"
                >
                  <Send className="w-3 h-3 mr-1" /> Email Test
                </Button>
                <Button
                  variant={activeTab === "meet-events" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab("meet-events")}
                  data-testid="tab-meet-events"
                >
                  <Video className="w-3 h-3 mr-1" /> Kulanka Meet
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden"></TabsList>

            <TabsContent value="payments">
                {/* Payment Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {(() => {
                    const approved = paymentSubmissions.filter((p: any) => p.status === "approved");
                    const pending = paymentSubmissions.filter((p: any) => p.status === "pending");
                    const rejected = paymentSubmissions.filter((p: any) => p.status === "rejected");
                    const totalRevenue = approved.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    
                    return (
                      <>
                        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
                          <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-green-700">${totalRevenue}</p>
                            <p className="text-xs text-green-600 font-medium">Dakhli Wadarta</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-blue-700">{approved.length}</p>
                            <p className="text-xs text-blue-600">La oggolaaday</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50">
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-orange-700">{pending.length}</p>
                            <p className="text-xs text-orange-600">Sugaya</p>
                          </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-rose-50">
                          <CardContent className="p-4 text-center">
                            <p className="text-2xl font-bold text-red-700">{rejected.length}</p>
                            <p className="text-xs text-red-600">La diiday</p>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>

                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Codsiyada Lacag Bixinta ({paymentSubmissions.length})</CardTitle>
                        <CardDescription>Halkan waxaad ka arki kartaa dhammaan codsiyada lacag bixinta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {paymentSubmissions.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">Weli codsi lacag bixin ma jirto.</p>
                            ) : (
                              paymentSubmissions.map((submission: any) => {
                                const course = courses.find((c: any) => c.id === submission.courseId);
                                const method = paymentMethods.find((m: any) => m.id === submission.paymentMethodId);
                                const isPending = submission.status === "pending";
                                const isApproved = submission.status === "approved";
                                
                                return (
                                  <div 
                                    key={submission.id} 
                                    className={`p-4 rounded-lg border-2 ${
                                      isPending ? "border-orange-200 bg-orange-50" : 
                                      isApproved ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                                    }`}
                                    data-testid={`payment-${submission.id}`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          {isPending && <Clock className="w-5 h-5 text-orange-500" />}
                                          {isApproved && <CheckCircle className="w-5 h-5 text-green-500" />}
                                          {submission.status === "rejected" && <XCircle className="w-5 h-5 text-red-500" />}
                                          <span className={`font-bold ${
                                            isPending ? "text-orange-700" : 
                                            isApproved ? "text-green-700" : "text-red-700"
                                          }`}>
                                            {isPending ? "Sugaya" : isApproved ? "La oggolaaday" : "La diiday"}
                                          </span>
                                          <span className="text-gray-500 text-sm">
                                            {new Date(submission.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        
                                        <h4 className="font-bold text-gray-900 mb-1">{submission.customerName}</h4>
                                        <p className="text-sm text-gray-600 mb-2">
                                          <strong>Tel:</strong> {submission.customerPhone}
                                          {submission.customerEmail && <> | <strong>Email:</strong> {submission.customerEmail}</>}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          <Badge variant="outline">{course?.title || "Unknown Course"}</Badge>
                                          <Badge variant="outline" className="bg-blue-50">
                                            {submission.planType === "onetime" ? `Hal mar - $${submission.amount}` : 
                                             submission.planType === "monthly" ? `Bilaha - $${submission.amount}` : `Sanada - $${submission.amount}`}
                                          </Badge>
                                          {submission.paymentSource === 'stripe' ? (
                                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                              💳 Stripe
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline">{method?.name || "Unknown Method"}</Badge>
                                          )}
                                        </div>
                                        
                                        {isApproved && (
                                          <div className="mt-2 p-2 rounded-lg bg-white border border-green-200">
                                            {submission.planType === "onetime" ? (
                                              <p className="text-sm text-green-700 font-medium">
                                                ✅ Weligeed wuu furan yahay (Lifetime Access)
                                              </p>
                                            ) : (
                                              <p className="text-sm text-orange-700 font-medium">
                                                ⏰ Lacag dambe waxaa la rabaa: {' '}
                                                <span className="font-bold">
                                                  {(() => {
                                                    const approvedDate = new Date(submission.updatedAt || submission.createdAt);
                                                    if (submission.planType === "monthly") {
                                                      approvedDate.setMonth(approvedDate.getMonth() + 1);
                                                    } else if (submission.planType === "yearly") {
                                                      approvedDate.setFullYear(approvedDate.getFullYear() + 1);
                                                    }
                                                    return approvedDate.toLocaleDateString('so-SO', { 
                                                      year: 'numeric', 
                                                      month: 'long', 
                                                      day: 'numeric' 
                                                    });
                                                  })()}
                                                </span>
                                              </p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {submission.referenceCode && (
                                          <p className="text-sm text-gray-600">
                                            <strong>Reference:</strong> {submission.referenceCode}
                                          </p>
                                        )}
                                        {submission.screenshotUrl && (
                                          <div className="mt-2">
                                            <p className="text-sm text-gray-600 mb-1"><strong>Sawirka lacag bixinta:</strong></p>
                                            <a href={submission.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                              <img 
                                                src={submission.screenshotUrl} 
                                                alt="Payment screenshot" 
                                                className="max-w-xs max-h-32 object-contain rounded border hover:opacity-80 transition-opacity cursor-pointer"
                                              />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {isPending && (
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => updatePaymentMutation.mutate({ id: submission.id, status: "approved" })}
                                            disabled={updatePaymentMutation.isPending}
                                            data-testid={`approve-${submission.id}`}
                                          >
                                            <CheckCircle className="w-4 h-4 mr-1" /> Oggolow
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="border-red-300 text-red-600 hover:bg-red-50"
                                            onClick={() => updatePaymentMutation.mutate({ id: submission.id, status: "rejected" })}
                                            disabled={updatePaymentMutation.isPending}
                                            data-testid={`reject-${submission.id}`}
                                          >
                                            <XCircle className="w-4 h-4 mr-1" /> Diid
                                          </Button>
                                        </div>
                                      )}
                                      
                                      {!isPending && (
                                        <div className="flex gap-2 mt-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="border-red-300 text-red-600 hover:bg-red-50"
                                            onClick={() => setPaymentToDelete(submission)}
                                            disabled={deletePaymentMutation.isPending}
                                            data-testid={`delete-${submission.id}`}
                                          >
                                            <Trash2 className="w-4 h-4 mr-1" /> Tirtir
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="upload">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="border-b border-gray-100 pb-6">
                        <CardTitle>Soo Geli Cashar Cusub</CardTitle>
                        <CardDescription>Marka hore dooro koorsada, ka dib qaybta (module), ka dibna geli casharka.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Step 1: Select Course */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-cyan-50 border-2 border-orange-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                              <h3 className="font-bold text-gray-800">Dooro Koorsada</h3>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowNewCourseInput(!showNewCourseInput)}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Koorso Cusub
                            </Button>
                          </div>
                          
                          {/* New course input form */}
                          {showNewCourseInput && (
                            <div className="mb-4 p-4 bg-white rounded-lg border border-orange-200 space-y-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Magaca Koorsada *</Label>
                                <DebouncedInput
                                  value={newCourseTitle}
                                  onChange={setNewCourseTitle}
                                  placeholder="Tusaale: Ilmaha 0-6 Bilood"
                                  className="w-full"
                                  debounceMs={200}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">ID-ga Koorsada * (gaaban, eber space)</Label>
                                <DebouncedInput
                                  value={newCourseId}
                                  onChange={(val) => setNewCourseId(val.toLowerCase().replace(/\s+/g, '-'))}
                                  placeholder="Tusaale: 0-6 ama intellect"
                                  className="w-full"
                                  debounceMs={200}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Sharaxaad (optional)</Label>
                                <DebouncedInput
                                  value={newCourseDescription}
                                  onChange={setNewCourseDescription}
                                  placeholder="Wax yar oo ku saabsan koorsada..."
                                  className="w-full"
                                  debounceMs={200}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Nooca</Label>
                                <Select value={newCourseCategory} onValueChange={setNewCourseCategory}>
                                  <SelectTrigger className="w-full bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">Koorso Caadi (General)</SelectItem>
                                    <SelectItem value="special">Koorso Gaar ah (Special)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Pricing Fields */}
                              <div className="pt-2 border-t border-orange-200">
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">💵 Qiimaha Koorsada (USD)</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Hal Mar</Label>
                                    <Input
                                      type="number"
                                      value={newCoursePriceOneTime}
                                      onChange={(e) => setNewCoursePriceOneTime(e.target.value)}
                                      placeholder="95"
                                      className="w-full"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Bishii</Label>
                                    <Input
                                      type="number"
                                      value={newCoursePriceMonthly}
                                      onChange={(e) => setNewCoursePriceMonthly(e.target.value)}
                                      placeholder="30"
                                      className="w-full"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Sanadkii</Label>
                                    <Input
                                      type="number"
                                      value={newCoursePriceYearly}
                                      onChange={(e) => setNewCoursePriceYearly(e.target.value)}
                                      placeholder="114"
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                type="button"
                                onClick={() => {
                                  if (newCourseTitle.trim() && newCourseId.trim()) {
                                    createCourseMutation.mutate({
                                      title: newCourseTitle.trim(),
                                      courseId: newCourseId.trim(),
                                      description: newCourseDescription.trim(),
                                      category: newCourseCategory,
                                      order: courses.length + 1,
                                      priceOneTime: newCoursePriceOneTime ? parseInt(newCoursePriceOneTime) : undefined,
                                      priceMonthly: newCoursePriceMonthly ? parseInt(newCoursePriceMonthly) : undefined,
                                      priceYearly: newCoursePriceYearly ? parseInt(newCoursePriceYearly) : undefined,
                                    });
                                  } else {
                                    toast.error("Fadlan geli magaca iyo ID-ga koorsada");
                                  }
                                }}
                                disabled={!newCourseTitle.trim() || !newCourseId.trim() || createCourseMutation.isPending}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                              >
                                {createCourseMutation.isPending ? "Waa la abuurayaa..." : "Abuur Koorsada"}
                              </Button>
                            </div>
                          )}

                          <Select value={selectedCourseId} onValueChange={(val) => { setSelectedCourseId(val); setModuleNumber("1"); setSelectedModuleId(""); setShowNewModuleInput(false); setShowNewCourseInput(false); }}>
                            <SelectTrigger className="h-12 font-semibold bg-white" data-testid="select-course">
                              <SelectValue placeholder="📚 Fadlan dooro koorsada hore..." />
                            </SelectTrigger>
                            <SelectContent>
                              {courses && courses.length > 0 ? (
                                courses.map((course: any) => (
                                  <SelectItem key={course.id} value={course.id}>
                                    <span className="font-semibold">{course.title}</span>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>Koorsadu wali ma lodno</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {selectedCourseId && (
                            <p className="text-sm text-green-600 font-medium mt-2">✓ Koorsada: {courses.find((c: any) => c.id === selectedCourseId)?.title}</p>
                          )}
                        </div>

                        {/* Step 2: Select Module - Only show if course selected */}
                        {selectedCourseId && (
                          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <h3 className="font-bold text-gray-800">Dooro Qaybta (Module)</h3>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowNewModuleInput(!showNewModuleInput)}
                                className="text-cyan-600 border-cyan-300 hover:bg-cyan-50"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Qayb Cusub
                              </Button>
                            </div>
                            
                            {/* New module input */}
                            {showNewModuleInput && (
                              <div className="mb-4 p-3 bg-white rounded-lg border border-cyan-200 space-y-3">
                                <Label className="text-sm font-medium text-gray-700">Magaca Qaybta Cusub</Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={newModuleTitle}
                                    onChange={(e) => setNewModuleTitle(e.target.value)}
                                    placeholder="Tusaale: Qaybta 2aad - Cuntada"
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      if (newModuleTitle.trim()) {
                                        createModuleMutation.mutate({
                                          courseId: selectedCourseId,
                                          title: newModuleTitle.trim(),
                                          order: courseModules.length + 1,
                                        });
                                      }
                                    }}
                                    disabled={!newModuleTitle.trim() || createModuleMutation.isPending}
                                    className="bg-cyan-600 hover:bg-cyan-700"
                                  >
                                    {createModuleMutation.isPending ? "..." : "Abuur"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {courseModules.length > 0 ? (
                              <>
                                <Select value={selectedModuleId} onValueChange={(val) => {
                                  setSelectedModuleId(val);
                                  // Also update moduleNumber based on module order for legacy support
                                  const selectedModule = courseModules.find((m: any) => m.id === val);
                                  if (selectedModule) {
                                    setModuleNumber(String(selectedModule.order || 1));
                                  }
                                }}>
                                  <SelectTrigger className="h-12 font-semibold bg-white" data-testid="select-module">
                                    <SelectValue placeholder="📂 Dooro qaybta..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {courseModules.map((mod: any) => {
                                      const moduleLessons = lessons.filter((l: any) => l.courseId === selectedCourseId && l.moduleId === mod.id);
                                      return (
                                        <SelectItem key={mod.id} value={mod.id}>
                                          <span className="font-semibold">{mod.title}</span>
                                          {moduleLessons.length > 0 && (
                                            <span className="text-gray-500 ml-2">({moduleLessons.length} cashar)</span>
                                          )}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {selectedModuleId && (
                                  <p className="text-sm text-cyan-600 font-medium mt-2">
                                    ✓ {courseModules.find((m: any) => m.id === selectedModuleId)?.title}
                                  </p>
                                )}
                                
                                {/* Show existing lessons in this module */}
                                {selectedModuleId && (() => {
                                  const moduleLessons = lessons.filter((l: any) => l.courseId === selectedCourseId && l.moduleId === selectedModuleId);
                                  if (moduleLessons.length > 0) {
                                    return (
                                      <div className="mt-4 p-3 bg-white rounded-lg border border-cyan-100">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Casharada jira ee qaybtan:</p>
                                        <div className="space-y-1">
                                          {moduleLessons.map((lesson: any, index: number) => (
                                            <div key={lesson.id} className="text-sm text-gray-700 flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs">{index + 1}</span>
                                              {lesson.title}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            ) : (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                                <p className="text-sm text-yellow-700">
                                  Koorsadani wali ma laha qaybo (modules). 
                                  <br />
                                  Fadlan samee qayb cusub si aad cashar u geliso.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 3: Lesson Form - Only show if course and module selected */}
                        {selectedCourseId && selectedModuleId && (
                          <div className={`p-4 rounded-xl border-2 ${editingLessonId ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm ${editingLessonId ? 'bg-blue-500' : 'bg-green-500'}`}>
                                {editingLessonId ? <Pencil className="w-4 h-4" /> : '3'}
                              </div>
                              <h3 className="font-bold text-gray-800">
                                {editingLessonId ? 'Wax ka badal Casharka' : 'Geli Casharka Cusub'}
                              </h3>
                              {editingLessonId && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  Wax ka badalayo
                                </Badge>
                              )}
                            </div>
                            
                            <form onSubmit={handleSubmitLesson} className="space-y-6">
                              {/* Lesson Type Selector */}
                              <div className="space-y-2">
                                <Label>Nooca Casharka</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                  {[
                                    { value: "video", label: "Video", icon: <Video className="w-4 h-4" />, color: "bg-blue-500" },
                                    { value: "audio", label: "Audio + Qoraal", icon: <Headphones className="w-4 h-4" />, color: "bg-teal-500" },
                                    { value: "text", label: "Qoraal", icon: <FileText className="w-4 h-4" />, color: "bg-green-500" },
                                    { value: "quiz", label: "Su'aalo", icon: <HelpCircle className="w-4 h-4" />, color: "bg-purple-500" },
                                    { value: "assignment", label: "Hawlgal", icon: <ClipboardList className="w-4 h-4" />, color: "bg-orange-500" },
                                    { value: "live", label: "LIVE", icon: <Video className="w-4 h-4" />, color: "bg-red-500" },
                                    { value: "sawirro", label: "Sawirro AI", icon: <Sparkles className="w-4 h-4" />, color: "bg-pink-500" },
                                  ].map((type) => (
                                    <button
                                      key={type.value}
                                      type="button"
                                      onClick={() => setLessonType(type.value as any)}
                                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                        lessonType === type.value 
                                          ? `${type.color} text-white border-transparent` 
                                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                                      }`}
                                      data-testid={`btn-type-${type.value}`}
                                    >
                                      {type.icon}
                                      <span className="text-sm font-medium">{type.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label htmlFor="title">Cinwaanka Casharka</Label>
                                  <DebouncedInput 
                                    id="title"
                                    placeholder="Tusaale: Marxaladaha Kobaca Jirka" 
                                    className="h-11 bg-white"
                                    value={lessonTitle}
                                    onChange={setLessonTitle}
                                    debounceMs={200}
                                    data-testid="input-lesson-title"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="duration">Mudada (Duration)</Label>
                                  <DebouncedInput 
                                    id="duration"
                                    placeholder="15 min" 
                                    className="h-11 bg-white"
                                    value={duration}
                                    onChange={setDuration}
                                    debounceMs={200}
                                    data-testid="input-duration"
                                  />
                                </div>
                              </div>

                              {/* Video URL - Only show for video type */}
                              {lessonType === "video" && (
                                <div className="space-y-2">
                                  <Label>Video-ga Casharka (YouTube / Vimeo Link)</Label>
                                  <DebouncedInput 
                                    id="videoUrl"
                                    placeholder="https://youtube.com/watch?v=... ama https://vimeo.com/..." 
                                    className="h-11 font-mono text-sm bg-white"
                                    value={videoUrl}
                                    onChange={setVideoUrl}
                                    debounceMs={200}
                                    data-testid="input-video-url"
                                  />
                                </div>
                              )}

                              {/* Live Lesson Fields */}
                              {lessonType === "live" && (
                                <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                  <div className="space-y-2">
                                    <Label>Google Meet Link</Label>
                                    <div className="flex gap-2">
                                      <Input 
                                        placeholder="https://meet.google.com/..." 
                                        className="h-11 font-mono text-sm bg-white flex-1"
                                        value={liveUrl}
                                        onChange={(e) => setLiveUrl(e.target.value)}
                                        data-testid="input-live-url"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 px-4 border-red-300 text-red-700 hover:bg-red-100"
                                        disabled={isGeneratingMeet || !lessonTitle || !liveDateTime}
                                        onClick={async () => {
                                          if (!lessonTitle || !liveDateTime) {
                                            toast.error("Fadlan geli cinwaanka iyo waqtiga ka hor");
                                            return;
                                          }
                                          setIsGeneratingMeet(true);
                                          try {
                                            const res = await fetch("/api/admin/create-meet-link", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              credentials: "include",
                                              body: JSON.stringify({
                                                title: `Barbaarintasan: ${lessonTitle}`,
                                                description: textContent || "Cashar LIVE ah - Barbaarintasan Academy",
                                                startDateTime: liveDateTime,
                                                durationMinutes: 60,
                                              }),
                                            });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error || "Failed to create Meet link");
                                            setLiveUrl(data.meetLink);
                                            toast.success("Google Meet link waa la sameeyey!");
                                          } catch (error: any) {
                                            toast.error(error.message || "Ma suurtogalin in Meet link la sameeyo. Fadlan isku day mar kale.");
                                          } finally {
                                            setIsGeneratingMeet(false);
                                          }
                                        }}
                                        data-testid="button-generate-meet"
                                      >
                                        {isGeneratingMeet ? "..." : "Samee Meet"}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">Guji "Samee Meet" ama ku geli linkiga hore haddii aad haysato</p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Taariikhda iyo Waqtiga</Label>
                                      <Input 
                                        type="datetime-local"
                                        className="h-11 bg-white"
                                        value={liveDateTime}
                                        onChange={(e) => {
                                          setLiveDateTime(e.target.value);
                                          setLiveDate(e.target.value);
                                        }}
                                        data-testid="input-live-datetime"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Timezone</Label>
                                      <Select value={liveTimezone} onValueChange={setLiveTimezone}>
                                        <SelectTrigger className="h-11 bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Africa/Mogadishu">Somalia (GMT+3)</SelectItem>
                                          <SelectItem value="America/New_York">New York (EST)</SelectItem>
                                          <SelectItem value="America/Los_Angeles">Los Angeles (PST)</SelectItem>
                                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Assignment Fields */}
                              {lessonType === "assignment" && (
                                <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="space-y-2">
                                    <Label>Sharaxaadda Hawlgalka</Label>
                                    <Textarea 
                                      placeholder="Sharax waxa ardaygu qorayo ama sameeyo..."
                                      className="min-h-[120px] bg-white"
                                      value={inlineAssignmentDescription}
                                      onChange={(e) => setInlineAssignmentDescription(e.target.value)}
                                      data-testid="textarea-assignment-desc"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Lesson Unlock Settings */}
                              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Label className="text-blue-700 font-semibold flex items-center gap-2">
                                  <Lock className="w-4 h-4" />
                                  Goorta Casharka u Furmayo (Unlock Settings)
                                </Label>
                                <div className="space-y-2">
                                  <Label>Nooca Furitaanka</Label>
                                  <Select value={unlockType} onValueChange={(val) => setUnlockType(val as any)}>
                                    <SelectTrigger className="h-11 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="immediate">Isla markiiba (Immediate)</SelectItem>
                                      <SelectItem value="date">Taariikh Gaar ah (Specific Date)</SelectItem>
                                      <SelectItem value="days_after_enrollment">X Maalmood ka dib Diiwaangelinta</SelectItem>
                                      <SelectItem value="days_after_previous">X Maalmood ka dib Casharka Hore</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {unlockType === "date" && (
                                  <div className="space-y-2">
                                    <Label>Taariikhda uu Furmayo</Label>
                                    <Input 
                                      type="date"
                                      className="h-11 bg-white"
                                      value={unlockDate}
                                      onChange={(e) => setUnlockDate(e.target.value)}
                                      data-testid="input-unlock-date"
                                    />
                                  </div>
                                )}
                                
                                {(unlockType === "days_after_enrollment" || unlockType === "days_after_previous") && (
                                  <div className="space-y-2">
                                    <Label>Imisa Maalmood ka dib?</Label>
                                    <Input 
                                      type="number"
                                      min="1"
                                      className="h-11 bg-white"
                                      placeholder="Tusaale: 7"
                                      value={unlockDaysAfter}
                                      onChange={(e) => setUnlockDaysAfter(e.target.value)}
                                      data-testid="input-unlock-days"
                                    />
                                    <p className="text-xs text-blue-600">
                                      {unlockType === "days_after_enrollment" 
                                        ? "Casharka wuxuu u furmayaa ardayga X maalmood ka dib markuu koorsada iibsado" 
                                        : "Casharka wuxuu u furmayaa X maalmood ka dib markuu casharka hore dhamaysato"}
                                    </p>
                                  </div>
                                )}

                                {lessonType === "video" && (
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={videoWatchRequired}
                                      onCheckedChange={setVideoWatchRequired}
                                      data-testid="switch-video-required"
                                    />
                                    <Label>Video-ga waa khasab in la daawado (80%+)</Label>
                                  </div>
                                )}
                              </div>

                              {/* Text Content - Show for all types except quiz */}
                              {lessonType !== "quiz" && (
                                <div className="space-y-2">
                                  <Label htmlFor="textContent">Qoraalka Casharka (Faahfaahin)</Label>
                                  <DebouncedTextarea 
                                    id="textContent"
                                    placeholder="Halkan ku qor faahfaahinta casharka oo dhamaystiran..." 
                                    className="min-h-[200px] font-sans leading-relaxed p-4 bg-white"
                                    value={textContent}
                                    onChange={setTextContent}
                                    debounceMs={250}
                                    rows={10}
                                    data-testid="textarea-text-content"
                                  />
                                  <p className="text-xs text-gray-500 text-right">
                                    Waa muhiim in casharkaagu yeesho qoraal faahfaahsan.
                                  </p>
                                </div>
                              )}

                              {/* AI Cashar Tools */}
                              {lessonType !== "quiz" && (
                                <div className="space-y-4 mt-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-semibold text-blue-800">AI Cashar Tools</h4>
                                  </div>

                                  {/* AI Text Generation Panel */}
                                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-4 h-4 text-blue-600" />
                                      <Label className="text-blue-700 font-semibold">AI Qoraal Casharka</Label>
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Mawduuca Casharka (tusaale: Nafaqada Ilmaha)"
                                        value={aiLessonTopic}
                                        onChange={(e) => setAiLessonTopic(e.target.value)}
                                        className="flex-1"
                                        data-testid="input-ai-lesson-topic"
                                      />
                                      <Button
                                        onClick={async () => {
                                          if (!aiLessonTopic.trim()) {
                                            toast.error("Fadlan geli mawduuca casharka");
                                            return;
                                          }
                                          setIsGeneratingLesson(true);
                                          try {
                                            const courseTitle = courses.find((c: any) => c.id === selectedCourseId)?.title;
                                            const moduleTitle = courseModules.find((m: any) => m.id === selectedModuleId)?.title;
                                            const res = await fetch("/api/admin/lessons/ai-generate", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ topic: aiLessonTopic, courseTitle, moduleTitle }),
                                              credentials: "include",
                                            });
                                            if (!res.ok) {
                                              const err = await res.json();
                                              throw new Error(err.message || "AI qoraalka lama sameyn karin");
                                            }
                                            const data = await res.json();
                                            setTextContent(data.content);
                                            toast.success("AI qoraalka casharka waa la sameeyay!");
                                          } catch (error: any) {
                                            toast.error(error.message || "Khalad ayaa dhacay");
                                          } finally {
                                            setIsGeneratingLesson(false);
                                          }
                                        }}
                                        disabled={isGeneratingLesson || !aiLessonTopic.trim()}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                        data-testid="button-ai-generate-lesson"
                                      >
                                        {isGeneratingLesson ? (
                                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Waa la sameynayaa...</>
                                        ) : (
                                          <><Sparkles className="w-4 h-4 mr-2" /> AI Qoraal Samee</>
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Voice & Audio Generation Panel */}
                                  {(editingLessonId || lessonType === "audio") && (
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-lg border border-purple-200 space-y-3">
                                      <div className="flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-purple-600" />
                                        <Label className="text-purple-700 font-semibold">Cod & Audio</Label>
                                      </div>

                                      {/* Voice selector */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">Codka:</span>
                                        <button
                                          type="button"
                                          onClick={() => setLessonVoice("ubax")}
                                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            lessonVoice === "ubax"
                                              ? "bg-purple-600 text-white shadow-md"
                                              : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                                          }`}
                                          data-testid="button-voice-ubax"
                                        >
                                          🎤 Ubax (Naag)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setLessonVoice("muuse")}
                                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            lessonVoice === "muuse"
                                              ? "bg-purple-600 text-white shadow-md"
                                              : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                                          }`}
                                          data-testid="button-voice-muuse"
                                        >
                                          🎤 Muuse (Lab)
                                        </button>
                                      </div>

                                      {/* Existing audio player */}
                                      {(() => {
                                        const editingLesson = lessons.find((l: any) => l.id === editingLessonId);
                                        if (editingLesson?.audioUrl) {
                                          return (
                                            <div className="flex items-center gap-3 bg-white rounded-lg p-2 border border-purple-100">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (!lessonAudioRef.current) {
                                                    lessonAudioRef.current = new Audio(editingLesson.audioUrl);
                                                    lessonAudioRef.current.onended = () => setIsPlayingLessonAudio(false);
                                                  }
                                                  if (isPlayingLessonAudio) {
                                                    lessonAudioRef.current.pause();
                                                    setIsPlayingLessonAudio(false);
                                                  } else {
                                                    lessonAudioRef.current.play();
                                                    setIsPlayingLessonAudio(true);
                                                  }
                                                }}
                                                className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                                                data-testid="button-play-lesson-audio"
                                              >
                                                {isPlayingLessonAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                              </button>
                                              <div className="flex items-center gap-1 flex-1">
                                                {[...Array(12)].map((_, i) => (
                                                  <div
                                                    key={i}
                                                    className={`w-1 rounded-full ${isPlayingLessonAudio ? 'animate-pulse' : ''}`}
                                                    style={{
                                                      height: `${8 + Math.random() * 16}px`,
                                                      backgroundColor: isPlayingLessonAudio ? '#9333ea' : '#d8b4fe',
                                                      animationDelay: `${i * 0.1}s`,
                                                    }}
                                                  />
                                                ))}
                                              </div>
                                              <span className="text-xs text-purple-600 font-medium">
                                                <Headphones className="w-3 h-3 inline mr-1" />
                                                Audio diyaar
                                              </span>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                                      {/* Generate / Regenerate button */}
                                      {editingLessonId ? (
                                        <Button
                                          onClick={async () => {
                                            if (!textContent.trim()) {
                                              toast.error("Fadlan marka hore qoraalka casharka geli");
                                              return;
                                            }
                                            setIsGeneratingLessonAudio(true);
                                            if (lessonAudioRef.current) {
                                              lessonAudioRef.current.pause();
                                              lessonAudioRef.current = null;
                                              setIsPlayingLessonAudio(false);
                                            }
                                            try {
                                              const res = await fetch(`/api/admin/lessons/${editingLessonId}/generate-audio`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ voiceName: lessonVoice, text: textContent }),
                                                credentials: "include",
                                              });
                                              if (!res.ok) {
                                                const err = await res.json();
                                                throw new Error(err.message || "Audio lama sameyn karin");
                                              }
                                              toast.success("Audio waa la sameeyay!");
                                              refetchLessons();
                                            } catch (error: any) {
                                              toast.error(error.message || "Khalad ayaa dhacay");
                                            } finally {
                                              setIsGeneratingLessonAudio(false);
                                            }
                                          }}
                                          disabled={isGeneratingLessonAudio || !textContent.trim()}
                                          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white w-full"
                                          data-testid="button-generate-lesson-audio"
                                        >
                                          {isGeneratingLessonAudio ? (
                                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Codka waa la sameynayaa...</>
                                          ) : (
                                            <>
                                              <Volume2 className="w-4 h-4 mr-2" />
                                              {lessons.find((l: any) => l.id === editingLessonId)?.audioUrl ? "Dib u Samee Codka" : "Cod Samee"}
                                            </>
                                          )}
                                        </Button>
                                      ) : (
                                        <p className="text-sm text-purple-500 bg-purple-50 p-3 rounded-lg text-center">
                                          <Volume2 className="w-4 h-4 inline mr-1" />
                                          Marka hore keydi casharka, kadibna audio-ga samee
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* AI Prompt Settings Panel */}
                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowLessonAiSettings(!showLessonAiSettings);
                                        if (!showLessonAiSettings && !lessonAiPrompt) {
                                          fetch("/api/admin/ai-lessons/settings", { credentials: "include" })
                                            .then(res => res.ok ? res.json() : { prompt: "" })
                                            .then(data => setLessonAiPrompt(data.prompt || ""))
                                            .catch(() => {});
                                        }
                                      }}
                                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                      data-testid="button-toggle-lesson-ai-settings"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-700">AI Prompt Settings</span>
                                      </div>
                                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showLessonAiSettings ? 'rotate-90' : ''}`} />
                                    </button>
                                    {showLessonAiSettings && (
                                      <div className="p-4 space-y-3 bg-white">
                                        <Textarea
                                          placeholder="AI prompt-ka casharka... Isticmaal {topic}, {courseTitle}, {moduleTitle} sida variables."
                                          value={lessonAiPrompt}
                                          onChange={(e) => setLessonAiPrompt(e.target.value)}
                                          className="min-h-[120px] text-sm font-mono"
                                          data-testid="textarea-lesson-ai-prompt"
                                        />
                                        <p className="text-xs text-gray-500">
                                          Variables: {"{topic}"} = Mawduuca, {"{courseTitle}"} = Magaca Koorsada, {"{moduleTitle}"} = Magaca Qaybta
                                        </p>
                                        <Button
                                          onClick={async () => {
                                            try {
                                              const res = await fetch("/api/admin/ai-lessons/settings", {
                                                method: "PUT",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ prompt: lessonAiPrompt }),
                                                credentials: "include",
                                              });
                                              if (!res.ok) throw new Error("Settings lama keydin karin");
                                              toast.success("AI prompt settings waa la keydiyay!");
                                            } catch (error: any) {
                                              toast.error(error.message || "Khalad ayaa dhacay");
                                            }
                                          }}
                                          variant="outline"
                                          className="w-full"
                                          data-testid="button-save-lesson-ai-settings"
                                        >
                                          <Save className="w-4 h-4 mr-2" />
                                          Kaydi Settings
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Quiz Editor */}
                              {lessonType === "quiz" && (
                                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                  <Label className="text-purple-700 font-semibold flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" />
                                    Su'aalaha Quiz-ka
                                  </Label>
                                  
                                  {/* AI Quiz Generation */}
                                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-5 h-5 text-blue-600" />
                                      <p className="text-sm font-semibold text-blue-700">AI Su'aalo Diyaari</p>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Ku qor qoraalka casharka (ama nuqul ka samee casharkaaga) - AI ayaa kuu diyaarin doona su'aalaha.
                                    </p>
                                    
                                    {/* Quiz Options */}
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                      <div>
                                        <Label className="text-xs text-gray-600 mb-1 block">Inta su'aalood</Label>
                                        <select
                                          value={aiQuizNumQuestions}
                                          onChange={(e) => setAiQuizNumQuestions(e.target.value)}
                                          className="w-full border rounded px-3 py-2 text-sm"
                                        >
                                          <option value="3">3 su'aalood</option>
                                          <option value="5">5 su'aalood</option>
                                          <option value="7">7 su'aalood</option>
                                          <option value="10">10 su'aalood</option>
                                        </select>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-gray-600 mb-1 block">Nooca su'aalaha</Label>
                                        <select
                                          value={aiQuizType}
                                          onChange={(e) => setAiQuizType(e.target.value as any)}
                                          className="w-full border rounded px-3 py-2 text-sm"
                                        >
                                          <option value="multiple_choice">Multiple Choice (4 jawaab)</option>
                                          <option value="true_false">Haa/Maya (True/False)</option>
                                          <option value="mixed">Noocyada Oo Dhan (MC + Haa/Maya)</option>
                                        </select>
                                      </div>
                                    </div>
                                    
                                    <DebouncedTextarea
                                      placeholder="Halkan ku qor qoraalka casharka oo aad rabto in AI uu su'aalo ka diyaariyo..."
                                      className="min-h-[120px] bg-white"
                                      value={aiQuizContent}
                                      onChange={setAiQuizContent}
                                      debounceMs={250}
                                      rows={5}
                                      data-testid="textarea-ai-quiz-content"
                                    />
                                    <Button
                                      type="button"
                                      disabled={isGeneratingQuiz || aiQuizContent.trim().length < 50}
                                      onClick={async () => {
                                        if (aiQuizContent.trim().length < 50) {
                                          toast.error("Fadlan ku qor ugu yaraan 50 xaraf");
                                          return;
                                        }
                                        setIsGeneratingQuiz(true);
                                        try {
                                          const res = await fetch("/api/admin/generate-quiz", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            credentials: "include",
                                            body: JSON.stringify({
                                              lessonContent: aiQuizContent,
                                              numQuestions: parseInt(aiQuizNumQuestions),
                                              questionType: aiQuizType
                                            })
                                          });
                                          const data = await res.json();
                                          if (!res.ok) {
                                            toast.error(data.error || "Khalad ayaa dhacay");
                                            return;
                                          }
                                          if (data.questions && data.questions.length > 0) {
                                            setInlineQuizQuestions([...inlineQuizQuestions, ...data.questions]);
                                            setAiQuizContent("");
                                            toast.success(`${data.questions.length} su'aalood ayaa la diyaariyey! Hoos ka eeg oo edit samee.`);
                                          }
                                        } catch (err) {
                                          toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
                                        } finally {
                                          setIsGeneratingQuiz(false);
                                        }
                                      }}
                                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    >
                                      {isGeneratingQuiz ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          AI wuu diyaarinayaa...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4 mr-2" />
                                          AI-ga ha Diyaariyo Su'aalaha
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 py-2">
                                    <div className="flex-1 border-t border-gray-300"></div>
                                    <span className="text-xs text-gray-500">ama</span>
                                    <div className="flex-1 border-t border-gray-300"></div>
                                  </div>
                                  
                                  {/* Add New Question Form */}
                                  <div className="p-4 bg-white rounded-lg border border-purple-200 space-y-3">
                                    <p className="text-sm font-medium text-gray-700">Ku dar su'aal cusub:</p>
                                    <Input
                                      placeholder="Su'aasha (tusaale: Waa maxay ujeedada ugu weyn...?)"
                                      value={newQuizQuestion}
                                      onChange={(e) => setNewQuizQuestion(e.target.value)}
                                      data-testid="input-new-quiz-question"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="Jawaab 1"
                                        value={newQuizOption1}
                                        onChange={(e) => setNewQuizOption1(e.target.value)}
                                      />
                                      <Input
                                        placeholder="Jawaab 2"
                                        value={newQuizOption2}
                                        onChange={(e) => setNewQuizOption2(e.target.value)}
                                      />
                                      <Input
                                        placeholder="Jawaab 3"
                                        value={newQuizOption3}
                                        onChange={(e) => setNewQuizOption3(e.target.value)}
                                      />
                                      <Input
                                        placeholder="Jawaab 4"
                                        value={newQuizOption4}
                                        onChange={(e) => setNewQuizOption4(e.target.value)}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm">Jawaabta saxda ah:</Label>
                                      <select
                                        value={newQuizCorrectAnswer}
                                        onChange={(e) => setNewQuizCorrectAnswer(parseInt(e.target.value))}
                                        className="border rounded px-3 py-1.5 text-sm"
                                      >
                                        <option value={0}>Jawaab 1</option>
                                        <option value={1}>Jawaab 2</option>
                                        <option value={2}>Jawaab 3</option>
                                        <option value={3}>Jawaab 4</option>
                                      </select>
                                    </div>
                                    <Input
                                      placeholder="Sharaxaad (optional) - Sababta jawaabtu u saxan tahay"
                                      value={newQuizExplanation}
                                      onChange={(e) => setNewQuizExplanation(e.target.value)}
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        if (!newQuizQuestion.trim() || !newQuizOption1.trim() || !newQuizOption2.trim()) {
                                          toast.error("Fadlan buuxi su'aasha iyo ugu yaraan 2 jawaab");
                                          return;
                                        }
                                        const options = [newQuizOption1, newQuizOption2];
                                        if (newQuizOption3.trim()) options.push(newQuizOption3);
                                        if (newQuizOption4.trim()) options.push(newQuizOption4);
                                        
                                        const newQ = {
                                          question: newQuizQuestion,
                                          options,
                                          correctAnswer: newQuizCorrectAnswer,
                                          explanation: newQuizExplanation
                                        };
                                        setInlineQuizQuestions([...inlineQuizQuestions, newQ]);
                                        setNewQuizQuestion("");
                                        setNewQuizOption1("");
                                        setNewQuizOption2("");
                                        setNewQuizOption3("");
                                        setNewQuizOption4("");
                                        setNewQuizCorrectAnswer(0);
                                        setNewQuizExplanation("");
                                        toast.success("Su'aashii waa lagu daray!");
                                      }}
                                      className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                      <Plus className="w-4 h-4 mr-2" /> Ku Dar Su'aasha
                                    </Button>
                                  </div>
                                  
                                  {/* List of Questions */}
                                  {inlineQuizQuestions.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-purple-700">Su'aalaha ({inlineQuizQuestions.length}):</p>
                                      {inlineQuizQuestions.map((q, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100">
                                          {editingQuizIndex === idx ? (
                                            /* Edit Mode */
                                            <div className="space-y-3">
                                              <Input
                                                placeholder="Su'aasha"
                                                value={editQuizQuestion}
                                                onChange={(e) => setEditQuizQuestion(e.target.value)}
                                              />
                                              <div className="grid grid-cols-2 gap-2">
                                                {editQuizOptions.map((opt, optIdx) => (
                                                  <Input
                                                    key={optIdx}
                                                    placeholder={`Jawaab ${optIdx + 1}`}
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const newOpts = [...editQuizOptions];
                                                      newOpts[optIdx] = e.target.value;
                                                      setEditQuizOptions(newOpts);
                                                    }}
                                                  />
                                                ))}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Label className="text-sm">Jawaabta saxda:</Label>
                                                <select
                                                  value={editQuizCorrectAnswer}
                                                  onChange={(e) => setEditQuizCorrectAnswer(parseInt(e.target.value))}
                                                  className="border rounded px-3 py-1.5 text-sm"
                                                >
                                                  <option value={0}>Jawaab 1</option>
                                                  <option value={1}>Jawaab 2</option>
                                                  <option value={2}>Jawaab 3</option>
                                                  <option value={3}>Jawaab 4</option>
                                                </select>
                                              </div>
                                              <Input
                                                placeholder="Sharaxaad (optional)"
                                                value={editQuizExplanation}
                                                onChange={(e) => setEditQuizExplanation(e.target.value)}
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  onClick={() => {
                                                    const updated = [...inlineQuizQuestions];
                                                    updated[idx] = {
                                                      question: editQuizQuestion,
                                                      options: editQuizOptions.filter(o => o.trim()),
                                                      correctAnswer: editQuizCorrectAnswer,
                                                      explanation: editQuizExplanation
                                                    };
                                                    setInlineQuizQuestions(updated);
                                                    setEditingQuizIndex(null);
                                                    toast.success("Su'aashii waa la cusboonaysiiyey!");
                                                  }}
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  <CheckCircle className="w-4 h-4 mr-1" /> Kaydi
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => setEditingQuizIndex(null)}
                                                >
                                                  Ka noqo
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            /* Display Mode */
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <p className="text-sm font-medium"><strong>{idx + 1}.</strong> {q.question}</p>
                                                <div className="ml-4 mt-1">
                                                  {q.options.map((opt, optIdx) => (
                                                    <p key={optIdx} className={`text-xs ${q.correctAnswer === optIdx ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                                                      {q.correctAnswer === optIdx ? '✓' : '○'} {opt}
                                                    </p>
                                                  ))}
                                                </div>
                                                {q.explanation && (
                                                  <p className="text-xs text-gray-400 mt-1 ml-4">💡 {q.explanation}</p>
                                                )}
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setEditingQuizIndex(idx);
                                                    setEditQuizQuestion(q.question);
                                                    const opts = [...q.options];
                                                    while (opts.length < 4) opts.push("");
                                                    setEditQuizOptions(opts);
                                                    setEditQuizCorrectAnswer(q.correctAnswer);
                                                    setEditQuizExplanation(q.explanation || "");
                                                  }}
                                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    const updated = inlineQuizQuestions.filter((_, i) => i !== idx);
                                                    setInlineQuizQuestions(updated);
                                                    toast.success("Su'aashii waa la tirtiray");
                                                  }}
                                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {inlineQuizQuestions.length === 0 && openEndedQuestions.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                      Weli ma jiraan su'aalo. Ku dar su'aalaha kor.
                                    </p>
                                  )}
                                  
                                  {/* Open-Ended Questions Section - Su'aalo qoraal ah oo keliya */}
                                  <div className="flex items-center gap-2 py-3">
                                    <div className="flex-1 border-t border-green-300"></div>
                                    <span className="text-xs text-green-600 font-medium">Su'aalo Qoraal ah (Open-ended)</span>
                                    <div className="flex-1 border-t border-green-300"></div>
                                  </div>
                                  
                                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="w-5 h-5 text-green-600" />
                                      <p className="text-sm font-semibold text-green-700">Ku dar su'aal qoraal ah oo keliya</p>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Su'aalahan waxaa jawaabaya waalid qoraal ahaan - ma jiraan doorashooyin.
                                    </p>
                                    
                                    <Input
                                      placeholder="Su'aasha (tusaale: Waa maxay sababta ugu weyn...?)"
                                      value={newOpenEndedQuestion}
                                      onChange={(e) => setNewOpenEndedQuestion(e.target.value)}
                                      data-testid="input-new-open-ended-question"
                                    />
                                    <Input
                                      placeholder="Tilmaan/Hint (optional) - Tusaale: Ka fikir waxyaabaha..."
                                      value={newOpenEndedHint}
                                      onChange={(e) => setNewOpenEndedHint(e.target.value)}
                                      data-testid="input-new-open-ended-hint"
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        if (!newOpenEndedQuestion.trim()) {
                                          toast.error("Fadlan ku qor su'aasha");
                                          return;
                                        }
                                        const newQ = {
                                          question: newOpenEndedQuestion,
                                          hint: newOpenEndedHint.trim() || undefined
                                        };
                                        setOpenEndedQuestions([...openEndedQuestions, newQ]);
                                        setNewOpenEndedQuestion("");
                                        setNewOpenEndedHint("");
                                        toast.success("Su'aasha qoraalka waa lagu daray!");
                                      }}
                                      className="w-full bg-green-600 hover:bg-green-700"
                                      data-testid="button-add-open-ended-question"
                                    >
                                      <Plus className="w-4 h-4 mr-2" /> Ku Dar Su'aasha
                                    </Button>
                                  </div>
                                  
                                  {/* List of Open-Ended Questions */}
                                  {openEndedQuestions.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-green-700">Su'aalaha Qoraalka ({openEndedQuestions.length}):</p>
                                      {openEndedQuestions.map((q, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded-lg border border-green-100">
                                          {editingOpenEndedIndex === idx ? (
                                            /* Edit Mode */
                                            <div className="space-y-3">
                                              <Input
                                                placeholder="Su'aasha"
                                                value={editOpenEndedQuestion}
                                                onChange={(e) => setEditOpenEndedQuestion(e.target.value)}
                                              />
                                              <Input
                                                placeholder="Tilmaan/Hint (optional)"
                                                value={editOpenEndedHint}
                                                onChange={(e) => setEditOpenEndedHint(e.target.value)}
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  onClick={() => {
                                                    const updated = [...openEndedQuestions];
                                                    updated[idx] = {
                                                      question: editOpenEndedQuestion,
                                                      hint: editOpenEndedHint.trim() || undefined
                                                    };
                                                    setOpenEndedQuestions(updated);
                                                    setEditingOpenEndedIndex(null);
                                                    toast.success("Su'aashii waa la cusboonaysiiyey!");
                                                  }}
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  <CheckCircle className="w-4 h-4 mr-1" /> Kaydi
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => setEditingOpenEndedIndex(null)}
                                                >
                                                  Ka noqo
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            /* Display Mode */
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <p className="text-sm font-medium"><strong>{idx + 1}.</strong> {q.question}</p>
                                                {q.hint && (
                                                  <p className="text-xs text-gray-400 mt-1 ml-4">💡 Tilmaan: {q.hint}</p>
                                                )}
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setEditingOpenEndedIndex(idx);
                                                    setEditOpenEndedQuestion(q.question);
                                                    setEditOpenEndedHint(q.hint || "");
                                                  }}
                                                  className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    const updated = openEndedQuestions.filter((_, i) => i !== idx);
                                                    setOpenEndedQuestions(updated);
                                                    toast.success("Su'aashii waa la tirtiray");
                                                  }}
                                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Generated Images Section - Only show for sawirro type OR when editing any lesson */}
                              {(lessonType === "sawirro" || editingLessonId) && (
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                      <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-purple-700">Sawiro AI (AI-Generated Images)</h3>
                                      <p className="text-sm text-purple-600">Samee sawiro realistic qoyska Soomaaliyeed muujinaya</p>
                                      <p className="text-xs text-purple-400 mt-1">Google Gemini Imagen 4.0 API - Lagu daray: Jan 19, 2026</p>
                                    </div>
                                  </div>

                                  {lessonType === "sawirro" && !editingLessonId && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                      <p className="text-sm text-yellow-700">
                                        <strong>Ogeysiis:</strong> Marka hore kaydi casharka, ka dib samee sawirrada AI.
                                      </p>
                                    </div>
                                  )}

                                  {/* Generate Images Controls - Only show when editing */}
                                  {editingLessonId && (
                                    <div className="flex items-center gap-3 mb-4">
                                      <Select value={imageGenerateCount} onValueChange={setImageGenerateCount}>
                                        <SelectTrigger className="w-24">
                                          <SelectValue placeholder="Tirada" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1">1 sawir</SelectItem>
                                          <SelectItem value="2">2 sawir</SelectItem>
                                          <SelectItem value="3">3 sawir</SelectItem>
                                          <SelectItem value="4">4 sawir</SelectItem>
                                          <SelectItem value="5">5 sawir</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        onClick={handleGenerateAIImages}
                                        disabled={isGeneratingImages}
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                        data-testid="button-generate-ai-images"
                                      >
                                        {isGeneratingImages ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Samaynaya...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Samee Sawiro AI
                                          </>
                                        )}
                                      </Button>
                                      <span className="text-xs text-purple-500">~$0.04 sawir kasta (realistic)</span>
                                    </div>
                                  )}

                                  {/* Display Generated Images */}
                                  {lessonImages.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      {lessonImages.map((img) => (
                                        <div key={img.id} className="relative group rounded-lg overflow-hidden border-2 border-purple-200">
                                          <img 
                                            src={img.imageUrl} 
                                            alt={img.caption || "Sawir AI"} 
                                            className="w-full h-32 object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => handleDeleteLessonImage(img.id)}
                                              className="bg-red-500 hover:bg-red-600"
                                              data-testid={`button-delete-image-${img.id}`}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          {img.caption && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                                              {img.caption}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {lessonImages.length === 0 && editingLessonId && (
                                    <p className="text-sm text-purple-500 text-center py-4">
                                      Weli ma jiraan sawiro AI. Riix "Samee Sawiro AI" si aad u samaysid sawiro cusub.
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* AI Video Generation Section */}
                              {(editingLessonId || lessonType === "audio" || lessonType === "video") && lessonType !== "quiz" && (
                                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
                                      <Film className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-indigo-700">Muuqaal AI (AI Video - Veo)</h3>
                                      <p className="text-sm text-indigo-600">Samee muuqaal gaaban oo casharka ku saabsan</p>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm text-indigo-700">Video-ga sharaxaaddiisa (Prompt)</Label>
                                      <Textarea
                                        placeholder="Tusaale: Hooyo Soomaali ah oo carruurteeda la ciyaareysa guriga dhexdiisa, iftiinka qorraxdu soo gelayo, carruurtu way qoslayan iyagoo dareenka farxadda leh"
                                        value={videoPrompt}
                                        onChange={(e) => setVideoPrompt(e.target.value)}
                                        className="min-h-[80px] bg-white text-sm"
                                        data-testid="textarea-video-prompt"
                                      />
                                    </div>

                                    {generatedVideoUrl && (
                                      <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                        <video
                                          src={generatedVideoUrl}
                                          controls
                                          className="w-full rounded-lg max-h-[200px]"
                                          data-testid="video-generated-preview"
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-indigo-600"
                                            onClick={() => {
                                              if (generatedVideoUrl) {
                                                setVideoUrl(generatedVideoUrl);
                                                toast.success("Video URL waa la geliyay casharka");
                                              }
                                            }}
                                            data-testid="button-use-video"
                                          >
                                            Isticmaal Casharka
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {editingLessonId ? (
                                      <Button
                                        type="button"
                                        onClick={async () => {
                                          if (!videoPrompt.trim()) {
                                            toast.error("Fadlan ku qor sharaxaadda video-ga");
                                            return;
                                          }
                                          setIsGeneratingVideo(true);
                                          setGeneratedVideoUrl(null);
                                          try {
                                            const res = await fetch(`/api/admin/lessons/${editingLessonId}/generate-video`, {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ prompt: videoPrompt }),
                                              credentials: "include",
                                            });
                                            if (!res.ok) throw new Error("Video generation failed");
                                            const data = await res.json();
                                            setVideoOperationName(data.operationName);
                                            toast.success("Video-ga waa la bilaabay - wuxuu qaadanayaa 1-2 daqiiqo...");

                                            let pollCompleted = false;
                                            const pollInterval = setInterval(async () => {
                                              try {
                                                const statusRes = await fetch(`/api/admin/lessons/video-status/${data.operationName}`, {
                                                  credentials: "include",
                                                });
                                                if (!statusRes.ok) {
                                                  clearInterval(pollInterval);
                                                  pollCompleted = true;
                                                  setIsGeneratingVideo(false);
                                                  toast.error("Video status check failed");
                                                  return;
                                                }
                                                const statusData = await statusRes.json();
                                                if (statusData.done) {
                                                  clearInterval(pollInterval);
                                                  pollCompleted = true;
                                                  setIsGeneratingVideo(false);
                                                  if (statusData._r2VideoUrl) {
                                                    setGeneratedVideoUrl(statusData._r2VideoUrl);
                                                    toast.success("Video waa la sameeyay oo la keydiyay!");
                                                  } else {
                                                    const generatedVideos = statusData.response?.generatedVideos || 
                                                      statusData.response?.generateVideoResponse?.generatedSamples;
                                                    const videoData = generatedVideos?.[0]?.video;
                                                    if (videoData?.uri) {
                                                      setGeneratedVideoUrl(videoData.uri);
                                                      toast.success("Video waa la sameeyay!");
                                                    } else if (videoData?.videoBytes) {
                                                      const blob = new Blob(
                                                        [Uint8Array.from(atob(videoData.videoBytes), c => c.charCodeAt(0))],
                                                        { type: 'video/mp4' }
                                                      );
                                                      setGeneratedVideoUrl(URL.createObjectURL(blob));
                                                      toast.success("Video waa la sameeyay!");
                                                    } else {
                                                      console.log("[AI-VIDEO] Response structure:", JSON.stringify(statusData.response));
                                                      toast.error("Video-ga lama helin natiijada");
                                                    }
                                                  }
                                                }
                                              } catch {
                                                clearInterval(pollInterval);
                                                pollCompleted = true;
                                                setIsGeneratingVideo(false);
                                              }
                                            }, 10000);

                                            setTimeout(() => {
                                              if (!pollCompleted) {
                                                clearInterval(pollInterval);
                                                setIsGeneratingVideo(false);
                                                toast.error("Video-ga waqtigii buu dhamaatay - isku day mar kale");
                                              }
                                            }, 180000);

                                          } catch (error: any) {
                                            toast.error(error.message || "Khalad ayaa dhacay");
                                            setIsGeneratingVideo(false);
                                          }
                                        }}
                                        disabled={isGeneratingVideo || !videoPrompt.trim()}
                                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white w-full"
                                        data-testid="button-generate-video"
                                      >
                                        {isGeneratingVideo ? (
                                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Muuqaalka waa la sameynayaa (~1-2 min)...</>
                                        ) : (
                                          <><Film className="w-4 h-4 mr-2" /> Samee Muuqaal AI</>
                                        )}
                                      </Button>
                                    ) : (
                                      <p className="text-sm text-indigo-500 bg-indigo-50 p-3 rounded-lg text-center">
                                        <Film className="w-4 h-4 inline mr-1" />
                                        Marka hore keydi casharka, kadibna video-ga samee
                                      </p>
                                    )}
                                    <p className="text-xs text-indigo-400">~8 seconds, 16:9, realistic Somali content</p>
                                  </div>
                                </div>
                              )}

                              <div className="pt-4 border-t border-green-100 flex justify-end gap-4">
                                {editingLessonId && (
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    className="h-12 px-6 border-gray-300"
                                    onClick={handleBackToList}
                                    data-testid="button-cancel-edit"
                                  >
                                    Ka noqo
                                  </Button>
                                )}
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  className="h-12 px-6"
                                  onClick={resetForm}
                                  data-testid="button-clear"
                                >
                                  Tirtir
                                </Button>
                                <Button 
                                  type="submit" 
                                  className={`h-12 px-8 font-bold ${editingLessonId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                                  disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                                  data-testid="button-submit-lesson"
                                >
                                  {editingLessonId ? (
                                    <>
                                      <Pencil className="w-5 h-5 mr-2" />
                                      {updateLessonMutation.isPending ? "Cusboonaysiinaya..." : "Cusboonaysii"}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-5 h-5 mr-2" />
                                      {createLessonMutation.isPending ? "Ku Daraya..." : "Daabac Casharka"}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="list">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Liiska Casharada ({lessonsWithContent.length})</CardTitle>
                        <CardDescription>Koorsooyinka iyo casharadooda - isticmaal badhanka kor/hoos ama jiid (drag) si aad u kala hormarisid</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {courses.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">Weli koorso ma jirto. Bilow koorso cusub!</p>
                            ) : (
                              <>
                                {/* KOORSOOYINKA CAADIGA AH (General Courses) */}
                                {(() => {
                                  const generalCourses = courses.filter((c: any) => c.category === 'general');
                                  if (generalCourses.length === 0) return null;
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-300">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                          <BookOpen className="w-4 h-4 text-white" />
                                        </div>
                                        <h2 className="font-bold text-xl text-blue-700">Koorsooyinka Caadiga ah (Da'da Ilmaha)</h2>
                                        <Badge className="bg-blue-100 text-blue-700">{generalCourses.length} koorso</Badge>
                                      </div>
                                      
                                      {generalCourses.map((course: any) => {
                                        const courseLessons = lessons
                                          .filter((l: any) => l.courseId === course.id)
                                          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
                                        return (
                                          <div key={course.id} className="ml-4 space-y-2 border-l-4 border-blue-200 pl-4">
                                            <div className="flex items-center gap-3 py-2 bg-blue-50 -ml-4 pl-4 rounded-r-lg">
                                              <h3 className="font-bold text-gray-800">{course.title}</h3>
                                              <Badge variant="outline" className="text-xs">{courseLessons.length} cashar</Badge>
                                              <div className="flex items-center gap-4 ml-auto mr-4">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs font-medium ${course.contentReady ? 'text-purple-600' : 'text-gray-400'}`}>
                                                    {course.contentReady ? 'Diyaar' : 'Diyaar maaha'}
                                                  </span>
                                                  <Switch
                                                    checked={course.contentReady || false}
                                                    onCheckedChange={(checked) => toggleContentReadyMutation.mutate({ id: course.id, contentReady: checked })}
                                                    disabled={toggleContentReadyMutation.isPending}
                                                    data-testid={`toggle-content-ready-${course.id}`}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs font-medium ${course.isLive ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {course.isLive ? 'Furanyahay' : 'Qaranyahay'}
                                                  </span>
                                                  <Switch
                                                    checked={course.isLive}
                                                    onCheckedChange={(checked) => toggleCourseVisibilityMutation.mutate({ id: course.id, isLive: checked })}
                                                    disabled={toggleCourseVisibilityMutation.isPending}
                                                    data-testid={`toggle-course-visibility-${course.id}`}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                            {courseLessons.length === 0 ? (
                                              <p className="text-gray-400 text-sm italic py-2">Cashar ma jiro</p>
                                            ) : (
                                              <>
                                                {groupLessonsByModule(courseLessons).map((group) => (
                                                  <div key={group.moduleId || 'unassigned'} className="space-y-2">
                                                    {group.moduleName && (
                                                      <div className="flex items-center gap-2 py-1 px-2 bg-blue-100 rounded text-blue-800 text-sm font-medium">
                                                        <List className="w-3 h-3" />
                                                        {editingModuleId === group.moduleId ? (
                                                          <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                              value={editingModuleTitle}
                                                              onChange={(e) => setEditingModuleTitle(e.target.value)}
                                                              className="h-6 text-sm py-0 px-2 bg-white"
                                                              autoFocus
                                                              onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && editingModuleTitle.trim()) {
                                                                  updateModuleMutation.mutate({ id: group.moduleId!, data: { title: editingModuleTitle.trim() } });
                                                                  setEditingModuleId(null);
                                                                }
                                                                if (e.key === 'Escape') setEditingModuleId(null);
                                                              }}
                                                            />
                                                            <button
                                                              onClick={() => {
                                                                if (editingModuleTitle.trim()) {
                                                                  updateModuleMutation.mutate({ id: group.moduleId!, data: { title: editingModuleTitle.trim() } });
                                                                }
                                                                setEditingModuleId(null);
                                                              }}
                                                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                            >
                                                              <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditingModuleId(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                                                              <X className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            {group.moduleName}
                                                            <Badge variant="outline" className="text-[10px] ml-auto">{group.lessons.length}</Badge>
                                                            <button
                                                              onClick={() => {
                                                                setEditingModuleId(group.moduleId);
                                                                setEditingModuleTitle(group.moduleName || '');
                                                              }}
                                                              className="p-1 text-blue-600 hover:bg-blue-200 rounded"
                                                              title="Wax ka beddel"
                                                            >
                                                              <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                              onClick={() => {
                                                                if (confirm(`Ma hubtaa inaad tirtirto qaybta "${group.moduleName}"? Casharada waxay u wareegi doonaan "Qaybta la'aan".`)) {
                                                                  deleteModuleMutation.mutate(group.moduleId!);
                                                                }
                                                              }}
                                                              className="p-1 text-red-500 hover:bg-red-100 rounded"
                                                              title="Tirtir"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          </>
                                                        )}
                                                      </div>
                                                    )}
                                                    {group.lessons.map((lesson: any, index: number) => {
                                                      const courseIndex = courseLessons.findIndex((l: any) => l.id === lesson.id);
                                                      return (
                                                        <div 
                                                          key={lesson.id} 
                                                          draggable
                                                          onDragStart={(e) => handleDragStart(e, lesson)}
                                                          onDragOver={handleDragOver}
                                                          onDrop={(e) => handleDrop(e, lesson)}
                                                          onDragEnd={handleDragEnd}
                                                          className={`flex items-center justify-between p-3 rounded border cursor-grab active:cursor-grabbing transition-all ${
                                                            draggedLesson?.id === lesson.id ? 'opacity-50 border-dashed border-blue-400' : 
                                                            lesson.isLive ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-blue-300'
                                                          }`} 
                                                          data-testid={`lesson-item-${lesson.id}`}
                                                        >
                                                          <div className="flex-1">
                                                            <div className="flex items-start gap-2">
                                                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                              <span className="text-gray-500 font-medium text-sm flex-shrink-0">
                                                                {courseIndex + 1}
                                                              </span>
                                                              {lesson.isLive && (
                                                                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-medium rounded flex-shrink-0">LIVE</span>
                                                              )}
                                                              <div className="flex-1">
                                                                <h4 className="font-medium text-gray-800 text-sm leading-snug">{lesson.title}</h4>
                                                              </div>
                                                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                                                                lesson.lessonType === 'quiz' ? 'bg-purple-100 text-purple-700' :
                                                                lesson.lessonType === 'assignment' ? 'bg-green-100 text-green-700' :
                                                                lesson.lessonType === 'live' ? 'bg-red-100 text-red-700' :
                                                                lesson.lessonType === 'text' ? 'bg-blue-100 text-blue-700' :
                                                                lesson.lessonType === 'audio' ? 'bg-teal-100 text-teal-700' :
                                                                'bg-gray-100 text-gray-600'
                                                              }`}>
                                                                {lesson.lessonType === 'quiz' ? 'Quiz' :
                                                                 lesson.lessonType === 'assignment' ? 'Hawlgal' :
                                                                 lesson.lessonType === 'live' ? 'Live' :
                                                                 lesson.lessonType === 'text' ? 'Qoraal' :
                                                                 lesson.lessonType === 'audio' ? 'Audio' :
                                                                 lesson.lessonType === 'sawirro' ? 'Sawirro' :
                                                                 'Video'}
                                                              </span>
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                                                              onClick={() => moveLesson(lesson, 'up')}
                                                              disabled={courseIndex === 0 || reorderLessonsMutation.isPending}
                                                              data-testid={`button-move-up-${lesson.id}`}
                                                              title="Kor u qaad"
                                                            >
                                                              <ChevronUp className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                                                              onClick={() => moveLesson(lesson, 'down')}
                                                              disabled={courseIndex === courseLessons.length - 1 || reorderLessonsMutation.isPending}
                                                              data-testid={`button-move-down-${lesson.id}`}
                                                              title="Hoos u dhig"
                                                            >
                                                              <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                              onClick={() => startEditingLesson(lesson)}
                                                              data-testid={`button-edit-${lesson.id}`}
                                                              title="Wax ka beddel"
                                                            >
                                                              <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                                                              onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                                              disabled={deleteLessonMutation.isPending}
                                                              data-testid={`button-delete-${lesson.id}`}
                                                              title="Tirtir"
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ))}
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* KOORSOOYINKA GAARKA AH (Special Courses) */}
                                {(() => {
                                  const specialCourses = courses.filter((c: any) => c.category === 'special');
                                  if (specialCourses.length === 0) return null;
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3 pb-2 border-b-2 border-orange-300">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                          <Star className="w-4 h-4 text-white" />
                                        </div>
                                        <h2 className="font-bold text-xl text-orange-700">Koorsooyinka Gaarka ah (Special)</h2>
                                        <Badge className="bg-orange-100 text-orange-700">{specialCourses.length} koorso</Badge>
                                      </div>
                                      
                                      {specialCourses.map((course: any) => {
                                        const courseLessons = lessons
                                          .filter((l: any) => l.courseId === course.id)
                                          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
                                        return (
                                          <div key={course.id} className="ml-4 space-y-2 border-l-4 border-orange-200 pl-4">
                                            <div className="flex items-center gap-3 py-2 bg-orange-50 -ml-4 pl-4 rounded-r-lg">
                                              <h3 className="font-bold text-gray-800">{course.title}</h3>
                                              <Badge variant="outline" className="text-xs">{courseLessons.length} cashar</Badge>
                                              <div className="flex items-center gap-4 ml-auto mr-4">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs font-medium ${course.contentReady ? 'text-purple-600' : 'text-gray-400'}`}>
                                                    {course.contentReady ? 'Diyaar' : 'Diyaar maaha'}
                                                  </span>
                                                  <Switch
                                                    checked={course.contentReady || false}
                                                    onCheckedChange={(checked) => toggleContentReadyMutation.mutate({ id: course.id, contentReady: checked })}
                                                    disabled={toggleContentReadyMutation.isPending}
                                                    data-testid={`toggle-content-ready-${course.id}`}
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs font-medium ${course.isLive ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {course.isLive ? 'Furanyahay' : 'Qaranyahay'}
                                                  </span>
                                                  <Switch
                                                    checked={course.isLive}
                                                    onCheckedChange={(checked) => toggleCourseVisibilityMutation.mutate({ id: course.id, isLive: checked })}
                                                    disabled={toggleCourseVisibilityMutation.isPending}
                                                    data-testid={`toggle-course-visibility-${course.id}`}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                            {courseLessons.length === 0 ? (
                                              <p className="text-gray-400 text-sm italic py-2">Cashar ma jiro</p>
                                            ) : (
                                              <>
                                                {groupLessonsByModule(courseLessons).map((group) => (
                                                  <div key={group.moduleId || 'unassigned'} className="space-y-2">
                                                    {group.moduleName && (
                                                      <div className="flex items-center gap-2 py-1 px-2 bg-orange-100 rounded text-orange-800 text-sm font-medium">
                                                        <List className="w-3 h-3" />
                                                        {editingModuleId === group.moduleId ? (
                                                          <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                              value={editingModuleTitle}
                                                              onChange={(e) => setEditingModuleTitle(e.target.value)}
                                                              className="h-6 text-sm py-0 px-2 bg-white"
                                                              autoFocus
                                                              onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && editingModuleTitle.trim()) {
                                                                  updateModuleMutation.mutate({ id: group.moduleId!, data: { title: editingModuleTitle.trim() } });
                                                                  setEditingModuleId(null);
                                                                }
                                                                if (e.key === 'Escape') setEditingModuleId(null);
                                                              }}
                                                            />
                                                            <button
                                                              onClick={() => {
                                                                if (editingModuleTitle.trim()) {
                                                                  updateModuleMutation.mutate({ id: group.moduleId!, data: { title: editingModuleTitle.trim() } });
                                                                }
                                                                setEditingModuleId(null);
                                                              }}
                                                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                            >
                                                              <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditingModuleId(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                                                              <X className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            {group.moduleName}
                                                            <Badge variant="outline" className="text-[10px] ml-auto">{group.lessons.length}</Badge>
                                                            <button
                                                              onClick={() => {
                                                                setEditingModuleId(group.moduleId);
                                                                setEditingModuleTitle(group.moduleName || '');
                                                              }}
                                                              className="p-1 text-orange-600 hover:bg-orange-200 rounded"
                                                              title="Wax ka beddel"
                                                            >
                                                              <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                              onClick={() => {
                                                                if (confirm(`Ma hubtaa inaad tirtirto qaybta "${group.moduleName}"? Casharada waxay u wareegi doonaan "Qaybta la'aan".`)) {
                                                                  deleteModuleMutation.mutate(group.moduleId!);
                                                                }
                                                              }}
                                                              className="p-1 text-red-500 hover:bg-red-100 rounded"
                                                              title="Tirtir"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          </>
                                                        )}
                                                      </div>
                                                    )}
                                                    {group.lessons.map((lesson: any, index: number) => {
                                                      const courseIndex = courseLessons.findIndex((l: any) => l.id === lesson.id);
                                                      return (
                                                        <div 
                                                          key={lesson.id} 
                                                          draggable
                                                          onDragStart={(e) => handleDragStart(e, lesson)}
                                                          onDragOver={handleDragOver}
                                                          onDrop={(e) => handleDrop(e, lesson)}
                                                          onDragEnd={handleDragEnd}
                                                          className={`flex items-center justify-between p-3 rounded border cursor-grab active:cursor-grabbing transition-all ${
                                                            draggedLesson?.id === lesson.id ? 'opacity-50 border-dashed border-orange-400' : 
                                                            lesson.isLive ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-orange-300'
                                                          }`} 
                                                          data-testid={`lesson-item-${lesson.id}`}
                                                        >
                                                          <div className="flex-1">
                                                            <div className="flex items-start gap-2">
                                                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                              <span className="text-gray-500 font-medium text-sm flex-shrink-0">
                                                                {courseIndex + 1}
                                                              </span>
                                                              {lesson.isLive && (
                                                                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-medium rounded flex-shrink-0">LIVE</span>
                                                              )}
                                                              <div className="flex-1">
                                                                <h4 className="font-medium text-gray-800 text-sm leading-snug">{lesson.title}</h4>
                                                              </div>
                                                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                                                                lesson.lessonType === 'quiz' ? 'bg-purple-100 text-purple-700' :
                                                                lesson.lessonType === 'assignment' ? 'bg-green-100 text-green-700' :
                                                                lesson.lessonType === 'live' ? 'bg-red-100 text-red-700' :
                                                                lesson.lessonType === 'text' ? 'bg-blue-100 text-blue-700' :
                                                                lesson.lessonType === 'audio' ? 'bg-teal-100 text-teal-700' :
                                                                'bg-gray-100 text-gray-600'
                                                              }`}>
                                                                {lesson.lessonType === 'quiz' ? 'Quiz' :
                                                                 lesson.lessonType === 'assignment' ? 'Hawlgal' :
                                                                 lesson.lessonType === 'live' ? 'Live' :
                                                                 lesson.lessonType === 'text' ? 'Qoraal' :
                                                                 lesson.lessonType === 'audio' ? 'Audio' :
                                                                 lesson.lessonType === 'sawirro' ? 'Sawirro' :
                                                                 'Video'}
                                                              </span>
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                                                              onClick={() => moveLesson(lesson, 'up')}
                                                              disabled={courseIndex === 0 || reorderLessonsMutation.isPending}
                                                              data-testid={`button-move-up-${lesson.id}`}
                                                              title="Kor u qaad"
                                                            >
                                                              <ChevronUp className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                                                              onClick={() => moveLesson(lesson, 'down')}
                                                              disabled={courseIndex === courseLessons.length - 1 || reorderLessonsMutation.isPending}
                                                              data-testid={`button-move-down-${lesson.id}`}
                                                              title="Hoos u dhig"
                                                            >
                                                              <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                              onClick={() => startEditingLesson(lesson)}
                                                              data-testid={`button-edit-${lesson.id}`}
                                                              title="Wax ka beddel"
                                                            >
                                                              <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                                                              onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                                              disabled={deleteLessonMutation.isPending}
                                                              data-testid={`button-delete-${lesson.id}`}
                                                              title="Tirtir"
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ))}
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="assignments">
                {/* Existing Assignments List */}
                <Card className="border-none shadow-md bg-white mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-orange-600" />
                          Hawlgalyadda Jira ({allAssignments.length})
                      </CardTitle>
                      <CardDescription>Raadi oo maaree hawlgalyada</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                          <Input 
                            placeholder="Raadi hawlgal... (magaca, casharka, ama koorsada)"
                            value={assignmentSearchTerm}
                            onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                            className="max-w-md"
                            data-testid="input-assignment-search"
                          />
                        </div>
                        {/* Assignment List */}
                        <div className="space-y-3">
                          {allAssignments.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Hawlgal kuma jiro</p>
                          ) : (
                            allAssignments
                              .filter((assignment: any) => {
                                const search = assignmentSearchTerm.toLowerCase();
                                return !search ||
                                  assignment.title?.toLowerCase().includes(search) ||
                                  assignment.lessonTitle?.toLowerCase().includes(search) ||
                                  assignment.courseTitle?.toLowerCase().includes(search);
                              })
                              .map((assignment: any) => (
                                <div 
                                  key={assignment.id} 
                                  className="p-4 bg-orange-50 rounded-lg flex items-start justify-between"
                                  data-testid={`assignment-item-${assignment.id}`}
                                >
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{assignment.title}</h4>
                                    <p className="text-sm text-gray-600">
                                      📖 {assignment.lessonTitle || "Cashar la'aan"} • 📚 {assignment.courseTitle || "Koorsad la'aan"}
                                    </p>
                                    {assignment.description && (
                                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
                                    )}
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm("Ma hubtaa inaad tirtirto hawlgalkan?")) {
                                        deleteAssignmentMutation.mutate(assignment.id);
                                      }
                                    }}
                                    disabled={deleteAssignmentMutation.isPending}
                                    data-testid={`button-delete-assignment-${assignment.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))
                          )}
                        </div>
                    </CardContent>
                </Card>

                {/* Create New Assignment */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-orange-600" />
                          Samee Hawlgal Cusub
                      </CardTitle>
                      <CardDescription>Ku dar hawlgal casharka</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitAssignment} className="space-y-6">
                          {/* Course and Lesson Selection */}
                          <div className="space-y-4">
                            <Label className="text-base font-bold text-gray-700">1. Dooro Koorsada iyo Casharka</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select 
                                    value={selectedCourseForAssignment} 
                                    onValueChange={(value) => {
                                      setSelectedCourseForAssignment(value);
                                      setSelectedLessonForAssignment("");
                                    }}
                                >
                                    <SelectTrigger className="h-12 font-semibold bg-white" data-testid="select-assignment-course">
                                        <SelectValue placeholder="Dooro Koorsada" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course: any) => (
                                            <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedCourseForAssignment && (
                                  <div>
                                    <Select value={selectedLessonForAssignment} onValueChange={setSelectedLessonForAssignment}>
                                      <SelectTrigger className="h-12 font-semibold bg-white" data-testid="select-assignment-lesson">
                                          <SelectValue placeholder="Dooro Casharka" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {lessons
                                          .filter((l: any) => l.courseId === selectedCourseForAssignment)
                                          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                          .map((lesson: any) => (
                                            <SelectItem key={lesson.id} value={lesson.id}>
                                              {lesson.title}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                            </div>
                          </div>

                          {selectedLessonForAssignment && (
                            <>
                              {/* Assignment Details */}
                              <div className="space-y-4">
                                <Label className="text-base font-bold text-gray-700">2. Macluumaadka Hawlgalka</Label>
                                <Input 
                                  placeholder="Magaca Hawlgalka (tusaale: Qor wax ku saabsan...)"
                                  value={assignmentTitle}
                                  onChange={(e) => setAssignmentTitle(e.target.value)}
                                  className="h-12"
                                  data-testid="input-assignment-title"
                                />
                                <Textarea 
                                  placeholder="Sharaxaadda hawlgalka (waxaad ku qori kartaa tilmaamaha, su'aalaha, ama wixii kale ee loogu talagalay ardayga)"
                                  value={assignmentDescription}
                                  onChange={(e) => setAssignmentDescription(e.target.value)}
                                  className="min-h-[150px]"
                                  data-testid="input-assignment-description"
                                />
                              </div>

                              {/* Submit */}
                              <Button 
                                type="submit" 
                                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                disabled={createAssignmentMutation.isPending || !assignmentTitle}
                                data-testid="button-submit-assignment"
                              >
                                {createAssignmentMutation.isPending ? "Waa la sameynayaa..." : "Samee Hawlgalka"}
                              </Button>
                            </>
                          )}
                        </form>
                    </CardContent>
                </Card>

                {/* Assignment Submissions from Students */}
                <Card className="border-none shadow-md bg-white mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-green-600" />
                          Hawlgalyada Ardaydu Soo Direen ({assignmentSubmissions.length})
                      </CardTitle>
                      <CardDescription>Halkan waxaad ka arki kartaa hawlgalyada ardaydu soo direen, waxaadna ansixin kartaa ama dib u celin kartaa</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                          {assignmentSubmissions.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Weli arday hawlgal ma soo dirin</p>
                          ) : (
                            assignmentSubmissions.map((submission: any) => (
                              <div 
                                key={submission.id} 
                                className={`p-4 rounded-lg border-2 ${
                                  submission.status === "pending" ? "border-orange-200 bg-orange-50" :
                                  submission.status === "approved" ? "border-green-200 bg-green-50" :
                                  "border-red-200 bg-red-50"
                                }`}
                                data-testid={`submission-${submission.id}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {submission.status === "pending" && <Clock className="w-5 h-5 text-orange-500" />}
                                      {submission.status === "approved" && <CheckCircle className="w-5 h-5 text-green-500" />}
                                      {submission.status === "revision_needed" && <XCircle className="w-5 h-5 text-red-500" />}
                                      <span className={`font-bold ${
                                        submission.status === "pending" ? "text-orange-700" :
                                        submission.status === "approved" ? "text-green-700" : "text-red-700"
                                      }`}>
                                        {submission.status === "pending" ? "Sugaya" : 
                                         submission.status === "approved" ? "La ansixiyey" : "Dib u soo dir"}
                                      </span>
                                      <span className="text-gray-500 text-sm">
                                        {new Date(submission.submittedAt).toLocaleDateString('so-SO')}
                                      </span>
                                    </div>
                                    
                                    <h4 className="font-bold text-gray-900">{submission.parentName || "Arday"}</h4>
                                    <p className="text-sm text-gray-600 mb-1">{submission.parentEmail}</p>
                                    <p className="text-xs text-gray-500 mb-2">
                                      📝 {submission.assignmentTitle} • 📖 {submission.lessonTitle} • 📚 {submission.courseTitle}
                                    </p>
                                    
                                    <div className="bg-white p-3 rounded-lg border text-gray-700 text-sm whitespace-pre-wrap">
                                      {submission.content}
                                    </div>

                                    {submission.feedback && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                        <strong>Jawaabta Admin:</strong> {submission.feedback}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {submission.status === "pending" && (
                                    <div className="flex flex-col gap-2">
                                      <Button 
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => updateSubmissionMutation.mutate({ id: submission.id, status: "approved" })}
                                        disabled={updateSubmissionMutation.isPending}
                                        data-testid={`button-approve-${submission.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" /> Ansixii
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                          const feedback = prompt("Qor sababta dib loo celinayo:");
                                          if (feedback) {
                                            updateSubmissionMutation.mutate({ id: submission.id, status: "revision_needed", feedback });
                                          }
                                        }}
                                        disabled={updateSubmissionMutation.isPending}
                                        data-testid={`button-reject-${submission.id}`}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" /> Dib u Celi
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="exercises">
                <ExerciseManager />
            </TabsContent>

            <TabsContent value="course-manager">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5" />
                              Maamulka Koorsooyinka
                            </CardTitle>
                            <CardDescription>Ku dar, wax ka bedel, ama tirtir koorsooyin. Sawiro iyo qiimayaal ayaad ku dari kartaa.</CardDescription>
                          </div>
                          <Button
                            onClick={fetchAccessibilityReport}
                            disabled={isLoadingAccessibilityReport}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {isLoadingAccessibilityReport ? "Loading..." : "Casharada Furan"}
                          </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add New Course Form */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            {editingCourseId ? "Wax ka Bedel Koorsada" : "Ku Dar Koorso Cusub"}
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Magaca Koorsada *</Label>
                                <Input 
                                  placeholder="Tusaale: 0-6 Bil Jir"
                                  value={newCourseTitle}
                                  onChange={(e) => setNewCourseTitle(e.target.value)}
                                  data-testid="input-course-title"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Course ID (URL) *</Label>
                                <Input 
                                  placeholder="Tusaale: 0-6"
                                  value={newCourseId}
                                  onChange={(e) => setNewCourseId(e.target.value)}
                                  data-testid="input-course-id"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Sharaxaad</Label>
                              <Textarea 
                                placeholder="Sharaxaadda koorsada..."
                                value={newCourseDescription}
                                onChange={(e) => setNewCourseDescription(e.target.value)}
                                rows={3}
                                data-testid="input-course-description"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Nooca</Label>
                                <Select value={newCourseCategory} onValueChange={setNewCourseCategory}>
                                  <SelectTrigger data-testid="select-course-category">
                                    <SelectValue placeholder="Dooro nooca" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General (Da'da)</SelectItem>
                                    <SelectItem value="special">Special (Gaar ah)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Tartibka (Order)</Label>
                                <Input 
                                  type="number"
                                  placeholder="0"
                                  value={newCourseOrder}
                                  onChange={(e) => setNewCourseOrder(e.target.value)}
                                  data-testid="input-course-order"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Da'da Ilmaha</Label>
                                <Select value={newCourseAgeRange} onValueChange={setNewCourseAgeRange}>
                                  <SelectTrigger data-testid="select-course-age-range">
                                    <SelectValue placeholder="Dooro da'da" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0-6">0-6 Bil</SelectItem>
                                    <SelectItem value="6-12">6-12 Bil</SelectItem>
                                    <SelectItem value="1-2">1-2 Sano</SelectItem>
                                    <SelectItem value="2-4">2-4 Sano</SelectItem>
                                    <SelectItem value="4-7">4-7 Sano</SelectItem>
                                    <SelectItem value="all">Dhammaan</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Sawirka Koorsada</Label>
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="URL-ka sawirka ama upload samee..."
                                  value={newCourseImageUrl}
                                  onChange={(e) => setNewCourseImageUrl(e.target.value)}
                                  data-testid="input-course-image-url"
                                  className="flex-1"
                                />
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCourseImageUpload}
                                    className="hidden"
                                    disabled={uploadingCourseImage}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="whitespace-nowrap"
                                    disabled={uploadingCourseImage}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                                    }}
                                  >
                                    {uploadingCourseImage ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Soo gelinta...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4 mr-1" />
                                        Upload
                                      </>
                                    )}
                                  </Button>
                                </label>
                              </div>
                              {newCourseImageUrl && (
                                <div className="mt-2 rounded-lg overflow-hidden w-32 h-20 border">
                                  <img src={newCourseImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Qiimaha Hal Mar ($)</Label>
                                <Input 
                                  type="number"
                                  placeholder="95"
                                  value={newCoursePriceOneTime}
                                  onChange={(e) => setNewCoursePriceOneTime(e.target.value)}
                                  data-testid="input-course-price-onetime"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Qiimaha Bishiiba ($)</Label>
                                <Input 
                                  type="number"
                                  placeholder="30"
                                  value={newCoursePriceMonthly}
                                  onChange={(e) => setNewCoursePriceMonthly(e.target.value)}
                                  data-testid="input-course-price-monthly"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Qiimaha Sannadka ($)</Label>
                                <Input 
                                  type="number"
                                  placeholder="114"
                                  value={newCoursePriceYearly}
                                  onChange={(e) => setNewCoursePriceYearly(e.target.value)}
                                  data-testid="input-course-price-yearly"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Fariinta "Waa Soo Socotaa" (Coming Soon Popup)</Label>
                              <Textarea 
                                placeholder="Koorsadan waxay soo furmi doontaa dhawaan. Isdiiwaangeli si aad u hesho ogeysiis..."
                                value={newCourseComingSoonMessage}
                                onChange={(e) => setNewCourseComingSoonMessage(e.target.value)}
                                rows={2}
                                data-testid="input-course-coming-soon"
                              />
                            </div>

                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="course-isLive"
                                  checked={newCourseIsLive}
                                  onCheckedChange={(checked) => setNewCourseIsLive(!!checked)}
                                />
                                <Label htmlFor="course-isLive" className="cursor-pointer">Koorsadu way shaqaysaa (isLive)</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="course-contentReady"
                                  checked={newCourseContentReady}
                                  onCheckedChange={(checked) => setNewCourseContentReady(!!checked)}
                                />
                                <Label htmlFor="course-contentReady" className="cursor-pointer">Content-ku diyaar yahay</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="course-isFree"
                                  checked={newCourseIsFree}
                                  onCheckedChange={(checked) => setNewCourseIsFree(!!checked)}
                                />
                                <Label htmlFor="course-isFree" className="cursor-pointer">Bilaash (Free)</Label>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSaveCourse}
                                disabled={!newCourseTitle || !newCourseId || !newCourseCategory || savingCourse}
                                data-testid="button-save-course"
                              >
                                {savingCourse ? (
                                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Kaydinaya...</>
                                ) : editingCourseId ? (
                                  <><Save className="w-4 h-4 mr-1" /> Kaydi Isbedelka</>
                                ) : (
                                  <><Plus className="w-4 h-4 mr-1" /> Ku Dar</>
                                )}
                              </Button>
                              {editingCourseId && (
                                <Button variant="outline" onClick={resetCourseForm} data-testid="button-cancel-edit">
                                  <X className="w-4 h-4 mr-1" /> Jooji
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Courses List */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-800">Liiska Koorsooyinka ({courses.length})</h3>
                          
                          {courses.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Ma jiraan koorsooyin</p>
                          ) : (
                            <div className="grid gap-3">
                              {courses.sort((a: any, b: any) => a.order - b.order).map((course: any) => (
                                <div 
                                  key={course.id}
                                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-4"
                                >
                                  {/* Course Image - Click to upload */}
                                  <label className="w-full sm:w-24 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer hover:bg-gray-300 transition-colors relative group">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingCourseImageId === course.id}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleDirectCourseImageUpload(course.id, file);
                                        e.target.value = '';
                                      }}
                                    />
                                    {uploadingCourseImageId === course.id ? (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                                      </div>
                                    ) : course.imageUrl ? (
                                      <>
                                        <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <Upload className="w-5 h-5 text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                                        <Upload className="w-5 h-5 mb-1" />
                                        <span className="text-[10px]">Sawir geli</span>
                                      </div>
                                    )}
                                  </label>

                                  {/* Course Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                          {course.title}
                                          {!course.contentReady && (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-600 text-[10px]">Soo Socotaa</Badge>
                                          )}
                                          {course.isFree && (
                                            <Badge variant="outline" className="bg-green-50 text-green-600 text-[10px]">Bilaash</Badge>
                                          )}
                                        </h4>
                                        <p className="text-xs text-gray-500">ID: {course.courseId} | Nooca: {course.category} | Order: {course.order}</p>
                                      </div>
                                    </div>
                                    
                                    {course.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{course.description}</p>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {course.priceOneTime && (
                                        <Badge variant="secondary" className="text-[10px]">${course.priceOneTime} Hal Mar</Badge>
                                      )}
                                      {course.priceMonthly && (
                                        <Badge variant="secondary" className="text-[10px]">${course.priceMonthly}/bil</Badge>
                                      )}
                                      {course.priceYearly && (
                                        <Badge variant="secondary" className="text-[10px]">${course.priceYearly}/sanad</Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 flex-shrink-0 items-center">
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleReorderCourse(course.id, 'up')}
                                        disabled={!!reorderingCourseId || [...courses].sort((a: any, b: any) => a.order - b.order)[0]?.id === course.id}
                                        data-testid={`button-course-up-${course.id}`}
                                      >
                                        {reorderingCourseId === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleReorderCourse(course.id, 'down')}
                                        disabled={!!reorderingCourseId || [...courses].sort((a: any, b: any) => a.order - b.order)[courses.length - 1]?.id === course.id}
                                        data-testid={`button-course-down-${course.id}`}
                                      >
                                        {reorderingCourseId === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditCourse(course)}
                                      data-testid={`button-edit-course-${course.id}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteCourse(course.id)}
                                      data-testid={`button-delete-course-${course.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="testimonials">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Waayo-aragnimada Waalidka</CardTitle>
                        <CardDescription>Halkan waxaad ka gelisaa feedback-a waalidka ee bogga Waayo-aragnimo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add/Edit Testimonial Form */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200">
                          <h3 className="font-bold text-gray-800 mb-4">
                            {editingTestimonialId ? "Wax ka Bedel Feedback" : "Ku Dar Feedback Cusub"}
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Magaca Waalidka *</Label>
                                <Input 
                                  placeholder="Tusaale: Fadumo Axmed"
                                  value={testimonialName}
                                  onChange={(e) => setTestimonialName(e.target.value)}
                                  data-testid="input-testimonial-name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Magaalada iyo Dalka aad joogto</Label>
                                <Input 
                                  placeholder="Muqdisho, Soomaaliya"
                                  value={testimonialLocation}
                                  onChange={(e) => setTestimonialLocation(e.target.value)}
                                  data-testid="input-testimonial-location"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Xiddigaha (1-5)</Label>
                              <Select value={testimonialRating} onValueChange={setTestimonialRating}>
                                <SelectTrigger data-testid="select-testimonial-rating">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 4, 3, 2, 1].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                      {"⭐".repeat(n)} ({n})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Faalladda *</Label>
                              <Textarea 
                                placeholder="Halkan ku qor faalladaada iyo sidaad koorsada u aragto..."
                                value={testimonialMessage}
                                onChange={(e) => setTestimonialMessage(e.target.value)}
                                rows={3}
                                data-testid="input-testimonial-message"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id="isPublished"
                                checked={testimonialIsPublished}
                                onChange={(e) => setTestimonialIsPublished(e.target.checked)}
                                className="w-4 h-4"
                                data-testid="checkbox-testimonial-published"
                              />
                              <Label htmlFor="isPublished">La daabaco bogga Waayo-aragnimo</Label>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSubmitTestimonial}
                                disabled={!testimonialName || !testimonialMessage || createTestimonialMutation.isPending || updateTestimonialMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                                data-testid="button-submit-testimonial"
                              >
                                {editingTestimonialId ? "Cusboonaysii" : "Ku Dar"}
                              </Button>
                              {editingTestimonialId && (
                                <Button 
                                  variant="outline"
                                  onClick={resetTestimonialForm}
                                  data-testid="button-cancel-edit-testimonial"
                                >
                                  Ka noqo
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Testimonials List */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-800">Liiska Feedback-a ({testimonialsList.length})</h3>
                          
                          {testimonialsList.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Weli feedback ma jirto.</p>
                          ) : (
                            testimonialsList.map((testimonial: any) => (
                              <div 
                                key={testimonial.id}
                                className={`p-4 rounded-lg border-2 ${testimonial.isPublished ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                                data-testid={`testimonial-admin-${testimonial.id}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                      {testimonial.profileImage ? (
                                        <img src={testimonial.profileImage} alt={testimonial.name} className="w-full h-full object-cover" />
                                      ) : (
                                        testimonial.name.charAt(0)
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-900">{testimonial.name}</span>
                                        {testimonial.location && (
                                          <span className="text-sm text-gray-500">- {testimonial.location}</span>
                                        )}
                                        <div className="flex">
                                          {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-gray-700 text-sm mb-2">{testimonial.message}</p>
                                      <div className="flex gap-2">
                                        {testimonial.courseTag && (
                                          <Badge variant="outline" className="bg-blue-50">{testimonial.courseTag}</Badge>
                                        )}
                                        <Badge variant={testimonial.isPublished ? "default" : "secondary"}>
                                          {testimonial.isPublished ? "La daabacay" : "Qarsoon"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleEditTestimonial(testimonial)}
                                      data-testid={`edit-testimonial-${testimonial.id}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                      onClick={() => deleteTestimonialMutation.mutate(testimonial.id)}
                                      disabled={deleteTestimonialMutation.isPending}
                                      data-testid={`delete-testimonial-${testimonial.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Parent Feedback Tab */}
            <TabsContent value="parent-feedback">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          Feedback-ka Waalidka (Telegram)
                        </CardTitle>
                        <CardDescription>Halkan ku qor feedback-ka waalidka ka yimid Telegram groups-ka - magacooda ayaa la tusayaa bogga hore</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add Parent Feedback Form */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                          <h3 className="font-bold text-gray-800 mb-4">Ku Dar Feedback Cusub</h3>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Magaca Waalidka *</Label>
                                <Input 
                                  placeholder="Tusaale: Fadumo Axmed"
                                  value={parentFeedbackName}
                                  onChange={(e) => setParentFeedbackName(e.target.value)}
                                  data-testid="input-parent-feedback-name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Telegram Username (optional)</Label>
                                <Input 
                                  placeholder="@username"
                                  value={parentFeedbackUsername}
                                  onChange={(e) => setParentFeedbackUsername(e.target.value)}
                                  data-testid="input-parent-feedback-username"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Magaca Telegram Group-ka</Label>
                              <Input 
                                placeholder="Waa Bahda Tarbiyadda Caruurta Amiira"
                                value={parentFeedbackGroup}
                                onChange={(e) => setParentFeedbackGroup(e.target.value)}
                                data-testid="input-parent-feedback-group"
                              />
                              <p className="text-xs text-gray-500">Default: Waa Bahda Tarbiyadda Caruurta Amiira</p>
                            </div>

                            <div className="space-y-2">
                              <Label>Feedback-ka / Notes *</Label>
                              <Textarea 
                                placeholder="Halkan ku qor feedback-ka waalidku soo diray..."
                                value={parentFeedbackNotes}
                                onChange={(e) => setParentFeedbackNotes(e.target.value)}
                                rows={3}
                                data-testid="input-parent-feedback-notes"
                              />
                            </div>

                            <Button 
                              onClick={() => {
                                if (!parentFeedbackName || !parentFeedbackNotes) {
                                  toast.error("Fadlan ku qor magaca iyo feedback-ka");
                                  return;
                                }
                                createTelegramReferralMutation.mutate({
                                  parentName: parentFeedbackName,
                                  telegramUsername: parentFeedbackUsername || undefined,
                                  telegramGroupName: parentFeedbackGroup || "Waa Bahda Tarbiyadda Caruurta Amiira",
                                  notes: parentFeedbackNotes,
                                });
                              }}
                              disabled={!parentFeedbackName || !parentFeedbackNotes || createTelegramReferralMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid="button-submit-parent-feedback"
                            >
                              Ku Dar Feedback
                            </Button>
                          </div>
                        </div>

                        {/* Parent Feedback List */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-800">Liiska Feedback-ka ({telegramReferrals.length})</h3>
                          
                          {telegramReferrals.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Weli feedback ma jirto.</p>
                          ) : (
                            telegramReferrals.map((referral: any) => (
                              <div 
                                key={referral.id}
                                className="p-4 rounded-lg border-2 border-green-200 bg-green-50"
                                data-testid={`parent-feedback-${referral.id}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                      {referral.parentName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-800">{referral.parentName}</span>
                                        {referral.telegramUsername && (
                                          <span className="text-sm text-blue-600">{referral.telegramUsername}</span>
                                        )}
                                      </div>
                                      {referral.telegramGroupName && (
                                        <p className="text-xs text-gray-500 mb-1">Telegram: {referral.telegramGroupName}</p>
                                      )}
                                      <p className="text-sm text-gray-700">{referral.notes}</p>
                                      <p className="text-xs text-gray-400 mt-2">
                                        {new Date(referral.createdAt).toLocaleDateString('so-SO')}
                                      </p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50 flex-shrink-0"
                                    onClick={() => deleteTelegramReferralMutation.mutate(referral.id)}
                                    disabled={deleteTelegramReferralMutation.isPending}
                                    data-testid={`delete-parent-feedback-${referral.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
                <div className="space-y-6">
                  {/* General Courses */}
                  <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          Koorsooyin Guud - Qiimaha
                        </CardTitle>
                        <CardDescription>Da'ooyinka carruurta (0-6 bilood, 6-12 bilood, iwm.)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                          {courses.filter((c: any) => c.category === "general").sort((a: any, b: any) => a.order - b.order).length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Koorsooyin guud ma jiraan.</p>
                          ) : (
                            courses.filter((c: any) => c.category === "general").sort((a: any, b: any) => a.order - b.order).map((course: any) => (
                              <div 
                                key={course.id} 
                                className="p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-colors bg-gradient-to-r from-white to-gray-50"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{course.title}</h4>
                                    <p className="text-sm text-gray-500">{course.courseId}</p>
                                  </div>
                                  
                                  {editingCoursePrices === course.id ? (
                                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Hal Mar ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceOneTime}
                                            onChange={(e) => setEditPriceOneTime(e.target.value)}
                                            placeholder="95"
                                            className="w-full h-9"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Bishii ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceMonthly}
                                            onChange={(e) => setEditPriceMonthly(e.target.value)}
                                            placeholder="30"
                                            className="w-full h-9"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Sanadkii ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceYearly}
                                            onChange={(e) => setEditPriceYearly(e.target.value)}
                                            placeholder="114"
                                            className="w-full h-9"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 flex-1"
                                          onClick={() => {
                                            updateCoursePricesMutation.mutate({
                                              id: course.id,
                                              priceOneTime: editPriceOneTime ? parseInt(editPriceOneTime) : null,
                                              priceMonthly: editPriceMonthly ? parseInt(editPriceMonthly) : null,
                                              priceYearly: editPriceYearly ? parseInt(editPriceYearly) : null,
                                            });
                                          }}
                                          disabled={updateCoursePricesMutation.isPending}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Kaydi
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingCoursePrices(null);
                                            setEditPriceOneTime("");
                                            setEditPriceMonthly("");
                                            setEditPriceYearly("");
                                          }}
                                        >
                                          <XCircle className="w-4 h-4 mr-1" />
                                          Ka noqo
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-4">
                                      <div className="flex gap-2 flex-wrap">
                                        {course.priceOneTime ? (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            Hal Mar: ${course.priceOneTime}
                                          </Badge>
                                        ) : null}
                                        {course.priceMonthly ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Bishii: ${course.priceMonthly}
                                          </Badge>
                                        ) : null}
                                        {course.priceYearly ? (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                            Sanadkii: ${course.priceYearly}
                                          </Badge>
                                        ) : null}
                                        {!course.priceOneTime && !course.priceMonthly && !course.priceYearly && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                            Qiime la ma gelin
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                        onClick={() => {
                                          setEditingCoursePrices(course.id);
                                          setEditPriceOneTime(course.priceOneTime?.toString() || "");
                                          setEditPriceMonthly(course.priceMonthly?.toString() || "");
                                          setEditPriceYearly(course.priceYearly?.toString() || "");
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Badal
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </CardContent>
                  </Card>

                  {/* Special Courses */}
                  <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-purple-600" />
                          Koorsooyin Gaar ah - Qiimaha
                        </CardTitle>
                        <CardDescription>Mowduucyo gaar ah (Autism, Aabo, Xalinta Khilaafka, iwm.)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                          {courses.filter((c: any) => c.category === "special").sort((a: any, b: any) => a.order - b.order).length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Koorsooyin gaar ah ma jiraan.</p>
                          ) : (
                            courses.filter((c: any) => c.category === "special").sort((a: any, b: any) => a.order - b.order).map((course: any) => (
                              <div 
                                key={course.id} 
                                className="p-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors bg-gradient-to-r from-white to-purple-50"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{course.title}</h4>
                                    <p className="text-sm text-gray-500">{course.courseId}</p>
                                  </div>
                                  
                                  {editingCoursePrices === course.id ? (
                                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Hal Mar ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceOneTime}
                                            onChange={(e) => setEditPriceOneTime(e.target.value)}
                                            placeholder="95"
                                            className="w-full h-9"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Bishii ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceMonthly}
                                            onChange={(e) => setEditPriceMonthly(e.target.value)}
                                            placeholder="30"
                                            className="w-full h-9"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Sanadkii ($)</Label>
                                          <Input
                                            type="number"
                                            value={editPriceYearly}
                                            onChange={(e) => setEditPriceYearly(e.target.value)}
                                            placeholder="114"
                                            className="w-full h-9"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 flex-1"
                                          onClick={() => {
                                            updateCoursePricesMutation.mutate({
                                              id: course.id,
                                              priceOneTime: editPriceOneTime ? parseInt(editPriceOneTime) : null,
                                              priceMonthly: editPriceMonthly ? parseInt(editPriceMonthly) : null,
                                              priceYearly: editPriceYearly ? parseInt(editPriceYearly) : null,
                                            });
                                          }}
                                          disabled={updateCoursePricesMutation.isPending}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Kaydi
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingCoursePrices(null);
                                            setEditPriceOneTime("");
                                            setEditPriceMonthly("");
                                            setEditPriceYearly("");
                                          }}
                                        >
                                          <XCircle className="w-4 h-4 mr-1" />
                                          Ka noqo
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-4">
                                      <div className="flex gap-2 flex-wrap">
                                        {course.priceOneTime ? (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            Hal Mar: ${course.priceOneTime}
                                          </Badge>
                                        ) : null}
                                        {course.priceMonthly ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Bishii: ${course.priceMonthly}
                                          </Badge>
                                        ) : null}
                                        {course.priceYearly ? (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                            Sanadkii: ${course.priceYearly}
                                          </Badge>
                                        ) : null}
                                        {!course.priceOneTime && !course.priceMonthly && !course.priceYearly && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                                            Qiime la ma gelin
                                          </Badge>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                        onClick={() => {
                                          setEditingCoursePrices(course.id);
                                          setEditPriceOneTime(course.priceOneTime?.toString() || "");
                                          setEditPriceMonthly(course.priceMonthly?.toString() || "");
                                          setEditPriceYearly(course.priceYearly?.toString() || "");
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Badal
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </CardContent>
                  </Card>
                </div>
            </TabsContent>

            {/* Daily Tips Tab */}
            <TabsContent value="tips">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t('admin.tips.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('admin.tips.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(isLoadingDailyTips || isLoadingTipSchedules) ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Clock className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                      <p className="text-gray-500">{t('admin.loadingTips')}</p>
                    </div>
                  ) : dailyTipsError || tipSchedulesError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-700">
                        Khalad: {String(dailyTipsErrorMsg || tipSchedulesErrorMsg)}
                      </p>
                      <Button 
                        onClick={() => {
                          refetchDailyTips();
                          refetchTipSchedules();
                        }} 
                        variant="outline" 
                        className="mt-2"
                      >
                        {t('admin.tryAgain')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Add/Edit Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold mb-4">{editingTipId ? t('admin.tips.editTip') : t('admin.tips.addNewTip')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('admin.tips.childAge')}</Label>
                        <Select value={tipAgeRange} onValueChange={setTipAgeRange}>
                          <SelectTrigger data-testid="select-tip-age">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="0-6">0-6 bilood</SelectItem>
                            <SelectItem value="6-12">6-12 bilood</SelectItem>
                            <SelectItem value="1-2">1-2 sano</SelectItem>
                            <SelectItem value="2-4">2-4 sano</SelectItem>
                            <SelectItem value="4-7">4-7 sano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('admin.tips.section')}</Label>
                        <Select value={tipCategory} onValueChange={setTipCategory}>
                          <SelectTrigger data-testid="select-tip-category">
                            <SelectValue placeholder={t('admin.tips.selectSection')} />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="cuntada">Cuntada</SelectItem>
                            <SelectItem value="hurdo">Hurdo</SelectItem>
                            <SelectItem value="ciyaar">Ciyaar</SelectItem>
                            <SelectItem value="caafimaad">Caafimaad</SelectItem>
                            <SelectItem value="dareen">Dareen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>{t('admin.tips.tipTitle')}</Label>
                        <Input
                          value={tipTitle}
                          onChange={(e) => setTipTitle(e.target.value)}
                          placeholder={t('admin.tips.titlePlaceholder')}
                          data-testid="input-tip-title"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>{t('admin.tips.tipContent')}</Label>
                        <Textarea
                          value={tipContent}
                          onChange={(e) => setTipContent(e.target.value)}
                          placeholder={t('admin.tips.contentPlaceholder')}
                          rows={3}
                          data-testid="input-tip-content"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleSubmitTip}
                        disabled={!tipTitle || !tipContent || createTipMutation.isPending || updateTipMutation.isPending}
                        data-testid="button-submit-tip"
                      >
                        {editingTipId ? t('admin.update') : t('admin.tips.add')}
                      </Button>
                      {editingTipId && (
                        <Button variant="outline" onClick={resetTipForm} data-testid="button-cancel-tip">
                          {t('admin.cancel')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tips List */}
                  <div className="space-y-3">
                    {dailyTips.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">{t('admin.tips.noTips')}</p>
                    ) : (
                      dailyTips.map((tip: any) => (
                        <div key={tip.id} className="bg-white border rounded-lg p-4 flex justify-between items-start" data-testid={`tip-item-${tip.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{tip.ageRange} bilood/sano</Badge>
                              {tip.category && <Badge variant="secondary">{tip.category}</Badge>}
                            </div>
                            <h4 className="font-semibold">{tip.title}</h4>
                            <p className="text-sm text-gray-600">{tip.content}</p>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTip(tip)}
                              data-testid={`button-edit-tip-${tip.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deleteTipMutation.mutate(tip.id)}
                              disabled={deleteTipMutation.isPending}
                              data-testid={`button-delete-tip-${tip.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Tip Scheduling Section */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {t('admin.tips.scheduling.title')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('admin.tips.scheduling.description')}
                    </p>

                    {/* Add/Edit Schedule Form */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <h4 className="font-semibold mb-4">{editingScheduleId ? t('admin.tips.scheduling.editSchedule') : t('admin.tips.scheduling.addSchedule')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>{t('admin.tips.tipTitle')}</Label>
                          <Select value={selectedTipForSchedule} onValueChange={setSelectedTipForSchedule}>
                            <SelectTrigger data-testid="select-schedule-tip">
                              <SelectValue placeholder={t('admin.tips.scheduling.selectTip')} />
                            </SelectTrigger>
                            <SelectContent>
                              {dailyTips.map((tip: any) => (
                                <SelectItem key={tip.id} value={tip.id}>{tip.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t('admin.tips.scheduling.scheduleType')}</Label>
                          <Select value={scheduleType} onValueChange={(val: "day" | "week") => setScheduleType(val)}>
                            <SelectTrigger data-testid="select-schedule-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">{t('admin.tips.scheduling.specificDay')}</SelectItem>
                              <SelectItem value="week">{t('admin.tips.scheduling.specificWeek')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {scheduleType === "day" && (
                          <div>
                            <Label>{t('admin.tips.scheduling.theDate')}</Label>
                            <Input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              data-testid="input-schedule-date"
                            />
                          </div>
                        )}
                        {scheduleType === "week" && (
                          <div>
                            <Label>{t('admin.tips.scheduling.weekNumber')}</Label>
                            <Input
                              type="number"
                              min="1"
                              max="52"
                              value={scheduledWeek}
                              onChange={(e) => setScheduledWeek(e.target.value)}
                              placeholder="Tusaale: 15"
                              data-testid="input-schedule-week"
                            />
                          </div>
                        )}
                        <div>
                          <Label>Koorsada La Xiriirta (Ikhtiyaar)</Label>
                          <Select value={selectedCourseForSchedule} onValueChange={setSelectedCourseForSchedule}>
                            <SelectTrigger data-testid="select-schedule-course">
                              <SelectValue placeholder="Dooro koorsada (ikhtiyaar)" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="none">Ma jirto</SelectItem>
                              {courses.map((course: any) => (
                                <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Mudnaanta</Label>
                          <Input
                            type="number"
                            min="0"
                            value={schedulePriority}
                            onChange={(e) => setSchedulePriority(e.target.value)}
                            placeholder="0 = caadi, 10 = sare"
                            data-testid="input-schedule-priority"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={handleSubmitSchedule}
                          disabled={!selectedTipForSchedule || (scheduleType === "day" ? !scheduledDate : !scheduledWeek) || createScheduleMutation.isPending || updateScheduleMutation.isPending}
                          data-testid="button-submit-schedule"
                        >
                          {editingScheduleId ? "Cusboonaysii" : "Ku Dar Jadwalka"}
                        </Button>
                        {editingScheduleId && (
                          <Button variant="outline" onClick={resetScheduleForm} data-testid="button-cancel-schedule">
                            Ka noqo
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Schedules List */}
                    <div className="space-y-3">
                      {tipSchedules.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Weli jadwal ma jirto.</p>
                      ) : (
                        tipSchedules.map((schedule: any) => {
                          const tip = dailyTips.find((t: any) => t.id === schedule.tipId);
                          const course = courses.find((c: any) => c.id === schedule.courseId);
                          return (
                            <div key={schedule.id} className="bg-white border rounded-lg p-4 flex justify-between items-start" data-testid={`schedule-item-${schedule.id}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={schedule.scheduleType === "day" ? "default" : "secondary"}>
                                    {schedule.scheduleType === "day" ? `Maalin: ${schedule.scheduledDate}` : `Toddobaad: ${schedule.weekNumber}`}
                                  </Badge>
                                  {schedule.priority > 0 && <Badge variant="outline">Mudnaanta: {schedule.priority}</Badge>}
                                  {course && <Badge variant="outline">{course.title}</Badge>}
                                </div>
                                <h4 className="font-semibold">{tip?.title || "Talo la tiray"}</h4>
                                <p className="text-sm text-gray-600">{tip?.content?.substring(0, 100)}...</p>
                              </div>
                              <div className="flex gap-1 ml-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditSchedule(schedule)}
                                  data-testid={`button-edit-schedule-${schedule.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                  disabled={deleteScheduleMutation.isPending}
                                  data-testid={`button-delete-schedule-${schedule.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Horumarinta Ilmaha
                  </CardTitle>
                  <CardDescription>
                    Ku dar ama wax ka beddel horumarinta ilmaha ee da'yaha kala duwan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add/Edit Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold mb-4">{editingMilestoneId ? "Horumar Wax ka Beddel" : "Horumar Cusub Ku Dar"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Da'da Ilmaha</Label>
                        <Select value={milestoneAgeRange} onValueChange={setMilestoneAgeRange}>
                          <SelectTrigger data-testid="select-milestone-age">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="0-6">0-6 bilood</SelectItem>
                            <SelectItem value="6-12">6-12 bilood</SelectItem>
                            <SelectItem value="1-2">1-2 sano</SelectItem>
                            <SelectItem value="2-4">2-4 sano</SelectItem>
                            <SelectItem value="4-7">4-7 sano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nooca</Label>
                        <Select value={milestoneCategory} onValueChange={setMilestoneCategory}>
                          <SelectTrigger data-testid="select-milestone-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Jirka">Jirka</SelectItem>
                            <SelectItem value="Maskaxda">Maskaxda</SelectItem>
                            <SelectItem value="Bulshada">Bulshada</SelectItem>
                            <SelectItem value="Luuqadda">Luuqadda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Magaca Horumarinta</Label>
                        <Input
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value)}
                          placeholder="Tusaale: Dhoolacaddaynta"
                          data-testid="input-milestone-title"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Faahfaahinta</Label>
                        <Textarea
                          value={milestoneDescription}
                          onChange={(e) => setMilestoneDescription(e.target.value)}
                          placeholder="Tusaale: Nuunaha wuxuu bilaabaa inuu dhoolacadeeyo marka waalidku la ciyaaraan cayaarta waji iska eega, ama u qoslaan."
                          rows={2}
                          data-testid="input-milestone-description"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleSubmitMilestone}
                        disabled={!milestoneTitle || createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                        data-testid="button-submit-milestone"
                      >
                        {editingMilestoneId ? "Cusboonaysii" : "Ku Dar"}
                      </Button>
                      {editingMilestoneId && (
                        <Button variant="outline" onClick={resetMilestoneForm} data-testid="button-cancel-milestone">
                          Ka noqo
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Milestones List grouped by age */}
                  <div className="space-y-6">
                    {["0-6", "6-12", "1-2", "2-4", "4-7"].map((ageRange) => {
                      const ageMilestones = milestonesList.filter((m: any) => m.ageRange === ageRange);
                      if (ageMilestones.length === 0) return null;
                      return (
                        <div key={ageRange}>
                          <h4 className="font-semibold text-lg mb-3 text-blue-800">{ageRange} {["0-6", "6-12"].includes(ageRange) ? "bilood" : "sano"}</h4>
                          <div className="space-y-2">
                            {ageMilestones.map((milestone: any) => (
                              <div key={milestone.id} className="bg-white border rounded-lg p-3 flex justify-between items-start" data-testid={`milestone-item-${milestone.id}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{milestone.category}</Badge>
                                  </div>
                                  <h5 className="font-medium">{milestone.title}</h5>
                                  {milestone.description && (
                                    <p className="text-sm text-gray-600">{milestone.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditMilestone(milestone)}
                                    data-testid={`button-edit-milestone-${milestone.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => deleteMilestoneMutation.mutate(milestone.id)}
                                    disabled={deleteMilestoneMutation.isPending}
                                    data-testid={`button-delete-milestone-${milestone.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {milestonesList.length === 0 && (
                      <p className="text-gray-500 text-center py-8">Weli horumar ma jirto. Ku dar mid cusub!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flashcards Management Tab */}
            <TabsContent value="flashcards">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Kaararka Barashada
                  </CardTitle>
                  <CardDescription>
                    Ku dar kaararka carruurta af-Soomaaliga lagu baro (Khudaar, Miro, Xayawaan, iwm.)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FlashcardManager />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Parents Management Tab */}
            <TabsContent value="parents">
              <div className="space-y-6">
                {/* Stats Summary - Clickable Tabs */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {/* 1. Tirada Wadamada */}
                  <Card 
                    className="border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50 cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
                    onClick={() => { setParentCountryFilter("all"); setParentGroupFilter(false); setParentCourseFilter(null); }}
                  >
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-orange-700">{Array.from(new Set(parentsList.map((p: any) => normalizeCountry(p.country)).filter(Boolean))).length}</p>
                      <p className="text-xs text-orange-600 font-medium">Tirada Wadamada</p>
                    </CardContent>
                  </Card>
                  {/* 2. Wadarta Guud ee Waalidiinta */}
                  <Card 
                    className={`border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98] ${parentCountryFilter === "all" && !parentGroupFilter && !parentCourseFilter ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-100 to-indigo-100" : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}
                    onClick={() => { setParentCountryFilter("all"); setParentGroupFilter(false); setParentCourseFilter(null); }}
                  >
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-700">{parentsList.length}</p>
                      <p className="text-xs text-blue-600 font-medium">Wadarta Waalidiinta</p>
                    </CardContent>
                  </Card>
                  {/* 3. Guruubka Telegram */}
                  <Card 
                    className={`border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98] ${parentGroupFilter && !parentCourseFilter ? "ring-2 ring-cyan-500 bg-gradient-to-br from-cyan-100 to-teal-100" : "bg-gradient-to-br from-cyan-50 to-teal-50"}`}
                    onClick={() => { setParentCountryFilter("all"); setParentGroupFilter(true); setParentCourseFilter(null); }}
                  >
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-cyan-700">{parentsList.filter((p: any) => p.inParentingGroup).length}</p>
                      <p className="text-xs text-cyan-600 font-medium">Guruubka Telegram</p>
                    </CardContent>
                  </Card>
                </div>
                {/* 4. Wadan kasta oo tirada leh */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(Array.from(new Set(parentsList.map((p: any) => normalizeCountry(p.country)).filter(Boolean))) as string[])
                    .sort()
                    .map((country) => {
                      const countryCount = parentsList.filter((p: any) => normalizeCountry(p.country) === country).length;
                      const isSelected = parentCountryFilter === country && !parentCourseFilter;
                      return (
                        <Card 
                          key={country} 
                          className={`border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] ${isSelected ? "ring-2 ring-gray-500 bg-gradient-to-br from-gray-100 to-slate-100" : "bg-gradient-to-br from-gray-50 to-slate-50"}`}
                          onClick={() => { setParentCountryFilter(country); setParentGroupFilter(false); setParentCourseFilter(null); }}
                        >
                          <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-gray-700">{countryCount}</p>
                            <p className="text-xs text-gray-600 font-medium truncate">{getCountryLabel(country)}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* 5. Koorso kasta oo tirada waalidiinta leh */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Koorsooyinka & Tirada Waalidiinta:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {courses.map((course: any) => {
                      const courseEnrollments = enrollmentsList.filter((e: any) => e.courseId === course.id && e.status === "active");
                      const parentCount = courseEnrollments.length;
                      const isSelected = parentCourseFilter === course.id;
                      return (
                        <Card 
                          key={course.id} 
                          className={`border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] ${isSelected ? "ring-2 ring-green-500 bg-gradient-to-br from-green-100 to-emerald-100" : "bg-gradient-to-br from-green-50 to-emerald-50"}`}
                          onClick={() => { setParentCourseFilter(course.id); setParentCountryFilter("all"); setParentGroupFilter(false); }}
                        >
                          <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">{parentCount}</p>
                            <p className="text-xs text-green-600 font-medium truncate" title={course.title}>{course.title}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Parent Search & List */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Waalidka Diiwaangashan
                    </CardTitle>
                    <CardDescription>
                      Maaree waalidka, koorsooyin fur ama xir, ama akoonka tir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search & Filters */}
                    <div className="mb-6 space-y-4">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                          <Label className="text-xs text-gray-500 mb-1">Raadi</Label>
                          <Input
                            placeholder="Raadi magac, email, ama telefoon..."
                            value={parentSearchQuery}
                            onChange={(e) => setParentSearchQuery(e.target.value)}
                            data-testid="input-search-parents"
                          />
                        </div>
                        <div className="w-[180px]">
                          <Label className="text-xs text-gray-500 mb-1">Wadanka</Label>
                          <Select value={parentCountryFilter} onValueChange={setParentCountryFilter}>
                            <SelectTrigger data-testid="select-country-filter">
                              <SelectValue placeholder="Dhammaan" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              <SelectItem value="all">Dhammaan Wadamada</SelectItem>
                              {(Array.from(new Set(parentsList.map((p: any) => normalizeCountry(p.country)).filter(Boolean))) as string[]).sort().map((country) => (
                                <SelectItem key={country} value={country}>
                                  {getCountryLabel(country)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[220px]">
                          <Label className="text-xs text-gray-500 mb-1">💰 Lacag Bixiyeyasha</Label>
                          <Select value={paidParentFilter || "all"} onValueChange={(v) => setPaidParentFilter(v === "all" ? null : v)}>
                            <SelectTrigger data-testid="select-paid-parent-filter" className="border-green-300 bg-green-50">
                              <SelectValue placeholder="Dhammaan" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              <SelectItem value="all">Dhammaan Waalidka</SelectItem>
                              {Array.isArray(paymentSubmissions) && (() => {
                                const approvedPayments = paymentSubmissions.filter((p: any) => p.status === "approved");
                                const uniqueCustomers = new Map();
                                approvedPayments.forEach((p: any) => {
                                  const identifier = p.customerEmail || p.customerPhone;
                                  if (identifier && !uniqueCustomers.has(identifier)) {
                                    uniqueCustomers.set(identifier, {
                                      name: p.customerName,
                                      email: p.customerEmail,
                                      phone: p.customerPhone,
                                      identifier
                                    });
                                  }
                                });
                                return Array.from(uniqueCustomers.values()).map((customer: any) => (
                                  <SelectItem key={customer.identifier} value={customer.identifier}>
                                    {customer.name} ({customer.email || customer.phone})
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="group-filter"
                            checked={parentGroupFilter}
                            onCheckedChange={setParentGroupFilter}
                            data-testid="toggle-group-filter"
                          />
                          <Label htmlFor="group-filter" className="text-xs cursor-pointer">
                            Guruubka Telegram
                          </Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enrolledParentIds = parentCourseFilter 
                                ? enrollmentsList.filter((e: any) => e.courseId === parentCourseFilter && e.status === "active").map((e: any) => e.parentId)
                                : null;
                            const filteredParents = parentsList
                              .filter((p: any) => {
                                if (parentCountryFilter !== "all" && normalizeCountry(p.country) !== parentCountryFilter) return false;
                                if (parentGroupFilter && !p.inParentingGroup) return false;
                                if (enrolledParentIds && !enrolledParentIds.includes(p.id)) return false;
                                if (paidParentFilter) {
                                  const matchesEmail = p.email?.toLowerCase() === paidParentFilter.toLowerCase();
                                  const matchesPhone = p.phone === paidParentFilter;
                                  const matchesName = p.name?.toLowerCase() === paidParentFilter.toLowerCase();
                                  if (!matchesEmail && !matchesPhone && !matchesName) return false;
                                }
                                if (parentSearchQuery) {
                                  const query = parentSearchQuery.toLowerCase();
                                  return p.name?.toLowerCase().includes(query) || 
                                         p.email?.toLowerCase().includes(query) || 
                                         p.phone?.includes(query);
                                }
                                return true;
                              });
                            const csvData = filteredParents.map((p: any) => ({
                              Magac: p.name,
                              Email: p.email,
                              Telefoon: p.phone || "",
                              Wadan: getCountryLabel(p.country),
                              Magaalo: p.city || "",
                              "Guruubka Telegram": p.inParentingGroup ? "Haa" : "Maya",
                              "Taariikhda Diiwangelinta": new Date(p.createdAt).toLocaleDateString()
                            }));
                            const csv = Papa.unparse(csvData);
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `waalidka_${parentCountryFilter !== "all" ? parentCountryFilter + "_" : ""}${new Date().toISOString().split("T")[0]}.csv`;
                            link.click();
                            toast.success("CSV waa la soo dejiyey!");
                          }}
                          data-testid="btn-export-csv"
                        >
                          📥 CSV Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportUsersWP}
                          disabled={isExportingUsersWP}
                          data-testid="btn-export-users-wp"
                        >
                          {isExportingUsersWP ? "⏳ Exporting..." : "🔄 WordPress Export"}
                        </Button>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-500">
                        <Badge variant="outline">
                          {(() => {
                            const enrolledIds = parentCourseFilter 
                              ? enrollmentsList.filter((e: any) => e.courseId === parentCourseFilter && e.status === "active").map((e: any) => e.parentId)
                              : null;
                            return parentsList.filter((p: any) => {
                              if (parentCountryFilter !== "all" && normalizeCountry(p.country) !== parentCountryFilter) return false;
                              if (parentGroupFilter && !p.inParentingGroup) return false;
                              if (enrolledIds && !enrolledIds.includes(p.id)) return false;
                              if (paidParentFilter) {
                                const matchesEmail = p.email?.toLowerCase() === paidParentFilter.toLowerCase();
                                const matchesPhone = p.phone === paidParentFilter;
                                if (!matchesEmail && !matchesPhone) return false;
                              }
                              return true;
                            }).length;
                          })()} waalid la helay
                        </Badge>
                        {parentGroupFilter && (
                          <Badge className="bg-blue-100 text-blue-700">Guruubka Telegram kaliya</Badge>
                        )}
                        {parentCountryFilter !== "all" && (
                          <Badge className="bg-green-100 text-green-700">{parentCountryFilter}</Badge>
                        )}
                        {parentCourseFilter && (
                          <Badge className="bg-purple-100 text-purple-700">{courses.find((c: any) => c.id === parentCourseFilter)?.title}</Badge>
                        )}
                        {paidParentFilter && (
                          <Badge className="bg-yellow-100 text-yellow-700">💰 {paidParentFilter}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Parents List */}
                    <div className="space-y-4">
                      {parentsList.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Weli waalid diiwaangashan ma jirto.</p>
                      ) : (
                        (() => {
                            const enrolledIds = parentCourseFilter 
                              ? enrollmentsList.filter((e: any) => e.courseId === parentCourseFilter && e.status === "active").map((e: any) => e.parentId)
                              : null;
                            return parentsList.filter((parent: any) => {
                              if (parentCountryFilter !== "all" && normalizeCountry(parent.country) !== parentCountryFilter) return false;
                              if (parentGroupFilter && !parent.inParentingGroup) return false;
                              if (enrolledIds && !enrolledIds.includes(parent.id)) return false;
                              if (paidParentFilter) {
                                const matchesEmail = parent.email?.toLowerCase() === paidParentFilter.toLowerCase();
                                const matchesPhone = parent.phone === paidParentFilter;
                                const matchesName = parent.name?.toLowerCase() === paidParentFilter.toLowerCase();
                                if (!matchesEmail && !matchesPhone && !matchesName) return false;
                              }
                              if (!parentSearchQuery) return true;
                              const query = parentSearchQuery.toLowerCase();
                              return (
                                parent.name?.toLowerCase().includes(query) ||
                                parent.email?.toLowerCase().includes(query) ||
                                parent.phone?.includes(query)
                              );
                            });
                          })()
                          .map((parent: any) => {
                            const parentEnrollments = enrollmentsList.filter((e: any) => e.parentId === parent.id);
                            const activeEnrollments = parentEnrollments.filter((e: any) => e.status === "active");
                            
                            return (
                              <div 
                                key={parent.id} 
                                className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                                data-testid={`parent-card-${parent.id}`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                  {/* Parent Info */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <h4 className="font-bold text-gray-900">{parent.name}</h4>
                                      {(() => {
                                        const hoursSinceRegistration = (Date.now() - new Date(parent.createdAt).getTime()) / (1000 * 60 * 60);
                                        if (hoursSinceRegistration <= 24) {
                                          return (
                                            <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs animate-pulse">
                                              🆕 CUSUB
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {parent.inParentingGroup && (
                                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                                          📱 Guruubka Telegram
                                        </Badge>
                                      )}
                                      {parent.isVerified && (
                                        <Badge className="bg-green-100 text-green-700">
                                          <CheckCircle className="w-3 h-3 mr-1" /> Xaqiijisan
                                        </Badge>
                                      )}
                                      {parent.isAdmin && (
                                        <Badge className="bg-purple-100 text-purple-700">
                                          <Lock className="w-3 h-3 mr-1" /> Admin
                                        </Badge>
                                      )}
                                      {parent.canHostSheeko && (
                                        <Badge className="bg-pink-100 text-pink-700">
                                          <Radio className="w-3 h-3 mr-1" /> Host
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p><strong>Email:</strong> {parent.email}</p>
                                      {parent.phone && <p><strong>Tel:</strong> {parent.phone}</p>}
                                      {(parent.country || parent.city) && (
                                        <p><strong>Goob:</strong> {[parent.city, getCountryLabel(parent.country)].filter(Boolean).join(", ")}</p>
                                      )}
                                      <p><strong>Ku biir:</strong> {new Date(parent.createdAt).toLocaleDateString()}</p>
                                    </div>

                                    {/* Current Enrollments */}
                                    {parentEnrollments.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Koorsooyinka:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {parentEnrollments.map((enrollment: any) => {
                                            const course = courses.find((c: any) => c.id === enrollment.courseId);
                                            return (
                                              <div key={enrollment.id} className="flex items-center gap-1">
                                                <Badge 
                                                  variant={enrollment.status === "active" ? "default" : "secondary"}
                                                  className={enrollment.status === "active" ? "bg-green-600" : "bg-gray-400"}
                                                >
                                                  {course?.title || "Unknown"}
                                                </Badge>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                  onClick={() => setEnrollmentToDelete(enrollment.id)}
                                                  data-testid={`btn-revoke-${enrollment.id}`}
                                                >
                                                  <XCircle className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-col gap-2">
                                    {/* Grant Course Access */}
                                    {selectedParentForEnrollment === parent.id ? (
                                      <div className="p-3 bg-blue-50 rounded-lg space-y-3 min-w-[250px]">
                                        <Select value={enrollmentCourseId} onValueChange={setEnrollmentCourseId}>
                                          <SelectTrigger data-testid={`select-course-${parent.id}`}>
                                            <SelectValue placeholder="Dooro koorso..." />
                                          </SelectTrigger>
                                          <SelectContent className="z-[9999]">
                                            {courses.map((course: any) => (
                                              <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select value={enrollmentPlanType} onValueChange={setEnrollmentPlanType}>
                                          <SelectTrigger data-testid={`select-plan-${parent.id}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="z-[9999]">
                                            <SelectItem value="lifetime">Nolosha oo dhan</SelectItem>
                                            <SelectItem value="monthly">Bil ($30)</SelectItem>
                                            <SelectItem value="yearly">Sannad ($114)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => {
                                              if (enrollmentCourseId) {
                                                createEnrollmentMutation.mutate({
                                                  parentId: parent.id,
                                                  courseId: enrollmentCourseId,
                                                  planType: enrollmentPlanType,
                                                });
                                                setSelectedParentForEnrollment(null);
                                                setEnrollmentCourseId("");
                                              }
                                            }}
                                            disabled={!enrollmentCourseId || createEnrollmentMutation.isPending}
                                            data-testid={`btn-confirm-enroll-${parent.id}`}
                                          >
                                            <CheckCircle className="w-4 h-4 mr-1" /> Fur
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedParentForEnrollment(null);
                                              setEnrollmentCourseId("");
                                            }}
                                            data-testid={`btn-cancel-enroll-${parent.id}`}
                                          >
                                            Ka noqo
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => setSelectedParentForEnrollment(parent.id)}
                                        data-testid={`btn-grant-access-${parent.id}`}
                                      >
                                        <Plus className="w-4 h-4 mr-1" /> Koorso Fur
                                      </Button>
                                    )}

                                    {/* Toggle Admin Status */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={parent.isAdmin 
                                        ? "border-orange-300 text-orange-600 hover:bg-orange-50" 
                                        : "border-purple-300 text-purple-600 hover:bg-purple-50"
                                      }
                                      onClick={() => setAdminToggleConfirm({ parent, makeAdmin: !parent.isAdmin })}
                                      disabled={toggleAdminMutation.isPending}
                                      data-testid={`btn-toggle-admin-${parent.id}`}
                                    >
                                      <Lock className="w-4 h-4 mr-1" /> 
                                      {parent.isAdmin ? "Admin ka saar" : "Admin ka dhig"}
                                    </Button>

                                    {/* Toggle Sheeko Host Status */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={parent.canHostSheeko 
                                        ? "border-pink-300 text-pink-600 hover:bg-pink-50" 
                                        : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                      }
                                      onClick={() => setHostToggleConfirm({ parent, makeHost: !parent.canHostSheeko })}
                                      disabled={toggleHostMutation.isPending}
                                      data-testid={`btn-toggle-host-${parent.id}`}
                                    >
                                      <Radio className="w-4 h-4 mr-1" /> 
                                      {parent.canHostSheeko ? "Host ka saar" : "Host ka dhig"}
                                    </Button>

                                    {/* Delete Parent */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                      onClick={() => setParentToDelete(parent)}
                                      data-testid={`btn-delete-parent-${parent.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" /> Tir Akoonka
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Delete Parent Confirmation Dialog */}
              <Dialog open={!!parentToDelete} onOpenChange={() => setParentToDelete(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">Tir Akoonka?</DialogTitle>
                    <DialogDescription>
                      Ma hubtaa inaad rabto inaad tirto akoonka <strong>{parentToDelete?.name}</strong>? 
                      Tani waxay tiri doontaa dhammaan xogta waalidkan oo dhan (koorsooyin, horumaro, iwm). 
                      Ficilkani lama soo celin karo!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setParentToDelete(null)}>
                      Ka noqo
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        if (parentToDelete) {
                          deleteParentMutation.mutate(parentToDelete.id);
                          setParentToDelete(null);
                        }
                      }}
                      disabled={deleteParentMutation.isPending}
                      data-testid="btn-confirm-delete-parent"
                    >
                      Haa, Tir
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Delete Enrollment Confirmation Dialog */}
              <Dialog open={!!enrollmentToDelete} onOpenChange={() => setEnrollmentToDelete(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-orange-600">Koorso Xir?</DialogTitle>
                    <DialogDescription>
                      Ma hubtaa inaad rabto inaad ka saarto waalidkan koorsadan? 
                      Waalidku may heli karo koorsada.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setEnrollmentToDelete(null)}>
                      Ka noqo
                    </Button>
                    <Button
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => {
                        if (enrollmentToDelete) {
                          deleteEnrollmentMutation.mutate(enrollmentToDelete);
                          setEnrollmentToDelete(null);
                        }
                      }}
                      disabled={deleteEnrollmentMutation.isPending}
                      data-testid="btn-confirm-delete-enrollment"
                    >
                      Haa, Xir
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Delete Payment Confirmation Dialog - Warning for approved payments */}
              <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      Digniin! Lacag Bixin La Tirtirayaa
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                        <p className="font-semibold text-red-800 mb-1">Xog muhiim ah:</p>
                        <ul className="text-sm text-red-700 space-y-1">
                          <li>• <strong>Waalid:</strong> {paymentToDelete?.parentName || "Aan la garanayn"}</li>
                          <li>• <strong>Koorso:</strong> {paymentToDelete?.courseName || paymentToDelete?.courseId}</li>
                          <li>• <strong>Qorshaha:</strong> {paymentToDelete?.planType}</li>
                          <li>• <strong>Xaalada:</strong> {paymentToDelete?.status === "approved" ? "✅ La oggolaaday" : paymentToDelete?.status === "rejected" ? "❌ La diiday" : "⏳ La sugayo"}</li>
                        </ul>
                      </div>
                      <p className="text-gray-600">
                        {paymentToDelete?.status === "approved" 
                          ? "⚠️ Lacag bixintan waa la oggolaaday oo waalidku koorso ayuu u socdaa! Haddii aad tirtirto, xogtii lacag bixinta ayaa lumaysa."
                          : "Ma hubtaa inaad tirtirto lacag bixintan?"
                        }
                      </p>
                      <p className="text-sm font-medium text-red-600">
                        Ficilkan lama soo celin karo!
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>
                      Ka noqo
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        if (paymentToDelete) {
                          deletePaymentMutation.mutate(paymentToDelete.id);
                          setPaymentToDelete(null);
                        }
                      }}
                    >
                      Haa, Tirtir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Admin Toggle Confirmation Dialog */}
              <Dialog open={!!adminToggleConfirm} onOpenChange={() => setAdminToggleConfirm(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className={adminToggleConfirm?.makeAdmin ? "text-purple-600" : "text-orange-600"}>
                      {adminToggleConfirm?.makeAdmin ? "Admin ka dhig?" : "Admin ka saar?"}
                    </DialogTitle>
                    <DialogDescription>
                      Ma hubtaa inaad {adminToggleConfirm?.makeAdmin ? "ka dhigto admin" : "ka saarto admin-nimada"} <strong>{adminToggleConfirm?.parent?.name}</strong>?
                      {adminToggleConfirm?.makeAdmin 
                        ? " Admin-ku wuxuu awood u yeelanayaa in uu maamulo platform-ka oo dhan."
                        : " Waalidku may heli karo admin panel-ka."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setAdminToggleConfirm(null)}>
                      Ka noqo
                    </Button>
                    <Button
                      className={adminToggleConfirm?.makeAdmin ? "bg-purple-600 hover:bg-purple-700" : "bg-orange-600 hover:bg-orange-700"}
                      onClick={() => {
                        if (adminToggleConfirm) {
                          toggleAdminMutation.mutate({ 
                            id: adminToggleConfirm.parent.id, 
                            isAdmin: adminToggleConfirm.makeAdmin 
                          });
                          setAdminToggleConfirm(null);
                        }
                      }}
                      disabled={toggleAdminMutation.isPending}
                      data-testid="btn-confirm-toggle-admin"
                    >
                      Haa, {adminToggleConfirm?.makeAdmin ? "Ka dhig Admin" : "Ka saar Admin"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Host Toggle Confirmation Dialog */}
              <Dialog open={!!hostToggleConfirm} onOpenChange={() => setHostToggleConfirm(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className={hostToggleConfirm?.makeHost ? "text-indigo-600" : "text-pink-600"}>
                      {hostToggleConfirm?.makeHost ? "Host ka dhig?" : "Host ka saar?"}
                    </DialogTitle>
                    <DialogDescription>
                      Ma hubtaa inaad {hostToggleConfirm?.makeHost ? "ka dhigto Sheeko host" : "ka saarto host-nimada"} <strong>{hostToggleConfirm?.parent?.name}</strong>?
                      {hostToggleConfirm?.makeHost 
                        ? " Host-ku wuxuu awood u yeelanayaa in uu sameeyo Sheeko rooms cusub."
                        : " Waalidku may awoodi in uu sameeyo Sheeko rooms."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setHostToggleConfirm(null)}>
                      Ka noqo
                    </Button>
                    <Button
                      className={hostToggleConfirm?.makeHost ? "bg-indigo-600 hover:bg-indigo-700" : "bg-pink-600 hover:bg-pink-700"}
                      onClick={() => {
                        if (hostToggleConfirm) {
                          toggleHostMutation.mutate({ 
                            id: hostToggleConfirm.parent.id, 
                            canHostSheeko: hostToggleConfirm.makeHost 
                          });
                          setHostToggleConfirm(null);
                        }
                      }}
                      disabled={toggleHostMutation.isPending}
                      data-testid="btn-confirm-toggle-host"
                    >
                      Haa, {hostToggleConfirm?.makeHost ? "Ka dhig Host" : "Ka saar Host"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Resources Tab - Maktabadda */}
            <TabsContent value="resources">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Resource Form */}
                <Card className="border-none shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Ku Dar Agab Cusub
                    </CardTitle>
                    <CardDescription>
                      Halkan waxaad ku dari kartaa PDF, sawirro, cod, iyo waxyaabo kale
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!resourceTitle || !resourceFileUrl) {
                        toast.error("Fadlan geli magaca iyo file-ka");
                        return;
                      }
                      createResourceMutation.mutate({
                        title: resourceTitle,
                        description: resourceDescription || undefined,
                        fileUrl: resourceFileUrl,
                        fileType: resourceFileType,
                        category: resourceCategory,
                        ageRange: resourceAgeRange || undefined,
                      });
                    }} className="space-y-4">
                      <div>
                        <Label>Magaca Agabka *</Label>
                        <Input
                          value={resourceTitle}
                          onChange={(e) => setResourceTitle(e.target.value)}
                          placeholder="Tusaale: Hagaha Waalidnimada"
                          data-testid="input-resource-title"
                        />
                      </div>
                      
                      <div>
                        <Label>Sharaxaad (ikhtiyaari)</Label>
                        <Textarea
                          value={resourceDescription}
                          onChange={(e) => setResourceDescription(e.target.value)}
                          placeholder="Sharaxaad kooban oo ku saabsan agabkan"
                          data-testid="input-resource-description"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nooca File-ka</Label>
                          <Select value={resourceFileType} onValueChange={(v: any) => setResourceFileType(v)}>
                            <SelectTrigger data-testid="select-resource-filetype">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="image">Sawir</SelectItem>
                              <SelectItem value="audio">Cod</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Qaybta</Label>
                          <Select value={resourceCategory} onValueChange={(v: any) => setResourceCategory(v)}>
                            <SelectTrigger data-testid="select-resource-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="duas">🤲 Ducooyinka (Xusnu Muslim)</SelectItem>
                              <SelectItem value="parenting-books">📕 Buugaagta Tarbiyada</SelectItem>
                              <SelectItem value="children-books">📚 Buugaagta Caruurta</SelectItem>
                              <SelectItem value="guide">Hagaha</SelectItem>
                              <SelectItem value="checklist">Liiska</SelectItem>
                              <SelectItem value="infographic">Sawirro</SelectItem>
                              <SelectItem value="audio">Cod</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Da'da Ilmaha (ikhtiyaari)</Label>
                        <Select value={resourceAgeRange || "all"} onValueChange={(v) => setResourceAgeRange(v === "all" ? "" : v)}>
                          <SelectTrigger data-testid="select-resource-age">
                            <SelectValue placeholder="Dhammaan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Dhammaan</SelectItem>
                            <SelectItem value="0-6">0-6 Bilood</SelectItem>
                            <SelectItem value="6-12">6-12 Bilood</SelectItem>
                            <SelectItem value="1-2">1-2 Sano</SelectItem>
                            <SelectItem value="2-4">2-4 Sano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Soo Geli File-ka *</Label>
                        <div className="space-y-2">
                          <div 
                            onClick={() => {
                              const input = document.getElementById('resource-file-input') as HTMLInputElement;
                              if (input) input.click();
                            }}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              resourceFileUrl ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                            data-testid="resource-upload-area"
                          >
                            <input
                              id="resource-file-input"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.mp3,.mp4"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const response = await uploadFile(file);
                                  if (response?.objectPath) {
                                    setResourceFileUrl(response.objectPath);
                                    toast.success("File-ka waa la soo geliyey!");
                                  }
                                } catch (err) {
                                  console.error("Upload error:", err);
                                  toast.error("File-ka ma soo gelin karin");
                                }
                              }}
                            />
                            {isUploading ? (
                              <div className="py-2">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-sm text-blue-600">Soo gelinta... {progress}%</p>
                              </div>
                            ) : resourceFileUrl ? (
                              <div className="py-2">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-sm text-green-700 font-medium">File-ka waa la soo geliyey ✓</p>
                                <p className="text-xs text-gray-500 mt-1 truncate">{resourceFileUrl}</p>
                              </div>
                            ) : (
                              <div className="py-2">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Guji si aad file-ka u soo geliso</p>
                                <p className="text-xs text-gray-400 mt-1">PDF, Sawirro, Audio, Video</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-center text-xs text-gray-400">- ama -</div>
                          
                          <Input
                            value={resourceFileUrl}
                            onChange={(e) => setResourceFileUrl(e.target.value)}
                            placeholder="https://example.com/file.pdf"
                            data-testid="input-resource-url"
                          />
                          <p className="text-xs text-gray-500">
                            Geli link-ga file-ka (Google Drive, Dropbox, iwm.)
                          </p>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={createResourceMutation.isPending}
                        data-testid="btn-create-resource"
                      >
                        {createResourceMutation.isPending ? "Waa la soo geliyayaa..." : "Ku Dar Maktabadda"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Resources List */}
                <Card className="border-none shadow-md bg-white">
                  <CardHeader>
                    <CardTitle>Agabka Jira ({resourcesList.length})</CardTitle>
                    <CardDescription>
                      Dhammaan agabka maktabadda
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {resourcesList.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Weli agab kuma jiro maktabadda.</p>
                      ) : (
                        resourcesList.map((resource: any) => (
                          <div 
                            key={resource.id} 
                            className="p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                            data-testid={`resource-item-${resource.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    resource.fileType === 'pdf' ? 'bg-red-100 text-red-700' :
                                    resource.fileType === 'image' ? 'bg-blue-100 text-blue-700' :
                                    resource.fileType === 'audio' ? 'bg-purple-100 text-purple-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {resource.fileType.toUpperCase()}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                                    {resource.category === 'duas' ? '🤲 Ducooyinka' :
                                     resource.category === 'parenting-books' ? '📕 Tarbiyada' :
                                     resource.category === 'children-books' ? '📚 Caruurta' :
                                     resource.category === 'guide' ? 'Hagaha' :
                                     resource.category === 'checklist' ? 'Liiska' :
                                     resource.category === 'infographic' ? 'Sawirro' : 'Cod'}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-gray-900 mt-1">{resource.title}</h4>
                                {resource.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span>Downloads: {resource.downloadCount}</span>
                                  {resource.ageRange && <span>Da': {resource.ageRange}</span>}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteResourceMutation.mutate(resource.id)}
                                disabled={deleteResourceMutation.isPending}
                                data-testid={`btn-delete-resource-${resource.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quran Reciters Section - Quraan Dhagayso */}
              <Card className="border-none shadow-md bg-white mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📖 Quraan Dhagayso - Shiikhyada ({recitersList.length})
                  </CardTitle>
                  <CardDescription>
                    Ku dar sheikhs cusub si ay dadka ugu dhageystaan Quraanka
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!reciterName || !reciterAudioBaseUrl) {
                      toast.error("Fadlan geli magaca iyo URL-ka audio");
                      return;
                    }
                    createReciterMutation.mutate({
                      name: reciterName,
                      nameSomali: reciterNameSomali || undefined,
                      audioBaseUrl: reciterAudioBaseUrl,
                      imageUrl: reciterImageUrl || undefined,
                      order: parseInt(reciterOrder) || 1,
                    });
                  }} className="space-y-4 mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Magaca Shiikhga (English) *</Label>
                        <Input
                          value={reciterName}
                          onChange={(e) => setReciterName(e.target.value)}
                          placeholder="e.g., Mishary Alafasy"
                          data-testid="input-reciter-name"
                        />
                      </div>
                      <div>
                        <Label>Magaca Soomaali</Label>
                        <Input
                          value={reciterNameSomali}
                          onChange={(e) => setReciterNameSomali(e.target.value)}
                          placeholder="e.g., Shiikh Mishary Alafasy"
                          data-testid="input-reciter-name-somali"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Audio Base URL *</Label>
                      <Input
                        value={reciterAudioBaseUrl}
                        onChange={(e) => setReciterAudioBaseUrl(e.target.value)}
                        placeholder="e.g., https://mp3quran.net/afs/"
                        data-testid="input-reciter-audio-url"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        URL-ka asaasiga ah + /{"{001-114}"}.mp3
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sawirka Shiikhga (URL)</Label>
                        <Input
                          value={reciterImageUrl}
                          onChange={(e) => setReciterImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          data-testid="input-reciter-image"
                        />
                      </div>
                      <div>
                        <Label>Tartibka (Order)</Label>
                        <Input
                          type="number"
                          value={reciterOrder}
                          onChange={(e) => setReciterOrder(e.target.value)}
                          min="1"
                          data-testid="input-reciter-order"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={createReciterMutation.isPending}
                      data-testid="btn-create-reciter"
                    >
                      {createReciterMutation.isPending ? "Waa la soo geliyayaa..." : "Ku Dar Sheikh Cusub"}
                    </Button>
                  </form>

                  {recitersList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Weli sheikh kuma jiro.</p>
                  ) : (
                    <div className="space-y-2">
                      {recitersList.map((reciter: any) => (
                        <div 
                          key={reciter.id} 
                          className="p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          data-testid={`reciter-item-${reciter.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                              {reciter.order}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{reciter.nameSomali || reciter.name}</h4>
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{reciter.audioBaseUrl}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Ma hubtaa inaad rabto inaad tirtirto "${reciter.nameSomali || reciter.name}"?`)) {
                                deleteReciterMutation.mutate(reciter.id);
                              }
                            }}
                            disabled={deleteReciterMutation.isPending}
                            data-testid={`btn-delete-reciter-${reciter.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Axaadiis Saxiix ah Section */}
              <Card className="border-none shadow-md bg-white mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📚 Axaadiis Saxiix ah ({hadithsList.length})
                  </CardTitle>
                  <CardDescription>
                    Ku dar Xadiisyada Nabiga (SAW) - Carabi iyo Soomaali
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!hadithArabicText) {
                      toast.error("Fadlan geli qoraalka Carabi");
                      return;
                    }
                    createHadithMutation.mutate({
                      number: parseInt(hadithNumber) || 1,
                      arabicText: hadithArabicText,
                      somaliText: hadithSomaliText || "",
                      source: hadithSource || undefined,
                      narrator: hadithNarrator || undefined,
                      topic: hadithTopic || undefined,
                    });
                  }} className="space-y-4 mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Lambarka Xadiiska *</Label>
                        <Input
                          type="number"
                          value={hadithNumber}
                          onChange={(e) => setHadithNumber(e.target.value)}
                          min="1"
                          max="40"
                          data-testid="input-hadith-number"
                        />
                      </div>
                      <div>
                        <Label>Isha (Source)</Label>
                        <Input
                          value={hadithSource}
                          onChange={(e) => setHadithSource(e.target.value)}
                          placeholder="e.g., Bukhari, Muslim"
                          data-testid="input-hadith-source"
                        />
                      </div>
                      <div>
                        <Label>Mawduuca (Topic)</Label>
                        <Input
                          value={hadithTopic}
                          onChange={(e) => setHadithTopic(e.target.value)}
                          placeholder="e.g., Niyada, Samaha"
                          data-testid="input-hadith-topic"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Qoraalka Carabi *</Label>
                      <Textarea
                        value={hadithArabicText}
                        onChange={(e) => setHadithArabicText(e.target.value)}
                        placeholder="Qoraalka Xadiiska ee Carabi..."
                        className="text-right font-arabic text-lg"
                        rows={3}
                        dir="rtl"
                        data-testid="input-hadith-arabic"
                      />
                    </div>
                    
                    <div>
                      <Label>Turjumaada Soomaali *</Label>
                      <Textarea
                        value={hadithSomaliText}
                        onChange={(e) => setHadithSomaliText(e.target.value)}
                        placeholder="Turjumaada Soomaali ee Xadiiska..."
                        rows={3}
                        data-testid="input-hadith-somali"
                      />
                    </div>
                    
                    <div>
                      <Label>Wariye (Narrator)</Label>
                      <Input
                        value={hadithNarrator}
                        onChange={(e) => setHadithNarrator(e.target.value)}
                        placeholder="e.g., Abu Hurayra"
                        data-testid="input-hadith-narrator"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      disabled={createHadithMutation.isPending}
                      data-testid="btn-create-hadith"
                    >
                      {createHadithMutation.isPending ? "Waa la soo geliyayaa..." : "Ku Dar Xadiis Cusub"}
                    </Button>
                  </form>

                  {/* Filter and Search */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Raadi xadiis..."
                        value={hadithSearchQuery}
                        onChange={(e) => setHadithSearchQuery(e.target.value)}
                        className="w-full"
                        data-testid="input-hadith-search"
                      />
                    </div>
                    <Select value={hadithFilterBook} onValueChange={setHadithFilterBook}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by book" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Dhammaan Kutubta</SelectItem>
                        <SelectItem value="needs_translation">❌ Turjumaad la'aan</SelectItem>
                        <SelectItem value="translated">✅ Turjuman</SelectItem>
                        <SelectItem value="Arbacinka">📗 Arbacinka Nawawi</SelectItem>
                        <SelectItem value="Bukhaari">📕 Saxiix Bukhaari</SelectItem>
                        <SelectItem value="Muslim">📘 Saxiix Muslim</SelectItem>
                        <SelectItem value="Tirmidhi">📙 Sunan Al-Tirmidhi</SelectItem>
                        <SelectItem value="Abu Dawuud">📓 Sunan Abu Dawuud</SelectItem>
                        <SelectItem value="Ibn Maajah">📔 Sunan Ibn Maajah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <span className="text-gray-600">Wadarta: {hadithsList.length}</span>
                    <span className="text-green-600">✅ Turjuman: {hadithsList.filter((h: any) => h.somaliText && h.somaliText.trim()).length}</span>
                    <span className="text-red-600">❌ La'aan: {hadithsList.filter((h: any) => !h.somaliText || !h.somaliText.trim()).length}</span>
                  </div>

                  {hadithsList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Weli xadiis kuma jiro.</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {hadithsList
                        .filter((hadith: any) => {
                          // Filter by book
                          if (hadithFilterBook === "needs_translation") {
                            if (hadith.somaliText && hadith.somaliText.trim()) return false;
                          } else if (hadithFilterBook === "translated") {
                            if (!hadith.somaliText || !hadith.somaliText.trim()) return false;
                          } else if (hadithFilterBook !== "all") {
                            if (!hadith.source?.toLowerCase().includes(hadithFilterBook.toLowerCase())) return false;
                          }
                          // Filter by search query
                          if (hadithSearchQuery) {
                            const query = hadithSearchQuery.toLowerCase();
                            return (
                              hadith.arabicText?.toLowerCase().includes(query) ||
                              hadith.somaliText?.toLowerCase().includes(query) ||
                              hadith.source?.toLowerCase().includes(query) ||
                              hadith.narrator?.toLowerCase().includes(query)
                            );
                          }
                          return true;
                        })
                        .map((hadith: any) => (
                        <div 
                          key={hadith.id} 
                          className={`p-4 rounded-lg border transition-colors ${
                            !hadith.somaliText || !hadith.somaliText.trim() 
                              ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          data-testid={`hadith-item-${hadith.id}`}
                        >
                          {editingHadith?.id === hadith.id ? (
                            /* Edit mode */
                            <div className="space-y-3">
                              <p className="text-lg text-right font-arabic text-gray-800" dir="rtl">{hadith.arabicText}</p>
                              <Textarea
                                value={editHadithSomaliText}
                                onChange={(e) => setEditHadithSomaliText(e.target.value)}
                                placeholder="Geli turjumaada Soomaali..."
                                rows={3}
                                className="w-full"
                                data-testid="input-edit-hadith-somali"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => updateHadithMutation.mutate({ id: hadith.id, somaliText: editHadithSomaliText })}
                                  disabled={updateHadithMutation.isPending}
                                  data-testid="btn-save-hadith-translation"
                                >
                                  <Save className="w-4 h-4 mr-1" /> Keydi
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setEditingHadith(null); setEditHadithSomaliText(""); }}
                                  data-testid="btn-cancel-hadith-edit"
                                >
                                  Jooji
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                                  !hadith.somaliText || !hadith.somaliText.trim() 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {hadith.number}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-lg text-right font-arabic text-gray-800 mb-2" dir="rtl">{hadith.arabicText}</p>
                                  {hadith.somaliText && hadith.somaliText.trim() ? (
                                    <p className="text-sm text-gray-700">{hadith.somaliText}</p>
                                  ) : (
                                    <p className="text-sm text-red-500 italic">⚠️ Turjumaad Soomaali la'aan - Dhagsii Tafatirka</p>
                                  )}
                                  <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                    {hadith.source && <span className="bg-amber-100 px-2 py-0.5 rounded">{hadith.source}</span>}
                                    {hadith.topic && <span className="bg-gray-200 px-2 py-0.5 rounded">{hadith.topic}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setEditingHadith(hadith);
                                    setEditHadithSomaliText(hadith.somaliText || "");
                                  }}
                                  data-testid={`btn-edit-hadith-${hadith.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm(`Ma hubtaa inaad rabto inaad tirtirto Xadiis #${hadith.number}?`)) {
                                      deleteHadithMutation.mutate(hadith.id);
                                    }
                                  }}
                                  disabled={deleteHadithMutation.isPending}
                                  data-testid={`btn-delete-hadith-${hadith.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parenting Books Section - Buugaagta Tarbiyada */}
              <Card className="border-none shadow-md bg-white mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📕 Buugaagta Tarbiyada ({parentingBooksList.length})
                  </CardTitle>
                  <CardDescription>
                    Ku dar buugaag waalidiinta tarbiyada uga caawiya
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!parentingBookTitle || !parentingBookUrl) {
                      toast.error("Fadlan geli magaca iyo URL-ka buugga");
                      return;
                    }
                    createParentingBookMutation.mutate({
                      title: parentingBookTitle,
                      description: parentingBookDescription || undefined,
                      fileUrl: parentingBookUrl,
                      imageUrl: parentingBookImageUrl || undefined,
                    });
                  }} className="space-y-4 mb-6 p-4 bg-rose-50 rounded-lg border border-rose-200">
                    <div>
                      <Label>Magaca Buugga *</Label>
                      <Input
                        value={parentingBookTitle}
                        onChange={(e) => setParentingBookTitle(e.target.value)}
                        placeholder="e.g., Tarbiyada Ilmaha"
                        data-testid="input-parenting-book-title"
                      />
                    </div>
                    <div>
                      <Label>Sharaxaad (Optional)</Label>
                      <Textarea
                        value={parentingBookDescription}
                        onChange={(e) => setParentingBookDescription(e.target.value)}
                        placeholder="Wax yar oo buugga ku saabsan..."
                        rows={2}
                        data-testid="input-parenting-book-desc"
                      />
                    </div>
                    <div>
                      <Label>Sawirka Buugga (URL)</Label>
                      <Input
                        value={parentingBookImageUrl}
                        onChange={(e) => setParentingBookImageUrl(e.target.value)}
                        placeholder="https://example.com/book-cover.jpg"
                        data-testid="input-parenting-book-image"
                      />
                    </div>
                    <div>
                      <Label>PDF URL (Google Drive) *</Label>
                      <Input
                        value={parentingBookUrl}
                        onChange={(e) => setParentingBookUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        data-testid="input-parenting-book-url"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-rose-600 hover:bg-rose-700"
                      disabled={createParentingBookMutation.isPending}
                      data-testid="btn-create-parenting-book"
                    >
                      {createParentingBookMutation.isPending ? "Waa la soo geliyayaa..." : "Ku Dar Buug Cusub"}
                    </Button>
                  </form>

                  {parentingBooksList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Weli buug kuma jiro.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {parentingBooksList.map((book: any) => (
                        <div 
                          key={book.id} 
                          className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          data-testid={`parenting-book-${book.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {book.imageUrl ? (
                              <img src={book.imageUrl} alt={book.title} className="w-10 h-14 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                <span className="text-xl">📕</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{book.title}</p>
                              {book.description && <p className="text-xs text-gray-500 line-clamp-1">{book.description}</p>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Ma hubtaa inaad rabto inaad tirtirto "${book.title}"?`)) {
                                deleteBookMutation.mutate(book.id);
                              }
                            }}
                            disabled={deleteBookMutation.isPending}
                            data-testid={`btn-delete-parenting-book-${book.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Children's Books Section - Buugaagta Caruurta */}
              <Card className="border-none shadow-md bg-white mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📚 Buugaagta Caruurta ({childrenBooksList.length})
                  </CardTitle>
                  <CardDescription>
                    Ku dar buugaag caruurta loogu talogalay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!childrenBookTitle || !childrenBookUrl) {
                      toast.error("Fadlan geli magaca iyo URL-ka buugga");
                      return;
                    }
                    createChildrenBookMutation.mutate({
                      title: childrenBookTitle,
                      description: childrenBookDescription || undefined,
                      fileUrl: childrenBookUrl,
                      imageUrl: childrenBookImageUrl || undefined,
                    });
                  }} className="space-y-4 mb-6 p-4 bg-violet-50 rounded-lg border border-violet-200">
                    <div>
                      <Label>Magaca Buugga *</Label>
                      <Input
                        value={childrenBookTitle}
                        onChange={(e) => setChildrenBookTitle(e.target.value)}
                        placeholder="e.g., Sheekooyinka Caruurta"
                        data-testid="input-children-book-title"
                      />
                    </div>
                    <div>
                      <Label>Sharaxaad (Optional)</Label>
                      <Textarea
                        value={childrenBookDescription}
                        onChange={(e) => setChildrenBookDescription(e.target.value)}
                        placeholder="Wax yar oo buugga ku saabsan..."
                        rows={2}
                        data-testid="input-children-book-desc"
                      />
                    </div>
                    <div>
                      <Label>Sawirka Buugga (URL)</Label>
                      <Input
                        value={childrenBookImageUrl}
                        onChange={(e) => setChildrenBookImageUrl(e.target.value)}
                        placeholder="https://example.com/book-cover.jpg"
                        data-testid="input-children-book-image"
                      />
                    </div>
                    <div>
                      <Label>PDF URL (Google Drive) *</Label>
                      <Input
                        value={childrenBookUrl}
                        onChange={(e) => setChildrenBookUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        data-testid="input-children-book-url"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      disabled={createChildrenBookMutation.isPending}
                      data-testid="btn-create-children-book"
                    >
                      {createChildrenBookMutation.isPending ? "Waa la soo geliyayaa..." : "Ku Dar Buug Cusub"}
                    </Button>
                  </form>

                  {childrenBooksList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Weli buug kuma jiro.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {childrenBooksList.map((book: any) => (
                        <div 
                          key={book.id} 
                          className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          data-testid={`children-book-${book.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {book.imageUrl ? (
                              <img src={book.imageUrl} alt={book.title} className="w-10 h-14 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <span className="text-xl">📚</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{book.title}</p>
                              {book.description && <p className="text-xs text-gray-500 line-clamp-1">{book.description}</p>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Ma hubtaa inaad rabto inaad tirtirto "${book.title}"?`)) {
                                deleteBookMutation.mutate(book.id);
                              }
                            }}
                            disabled={deleteBookMutation.isPending}
                            data-testid={`btn-delete-children-book-${book.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Google Drive Files Section */}
              <Card className="border-none shadow-md bg-white mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    Faylasha Google Drive ({driveFilesList.length})
                  </CardTitle>
                  <CardDescription>
                    Faylasha folder-ka "Barbaarintasan Maktabada" ee Google Drive-ka
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {driveFilesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-gray-500">Waa la soo dajinayaa...</span>
                    </div>
                  ) : driveFilesList.length === 0 ? (
                    <div className="text-center py-8">
                      <Cloud className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Weli fayl kuma jiro folder-ka Google Drive-ka.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Samee folder "Barbaarintasan Maktabada" Google Drive-kaaga oo ku dar faylasha halkaas.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {driveFilesList.map((file: any) => (
                        <div 
                          key={file.id} 
                          className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                          data-testid={`drive-file-${file.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{file.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Cloud className="w-3 h-3" />
                                  Google Drive
                                </span>
                                {file.size && (
                                  <span className="text-xs text-gray-500">
                                    {parseInt(file.size) < 1024 * 1024 
                                      ? `${(parseInt(file.size) / 1024).toFixed(1)} KB`
                                      : `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB`
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                onClick={() => file.webViewLink && window.open(file.webViewLink, "_blank")}
                                data-testid={`btn-open-drive-${file.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Ma hubtaa inaad rabto inaad tirtirto "${file.name}"?`)) {
                                    deleteDriveFileMutation.mutate(file.id);
                                  }
                                }}
                                disabled={deleteDriveFileMutation.isPending}
                                data-testid={`btn-delete-drive-${file.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Generated Tips Tab */}
            <TabsContent value="ai-tips">
              <AiTipsTab />
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <AppointmentsTab />
            </TabsContent>

            {/* Parent Progress / Educator Dashboard Tab */}
            <TabsContent value="parent-progress">
              <ParentProgressTab />
            </TabsContent>

            {/* Assessment Insights Tab */}
            <TabsContent value="assessment-insights">
              <AssessmentInsightsTab />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementsTab />
            </TabsContent>

            <TabsContent value="homepage">
              <HomepageSectionsTab />
            </TabsContent>

            <TabsContent value="parent-community">
              <ParentCommunitySettingsTab />
            </TabsContent>
            
            <TabsContent value="finance">
              <FinanceTab />
            </TabsContent>

            <TabsContent value="push-notifications">
              <PushNotificationsTab />
            </TabsContent>

            <TabsContent value="email-test">
              <EmailTestTab />
            </TabsContent>

            <TabsContent value="meet-events">
              <MeetEventsAdmin />
            </TabsContent>

            <TabsContent value="voice-spaces">
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    <Headphones className="w-3 h-3 mr-1" /> Qolalka
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveTab("ai-moderation")}
                  >
                    <Shield className="w-3 h-3 mr-1" /> AI Moderation
                  </Button>
                </div>
                <VoiceSpacesAdmin />
              </div>
            </TabsContent>
            
            <TabsContent value="ai-moderation">
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveTab("voice-spaces")}
                  >
                    <Headphones className="w-3 h-3 mr-1" /> Qolalka
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    <Shield className="w-3 h-3 mr-1" /> AI Moderation
                  </Button>
                </div>
                <AIModerationPanel />
              </div>
            </TabsContent>

            {/* Content Creator - New Unified Interface */}
            <TabsContent value="content-creator">
              <Card className="border-2 border-gradient-to-r from-blue-200 to-purple-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Qoraal Cusub Samee
                  </CardTitle>
                  <CardDescription>
                    Samee Dhambaalka Waalidka ama Sheekada Caruurta - adigoo isticmaalaya AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Step Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${contentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                    <div className={`w-16 h-1 ${contentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${contentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                  </div>

                  {/* Step 1: Content Entry & Media Generation */}
                  {contentStep === 1 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-800 mb-4">Tallaabo 1: Qor & Cod/Sawir Samee</h3>
                        
                        {/* Content Type Selector */}
                        <div className="mb-4">
                          <Label className="mb-2 block">Nooca Qoraalka</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={contentType === "dhambaal" ? "default" : "outline"}
                              onClick={() => setContentType("dhambaal")}
                              className={contentType === "dhambaal" ? "bg-blue-600" : ""}
                              data-testid="button-type-dhambaal"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Dhambaalka Waalidka
                            </Button>
                            <Button
                              variant={contentType === "sheeko" ? "default" : "outline"}
                              onClick={() => setContentType("sheeko")}
                              className={contentType === "sheeko" ? "bg-purple-600" : ""}
                              data-testid="button-type-sheeko"
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              Sheekada Caruurta
                            </Button>
                          </div>
                        </div>
                        
                        {/* Title */}
                        <div className="mb-4">
                          <Label className="mb-2 block">Cinwaan</Label>
                          <Input
                            value={contentType === "dhambaal" ? editedTitle : editedTitleSomali}
                            onChange={(e) => contentType === "dhambaal" 
                              ? setEditedTitle(e.target.value) 
                              : setEditedTitleSomali(e.target.value)}
                            className="w-full"
                          />
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                          <Label className="mb-2 block">Qoraalka</Label>
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={12}
                            className="w-full font-mono text-sm"
                          />
                        </div>

                        {/* Type-specific fields */}
                        {contentType === "dhambaal" ? (
                          <div className="mb-4">
                            <Label className="mb-2 block">Qodobyo Muhiim ah</Label>
                            <Textarea
                              value={editedKeyPoints}
                              onChange={(e) => setEditedKeyPoints(e.target.value)}
                              placeholder="Sadar kasta qodob cusub ku qor:\nNaxariista\nFahamka Dareenka\nDhagaysi Wanaagsan"
                              rows={5}
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Qodob kasta sadar cusub ku qor
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="mb-4">
                              <Label className="mb-2 block">Casharka (Moral Lesson)</Label>
                              <Textarea
                                value={editedMoralLesson}
                                onChange={(e) => setEditedMoralLesson(e.target.value)}
                                rows={2}
                                className="w-full"
                              />
                            </div>
                            <div className="mb-4">
                              <Label className="mb-2 block">Magaca Qofka Sheekada</Label>
                              <Input
                                value={editedCharacterName}
                                onChange={(e) => setEditedCharacterName(e.target.value)}
                                placeholder="Bilaal bin Rabaah"
                                className="w-full"
                              />
                            </div>
                          </>
                        )}

                        {/* Image Upload Section */}
                        <div className="mb-4 p-3 bg-white rounded border" data-testid="content-image-upload-section">
                          <Label className="mb-2 block">Sawirada (ilaa 5)</Label>
                          <div className="flex flex-wrap gap-2 mb-2" data-testid="content-image-previews">
                            {uploadedImages.map((url, idx) => (
                              <div key={idx} className="relative w-20 h-20" data-testid={`content-image-preview-${idx}`}>
                                <img src={url} alt={`Sawir ${idx + 1}`} className="w-full h-full object-cover rounded" />
                                <button
                                  type="button"
                                  onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                  data-testid={`button-remove-image-${idx}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {uploadedImages.length < 5 && (
                            <div className="space-y-3">
                              {/* Manual upload */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageUpload}
                                  disabled={isUploadingImage}
                                  className="hidden"
                                  id="content-image-upload"
                                  data-testid="input-content-image-upload"
                                />
                                <label
                                  htmlFor="content-image-upload"
                                  className={`cursor-pointer inline-flex items-center px-3 py-2 border rounded-md text-sm ${isUploadingImage ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                                  data-testid="button-content-image-upload"
                                >
                                  {isUploadingImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Waa la soo geliyayaa...
                                    </>
                                  ) : (
                                    <>
                                      <ImageIcon className="w-4 h-4 mr-2" />
                                      Sawir soo geli ({uploadedImages.length}/5)
                                    </>
                                  )}
                                </label>
                              </div>
                              
                              {/* AI Image Generator - reads from content and generates 5 images */}
                              <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                <Label className="mb-2 block text-sm font-medium text-purple-700">
                                  <Sparkles className="w-4 h-4 inline mr-1" />
                                  AI Sawir Samee (5 Sawir)
                                </Label>
                                <Button
                                  type="button"
                                  onClick={handleGenerateAiImages}
                                  disabled={isGeneratingAiImage || !editedContent.trim() || uploadedImages.length >= 5}
                                  className="w-full bg-purple-600 hover:bg-purple-700"
                                  data-testid="button-generate-ai-images"
                                >
                                  {isGeneratingAiImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      {5 - uploadedImages.length} sawir waa la sameynayaa...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Qoraalka ka Samee {5 - uploadedImages.length} Sawir
                                    </>
                                  )}
                                </Button>
                                <p className="text-xs text-purple-600 mt-2">
                                  AI-gu wuxuu akhriyaa qoraalka kor ku qoran oo {5 - uploadedImages.length} sawir kuu soo sameeyaa
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Sawirada waxaa loo kaydiyaa Google Drive - codka marka la dhagaysto ayey slide-gareyaan
                          </p>
                        </div>

                        {/* Voice Selector */}
                        <div className="mb-4 p-3 bg-white rounded border">
                          <Label className="mb-2 block">Codka Akhrinaya</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={selectedVoice === "muuse" ? "default" : "outline"}
                              onClick={() => setSelectedVoice("muuse")}
                              className={selectedVoice === "muuse" ? "bg-blue-600" : ""}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Muuse (Lab)
                            </Button>
                            <Button
                              variant={selectedVoice === "ubax" ? "default" : "outline"}
                              onClick={() => setSelectedVoice("ubax")}
                              className={selectedVoice === "ubax" ? "bg-pink-600" : ""}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Ubax (Naag)
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Azure TTS: https://{"{region}"}.tts.speech.microsoft.com/cognitiveservices/v1
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleGenerateAudio}
                            disabled={isGeneratingAudio || !editedContent.trim()}
                            className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                            data-testid="button-generate-audio"
                          >
                            {isGeneratingAudio ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Codka waa la sameynayaa...
                              </>
                            ) : (
                              <>
                                <Radio className="w-4 h-4 mr-2" />
                                Cod Samee & Tallaabo 2
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {/* Reset Button */}
                        <Button
                          variant="ghost"
                          onClick={resetContentCreator}
                          className="w-full mt-4 text-gray-500"
                          data-testid="button-reset-content"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Dib u bilow
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Save & Publish */}
                  {contentStep === 2 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h3 className="font-semibold text-purple-800 mb-4">Tallaabo 2: Kaydi & Fasax</h3>
                        
                        {/* Summary */}
                        <div className="mb-4 p-4 bg-white rounded-lg border">
                          <h4 className="font-medium text-gray-800 mb-2">
                            {contentType === "dhambaal" ? editedTitle : editedTitleSomali}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-3">{editedContent.slice(0, 200)}...</p>
                        </div>

                        {/* Audio Preview */}
                        {generatedAudioBase64 && (
                          <div className="mb-4 p-3 bg-white rounded border">
                            <Label className="mb-2 block text-green-700">Codka waa diyaar!</Label>
                            <audio 
                              controls 
                              className="w-full"
                              src={`data:audio/mp3;base64,${generatedAudioBase64}`}
                            />
                          </div>
                        )}

                        {/* Google Drive info */}
                        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <Cloud className="w-4 h-4 inline mr-1" />
                            Qoraalka iyo codka waxaa la kaydin doonaa Google Drive
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setContentStep(1)}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Dib u noqo
                          </Button>
                          <Button
                            onClick={handleSaveContent}
                            disabled={isSavingContent}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            {isSavingContent ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Waa la kaydinayaa...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Kaydi & Fasax
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Reset Button */}
                        <Button
                          variant="ghost"
                          onClick={resetContentCreator}
                          className="w-full mt-4 text-gray-500"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Dib u bilow
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parent-messages">
              <Card data-testid="parent-messages-list">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Dhambaalka Waalidka
                      </CardTitle>
                      <CardDescription>Qoraalada maalinlaha ah ee waalidka - taftiir oo fasax</CardDescription>
                    </div>
                    <Button
                      onClick={() => sendTelegramNotificationMutation.mutate()}
                      disabled={sendTelegramNotificationMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600"
                      data-testid="button-send-telegram"
                    >
                      {sendTelegramNotificationMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Dir Telegram
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-500">Waa la soo rareyaa...</span>
                      </div>
                    ) : parentMessages.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Qoraal ma jiro</p>
                    ) : (
                      parentMessages.map((msg: any) => (
                        <div key={msg.id} className={`p-4 rounded-lg border ${msg.isPublished ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`} data-testid={`parent-message-${msg.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{msg.title}</h3>
                              <p className="text-sm text-gray-500">{msg.messageDate}</p>
                            </div>
                            <Badge className={msg.isPublished ? 'bg-green-500' : 'bg-orange-500'}>
                              {msg.isPublished ? 'La daabicay' : 'Sugitaan'}
                            </Badge>
                          </div>
                          
                          {editingParentMessage?.id === msg.id ? (
                            <div className="space-y-3 mt-4">
                              <div>
                                <Label>Cinwaan</Label>
                                <DebouncedInput
                                  value={editingParentMessage.title}
                                  onChange={(value) => setEditingParentMessage({...editingParentMessage, title: value})}
                                  debounceMs={150}
                                  data-testid="input-parent-message-title"
                                />
                              </div>
                              <div>
                                <Label>Qoraalka</Label>
                                <DebouncedTextarea
                                  value={editingParentMessage.content}
                                  onChange={(value) => setEditingParentMessage({...editingParentMessage, content: value})}
                                  debounceMs={150}
                                  rows={10}
                                  data-testid="textarea-parent-message-content"
                                />
                              </div>
                              <div>
                                <Label>Qodobyo Muhiim ah</Label>
                                <DebouncedInput
                                  value={editingParentMessage.keyPoints || ''}
                                  onChange={(value) => setEditingParentMessage({...editingParentMessage, keyPoints: value})}
                                  debounceMs={150}
                                  data-testid="input-parent-message-keypoints"
                                />
                              </div>
                              <div>
                                <Label>Taariikhda (YYYY-MM-DD)</Label>
                                <Input
                                  type="date"
                                  value={editingParentMessage.messageDate || ''}
                                  onChange={(e) => setEditingParentMessage({...editingParentMessage, messageDate: e.target.value})}
                                  data-testid="input-parent-message-date"
                                />
                                <p className="text-xs text-gray-500 mt-1">Taariikhda maanta u badal si ay dhambaalku maanta u soo baxo</p>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => {
                                  updateParentMessageMutation.mutate(editingParentMessage);
                                  setEditingParentMessage(null);
                                }} data-testid="button-save-parent-message">
                                  <Save className="w-4 h-4 mr-1" /> Keydi
                                </Button>
                                <Button variant="outline" onClick={() => setEditingParentMessage(null)} data-testid="button-cancel-parent-message">
                                  Jooji
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-gray-700 whitespace-pre-wrap line-clamp-3 mb-3">{msg.content}</p>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingParentMessage(msg)} data-testid={`button-edit-parent-message-${msg.id}`}>
                                  <Edit className="w-3 h-3 mr-1" /> Taftiir
                                </Button>
                                {!msg.isPublished && (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateParentMessageMutation.mutate({ id: msg.id, isPublished: true })} data-testid={`button-publish-parent-message-${msg.id}`}>
                                    <CheckCircle className="w-3 h-3 mr-1" /> Fasax
                                  </Button>
                                )}
                                {msg.isPublished && (
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => republishParentMessageMutation.mutate(msg.id)} disabled={republishParentMessageMutation.isPending} data-testid={`button-republish-parent-message-${msg.id}`}>
                                    {republishParentMessageMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Dib u Fasax
                                  </Button>
                                )}
                                {msg.isPublished && (
                                  <Button size="sm" variant="outline" className="text-orange-600" onClick={() => updateParentMessageMutation.mutate({ id: msg.id, isPublished: false })} data-testid={`button-unpublish-parent-message-${msg.id}`}>
                                    <EyeOff className="w-3 h-3 mr-1" /> Ka saar
                                  </Button>
                                )}
                                {msg.isPublished && (
                                  <Button size="sm" variant="outline" onClick={() => generateParentMessageAudioMutation.mutate(msg.id)} disabled={generateParentMessageAudioMutation.isPending} data-testid={`button-audio-parent-message-${msg.id}`}>
                                    {generateParentMessageAudioMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Radio className="w-3 h-3 mr-1" />}
                                    {msg.audioUrl ? 'Audio Dib u samayn' : 'Audio Samayn'}
                                  </Button>
                                )}
                                {msg.isPublished && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-600 hover:bg-blue-50" 
                                    onClick={() => setTelegramPreview({ 
                                      type: 'dhambaal', 
                                      title: msg.title, 
                                      message: generateDhambaalTelegramMessage(msg.title) 
                                    })}
                                    data-testid={`button-telegram-parent-message-${msg.id}`}
                                  >
                                    <MessageCircle className="w-3 h-3 mr-1" /> Telegram Fariin
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 hover:bg-red-50" 
                                  onClick={() => setDeleteConfirmation({ type: 'message', id: msg.id, title: msg.title })}
                                  data-testid={`button-delete-parent-message-${msg.id}`}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Tirtir
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bedtime-stories">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Maaweelada Caruurta
                  </CardTitle>
                  <CardDescription>Sheekooyin-ka hurdada - taftiir oo fasax</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoadingStories ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="ml-2 text-gray-500">Waa la soo rareyaa...</span>
                      </div>
                    ) : bedtimeStories.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Sheeko ma jirto</p>
                    ) : (
                      bedtimeStories.map((story: any) => (
                        <div key={story.id} className={`p-4 rounded-lg border ${story.isPublished ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`} data-testid={`bedtime-story-${story.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{story.titleSomali}</h3>
                              <p className="text-sm text-gray-500">{story.storyDate} • {story.characterName}</p>
                            </div>
                            <Badge className={story.isPublished ? 'bg-green-500' : 'bg-orange-500'}>
                              {story.isPublished ? 'La daabicay' : 'Sugitaan'}
                            </Badge>
                          </div>
                          
                          {editingBedtimeStory?.id === story.id ? (
                            <div className="space-y-3 mt-4">
                              <div>
                                <Label>Cinwaan</Label>
                                <DebouncedInput
                                  value={editingBedtimeStory.titleSomali}
                                  onChange={(value) => setEditingBedtimeStory({...editingBedtimeStory, titleSomali: value})}
                                  debounceMs={150}
                                  data-testid="input-bedtime-story-title"
                                />
                              </div>
                              <div>
                                <Label>Sheekada</Label>
                                <DebouncedTextarea
                                  value={editingBedtimeStory.content}
                                  onChange={(value) => setEditingBedtimeStory({...editingBedtimeStory, content: value})}
                                  debounceMs={150}
                                  rows={10}
                                  data-testid="textarea-bedtime-story-content"
                                />
                              </div>
                              <div>
                                <Label>Casharka (Moral Lesson)</Label>
                                <DebouncedTextarea
                                  value={editingBedtimeStory.moralLesson || ''}
                                  onChange={(value) => setEditingBedtimeStory({...editingBedtimeStory, moralLesson: value})}
                                  debounceMs={150}
                                  rows={3}
                                  data-testid="textarea-bedtime-story-moral"
                                />
                              </div>
                              <div>
                                <Label>Taariikhda (YYYY-MM-DD)</Label>
                                <Input
                                  type="date"
                                  value={editingBedtimeStory.storyDate || ''}
                                  onChange={(e) => setEditingBedtimeStory({...editingBedtimeStory, storyDate: e.target.value})}
                                  data-testid="input-bedtime-story-date"
                                />
                                <p className="text-xs text-gray-500 mt-1">Taariikhda maanta u badal si ay sheekadu maanta u soo baxdo</p>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => {
                                  updateBedtimeStoryMutation.mutate(editingBedtimeStory);
                                  setEditingBedtimeStory(null);
                                }} data-testid="button-save-bedtime-story">
                                  <Save className="w-4 h-4 mr-1" /> Keydi
                                </Button>
                                <Button variant="outline" onClick={() => setEditingBedtimeStory(null)} data-testid="button-cancel-bedtime-story">
                                  Jooji
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-gray-700 whitespace-pre-wrap line-clamp-3 mb-3">{story.content}</p>
                              {story.moralLesson && (
                                <p className="text-sm text-purple-700 italic mb-3">Casharka: {story.moralLesson}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingBedtimeStory(story)} data-testid={`button-edit-bedtime-story-${story.id}`}>
                                  <Edit className="w-3 h-3 mr-1" /> Taftiir
                                </Button>
                                {!story.isPublished && (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateBedtimeStoryMutation.mutate({ id: story.id, isPublished: true })} data-testid={`button-publish-bedtime-story-${story.id}`}>
                                    <CheckCircle className="w-3 h-3 mr-1" /> Fasax
                                  </Button>
                                )}
                                {story.isPublished && (
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => republishBedtimeStoryMutation.mutate(story.id)} disabled={republishBedtimeStoryMutation.isPending} data-testid={`button-republish-bedtime-story-${story.id}`}>
                                    {republishBedtimeStoryMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Dib u Fasax
                                  </Button>
                                )}
                                {story.isPublished && (
                                  <Button size="sm" variant="outline" className="text-orange-600" onClick={() => updateBedtimeStoryMutation.mutate({ id: story.id, isPublished: false })} data-testid={`button-unpublish-bedtime-story-${story.id}`}>
                                    <EyeOff className="w-3 h-3 mr-1" /> Ka saar
                                  </Button>
                                )}
                                {story.isPublished && (
                                  <Button size="sm" variant="outline" onClick={() => generateBedtimeStoryAudioMutation.mutate(story.id)} disabled={generateBedtimeStoryAudioMutation.isPending} data-testid={`button-audio-bedtime-story-${story.id}`}>
                                    {generateBedtimeStoryAudioMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Radio className="w-3 h-3 mr-1" />}
                                    {story.audioUrl ? 'Audio Dib u samayn' : 'Audio Samayn'}
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 hover:bg-red-50" 
                                  onClick={() => setDeleteConfirmation({ type: 'story', id: story.id, title: story.titleSomali })}
                                  data-testid={`button-delete-bedtime-story-${story.id}`}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Tirtir
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ma hubtaa inaad tirtirto?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmation?.type === 'message' 
                  ? `Dhambaalkan "${deleteConfirmation?.title}" waa la tirtiri doonaa. Tallaabadan dib looma celin karo.`
                  : `Sheekadan "${deleteConfirmation?.title}" waa la tirtiri doonaa. Tallaabadan dib looma celin karo.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Jooji</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (deleteConfirmation?.type === 'message') {
                    deleteParentMessageMutation.mutate(deleteConfirmation.id);
                  } else if (deleteConfirmation?.type === 'story') {
                    deleteBedtimeStoryMutation.mutate(deleteConfirmation.id);
                  }
                }}
                disabled={deleteParentMessageMutation.isPending || deleteBedtimeStoryMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {(deleteParentMessageMutation.isPending || deleteBedtimeStoryMutation.isPending) 
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 
                  : <Trash2 className="w-4 h-4 mr-1" />
                }
                Haa, Tirtir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lesson Accessibility Report Dialog */}
        <Dialog open={showAccessibilityReport} onOpenChange={setShowAccessibilityReport}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Warbixinta Casharada Furan (Lesson Accessibility Report)
              </DialogTitle>
              <DialogDescription>
                Koorsooyin iyo casharada ay leeyihiin oo si bilaash ah u furan
              </DialogDescription>
            </DialogHeader>
            {accessibilityReport && (
              <div className="space-y-6">
                {/* Export Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      try {
                        // Prepare CSV data with summary
                        const csvData = [];
                        
                        // Add summary rows
                        const totalPercentage = accessibilityReport.summary.totalLessonsAcrossAll > 0 
                          ? Math.round((accessibilityReport.summary.freeLessonsAcrossAll / accessibilityReport.summary.totalLessonsAcrossAll) * 100)
                          : 0;
                        csvData.push({
                          "Koorsada/Course": "GUUD AHAAN (SUMMARY)",
                          "ID": "",
                          "Status": "",
                          "Wadarta Casharada/Total Lessons": accessibilityReport.summary.totalLessonsAcrossAll,
                          "Casharada Bilaash/Free Lessons": accessibilityReport.summary.freeLessonsAcrossAll,
                          "Casharada Lacag/Paid Lessons": accessibilityReport.summary.totalLessonsAcrossAll - accessibilityReport.summary.freeLessonsAcrossAll,
                          "% Bilaash": totalPercentage
                        });
                        csvData.push({}); // Empty row
                        
                        // Add course data
                        accessibilityReport.courses.forEach((course: any) => {
                          csvData.push({
                            "Koorsada/Course": course.courseTitle,
                            "ID": course.courseCourseId,
                            "Status": course.isCourseFreee ? "Bilaash" : "Lacag",
                            "Wadarta Casharada/Total Lessons": course.totalLessons,
                            "Casharada Bilaash/Free Lessons": course.freeLessons,
                            "Casharada Lacag/Paid Lessons": course.paidLessons,
                            "% Bilaash": course.accessibilityPercentage
                          });
                        });
                        
                        // Generate CSV
                        const csv = Papa.unparse(csvData);
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        const date = new Date().toISOString().split('T')[0];
                        link.download = `warbixinta-casharada_${date}.csv`;
                        link.click();
                        toast.success("Warbixinta waa la soo saaray! (Report exported successfully!)");
                      } catch (error) {
                        console.error("Export error:", error);
                        toast.error("Lama soo saari karin warbixinta casharada");
                      }
                    }}
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Soo Saar CSV (Export CSV)
                  </Button>
                </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{accessibilityReport.summary.totalCourses}</p>
                      <p className="text-xs text-blue-600">Koorsooyin Wadarta</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{accessibilityReport.summary.freeCoursesCount}</p>
                      <p className="text-xs text-green-600">Koorsooyin Bilaash</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-violet-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-purple-700">{accessibilityReport.summary.totalLessonsAcrossAll}</p>
                      <p className="text-xs text-purple-600">Casharada Wadarta</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{accessibilityReport.summary.freeLessonsAcrossAll}</p>
                      <p className="text-xs text-amber-600">Casharada Bilaash</p>
                    </CardContent>
                  </Card>
                </div>
                {/* Course Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Faahfaahinta Koorsada</h3>
                  {accessibilityReport.courses.map((course: any) => (
                    <Card key={course.courseId} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base flex items-center gap-2">
                              {course.courseTitle}
                              {course.isCourseFreee && <Badge className="bg-green-100 text-green-700 text-xs">Bilaash</Badge>}
                            </h4>
                            <p className="text-sm text-gray-600">ID: {course.courseCourseId}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{course.accessibilityPercentage}%</div>
                            <p className="text-xs text-gray-500">Furan</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600">Wadarta:</p>
                            <p className="font-semibold">{course.totalLessons}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-green-600">Bilaash:</p>
                            <p className="font-semibold text-green-700">{course.freeLessons}</p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-blue-600">Lacag:</p>
                            <p className="font-semibold text-blue-700">{course.paidLessons}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${course.accessibilityPercentage}%` }} />
                        </div>
                        {course.freeLessons > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                              Casharada Bilaash ({course.freeLessons})
                            </summary>
                            <ul className="mt-2 space-y-1 text-sm">
                              {course.lessons.filter((l: any) => l.isFree).map((lesson: any) => (
                                <li key={lesson.id} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span className="font-medium">#{lesson.order}</span>
                                  <span>{lesson.title}</span>
                                  <Badge variant="outline" className="text-xs">{lesson.lessonType}</Badge>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// AI Tips Management Tab Component
function AiTipAudioPlayer({ tip }: { tip: any }) {
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(tip.audioUrl || null);

  useEffect(() => {
    setGeneratedUrl(tip.audioUrl || null);
    setIsPlaying(false);
    setAudioProgress(0);
  }, [tip.audioUrl]);

  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/ai-tips/${tip.id}/generate-audio`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedUrl(data.audioUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips"] });
      toast.success("Codka waa la sameeyay!");
    },
    onError: () => {
      toast.error("Qalad - codka ma laga sameyn karin");
    },
  });

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (generatedUrl) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <audio
          ref={audioRef}
          src={generatedUrl}
          onTimeUpdate={() => {
            if (!audioRef.current) return;
            const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(isNaN(p) ? 0 : p);
          }}
          onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
          preload="metadata"
        />
        <button
          onClick={toggleAudio}
          className="w-8 h-8 flex items-center justify-center bg-purple-600 rounded-full text-white flex-shrink-0 hover:bg-purple-700 transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
          if (!audioRef.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          audioRef.current.currentTime = pct * audioRef.current.duration;
        }}>
          <div className="h-full bg-purple-500 rounded-full transition-all duration-150" style={{ width: `${audioProgress}%` }} />
        </div>
      </div>
    );
  }

  if (tip.status !== "approved") return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-2 text-purple-700 border-purple-300 hover:bg-purple-50"
      onClick={() => generateAudioMutation.mutate()}
      disabled={generateAudioMutation.isPending}
    >
      {generateAudioMutation.isPending ? (
        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Codka samaynaayo...</>
      ) : (
        <><Volume2 className="w-4 h-4 mr-1" /> Cod Ka Samee</>
      )}
    </Button>
  );
}

function AiTipsTab() {
  const queryClient = useQueryClient();
  const [editingTip, setEditingTip] = useState<any>(null);
  const [correctedContent, setCorrectedContent] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editPauseUntil, setEditPauseUntil] = useState("");

  const { data: aiTips = [], isLoading } = useQuery({
    queryKey: ["/api/admin/ai-tips"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-tips", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AI tips");
      return res.json();
    },
  });

  const { data: tipSettings } = useQuery({
    queryKey: ["/api/admin/ai-tips/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-tips/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { prompt?: string; pauseUntil?: string | null }) => {
      const res = await fetch("/api/admin/ai-tips/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips/settings"] });
      toast.success("Settings waa la kaydiyay!");
    },
    onError: () => {
      toast.error("Qalad - settings ma la kaydin karin");
    },
  });

  const generateTipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/ai-tips/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate AI tip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips"] });
      toast.success("AI tip cusub ayaa la sameeyay!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay - AI tip ma laga sameyn karin");
    },
  });

  const updateTipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/ai-tips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update AI tip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips"] });
      setEditingTip(null);
      toast.success("AI tip waa la cusbooneysiiyay!");
    },
  });

  const pendingTips = aiTips.filter((t: any) => t.status === "pending_review");
  const approvedTips = aiTips.filter((t: any) => t.status === "approved");
  const rejectedTips = aiTips.filter((t: any) => t.status === "rejected");

  const isPaused = tipSettings?.pauseUntil && new Date(tipSettings.pauseUntil) > new Date();
  const pauseDaysLeft = isPaused ? Math.ceil((new Date(tipSettings.pauseUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-6">
      {/* Pause Banner */}
      {isPaused && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">AI Talooyinku waa la joojiyay</p>
              <p className="text-sm text-amber-600">Dib ayuu u bilaabi doonaa {tipSettings.pauseUntil} ({pauseDaysLeft} maalmood oo haray)</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 border-amber-400"
            onClick={() => {
              saveSettingsMutation.mutate({ pauseUntil: null });
            }}
          >
            Dib u Bilow Hadda
          </Button>
        </div>
      )}

      {/* Settings Panel */}
      <Card className="border border-purple-200 bg-purple-50/30">
        <CardHeader className="cursor-pointer" onClick={() => {
          if (!showSettings) {
            setEditPrompt(tipSettings?.prompt || "");
            setEditPauseUntil(tipSettings?.pauseUntil || "");
          }
          setShowSettings(!showSettings);
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">AI Prompt & Settings</CardTitle>
            </div>
            <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">AI Prompt-ka (Command-ka)</Label>
              <p className="text-xs text-gray-500 mb-2">
                {"{category}"} = nooca talada (Quudinta, Hurdada, iwm), {"{ageRange}"} = da'da carruurta
              </p>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={10}
                className="font-mono text-sm bg-white"
                data-testid="textarea-ai-prompt"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Jooji Ilaa (Taariikhda)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Marka taariikhdan la gaaro, AI-gu dib ayuu u bilaabi doonaa talooyinka sameeynta
              </p>
              <Input
                type="date"
                value={editPauseUntil}
                onChange={(e) => setEditPauseUntil(e.target.value)}
                className="w-64 bg-white"
                data-testid="input-pause-until"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  saveSettingsMutation.mutate({
                    prompt: editPrompt,
                    pauseUntil: editPauseUntil || null,
                  });
                }}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? "Kaydinayo..." : "Kaydi Settings"}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Xir
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-none shadow-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI Talooyinka ({aiTips.length})</CardTitle>
            <CardDescription>Talooyinka AI-ga ay sameeyay - Hubi, sax, oo approve-garey intaadan publish-garayn</CardDescription>
          </div>
          <Button
            onClick={() => generateTipMutation.mutate()}
            disabled={generateTipMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generateTipMutation.isPending ? "Samaynaayo..." : "Samee Talo Cusub"}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{pendingTips.length}</p>
              <p className="text-sm text-orange-600">Sugaya Hubinta</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approvedTips.length}</p>
              <p className="text-sm text-green-600">La Ogolaaday</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{rejectedTips.length}</p>
              <p className="text-sm text-red-600">La Diiday</p>
            </div>
          </div>

          {isLoading ? (
            <p>Loading...</p>
          ) : aiTips.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Weli talo AI ah ma jirto. Riix "Samee Talo Cusub" si aad u bilowdo.</p>
          ) : (
            <div className="space-y-4">
              {aiTips.map((tip: any) => (
                <div
                  key={tip.id}
                  className={`border rounded-lg p-4 ${
                    tip.status === "pending_review" ? "border-orange-300 bg-orange-50" :
                    tip.status === "approved" ? "border-green-300 bg-green-50" :
                    "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{tip.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{tip.ageRange}</Badge>
                        <Badge variant="outline">{tip.category}</Badge>
                        <Badge className={
                          tip.status === "pending_review" ? "bg-orange-500" :
                          tip.status === "approved" ? "bg-green-500" : "bg-red-500"
                        }>
                          {tip.status === "pending_review" ? "Sugaya" : tip.status === "approved" ? "Ogol" : "Diid"}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {tip.publishDate || "Taarikh la'aan"}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 whitespace-pre-wrap my-3">
                    {tip.correctedContent || tip.content}
                  </p>

                  <AiTipAudioPlayer tip={tip} />

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {tip.status === "pending_review" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateTipMutation.mutate({
                          id: tip.id,
                          data: { status: "approved", publishDate: tip.publishDate || new Date().toISOString().split('T')[0] }
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Oggolow
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTip(tip);
                        setCorrectedContent(tip.correctedContent || tip.content);
                        setPublishDate(tip.publishDate || "");
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Qoraalka Sax
                    </Button>
                    {tip.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateTipMutation.mutate({ id: tip.id, data: { status: "rejected" } })}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Diid
                      </Button>
                    )}
                    {tip.status === "rejected" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateTipMutation.mutate({
                          id: tip.id,
                          data: { status: "approved", publishDate: tip.publishDate || new Date().toISOString().split('T')[0] }
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Dib u Oggolow
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingTip} onOpenChange={() => setEditingTip(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sax AI Talada</DialogTitle>
            <DialogDescription>Qoraalka badal, ka dibna codka dib u samee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cinwaanka</Label>
              <Input
                value={editingTip?.title || ""}
                onChange={(e) => setEditingTip((prev: any) => prev ? { ...prev, title: e.target.value } : null)}
              />
            </div>
            <div>
              <Label>Qoraalka</Label>
              <Textarea
                value={correctedContent}
                onChange={(e) => setCorrectedContent(e.target.value)}
                rows={8}
              />
            </div>
            <div>
              <Label>Taariikhda Publish</Label>
              <Input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>
            {editingTip?.audioUrl && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 mb-2">
                  Qoraalka haddaad badasho, codka cusub waa inaad dib u sameysaa
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end flex-wrap">
              <Button variant="outline" onClick={() => setEditingTip(null)}>
                Ka noqo
              </Button>
              <Button
                variant="outline"
                className="text-purple-700 border-purple-300 hover:bg-purple-50"
                onClick={() => {
                  updateTipMutation.mutate({
                    id: editingTip?.id,
                    data: { correctedContent, publishDate, title: editingTip?.title, status: editingTip?.status === "pending_review" ? "approved" : editingTip?.status }
                  }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips"] });
                      setEditingTip(null);
                      toast.success("Qoraalka waa la kaydiyay!");
                    }
                  });
                }}
              >
                Kaydi Kaliya
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={async () => {
                  try {
                    await updateTipMutation.mutateAsync({
                      id: editingTip?.id,
                      data: { correctedContent, publishDate, title: editingTip?.title, status: editingTip?.status === "pending_review" ? "approved" : editingTip?.status }
                    });
                    toast.success("Qoraalka waa la kaydiyay, codka cusub samaynaayo...");
                    const audioRes = await fetch(`/api/admin/ai-tips/${editingTip?.id}/generate-audio`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: correctedContent }),
                    });
                    if (audioRes.ok) {
                      toast.success("Codka cusub waa la sameeyay!");
                    } else {
                      toast.error("Codka cusub ma laga sameyn karin");
                    }
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tips"] });
                    setEditingTip(null);
                  } catch {
                    toast.error("Qalad - qoraalka ma la kaydin karin");
                  }
                }}
              >
                Kaydi & Cod Cusub Samee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Appointments Management Tab Component
function AppointmentsTab() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slotStartTime, setSlotStartTime] = useState("09:00");
  const [slotEndTime, setSlotEndTime] = useState("17:00");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/appointments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/appointments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  const { data: parents = [] } = useQuery({
    queryKey: ["/api/admin/parents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: calendarAvailability = [], isLoading: isLoadingCalendar } = useQuery({
    queryKey: ["/api/admin/calendar-availability"],
    queryFn: async () => {
      const res = await fetch("/api/admin/calendar-availability", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      setEditingAppointment(null);
      toast.success("Ballanta waa la cusbooneysiiyay!");
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to cancel appointment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast.success("Ballanta waa la kansal gareeyay!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay");
    },
  });

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    setEditDate(appointment.appointmentDate);
    setEditTime(appointment.appointmentTime);
  };

  const handleSaveEdit = () => {
    if (!editDate || !editTime) {
      toast.error("Fadlan buuxi taariikhda iyo wakhtiga");
      return;
    }
    updateAppointmentMutation.mutate({
      id: editingAppointment.id,
      data: {
        appointmentDate: editDate,
        appointmentTime: editTime,
      }
    });
  };

  const setCalendarAvailabilityMutation = useMutation({
    mutationFn: async (data: { date: string; isAvailable: boolean; startTime: string; endTime: string }) => {
      const res = await fetch("/api/admin/calendar-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to set availability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar-availability"] });
      toast.success("Maalinta waa la keydsaday!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay");
    },
  });

  const deleteCalendarAvailabilityMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`/api/admin/calendar-availability/${date}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete availability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar-availability"] });
      toast.success("Maalinta waa la tirtiray!");
    },
  });

  const pendingAppointments = appointments.filter((a: any) => a.status === "pending");
  const approvedAppointments = appointments.filter((a: any) => a.status === "approved");

  const getParentName = (parentId: string) => {
    const parent = parents.find((p: any) => p.id === parentId);
    return parent?.name || "Waalid";
  };

  const monthNames = ["Janaayo", "Febraayo", "Maarso", "Abriil", "Maayo", "Juun", "Luuliyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofembar", "Desembar"];
  const dayLabels = ["Ax", "Is", "Ta", "Ar", "Kh", "Ji", "Sa"];

  const availableDatesSet = new Set(
    calendarAvailability
      .filter((a: any) => a.isAvailable)
      .map((a: any) => a.date)
  );

  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const isAvailable = availableDatesSet.has(dateStr);
    
    if (isAvailable) {
      deleteCalendarAvailabilityMutation.mutate(dateStr);
    } else {
      setCalendarAvailabilityMutation.mutate({
        date: dateStr,
        isAvailable: true,
        startTime: slotStartTime,
        endTime: slotEndTime,
      });
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Calendar Availability Management */}
      <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Jadwalka Kalandarka - Maalmaha Firaaqada ah
          </CardTitle>
          <CardDescription>Guji maalmaha aad heli karto ballan si waalidka u arki karaan</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Time Settings */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-200">
            <h4 className="font-medium text-gray-900 mb-3">Waqtiga Maalinta (oo dhan)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Bilawga</Label>
                <Input 
                  type="time" 
                  value={slotStartTime} 
                  onChange={(e) => setSlotStartTime(e.target.value)}
                  className="text-sm"
                  data-testid="input-slot-start-time"
                />
              </div>
              <div>
                <Label className="text-xs">Dhamaadka</Label>
                <Input 
                  type="time" 
                  value={slotEndTime} 
                  onChange={(e) => setSlotEndTime(e.target.value)}
                  className="text-sm"
                  data-testid="input-slot-end-time"
                />
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-lg p-4 border border-indigo-200">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h4 className="font-semibold text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayLabels.map((label, idx) => (
                <div key={idx} className="text-center text-xs font-medium text-gray-500 py-1">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="h-10" />;
                }
                
                const dateStr = formatDateLocal(date);
                const isAvailable = availableDatesSet.has(dateStr);
                const isPast = date < today;
                const isToday = date.getTime() === today.getTime();
                
                return (
                  <button
                    key={idx}
                    onClick={() => !isPast && handleDateClick(date)}
                    disabled={isPast}
                    className={`
                      h-10 rounded-lg text-sm font-medium transition-all
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:scale-105'}
                      ${isAvailable && !isPast ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                      ${!isAvailable && !isPast ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''}
                      ${isToday ? 'ring-2 ring-indigo-500' : ''}
                    `}
                    data-testid={`calendar-date-${dateStr}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-gray-600">La heli karo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border"></div>
                <span className="text-sm text-gray-600">Aan la heli karin</span>
              </div>
            </div>

            {/* Count */}
            <div className="text-center mt-3 text-sm text-indigo-600 font-medium">
              {calendarAvailability.filter((a: any) => a.isAvailable).length} maalin oo la heli karo
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>Ballannada Waalidka ({appointments.length})</CardTitle>
          <CardDescription>Waalidka ayaa ballan sameynaya si ay ula hadlaan Ustaadka</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{pendingAppointments.length}</p>
              <p className="text-sm text-orange-600">Sugaya Jawaab</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approvedAppointments.length}</p>
              <p className="text-sm text-green-600">La Ogolaaday</p>
            </div>
          </div>

          {isLoading ? (
            <p>Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Weli ballan kama jirto.</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className={`border rounded-lg p-4 ${
                    appointment.status === "pending" ? "border-orange-300 bg-orange-50" :
                    appointment.status === "approved" ? "border-green-300 bg-green-50" :
                    appointment.status === "rejected" ? "border-red-300 bg-red-50" :
                    "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{getParentName(appointment.parentId)}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {appointment.appointmentDate} - {appointment.appointmentTime}
                        <span className="ml-2">({appointment.duration} daqiiqo)</span>
                      </p>
                      {appointment.topic && (
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Mawduuca:</strong> {appointment.topic}
                        </p>
                      )}
                      {appointment.meetingLink && (
                        <a
                          href={appointment.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm mt-2 block"
                        >
                          Link-ka Kulanka
                        </a>
                      )}
                    </div>
                    <Badge className={
                      appointment.status === "pending" ? "bg-orange-500" :
                      appointment.status === "approved" ? "bg-green-500" :
                      appointment.status === "rejected" ? "bg-red-500" :
                      appointment.status === "cancelled" ? "bg-gray-500" : "bg-gray-500"
                    }>
                      {appointment.status === "pending" ? "Sugaya" :
                       appointment.status === "approved" ? "Ogol" :
                       appointment.status === "rejected" ? "Diid" :
                       appointment.status === "cancelled" ? "La Tirtiray" : appointment.status}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Pending: Approve/Reject buttons */}
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            const meetingLink = prompt("Gali link-ka kulanka (Zoom, Google Meet):", "");
                            if (meetingLink) {
                              updateAppointmentMutation.mutate({
                                id: appointment.id,
                                data: { status: "approved", meetingLink }
                              });
                            }
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Oggolow
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateAppointmentMutation.mutate({
                            id: appointment.id,
                            data: { status: "rejected" }
                          })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Diid
                        </Button>
                      </>
                    )}
                    
                    {/* Edit button - for pending and approved */}
                    {(appointment.status === "pending" || appointment.status === "approved") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAppointment(appointment)}
                      >
                        <Edit className="w-4 h-4 mr-1" /> Wax ka Bedel
                      </Button>
                    )}
                    
                    {/* Cancel button - for pending and approved */}
                    {(appointment.status === "pending" || appointment.status === "approved") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Ma hubtaa inaad rabto inaad kansali karto ballantaan?")) {
                            cancelAppointmentMutation.mutate(appointment.id);
                          }
                        }}
                      >
                        <Ban className="w-4 h-4 mr-1" /> Kansal
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Appointment Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => !open && setEditingAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wax ka Bedel Ballanta</DialogTitle>
            <DialogDescription>Badal taariikhda ama wakhtiga ballanta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDate">Taariikh</Label>
              <Input
                id="editDate"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="editTime">Wakhti</Label>
              <Input
                id="editTime"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingAppointment(null)}>
                Ka noqo
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateAppointmentMutation.isPending}
              >
                {updateAppointmentMutation.isPending ? "Kaydinaya..." : "Kaydi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Announcements Management Tab Component (Ogeeysiisyada)
function AnnouncementsTab() {
  const queryClient = useQueryClient();
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["/api/admin/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/admin/announcements", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json();
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title?: string; content: string }) => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setNewContent("");
      setNewTitle("");
      toast.success("Ogeysiiska waa la keydiyay!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay");
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setEditingAnnouncement(null);
      toast.success("Ogeysiiska waa la cusbooneysiiyay!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay");
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast.success("Ogeysiiska waa la tirtiray!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Add New Announcement */}
      <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-indigo-600" />
            Ku dar Ogeysiis Cusub
          </CardTitle>
          <CardDescription>Qor ogeysiis ama xayeysiis cusub oo dadka booqanaya bogga ay arki doonaan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Cinwaanka (Ikhtiyaari)</Label>
              <Input
                placeholder="Tusaale: Ogeysiis Muhiim ah"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                data-testid="input-announcement-title"
              />
            </div>
            <div>
              <Label>Qoraalka *</Label>
              <Textarea
                placeholder="Qor qoraalka ogeysiiska halkan..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                data-testid="input-announcement-content"
              />
            </div>
            <Button
              onClick={() => {
                if (!newContent.trim()) {
                  toast.error("Fadlan qor qoraalka ogeysiiska");
                  return;
                }
                createAnnouncementMutation.mutate({
                  title: newTitle || undefined,
                  content: newContent,
                });
              }}
              disabled={createAnnouncementMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-add-announcement"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createAnnouncementMutation.isPending ? "Waa la keydiyaa..." : "Ku dar Ogeysiiska"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List of Announcements */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>Ogeeysiisyada ({announcements.length})</CardTitle>
          <CardDescription>Dhammaan ogeeysiisyada aad soo qortay</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Waa la soo dajinayaa...</p>
          ) : announcements.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Weli ogeysiis ma jiro. Ku dar mid cusub kor.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement: any) => (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-lg border ${announcement.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  data-testid={`announcement-${announcement.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {announcement.title && (
                        <h4 className="font-semibold text-gray-900 mb-1">{announcement.title}</h4>
                      )}
                      <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(announcement.createdAt).toLocaleDateString('so-SO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: announcement.id, isActive: checked })}
                        data-testid={`toggle-announcement-${announcement.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAnnouncement(announcement);
                          setEditTitle(announcement.title || "");
                          setEditContent(announcement.content);
                        }}
                        data-testid={`edit-announcement-${announcement.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm("Ma hubtaa inaad tirtireyso ogeysiiskan?")) {
                            deleteAnnouncementMutation.mutate(announcement.id);
                          }
                        }}
                        data-testid={`delete-announcement-${announcement.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wax ka beddel Ogeysiiska</DialogTitle>
            <DialogDescription>Wax ka beddel qoraalka ogeysiiska</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cinwaanka (Ikhtiyaari)</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Qoraalka *</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
                Ka noqo
              </Button>
              <Button
                onClick={() => {
                  if (!editContent.trim()) {
                    toast.error("Qoraalka waa lagama maarmaan");
                    return;
                  }
                  updateAnnouncementMutation.mutate({
                    id: editingAnnouncement?.id,
                    data: { title: editTitle || null, content: editContent }
                  });
                }}
                disabled={updateAnnouncementMutation.isPending}
              >
                {updateAnnouncementMutation.isPending ? "Waa la keydiyaa..." : "Kaydi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Finance Management Tab Component (Xisaab)
function FinanceTab() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("other");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: financeSummary, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/finance-summary", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/finance-summary?month=${selectedMonth}&year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch finance summary");
      return res.json();
    },
  });

  const { data: allExpenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["/api/admin/expenses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/expenses", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
  });

  // Bank balance tracking (Salaam Bank - separate from revenue)
  const [showAddBankTransfer, setShowAddBankTransfer] = useState(false);
  const [bankAmount, setBankAmount] = useState("");
  const [bankDescription, setBankDescription] = useState("");

  const { data: bankData, refetch: refetchBank } = useQuery({
    queryKey: ["/api/admin/bank-balance"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bank-balance", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bank balance");
      return res.json();
    },
  });

  const createBankTransferMutation = useMutation({
    mutationFn: async (data: { amount: number; description?: string }) => {
      const res = await fetch("/api/admin/bank-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create bank transfer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-balance"] });
      toast.success("Lacagta Salaam Bank waa la keydiyay!");
      setShowAddBankTransfer(false);
      setBankAmount("");
      setBankDescription("");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteBankTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/bank-transfers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete bank transfer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-balance"] });
      toast.success("Lacagta waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const handleAddBankTransfer = () => {
    if (!bankAmount) {
      toast.error("Fadlan geli lacagta");
      return;
    }
    createBankTransferMutation.mutate({
      amount: parseInt(bankAmount),
      description: bankDescription || undefined,
    });
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (data: { description: string; amount: number; category: string; notes?: string; date: Date }) => {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-summary"] });
      toast.success("Kharashaadka waa la keydiyay!");
      setShowAddExpense(false);
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseCategory("other");
      setExpenseNotes("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-summary"] });
      toast.success("Kharashaadka waa la tirtiray!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { description?: string; amount?: number; category?: string; notes?: string; date?: Date } }) => {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-summary"] });
      toast.success("Kharashaadka waa la cusbooneysiiyay!");
      setEditingExpense(null);
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");

  const startEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditNotes(expense.notes || "");
    setEditDate(new Date(expense.date).toISOString().split('T')[0]);
  };

  const handleUpdateExpense = () => {
    if (!editDescription.trim() || !editAmount) {
      toast.error("Fadlan buuxi dhammaan meelaha");
      return;
    }
    updateExpenseMutation.mutate({
      id: editingExpense.id,
      data: {
        description: editDescription,
        amount: parseInt(editAmount),
        category: editCategory,
        notes: editNotes || undefined,
        date: new Date(editDate)
      }
    });
  };

  const categoryLabels: Record<string, string> = {
    salary: "Mushaar",
    equipment: "Aaladaha",
    marketing: "Suuq-geyn",
    hosting: "Hosting",
    software: "Software",
    other: "Kale"
  };

  const monthNames = [
    "Janaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun",
    "Luulyo", "Ogoost", "Sebtembar", "Oktoobar", "Noofembar", "Diseembar"
  ];

  const handleAddExpense = () => {
    if (!expenseDescription.trim() || !expenseAmount) {
      toast.error("Fadlan buuxi dhammaan meelaha");
      return;
    }
    createExpenseMutation.mutate({
      description: expenseDescription,
      amount: parseInt(expenseAmount),
      category: expenseCategory,
      notes: expenseNotes || undefined,
      date: new Date(expenseDate)
    });
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-600" />
          <p className="mt-2 text-gray-500">Waa la soo qaadayaa...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Xisaabta Lacagaha
          </CardTitle>
          <CardDescription>Dooro bisha aad rabto inaad aragto xisaabteda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-sm">Bisha</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Sannadka</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-green-600 font-medium">Lacagta Soo Gashay</p>
            <p className="text-3xl font-bold text-green-700">${financeSummary?.monthly?.income || 0}</p>
            <p className="text-xs text-green-600">{financeSummary?.monthly?.paymentCount || 0} lacag bixin</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Lacagta Baxday</p>
            <p className="text-3xl font-bold text-red-700">${financeSummary?.monthly?.expenses || 0}</p>
            <p className="text-xs text-red-600">{financeSummary?.monthly?.expenseCount || 0} kharashaad</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-blue-600 font-medium">Balance</p>
            <p className={`text-3xl font-bold ${(financeSummary?.monthly?.balance || 0) >= 0 ? "text-blue-700" : "text-red-700"}`}>
              ${financeSummary?.monthly?.balance || 0}
            </p>
            <p className="text-xs text-blue-600">{monthNames[selectedMonth - 1]} {selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* All-Time Summary */}
      <Card className="border-none shadow-md bg-gradient-to-r from-cyan-50 to-orange-50">
        <CardContent className="p-4">
          <h3 className="font-bold text-gray-800 mb-3">Wadarta Guud (Wakhti kasta)</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Soo Gashay</p>
              <p className="text-lg font-bold text-green-600">${financeSummary?.allTime?.income || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">La Bixiyay</p>
              <p className="text-lg font-bold text-red-600">${financeSummary?.allTime?.expenses || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Haray</p>
              <p className={`text-lg font-bold ${(financeSummary?.allTime?.balance || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                ${financeSummary?.allTime?.balance || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salaam Bank Balance Tracking (Separate from Revenue) */}
      <Card className="border-none shadow-md bg-gradient-to-r from-teal-50 to-emerald-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-teal-600" />
              Salaam Bank Balance
            </CardTitle>
            <CardDescription>Lacagta aad u wareejisay akoonkaaga Salaam Bank (xisaab-celin kaliya)</CardDescription>
          </div>
          <Button onClick={() => setShowAddBankTransfer(!showAddBankTransfer)} size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-100">
            <Plus className="w-4 h-4 mr-1" /> Ku Dar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-center p-4 bg-teal-100 rounded-lg">
              <p className="text-sm text-teal-600 font-medium">Wadarta Bank-ka</p>
              <p className="text-3xl font-bold text-teal-700">${bankData?.totalBalance || 0}</p>
            </div>
          </div>

          {showAddBankTransfer && (
            <div className="p-4 bg-white border border-teal-200 rounded-lg mb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Lacagta ($) *</Label>
                  <Input
                    type="number"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label className="text-sm">Sharaxaad (ikhtiyaari)</Label>
                  <Input
                    value={bankDescription}
                    onChange={(e) => setBankDescription(e.target.value)}
                    placeholder="Tusaale: Wareejinta bisha Janaayo"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddBankTransfer} disabled={createBankTransferMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  {createBankTransferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Kaydi
                </Button>
                <Button variant="outline" onClick={() => setShowAddBankTransfer(false)}>
                  Ka noqo
                </Button>
              </div>
            </div>
          )}

          {/* List of bank transfers */}
          <div className="space-y-2">
            {!bankData?.transfers || bankData.transfers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Weli lacag lama gelin</p>
            ) : (
              bankData.transfers.map((transfer: any) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{transfer.description || "Lacag wareejin"}</span>
                    <p className="text-xs text-gray-500">
                      {new Date(transfer.createdAt).toLocaleDateString("so-SO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-600">${transfer.amount}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Ma hubtaa inaad tirtirto lacagtaan?")) {
                          deleteBankTransferMutation.mutate(transfer.id);
                        }
                      }}
                      disabled={deleteBankTransferMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Section */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Kharashaadka (Lacagta Baxda)</CardTitle>
            <CardDescription>Halkan ku dar lacagaha aad bixiso</CardDescription>
          </div>
          <Button onClick={() => setShowAddExpense(!showAddExpense)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Ku Dar
          </Button>
        </CardHeader>
        <CardContent>
          {showAddExpense && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Sharaxaadda *</Label>
                  <Input
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Tusaale: Mushaar bisha"
                  />
                </div>
                <div>
                  <Label className="text-sm">Lacagta ($) *</Label>
                  <Input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label className="text-sm">Nooca</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Taariikhda</Label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Qoraal dheeraad ah (ikhtiyaari)</Label>
                <Input
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Faahfaahin dheeraad ah..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddExpense} disabled={createExpenseMutation.isPending}>
                  {createExpenseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Kaydi
                </Button>
                <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                  Ka noqo
                </Button>
              </div>
            </div>
          )}

          {/* List of expenses */}
          <div className="space-y-2">
            {allExpenses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Weli kharashaad lama gelin</p>
            ) : (
              allExpenses.map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{expense.description}</span>
                      <Badge variant="outline" className="text-xs">{categoryLabels[expense.category] || expense.category}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(expense.date).toLocaleDateString("so-SO")}
                      {expense.notes && ` - ${expense.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">${expense.amount}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => startEditExpense(expense)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Ma hubtaa inaad tirtirto kharashaadkan?")) {
                          deleteExpenseMutation.mutate(expense.id);
                        }
                      }}
                      disabled={deleteExpenseMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wax ka Bedel Kharashaadka</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Sharaxaadda *</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Lacagta ($) *</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Nooca</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Taariikhda</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Qoraal dheeraad ah</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingExpense(null)}>
                Ka noqo
              </Button>
              <Button onClick={handleUpdateExpense} disabled={updateExpenseMutation.isPending}>
                {updateExpenseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Kaydi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Homepage Sections Management Tab Component
function HomepageSectionsTab() {
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["/api/admin/homepage-sections"],
    queryFn: async () => {
      const res = await fetch("/api/admin/homepage-sections", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch homepage sections");
      return res.json();
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { isVisible?: boolean; title?: string } }) => {
      const res = await fetch(`/api/admin/homepage-sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update section");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-sections"] });
      toast.success("Qaybta waa la cusbooneysiiyay!");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/admin/homepage-sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder sections");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-sections"] });
      toast.success("Qaybaha waa la kala hormariyay!");
    },
  });

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSections.length) return;
    
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    const orderedIds = newSections.map((s: any) => s.id);
    reorderMutation.mutate(orderedIds);
  };

  const sectionConfig: Record<string, { label: string; icon: string; color: string; description: string }> = {
    welcome_banner: { label: "Soo Dhawoow Banner", icon: "🏠", color: "from-orange-500 to-amber-500", description: "Bannerka ugu horeeyaa ee waalidka soo dhaweynaya" },
    search: { label: "Raadinta Koorsada", icon: "🔍", color: "from-blue-500 to-cyan-500", description: "Raadinta koorsooyin iyo casharada" },
    services: { label: "Adeegyada (Icons)", icon: "⚡", color: "from-purple-500 to-violet-500", description: "Icons-ka adeegyada la heli karo" },
    stats: { label: "Lambarada Tirakoobka", icon: "📊", color: "from-emerald-500 to-green-500", description: "Koorsooyin, Casharado, Waalidiin, Telegram" },
    learning_groups: { label: "Kooxaha Waxbarashada", icon: "👥", color: "from-indigo-500 to-blue-500", description: "Guruubyada waalidka ee wax wada baranaya" },
    homework_helper: { label: "AI Caawiye", icon: "🤖", color: "from-violet-500 to-purple-500", description: "AI-ga caawiya waalidka iyo caruurta" },
    getting_started: { label: "Hagaha Bilowga", icon: "🚀", color: "from-teal-500 to-emerald-500", description: "5 tallaabo ee waalidka cusub" },
    age_filter: { label: "Filter Da'da", icon: "👶", color: "from-pink-500 to-rose-500", description: "Koorsooyin loo kala soocay da'da ilmaha" },
    general_courses: { label: "Koorsooyin Guud", icon: "📚", color: "from-blue-600 to-indigo-600", description: "Dhammaan koorsooyin la heli karo" },
    special_courses: { label: "Koorsooyin Gaar ah", icon: "🌟", color: "from-amber-500 to-yellow-500", description: "Koorsooyin gaarka ah (Autism, IQ, iwm)" },
    ai_learning: { label: "AI Waxbarashada", icon: "🧠", color: "from-fuchsia-500 to-pink-500", description: "Talooyinka AI ee waxbarashada" },
    daily_tip: { label: "Talo Maalinle (Admin)", icon: "💡", color: "from-yellow-500 to-orange-500", description: "Talada maalinlaha ah ee Admin-ka qoro" },
    ai_tip: { label: "AI Talo Maalinle", icon: "✨", color: "from-cyan-500 to-blue-500", description: "Talada AI-ga si toos ah u soo saaro" },
    testimonials: { label: "Ra'yi-celinta Waalidka", icon: "💬", color: "from-green-500 to-emerald-500", description: "Feedback-ka waalidka ka yimid" },
    cta: { label: "Download CTA", icon: "📲", color: "from-red-500 to-rose-500", description: "App-ka soo degasho button-ka" },
    announcements: { label: "Ogeeysiisyada", icon: "📢", color: "from-slate-500 to-gray-600", description: "Ogeysiisyada muhiimka ah" },
    sheeko: { label: "BSAv.1 Sheeko (Voice Spaces)", icon: "🎙️", color: "from-rose-500 to-pink-600", description: "Qolalka codka tooska ah" },
    parent_feed: { label: "Baraha Waalidiinta", icon: "📱", color: "from-sky-500 to-blue-600", description: "Feed-ka bulshada waalidka" },
    dhambaal: { label: "Dhambaalka Waalidka", icon: "📝", color: "from-emerald-600 to-teal-600", description: "Maqaalka waalidnimada maalinlaha" },
    maaweelo: { label: "Maaweelada Caruurta", icon: "🌙", color: "from-indigo-600 to-violet-700", description: "Sheekooyin habeen oo caruurta" },
    golden_membership: { label: "114 Golden Members", icon: "🏅", color: "from-yellow-600 to-amber-600", description: "Banner-ka xubnaha Gold" },
  };

  const visibleCount = sections.filter((s: any) => s.isVisible).length;
  const hiddenCount = sections.filter((s: any) => !s.isVisible).length;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                Nidaamka Bogga Hore
              </CardTitle>
              <CardDescription className="mt-1">
                Kala hormari qaybaha bogga hore, muuji ama qari midkasta.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                <Eye className="w-3.5 h-3.5" />
                {visibleCount} la arko
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-medium">
                <EyeOff className="w-3.5 h-3.5" />
                {hiddenCount} qarsoon
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-gray-500">Waa la soo dajinayaa...</span>
            </div>
          ) : sections.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Weli qaybaha bogga hore ma jiraan.</p>
          ) : (
            <div className="space-y-2">
              {sections.map((section: any, index: number) => {
                const config = sectionConfig[section.sectionKey] || {
                  label: section.title || section.sectionKey,
                  icon: "📄",
                  color: "from-gray-400 to-gray-500",
                  description: section.sectionKey,
                };
                
                return (
                  <div
                    key={section.id}
                    className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                      section.isVisible
                        ? "bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md"
                        : "bg-gray-50 border-dashed border-gray-300 opacity-50 hover:opacity-70"
                    }`}
                    data-testid={`homepage-section-${section.sectionKey}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, "up")}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="p-0 h-6 w-8 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <span className="text-[10px] font-bold text-gray-400 select-none">{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, "down")}
                        disabled={index === sections.length - 1 || reorderMutation.isPending}
                        className="p-0 h-6 w-8 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{config.description}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSectionMutation.mutate({
                        id: section.id,
                        data: { isVisible: !section.isVisible }
                      })}
                      disabled={updateSectionMutation.isPending}
                      className={`rounded-full px-3 py-1 h-8 text-xs font-medium transition-all ${
                        section.isVisible
                          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300"
                      }`}
                    >
                      {section.isVisible ? (
                        <><Eye className="w-3.5 h-3.5 mr-1" /> Muuqda</>
                      ) : (
                        <><EyeOff className="w-3.5 h-3.5 mr-1" /> Qarsoon</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Parent Community Settings Tab Component (Baraha Waalidiinta admin settings)
function ParentCommunitySettingsTab() {
  const queryClient = useQueryClient();
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [adMessage, setAdMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { uploadToGoogleDrive, uploading } = useUpload();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/parent-community-settings"],
    queryFn: async () => {
      const res = await fetch("/api/parent-community-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const liveCourses = courses.filter(c => c.isLive);

  useEffect(() => {
    if (settings) {
      setBannerUrl(settings.banner_image_url || "");
      setBannerTitle(settings.banner_title || "Baraha Waalidiinta");
      setBannerSubtitle(settings.banner_subtitle || "Bulsho Hagaasan oo Soomaali ah");
      setSelectedCourseIds(settings.course_ads_ids ? settings.course_ads_ids.split(',').filter(Boolean) : []);
      setAdMessage(settings.ad_message || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/parent-community-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bannerImageUrl: bannerUrl,
          bannerTitle: bannerTitle,
          bannerSubtitle: bannerSubtitle,
          courseAdsIds: selectedCourseIds.join(','),
          adMessage: adMessage,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const savedSettings = await res.json();
      setBannerUrl(savedSettings.banner_image_url || "");
      setBannerTitle(savedSettings.banner_title || "Baraha Waalidiinta");
      setBannerSubtitle(savedSettings.banner_subtitle || "Bulsho Hagaasan oo Soomaali ah");
      setSelectedCourseIds(savedSettings.course_ads_ids ? savedSettings.course_ads_ids.split(',').filter(Boolean) : []);
      setAdMessage(savedSettings.ad_message || "");
      queryClient.invalidateQueries({ queryKey: ["/api/parent-community-settings"] });
      toast.success("Dejinta waa la keydiyay!");
    } catch (error) {
      toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Fadlan dooro sawir keliya");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Sawirka waa in uu ka yar yahay 10MB");
      return;
    }

    try {
      const url = await uploadToGoogleDrive(file);
      if (url) {
        setBannerUrl(url);
        toast.success("Sawirka waa la soo dhigay!");
      }
    } catch (error) {
      toast.error("Khalad ayaa dhacay sawirka la soo dirayay");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dejinta Baraha Waalidiinta
          </CardTitle>
          <CardDescription>
            Maamul sawirka banner-ka iyo qoraalka Baraha Waalidiinta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Sawirka Banner-ka</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Input
                  placeholder="URL sawirka (Google Drive)"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  data-testid="input-banner-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Geli URL sawirka ama upload garee sawir cusub
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="banner-upload"
                  disabled={uploading}
                />
                <label htmlFor="banner-upload">
                  <Button
                    variant="outline"
                    asChild
                    disabled={uploading}
                    className="cursor-pointer"
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            {bannerUrl && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground mb-2">Preview:</Label>
                <div className="relative rounded-xl overflow-hidden h-32">
                  <img
                    src={bannerUrl.includes("drive.google.com") 
                      ? `https://drive.google.com/thumbnail?id=${bannerUrl.match(/[-\w]{25,}/)?.[0]}&sz=w1000`
                      : bannerUrl
                    }
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <h3 className="text-xl font-bold">{bannerTitle}</h3>
                    <p className="text-sm text-blue-100">{bannerSubtitle}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Qoraalka Banner-ka (Title)</Label>
              <Input
                placeholder="Baraha Waalidiinta"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                data-testid="input-banner-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                placeholder="Bulsho Hagaasan oo Soomaali ah"
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
                data-testid="input-banner-subtitle"
              />
            </div>
          </div>

          {/* Course Ads Selection */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Xayeesiinta Koorsooyinka
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Dooro koorsooyinka ay xayeesiintu muujiso bogga Baraha Waalidiinta
              </p>
            </div>
            {liveCourses.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {liveCourses.map((course: any) => (
                  <div
                    key={course.id}
                    onClick={() => toggleCourseSelection(course.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCourseIds.includes(course.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCourseIds.includes(course.id)}
                      className="pointer-events-none"
                    />
                    {course.imageUrl && (
                      <img
                        src={course.imageUrl.includes("drive.google.com")
                          ? `https://drive.google.com/thumbnail?id=${course.imageUrl.match(/[-\w]{25,}/)?.[0]}&sz=w100`
                          : course.imageUrl
                        }
                        alt={course.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.isFree ? 'Bilaash' : `$${course.priceYearly || course.priceOneTime}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Koorso live ah ma jirto. Fadlan ka samee koorsooyin tab-ka Koorsooyinka.
              </p>
            )}
            {selectedCourseIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedCourseIds.length} koorso la doortay
              </p>
            )}
          </div>

          {/* Ad Message */}
          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Fariinta Xayeesiinta
            </Label>
            <p className="text-xs text-muted-foreground">
              Geli fariimo ogeysiis ah oo lagu muujiyo bannerka (tusaale: qiimo-dhimis, koorsooyin cusub, iwm)
            </p>
            <Textarea
              placeholder="Tusaale: 🎉 Qiimo-dhimis! Hesho All-Access $114/sannad keliya!"
              value={adMessage}
              onChange={(e) => setAdMessage(e.target.value)}
              rows={2}
              data-testid="input-ad-message"
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
            data-testid="button-save-settings"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Kaydi Dejinta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Parent Progress / Educator Dashboard Tab Component
function ParentProgressTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "activity" | "points">("points");

  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ["/api/admin/parent-progress"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parent-progress", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parent progress");
      return res.json();
    },
  });

  // Filter and sort data
  const filteredData = progressData
    .filter((item: any) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        item.parent.name?.toLowerCase().includes(search) ||
        item.parent.email?.toLowerCase().includes(search) ||
        item.parent.phone?.includes(search)
      );
    })
    .sort((a: any, b: any) => {
      if (sortBy === "name") {
        return (a.parent.name || "").localeCompare(b.parent.name || "");
      } else if (sortBy === "progress") {
        const aPercent = a.totalLessons > 0 ? (a.lessonsCompleted / a.totalLessons) : 0;
        const bPercent = b.totalLessons > 0 ? (b.lessonsCompleted / b.totalLessons) : 0;
        return bPercent - aPercent;
      } else if (sortBy === "points") {
        const aPoints = a.parent.totalPoints || 0;
        const bPoints = b.parent.totalPoints || 0;
        return bPoints - aPoints;
      } else {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bTime - aTime;
      }
    });

  // Calculate overall stats
  const stats = {
    totalParents: progressData.length,
    activeParents: progressData.filter((p: any) => p.lessonsCompleted > 0).length,
    totalLessonsCompleted: progressData.reduce((sum: number, p: any) => sum + p.lessonsCompleted, 0),
    totalAssessmentsCompleted: progressData.reduce((sum: number, p: any) => sum + (p.assessmentsCompleted || 0), 0),
    averageProgress: progressData.length > 0 
      ? progressData.reduce((sum: number, p: any) => {
          const percent = p.totalLessons > 0 ? (p.lessonsCompleted / p.totalLessons) * 100 : 0;
          return sum + percent;
        }, 0) / progressData.length
      : 0,
  };

  function formatLastActivity(dateStr: string | null): string {
    if (!dateStr) return "Weligaa ma shaqeynin";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} daqiiqo kahor`;
    if (diffHours < 24) return `${diffHours} saac kahor`;
    if (diffDays < 7) return `${diffDays} maalmood kahor`;
    return date.toLocaleDateString("so-SO", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50" data-testid="stat-total-parents">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.totalParents}</p>
            <p className="text-xs text-blue-600 font-medium">Wadarta Waalidka</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50" data-testid="stat-active-parents">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{stats.activeParents}</p>
            <p className="text-xs text-green-600 font-medium">Kuwo Firfircoon</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50" data-testid="stat-lessons-completed">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-indigo-700">{stats.totalLessonsCompleted}</p>
            <p className="text-xs text-indigo-600 font-medium">Casharada</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-violet-50" data-testid="stat-assessments-completed">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-700">{stats.totalAssessmentsCompleted}</p>
            <p className="text-xs text-purple-600 font-medium">Qiimeynta</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50" data-testid="stat-average-progress">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-700">{stats.averageProgress.toFixed(0)}%</p>
            <p className="text-xs text-orange-600 font-medium">Celceliska</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort Controls */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Raadi waalidka..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-parent-progress"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-48" data-testid="select-sort-by">
                <SelectValue placeholder="U kala saar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Dhibcaha</SelectItem>
                <SelectItem value="activity">Firfircoonida</SelectItem>
                <SelectItem value="progress">Horumarka</SelectItem>
                <SelectItem value="name">Magaca</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parent Progress Table */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            Horumarka Waalidka ({filteredData.length})
          </CardTitle>
          <CardDescription>Halkan waxaad ka arki kartaa horumarka ardayda (waalidka) koorsoyinka</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Weli waalid ma jiro.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((item: any) => {
                const progressPercent = item.totalLessons > 0 
                  ? Math.round((item.lessonsCompleted / item.totalLessons) * 100) 
                  : 0;
                
                return (
                  <div
                    key={item.parent.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`parent-progress-${item.parent.id}`}
                  >
                    {/* Header with Avatar and Name - Centered */}
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-2">
                        {item.parent.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg text-center">{item.parent.name || "Aan la aqoon"}</h3>
                      <p className="text-xs text-gray-400">{formatLastActivity(item.lastActivity)}</p>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2 text-center" data-testid={`lessons-count-${item.parent.id}`}>
                        <p className="text-lg font-bold text-gray-800">{item.lessonsCompleted}</p>
                        <p className="text-[10px] text-gray-500">Cashar</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 text-center" data-testid={`courses-count-${item.parent.id}`}>
                        <p className="text-lg font-bold text-green-600">{item.enrolledCourses}</p>
                        <p className="text-[10px] text-gray-500">Koorso</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2 text-center" data-testid={`assessment-count-${item.parent.id}`}>
                        <p className="text-lg font-bold text-purple-600">{item.assessmentsCompleted}</p>
                        <p className="text-[10px] text-gray-500">Qiimeyn</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2 text-center" data-testid={`points-${item.parent.id}`}>
                        <p className="text-lg font-bold text-orange-600">{item.parent.totalPoints || 0}</p>
                        <p className="text-[10px] text-gray-500">Dhibco</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Horumar</span>
                        <span className="text-xs font-bold text-blue-600">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            progressPercent >= 75 ? "bg-green-500" :
                            progressPercent >= 50 ? "bg-blue-500" :
                            progressPercent >= 25 ? "bg-yellow-500" :
                            "bg-gray-400"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Assessment Insights Management Tab Component
function AssessmentInsightsTab() {
  const queryClient = useQueryClient();
  const [editingInsight, setEditingInsight] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    summary: "",
    parentingStyle: "",
    strengths: "",
    needsImprovement: "",
    focusAreas: "",
    parentingTips: "",
  });

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["/api/admin/assessment-insights"],
    queryFn: async () => {
      const res = await fetch("/api/admin/assessment-insights", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assessment insights");
      return res.json();
    },
  });

  const updateInsightMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/assessment-insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update insight");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assessment-insights"] });
      setEditingInsight(null);
      toast.success("Natiijada waa la cusbooneysiiyay!");
    },
    onError: () => {
      toast.error("Qalad ayaa dhacay - ma baddalin karin");
    },
  });

  const formatJsonForDisplay = (jsonStr: string | null | undefined): string => {
    if (!jsonStr) return "[]";
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

  const startEditing = (insight: any) => {
    setEditingInsight(insight);
    setEditForm({
      summary: insight.summary || "",
      parentingStyle: insight.parentingStyle || "",
      strengths: formatJsonForDisplay(insight.strengths),
      needsImprovement: formatJsonForDisplay(insight.needsImprovement),
      focusAreas: formatJsonForDisplay(insight.focusAreas),
      parentingTips: formatJsonForDisplay(insight.parentingTips),
    });
  };

  const validateAndCompactJson = (jsonStr: string): string | null => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return null;
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  };

  const saveEdit = () => {
    if (!editingInsight) return;
    
    const strengths = validateAndCompactJson(editForm.strengths);
    const needsImprovement = validateAndCompactJson(editForm.needsImprovement);
    const focusAreas = validateAndCompactJson(editForm.focusAreas);
    const parentingTips = validateAndCompactJson(editForm.parentingTips);
    
    if (strengths === null || needsImprovement === null || focusAreas === null || parentingTips === null) {
      toast.error("Fadlan hubi in JSON-ku sax yahay (tusaale: [\"qoraal1\", \"qoraal2\"])");
      return;
    }
    
    updateInsightMutation.mutate({
      id: editingInsight.id,
      data: {
        summary: editForm.summary,
        parentingStyle: editForm.parentingStyle,
        strengths,
        needsImprovement,
        focusAreas,
        parentingTips,
      },
    });
  };

  const parentingStyleOptions = [
    "Waalid Dhab ah (Authoritative)",
    "Waalid Adag (Authoritarian)",
    "Waalid Debecsan (Permissive)",
    "Waalid Ka Fog (Uninvolved)",
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Natiijada Qiimaynta - AI Insights
          </CardTitle>
          <CardDescription>
            Waxaad ka saxan kartaa fariimaha Soomaali ee AI-ga sameeyay
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : insights.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Ma jiraan natiijooyin qiimayn oo la save gareeyo</p>
          ) : (
            <div className="space-y-4">
              {insights.map((insight: any) => (
                <div
                  key={insight.id}
                  className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white"
                  data-testid={`insight-${insight.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{insight.parentName || "Waalid"}</p>
                      <p className="text-sm text-gray-500">{insight.parentEmail}</p>
                      <p className="text-xs text-gray-400">Da'da Ilmaha: {insight.childAgeRange}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(insight)}
                      data-testid={`edit-insight-${insight.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Badal
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <span className="font-medium text-purple-700">Parenting Style:</span>{" "}
                      <span className="text-gray-800">{insight.parentingStyle || "-"}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="font-medium text-purple-700">Soo koobid:</span>
                      <p className="text-gray-700 mt-1">{insight.summary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingInsight} onOpenChange={() => setEditingInsight(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wax ka Badal Natiijada</DialogTitle>
            <DialogDescription>
              Saxo fariimaha Soomaali ee AI-ga sameeyay
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="parentingStyle">Nooca Waalidnimada (Parenting Style)</Label>
              <Select
                value={editForm.parentingStyle}
                onValueChange={(value) => setEditForm({ ...editForm, parentingStyle: value })}
              >
                <SelectTrigger data-testid="select-parenting-style">
                  <SelectValue placeholder="Dooro nooca" />
                </SelectTrigger>
                <SelectContent>
                  {parentingStyleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summary">Soo Koobid (Summary)</Label>
              <Textarea
                id="summary"
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                rows={4}
                placeholder="Soo koobidda qiimaynta..."
                data-testid="input-summary"
              />
            </div>

            <div>
              <Label htmlFor="strengths">Awoodooyinka (Strengths) - JSON Array</Label>
              <Textarea
                id="strengths"
                value={editForm.strengths}
                onChange={(e) => setEditForm({ ...editForm, strengths: e.target.value })}
                rows={3}
                placeholder='["Awoodda koowaad", "Awoodda labaad"]'
                data-testid="input-strengths"
              />
            </div>

            <div>
              <Label htmlFor="needsImprovement">Meelaha Loo Baahan (Needs Improvement) - JSON Array</Label>
              <Textarea
                id="needsImprovement"
                value={editForm.needsImprovement}
                onChange={(e) => setEditForm({ ...editForm, needsImprovement: e.target.value })}
                rows={3}
                placeholder='["Meesha koowaad", "Meesha labaad"]'
                data-testid="input-needs-improvement"
              />
            </div>

            <div>
              <Label htmlFor="focusAreas">Meelaha La Diiradda Saaro (Focus Areas) - JSON Array</Label>
              <Textarea
                id="focusAreas"
                value={editForm.focusAreas}
                onChange={(e) => setEditForm({ ...editForm, focusAreas: e.target.value })}
                rows={3}
                placeholder='["Focus area 1", "Focus area 2"]'
                data-testid="input-focus-areas"
              />
            </div>

            <div>
              <Label htmlFor="parentingTips">Talooyinka Waalidnimada (Parenting Tips) - JSON Array</Label>
              <Textarea
                id="parentingTips"
                value={editForm.parentingTips}
                onChange={(e) => setEditForm({ ...editForm, parentingTips: e.target.value })}
                rows={3}
                placeholder='["Tallo 1", "Tallo 2"]'
                data-testid="input-parenting-tips"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingInsight(null)}>
              Ka noqo
            </Button>
            <Button
              onClick={saveEdit}
              disabled={updateInsightMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="btn-save-insight"
            >
              {updateInsightMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Kaydi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Push Notifications Tab Component
function PushNotificationsTab() {
  const [pushMode, setPushMode] = useState<"broadcast" | "selective">("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [isSending, setIsSending] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const AUDIENCE_LABELS: Record<string, string> = {
    all: "Dhammaan Waalidka",
    inactive_24h: "Kuwa 24 saac ka maqnaa",
    enrolled: "Kuwa koorsada ku qoran",
    free_users: "Kuwa bilaashka ah",
  };

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["/api/push/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/push/subscriptions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: audienceStats } = useQuery({
    queryKey: ["/api/push/audience-stats"],
    queryFn: async () => {
      const res = await fetch("/api/push/audience-stats", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: broadcastHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/push/broadcast-history"],
    queryFn: async () => {
      const res = await fetch("/api/push/broadcast-history", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (subscriptions.length > 0 && selectedParentIds.length === 0) {
      setSelectedParentIds(subscriptions.map((sub: any) => sub.parentId));
    }
  }, [subscriptions]);

  const toggleParent = (parentId: string) => {
    setSelectedParentIds(prev =>
      prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    );
  };

  const sendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Fadlan buuxi cinwaanka iyo fariinta");
      return;
    }
    setIsSending(true);
    setLastReport(null);
    try {
      const res = await fetch("/api/push/broadcast-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body, url, targetAudience }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastReport(data.report);
        toast.success(`Waa la diray! ${data.report.sentSuccessfully} qof ayaa helay`);
        setTitle("");
        setBody("");
        setUrl("");
        queryClient.invalidateQueries({ queryKey: ["/api/push/broadcast-history"] });
      } else {
        toast.error(data.error || "Qalad ayaa dhacay");
      }
    } catch {
      toast.error("Qalad ayaa dhacay - push notification ma la dirin");
    } finally {
      setIsSending(false);
    }
  };

  const sendSelective = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Fadlan buuxi cinwaanka iyo fariinta");
      return;
    }
    if (selectedParentIds.length === 0) {
      toast.error("Fadlan xulo ugu yaraan hal waalid");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title, body, url,
          parentIds: selectedParentIds.length === subscriptions.length ? undefined : selectedParentIds
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Push notification waa la diray! ${data.sent || 0} qof ayaa helay`);
        setTitle("");
        setBody("");
        setUrl("");
      } else {
        toast.error(data.error || "Qalad ayaa dhacay");
      }
    } catch {
      toast.error("Qalad ayaa dhacay");
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = SOMALI_MONTHS[d.getMonth()] || "";
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} - ${hours}:${mins}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={pushMode === "broadcast" ? "default" : "outline"}
          size="sm"
          onClick={() => setPushMode("broadcast")}
          data-testid="btn-mode-broadcast"
        >
          <Megaphone className="w-4 h-4 mr-1" /> Broadcast
        </Button>
        <Button
          variant={pushMode === "selective" ? "default" : "outline"}
          size="sm"
          onClick={() => setPushMode("selective")}
          data-testid="btn-mode-selective"
        >
          <Users className="w-4 h-4 mr-1" /> Qof Gaar ah
        </Button>
      </div>

      {pushMode === "broadcast" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-600" />
                Broadcast - U Dir Dhammaan
              </CardTitle>
              <CardDescription>
                U dir push notification waalidka oo dhan ama koox gaar ah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block font-medium">Cidda loo dirayo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(AUDIENCE_LABELS).map(([key, label]) => {
                    const stats = audienceStats?.[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setTargetAudience(key)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          targetAudience === key
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        data-testid={`btn-audience-${key}`}
                      >
                        <div className="font-medium text-sm">{label}</div>
                        {stats && (
                          <div className="text-xs text-gray-500 mt-1">
                            {stats.total} waalid · {stats.withPush} push
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="broadcast-title">Cinwaanka</Label>
                <Input
                  id="broadcast-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tusaale: Waan ku xiisannay! 💙"
                  data-testid="input-broadcast-title"
                />
              </div>

              <div>
                <Label htmlFor="broadcast-body">Fariinta</Label>
                <Textarea
                  id="broadcast-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tusaale: Cashar cusub oo ku saabsan cuntada caruurta ayaa la soo daray..."
                  rows={3}
                  data-testid="input-broadcast-body"
                />
              </div>

              <div>
                <Label htmlFor="broadcast-url">URL (ikhtiyaari)</Label>
                <Input
                  id="broadcast-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/courses, /dhambaal, / (ama ka tag madhan)"
                  data-testid="input-broadcast-url"
                />
              </div>

              <Button
                onClick={sendBroadcast}
                disabled={isSending || !title.trim() || !body.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                data-testid="btn-send-broadcast"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Diraya...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4 mr-2" />
                    U Dir {AUDIENCE_LABELS[targetAudience]}
                  </>
                )}
              </Button>

              {lastReport && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Warbixin
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-gray-500 text-xs">Guud</div>
                      <div className="font-bold text-lg">{lastReport.totalUsers}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-gray-500 text-xs">La diray</div>
                      <div className="font-bold text-lg text-green-600">{lastReport.sentSuccessfully}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-gray-500 text-xs">Fashilmay</div>
                      <div className="font-bold text-lg text-red-600">{lastReport.failed}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-gray-500 text-xs">Push ma lahayn</div>
                      <div className="font-bold text-lg text-gray-500">{lastReport.noSubscription}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Taariikhda Broadcast-ka
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : broadcastHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Wali broadcast la ma dirin</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {broadcastHistory.map((log: any) => (
                    <div key={log.id} className="p-3 border rounded-lg bg-gray-50" data-testid={`broadcast-log-${log.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate flex-1">{log.title}</span>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{log.body}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {AUDIENCE_LABELS[log.targetAudience] || log.targetAudience}
                        </Badge>
                        <span className="text-green-600">{log.sentSuccessfully} sent</span>
                        {log.failed > 0 && <span className="text-red-500">{log.failed} failed</span>}
                        <span className="text-gray-400">{log.noSubscription} no push</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Qof Gaar ah - Push Notification
            </CardTitle>
            <CardDescription>
              U dir push notification waalid gaar ah oo aad dooratay
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Users className="w-4 h-4" />
                Subscribers: {subsLoading ? "..." : subscriptions.length} | La xushay: {selectedParentIds.length}
              </div>
            </div>

            {subscriptions.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                  <h4 className="font-medium text-sm text-gray-700">Xulo Waalidka</h4>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedParentIds(subscriptions.map((s: any) => s.parentId))} className="text-xs h-7" data-testid="btn-select-all-parents">
                      Dhammaan
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedParentIds([])} className="text-xs h-7" data-testid="btn-deselect-all-parents">
                      Ka saar
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {subscriptions.map((sub: any) => (
                    <div
                      key={sub.parentId}
                      className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer transition-colors ${
                        selectedParentIds.includes(sub.parentId) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleParent(sub.parentId)}
                      data-testid={`parent-row-${sub.parentId}`}
                    >
                      <Checkbox
                        checked={selectedParentIds.includes(sub.parentId)}
                        onCheckedChange={() => toggleParent(sub.parentId)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-parent-${sub.parentId}`}
                      />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {sub.picture ? (
                          <img src={sub.picture} alt={sub.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          sub.name?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sub.name}</p>
                        <p className="text-xs text-gray-500 truncate">{sub.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="push-title">Cinwaanka</Label>
              <Input
                id="push-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tusaale: Cashar cusub ayaa diyaar ah!"
                data-testid="input-push-title"
              />
            </div>

            <div>
              <Label htmlFor="push-body">Fariinta</Label>
              <Textarea
                id="push-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tusaale: Cashar cusub oo ku saabsan cuntada caruurta ayaa la soo daray..."
                rows={3}
                data-testid="input-push-body"
              />
            </div>

            <div>
              <Label htmlFor="push-url">URL (ikhtiyaari)</Label>
              <Input
                id="push-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/courses (ama ka tag madhan)"
                data-testid="input-push-url"
              />
            </div>

            <Button
              onClick={sendSelective}
              disabled={isSending || !title.trim() || !body.trim() || selectedParentIds.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="btn-send-push"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Diraya...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  U Dir {selectedParentIds.length} Waalid
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailTestTab() {
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ type: string; success: boolean }[] | null>(null);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleSendAll = async () => {
    if (!testEmail.trim()) {
      setMessage({ text: "Fadlan geli email address", success: false });
      return;
    }
    setIsSending(true);
    setResults(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/test-all-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
        setMessage({ text: data.message, success: data.success });
      } else {
        setMessage({ text: data.error || "Email dirista way guul darreysatay", success: false });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Khalad ayaa dhacay", success: false });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Email Test - Tijaabinta Nidaamka Emailka
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Dhammaan 8-da nooc ee emailka nidaamku leeyahay ayaa la diri doonaa email-ka aad geliso.</p>
            <p>Waxaa ku jira: Welcome, Koorso Iibsi, Lacag Sugitaan, Xasuusin (3 maalmood), Xasuusin Degdeg (12 saac), Wakhti Dhamaaday, Password Reset, iyo Admin Sharaf.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="input-test-email"
            />
          </div>

          <Button
            onClick={handleSendAll}
            disabled={isSending || !testEmail.trim()}
            className="w-full sm:w-auto"
            data-testid="button-send-test-email"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                8 email diraya...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Dhammaan Emailada Dir
              </>
            )}
          </Button>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              {message.text}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b">
                Natiijooyinka Email
              </div>
              <div className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-700">{r.type}</span>
                    {r.success ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> La diray
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Guul darreysatay
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeetEventsAdmin() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [mediaType, setMediaType] = useState("video");
  const [mediaTitle, setMediaTitle] = useState("");
  const [driveFileId, setDriveFileId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meet-events"],
    queryFn: async () => {
      const res = await fetch("/api/meet-events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMeetLink("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setIsActive(true);
    setMediaType("video");
    setMediaTitle("");
    setDriveFileId("");
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setMeetLink(event.meetLink);
    setEventDate(event.eventDate);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setIsActive(event.isActive);
    setMediaType(event.mediaType || "video");
    setMediaTitle(event.mediaTitle || "");
    setDriveFileId(event.driveFileId || "");
    setShowForm(true);
  };

  const handleGenerateMeetLink = async () => {
    if (!eventDate || !startTime) {
      toast.error("Fadlan marka hore geli taariikhda iyo waqtiga bilowga");
      return;
    }
    setIsGeneratingLink(true);
    try {
      const startDateTime = `${eventDate}T${startTime}:00`;
      const durationMinutes = startTime && endTime
        ? Math.max(30, Math.round((new Date(`2000-01-01T${endTime}`).getTime() - new Date(`2000-01-01T${startTime}`).getTime()) / 60000))
        : 60;
      const res = await fetch("/api/admin/create-meet-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title,
          description: description || "",
          startDateTime,
          durationMinutes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.meetLink) {
        setMeetLink(data.meetLink);
        toast.success("Google Meet link waa la abuuray!");
      } else {
        toast.error(data.error || "Meet link abuurista way guul darreysatay");
      }
    } catch (err: any) {
      toast.error(err.message || "Khalad ayaa dhacay");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !meetLink.trim() || !eventDate || !startTime || !endTime) {
      toast.error("Fadlan buuxi dhammaan meelaha lagama maarmaanka ah");
      return;
    }
    setIsSaving(true);
    try {
      const body = { title, description: description || null, meetLink, eventDate, startTime, endTime, isActive, mediaType, mediaTitle: mediaTitle || null, driveFileId: driveFileId || null };
      const url = editingEvent ? `/api/admin/meet-events/${editingEvent.id}` : "/api/admin/meet-events";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save event");
      toast.success(editingEvent ? "Kulanka waa la cusbooneysiiyay" : "Kulanka cusub waa la abuuray");
      queryClient.invalidateQueries({ queryKey: ["/api/meet-events"] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Khalad ayaa dhacay");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ma hubtaa inaad tirtireyso kulanka?")) return;
    try {
      const res = await fetch(`/api/admin/meet-events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Kulanka waa la tiray");
      queryClient.invalidateQueries({ queryKey: ["/api/meet-events"] });
    } catch {
      toast.error("Khalad ayaa dhacay");
    }
  };

  const handleToggleActive = async (event: any) => {
    try {
      const res = await fetch(`/api/admin/meet-events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !event.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      queryClient.invalidateQueries({ queryKey: ["/api/meet-events"] });
      toast.success(event.isActive ? "Kulanka waa la damiyay" : "Kulanka waa la shaqeeyay");
    } catch {
      toast.error("Khalad ayaa dhacay");
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Kulanka Maktabada ma u wareejisaa? (Kulamadii Bahda Tarbiyadda Caruurta ee Hore)")) return;
    try {
      const res = await fetch(`/api/admin/meet-events/${id}/archive`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success("Kulanka Maktabada ayuu u wareegay");
      queryClient.invalidateQueries({ queryKey: ["/api/meet-events"] });
    } catch {
      toast.error("Khalad ayaa dhacay");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Kulannada Google Meet
            </CardTitle>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="btn-add-meet-event"
            >
              <Plus className="w-4 h-4 mr-1" /> Kulan Cusub
            </Button>
          </div>
          <CardDescription>
            Maaree kulannada toos ah ee Google Meet ee bulshada waalidka
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
              <h3 className="font-semibold text-blue-800 text-sm">
                {editingEvent ? "Wax ka Badal Kulanka" : "Kulan Cusub Abuur"}
              </h3>
              <div>
                <Label className="text-xs">Cinwaanka Kulanka</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kulanka Bahda Tarbiyadda Caruurta"
                  className="mt-1"
                  data-testid="input-meet-title"
                />
              </div>
              <div>
                <Label className="text-xs">Faahfaahin (ikhtiyaari)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sharaxaad kooban oo ku saabsan kulanka..."
                  className="mt-1"
                  rows={3}
                  data-testid="input-meet-description"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Taariikhda *</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1"
                    data-testid="input-meet-date"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bilow *</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                    data-testid="input-meet-start"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dhammaad *</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1"
                    data-testid="input-meet-end"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Google Meet Link *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="flex-1"
                    data-testid="input-meet-link"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateMeetLink}
                    disabled={isGeneratingLink}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                    data-testid="btn-generate-meet-link"
                  >
                    {isGeneratingLink ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Video className="w-4 h-4 mr-1" />}
                    Samee Link
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Riix "Samee Link" si uu Google Meet link cusub kuu abuuro, ama geli link-ka aad haysatid.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-orange-700">Ciwaanka Duubista (Media Title)</Label>
                <Input
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  placeholder="Tusaale: Casharka 5aad - Tarbiyada Caruurta"
                  className="mt-1"
                  data-testid="input-meet-media-title"
                />
                <p className="text-[10px] text-gray-500 mt-1">Ciwaanka muuqaalka ama codka ee la duubay - wuxuu ku muuqanayaa bogga hore.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nooca Media</Label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    data-testid="select-meet-media-type"
                  >
                    <option value="video">Video (Muuqaal)</option>
                    <option value="audio">Audio (Cod)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Google Drive File ID</Label>
                  <Input
                    value={driveFileId}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      const dMatch = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
                      const idMatch = val.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                      if (dMatch) val = dMatch[1];
                      else if (idMatch) val = idMatch[1];
                      setDriveFileId(val);
                    }}
                    placeholder="File ID ama Drive link"
                    className="mt-1"
                    data-testid="input-meet-drive-file-id"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Kadib kulanka, paste-garee Google Drive link-ga ama file ID-ga duubista.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm text-gray-700">Firfircoon</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-green-600 hover:bg-green-700" data-testid="btn-save-meet-event">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  {editingEvent ? "Cusboonaysii" : "Kaydi"}
                </Button>
                <Button onClick={resetForm} variant="outline" size="sm" data-testid="btn-cancel-meet-event">
                  <X className="w-4 h-4 mr-1" /> Jooji
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Wali kulan lama abuurin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const eventDateTime = new Date(`${event.eventDate}T${event.startTime}`);
                const isPast = eventDateTime < new Date();
                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-xl border ${event.isActive ? 'border-blue-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'} ${isPast ? 'opacity-70' : ''}`}
                    data-testid={`meet-event-${event.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                          {event.isActive ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Firfircoon</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px]">Damisan</Badge>
                          )}
                          {isPast && <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px]">Dhamaaday</Badge>}
                        </div>
                        {event.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{event.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.eventDate}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.startTime} - {event.endTime}</span>
                        </div>
                        <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          <ExternalLink className="w-3 h-3 inline mr-1" />{event.meetLink}
                        </a>
                        {event.driveFileId && (
                          <div className="mt-2 bg-purple-50 rounded-lg p-2 border border-purple-100">
                            <div className="flex items-center gap-1">
                              {event.mediaType === "audio" ? <Volume2 className="w-3 h-3 text-purple-600" /> : <Video className="w-3 h-3 text-blue-600" />}
                              <span className="text-[10px] font-semibold text-purple-700">
                                {event.mediaType === "audio" ? "Cod (Audio)" : "Muuqaal (Video)"} - Drive ✓
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1 truncate">ID: {event.driveFileId}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(event)}
                            className="h-8 w-8 p-0"
                            data-testid={`btn-toggle-meet-${event.id}`}
                          >
                            {event.isActive ? <EyeOff className="w-3.5 h-3.5 text-gray-500" /> : <Eye className="w-3.5 h-3.5 text-green-600" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                            className="h-8 w-8 p-0"
                            data-testid={`btn-edit-meet-${event.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                            className="h-8 w-8 p-0"
                            data-testid={`btn-delete-meet-${event.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                        {!event.isArchived && event.driveFileId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleArchive(event.id)}
                            className="text-[10px] h-7 px-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                            data-testid={`btn-archive-meet-${event.id}`}
                          >
                            <Archive className="w-3 h-3 mr-1" /> Maktabada u wareeji
                          </Button>
                        )}
                        {event.isArchived && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[9px]">Maktabada</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
