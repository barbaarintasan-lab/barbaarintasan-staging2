import { useState, useRef } from "react";
import { Star, Camera, Check, ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
}

export default function SubmitTestimonial() {
  const { parent } = useParentAuth();
  const [name, setName] = useState(parent?.name || "");
  const [location, setLocation] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/parent/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Mahadsanid! Faalladaada waa la helay.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name || !message || !selectedCourse) {
      toast.error("Fadlan buuxi dhammaan meelaha lagama maarmaanka ah");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Fadlan dooro xiddigaha (1-5)");
      return;
    }

    const courseTitle = courses.find(c => c.id === selectedCourse)?.title || null;
    submitMutation.mutate({
      name,
      location: location || null,
      courseTag: courseTitle,
      profileImage: profileImage || null,
      rating: Math.min(5, Math.max(1, rating)),
      message,
    });
  };

  if (!parent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24 px-4 py-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Fadlan Ku Gal</h1>
          <p className="text-gray-600 mb-6">Si aad u soo dirto faalladaada, fadlan ku gal akoonkaaga</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">Ku Noqo Hoyga</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-24 px-4 py-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mahadsanid!</h1>
          <p className="text-gray-600 mb-6">Faalladaada waa la helay oo hadda way muuqataa bogga Waayo-aragnimada.</p>
          <Link href="/testimonials">
            <Button className="bg-blue-600 hover:bg-blue-700">Eeg Waayo-aragnimada</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/testimonials">
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Soo Dir Faalladaada</h1>
            <p className="text-sm text-gray-500">Nala wadaag waayo-aragnimadaada</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        <div className="flex flex-col items-center">
          <div 
            className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-3xl font-bold cursor-pointer relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-profile"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0) || "?"
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            data-testid="input-profile-image"
          />
          <p className="text-sm text-gray-500 mt-2">Riix si aad u beddesho sawirka</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Magacaaga *</Label>
            <Input 
              placeholder="Tusaale: Fadumo Axmed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Magaalada iyo Dalka aad joogto</Label>
            <Input 
              placeholder="Muqdisho, Soomaaliya"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="input-location"
            />
          </div>

          <div className="space-y-2">
            <Label>Koorsada aad qaadatay *</Label>
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full h-11 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="select-course"
              >
                <option value="">Dooro koorsada...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Xiddigaha *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                  data-testid={`star-${star}`}
                >
                  <Star 
                    className={`w-8 h-8 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Faalladaada *</Label>
            <Textarea 
              placeholder="Halkan ku qor faalladaada iyo sidaad koorsada u aragto..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="input-message"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!name || !message || !selectedCourse || rating < 1 || rating > 5 || submitMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 font-bold text-lg"
            data-testid="button-submit"
          >
            {submitMutation.isPending ? "Diraya..." : "Soo Dir Faalladaada"}
          </Button>
        </div>
      </div>
    </div>
  );
}
