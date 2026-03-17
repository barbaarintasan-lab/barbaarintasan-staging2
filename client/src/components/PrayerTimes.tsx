import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, Settings, ChevronLeft, Volume2, VolumeX, Bell, BellOff, Loader2, RefreshCw, Sun, Sunrise, Moon, Compass, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calculateQiblaDirection(lat: number, lng: number): number {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
  const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

  const deltaLng = kaabaLngRad - lngRad;

  const x = Math.sin(deltaLng);
  const y = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(deltaLng);

  let qibla = (Math.atan2(x, y) * 180) / Math.PI;
  qibla = (qibla + 360) % 360;

  return qibla;
}

interface PrayerTime {
  name: string;
  time: string;
  icon: React.ReactNode;
  arabicName: string;
  isNext?: boolean;
}

interface PrayerSettings {
  id: string;
  parentId: string;
  latitude: string | null;
  longitude: string | null;
  cityName: string | null;
  countryName: string | null;
  timezone: string | null;
  calculationMethod: number;
  madhab: number;
  azanEnabled: boolean;
  notificationsEnabled: boolean;
  notificationMinutesBefore: number;
  createdAt: string;
  updatedAt: string;
}

interface AladhanResponse {
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
    };
    date: {
      readable: string;
      hijri: {
        date: string;
        month: { en: string; ar: string };
        year: string;
        day: string;
      };
    };
    meta: {
      timezone: string;
      method: { name: string };
    };
  };
}

const CALCULATION_METHODS = [
  { value: 1, label: "University of Islamic Sciences, Karachi" },
  { value: 2, label: "Islamic Society of North America (ISNA)" },
  { value: 3, label: "Muslim World League" },
  { value: 4, label: "Umm Al-Qura University, Makkah" },
  { value: 5, label: "Egyptian General Authority of Survey" },
  { value: 7, label: "Institute of Geophysics, University of Tehran" },
  { value: 8, label: "Gulf Region" },
  { value: 9, label: "Kuwait" },
  { value: 10, label: "Qatar" },
  { value: 11, label: "Majlis Ugama Islam Singapura" },
  { value: 12, label: "Union des Organisations Islamiques de France" },
  { value: 13, label: "Diyanet İşleri Başkanlığı, Turkey" },
];

const COMMON_CITIES = [
  { name: "Muqdisho", country: "Somalia", lat: "2.0469", lng: "45.3182", timezone: "Africa/Mogadishu" },
  { name: "Hargeysa", country: "Somalia", lat: "9.5600", lng: "44.0650", timezone: "Africa/Mogadishu" },
  { name: "Kismaayo", country: "Somalia", lat: "-0.3582", lng: "42.5454", timezone: "Africa/Mogadishu" },
  { name: "Baydhabo", country: "Somalia", lat: "3.1167", lng: "43.6500", timezone: "Africa/Mogadishu" },
  { name: "Garoowe", country: "Somalia", lat: "8.4054", lng: "48.4845", timezone: "Africa/Mogadishu" },
  { name: "Boosaaso", country: "Somalia", lat: "11.2844", lng: "49.1825", timezone: "Africa/Mogadishu" },
  { name: "Berbera", country: "Somalia", lat: "10.4397", lng: "45.0164", timezone: "Africa/Mogadishu" },
  { name: "Burco", country: "Somalia", lat: "9.5217", lng: "45.5336", timezone: "Africa/Mogadishu" },
  { name: "Beledweyne", country: "Somalia", lat: "4.7358", lng: "45.2036", timezone: "Africa/Mogadishu" },
  { name: "Jowhar", country: "Somalia", lat: "2.7806", lng: "45.5011", timezone: "Africa/Mogadishu" },
  { name: "Nairobi", country: "Kenya", lat: "-1.2921", lng: "36.8219", timezone: "Africa/Nairobi" },
  { name: "Mombasa", country: "Kenya", lat: "-4.0435", lng: "39.6682", timezone: "Africa/Nairobi" },
  { name: "Addis Ababa", country: "Ethiopia", lat: "9.0320", lng: "38.7469", timezone: "Africa/Addis_Ababa" },
  { name: "Dire Dawa", country: "Ethiopia", lat: "9.6000", lng: "41.8500", timezone: "Africa/Addis_Ababa" },
  { name: "Djibouti City", country: "Djibouti", lat: "11.5886", lng: "43.1456", timezone: "Africa/Djibouti" },
  { name: "Dubai", country: "UAE", lat: "25.2048", lng: "55.2708", timezone: "Asia/Dubai" },
  { name: "Makkah", country: "Saudi Arabia", lat: "21.4225", lng: "39.8262", timezone: "Asia/Riyadh" },
  { name: "Madinah", country: "Saudi Arabia", lat: "24.4672", lng: "39.6024", timezone: "Asia/Riyadh" },
  { name: "Cairo", country: "Egypt", lat: "30.0444", lng: "31.2357", timezone: "Africa/Cairo" },
  { name: "London", country: "UK", lat: "51.5074", lng: "-0.1278", timezone: "Europe/London" },
  { name: "Minneapolis", country: "USA", lat: "44.9778", lng: "-93.2650", timezone: "America/Chicago" },
  { name: "Columbus", country: "USA", lat: "39.9612", lng: "-82.9988", timezone: "America/New_York" },
  { name: "Toronto", country: "Canada", lat: "43.6532", lng: "-79.3832", timezone: "America/Toronto" },
  { name: "Stockholm", country: "Sweden", lat: "59.3293", lng: "18.0686", timezone: "Europe/Stockholm" },
  { name: "Oslo", country: "Norway", lat: "59.9139", lng: "10.7522", timezone: "Europe/Oslo" },
];

interface PrayerTimesProps {
  onBack: () => void;
}

export default function PrayerTimes({ onBack }: PrayerTimesProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showCityList, setShowCityList] = useState(false);
  const [showQibla, setShowQibla] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState<number | null>(null);
  const [compassPermission, setCompassPermission] = useState<"granted" | "denied" | "pending">("pending");

  const filteredCities = COMMON_CITIES.filter(city => 
    city.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    city.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectCity = async (city: typeof COMMON_CITIES[0]) => {
    setIsLoadingLocation(true);
    try {
      await updateSettingsMutation.mutateAsync({
        latitude: city.lat,
        longitude: city.lng,
        cityName: city.name,
        countryName: city.country,
        timezone: city.timezone,
      });
      setLocationError(null);
      setCitySearch("");
      setShowCityList(false);
    } catch (error) {
      console.error("Error saving city:", error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const { data: settings } = useQuery<PrayerSettings | null>({
    queryKey: ["/api/parent/prayer-settings"],
  });

  const [localSettings, setLocalSettings] = useState({
    calculationMethod: 4,
    madhab: 1,
    azanEnabled: true,
    notificationsEnabled: true,
    notificationMinutesBefore: 5,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        calculationMethod: settings.calculationMethod,
        madhab: settings.madhab,
        azanEnabled: settings.azanEnabled,
        notificationsEnabled: settings.notificationsEnabled,
        notificationMinutesBefore: settings.notificationMinutesBefore,
      });
    }
  }, [settings]);

  const { data: prayerData, isLoading: isLoadingPrayer, refetch: refetchPrayer } = useQuery<AladhanResponse>({
    queryKey: ["/api/prayer-times", settings?.latitude, settings?.longitude, settings?.calculationMethod, settings?.madhab],
    queryFn: async () => {
      if (!settings?.latitude || !settings?.longitude) {
        throw new Error("Location not set");
      }
      const response = await fetch(
        `/api/prayer-times?latitude=${settings.latitude}&longitude=${settings.longitude}&method=${settings.calculationMethod}&school=${settings.madhab}`
      );
      if (!response.ok) throw new Error("Failed to fetch prayer times");
      return response.json();
    },
    enabled: !!settings?.latitude && !!settings?.longitude,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<PrayerSettings>) => {
      return apiRequest("PUT", "/api/parent/prayer-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/prayer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-times"] });
    },
  });

  const requestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 600000,
        });
      });

      const { latitude, longitude } = position.coords;
      console.log("Got coordinates:", latitude, longitude);

      let cityName = "Your Location";
      let countryName = "";

      try {
        const geoResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          cityName = geoData.city || geoData.locality || geoData.principalSubdivision || "Your Location";
          countryName = geoData.countryName || "";
        }
      } catch (geoError) {
        console.log("Geocoding failed, using coordinates only:", geoError);
      }

      await updateSettingsMutation.mutateAsync({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        cityName,
        countryName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error: any) {
      console.error("Location error:", error);
      if (error.code === 1) {
        setLocationError(i18n.language === "so" 
          ? "Fadlan ogolow isticmaalka goobta si aad u hesho wakhtiyada salaadda"
          : "Please allow location access to get prayer times");
      } else if (error.code === 2) {
        setLocationError(i18n.language === "so"
          ? "Goobta lama heli karo. Fadlan isku day mar kale"
          : "Location unavailable. Please try again");
      } else if (error.code === 3) {
        setLocationError(i18n.language === "so"
          ? "Waqtiga goobta wuu dhamaaday. Fadlan isku day mar kale"
          : "Location request timed out. Please try again");
      } else {
        setLocationError(i18n.language === "so"
          ? "Khalad dhacay. Fadlan isku day mar kale"
          : "Error occurred. Please try again");
      }
    } finally {
      setIsLoadingLocation(false);
    }
  }, [updateSettingsMutation, i18n.language]);

  // Don't auto-request location - let user choose city first
  // GPS often fails on mobile browsers, so showing city selector is more reliable

  const qiblaDirection = settings?.latitude && settings?.longitude
    ? calculateQiblaDirection(parseFloat(settings.latitude), parseFloat(settings.longitude))
    : null;

  const requestCompassPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          setCompassPermission("granted");
        } else {
          setCompassPermission("denied");
        }
      } catch (error) {
        console.error("Compass permission error:", error);
        setCompassPermission("denied");
      }
    } else {
      setCompassPermission("granted");
    }
  }, []);

  useEffect(() => {
    if (!showQibla || compassPermission !== "granted") return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        let heading = event.alpha;
        if ((event as any).webkitCompassHeading !== undefined) {
          heading = (event as any).webkitCompassHeading;
        }
        setDeviceOrientation(heading);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [showQibla, compassPermission]);

  const handleShowQibla = () => {
    if (compassPermission === "pending") {
      requestCompassPermission();
    }
    setShowQibla(true);
  };

  const getPrayerTimes = (): PrayerTime[] => {
    if (!prayerData?.data?.timings) return [];

    const timings = prayerData.data.timings;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers: PrayerTime[] = [
      { 
        name: i18n.language === "so" ? "Fajr" : "Fajr", 
        time: timings.Fajr, 
        icon: <Moon className="w-5 h-5" />, 
        arabicName: "الفجر" 
      },
      { 
        name: i18n.language === "so" ? "Qorraxda" : "Sunrise", 
        time: timings.Sunrise, 
        icon: <Sunrise className="w-5 h-5" />, 
        arabicName: "الشروق" 
      },
      { 
        name: i18n.language === "so" ? "Duhr" : "Dhuhr", 
        time: timings.Dhuhr, 
        icon: <Sun className="w-5 h-5" />, 
        arabicName: "الظهر" 
      },
      { 
        name: i18n.language === "so" ? "Casr" : "Asr", 
        time: timings.Asr, 
        icon: <Sun className="w-5 h-5 text-orange-500" />, 
        arabicName: "العصر" 
      },
      { 
        name: i18n.language === "so" ? "Magrib" : "Maghrib", 
        time: timings.Maghrib, 
        icon: <Sunrise className="w-5 h-5 rotate-180" />, 
        arabicName: "المغرب" 
      },
      { 
        name: i18n.language === "so" ? "Cishaa" : "Isha", 
        time: timings.Isha, 
        icon: <Moon className="w-5 h-5" />, 
        arabicName: "العشاء" 
      },
    ];

    let foundNext = false;
    return prayers.map((prayer) => {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      if (!foundNext && prayerMinutes > currentMinutes) {
        foundNext = true;
        return { ...prayer, isNext: true };
      }
      return prayer;
    });
  };

  const formatHijriDate = () => {
    if (!prayerData?.data?.date?.hijri) return "";
    const h = prayerData.data.date.hijri;
    return `${h.day} ${h.month.ar} ${h.year}`;
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
    setShowSettings(false);
  };

  const prayerTimes = getPrayerTimes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-800 to-purple-800 safe-top shadow-lg transition-all duration-300">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-back-from-prayer"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="font-bold text-white text-lg">
                  {i18n.language === "so" ? "Jadwalka Salaadda" : "Prayer Times"}
                </h1>
                <p className="text-indigo-200 text-sm">
                  {settings?.cityName && settings?.countryName 
                    ? `${settings.cityName}, ${settings.countryName}`
                    : (i18n.language === "so" ? "Goobta lama helin" : "Location not set")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchPrayer()}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-refresh-prayer"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isLoadingPrayer ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                data-testid="button-prayer-settings"
              >
                <Settings className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {prayerData?.data?.date && (
          <div className="text-center mb-6">
            <p className="text-indigo-300 text-sm">{prayerData.data.date.readable}</p>
            <p className="text-white text-xl font-arabic mt-1" dir="rtl">{formatHijriDate()}</p>
          </div>
        )}

        {!settings?.latitude && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 text-center">
              {i18n.language === "so" ? "Dooro Magaalaada" : "Select Your City"}
            </h3>
            
            <input
              type="text"
              placeholder={i18n.language === "so" ? "Raadi magaalada..." : "Search city..."}
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 mb-3"
              data-testid="input-city-search"
            />

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredCities.slice(0, 10).map((city) => (
                <button
                  key={`${city.name}-${city.country}`}
                  onClick={() => selectCity(city)}
                  className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-left transition-colors"
                  data-testid={`button-city-${city.name.toLowerCase()}`}
                  disabled={isLoadingLocation}
                >
                  <span className="text-white font-medium">{city.name}</span>
                  <span className="text-slate-400 text-sm ml-2">{city.country}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-xs text-center mb-2">
                {i18n.language === "so" ? "Ama isticmaal goobta tooska ah" : "Or use automatic location"}
              </p>
              <Button
                onClick={requestLocation}
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {i18n.language === "so" ? "Hel Goobta Tooska" : "Get Automatic Location"}
              </Button>
            </div>

            {locationError && (
              <p className="text-red-300 text-xs text-center mt-2">{locationError}</p>
            )}
          </div>
        )}

        {isLoadingPrayer && !prayerData && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        )}

        {prayerTimes.length > 0 && (
          <div className="space-y-3">
            {prayerTimes.map((prayer, index) => (
              <div
                key={prayer.name}
                className={`rounded-xl p-4 flex items-center justify-between transition-all ${
                  prayer.isNext
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30"
                    : "bg-white/10 backdrop-blur-sm"
                }`}
                data-testid={`prayer-time-${prayer.name.toLowerCase()}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    prayer.isNext ? "bg-white/20" : "bg-white/10"
                  }`}>
                    {prayer.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{prayer.name}</h3>
                    <p className="text-indigo-200 text-sm font-arabic" dir="rtl">{prayer.arabicName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-2xl ${prayer.isNext ? "text-white" : "text-indigo-100"}`}>
                    {prayer.time}
                  </p>
                  {prayer.isNext && (
                    <p className="text-emerald-200 text-xs">
                      {i18n.language === "so" ? "Xiga" : "Next"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {settings?.latitude && qiblaDirection !== null && (
          <button
            onClick={handleShowQibla}
            className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform"
            data-testid="button-qibla-finder"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white text-lg">
                  {i18n.language === "so" ? "Qiblada" : "Qibla Finder"}
                </h3>
                <p className="text-amber-200 text-sm">
                  {i18n.language === "so" ? "Jihada Makka" : "Direction to Mecca"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-xl">{Math.round(qiblaDirection)}°</p>
            </div>
          </button>
        )}

        {settings?.latitude && (
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {localSettings.notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-emerald-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-white">
                  {i18n.language === "so" ? "Xasuusinta Wakhtiga Salaadda" : "Prayer Notifications"}
                </span>
              </div>
              <Switch
                checked={localSettings.notificationsEnabled}
                onCheckedChange={(checked) => {
                  setLocalSettings(prev => ({ ...prev, notificationsEnabled: checked }));
                  updateSettingsMutation.mutate({ notificationsEnabled: checked });
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {i18n.language === "so" ? "Dejinta Salaadda" : "Prayer Settings"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                {i18n.language === "so" ? "Magaalada" : "City"}
              </label>
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
                <p className="text-white font-medium">
                  {settings?.cityName || (i18n.language === "so" ? "Lama dooranin" : "Not selected")}
                  {settings?.countryName && <span className="text-slate-400 ml-2">{settings.countryName}</span>}
                </p>
              </div>
              <button
                onClick={() => setShowCityList(!showCityList)}
                className="text-emerald-400 text-sm hover:underline"
              >
                {i18n.language === "so" ? "Bedel Magaalada" : "Change City"}
              </button>

              {showCityList && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder={i18n.language === "so" ? "Raadi magaalada..." : "Search city..."}
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredCities.slice(0, 8).map((city) => (
                      <button
                        key={`settings-${city.name}-${city.country}`}
                        onClick={() => {
                          selectCity(city);
                          setShowCityList(false);
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                        disabled={isLoadingLocation}
                      >
                        <span className="text-white">{city.name}</span>
                        <span className="text-slate-400 ml-2">{city.country}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                {i18n.language === "so" ? "Habka Xisaabinta" : "Calculation Method"}
              </label>
              <Select
                value={localSettings.calculationMethod.toString()}
                onValueChange={(value) => setLocalSettings(prev => ({ ...prev, calculationMethod: parseInt(value) }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {CALCULATION_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value.toString()} className="text-white">
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                {i18n.language === "so" ? "Madhhab (Casr)" : "Juristic Method (Asr)"}
              </label>
              <Select
                value={localSettings.madhab.toString()}
                onValueChange={(value) => setLocalSettings(prev => ({ ...prev, madhab: parseInt(value) }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="1" className="text-white">Shafi'i, Maliki, Hanbali</SelectItem>
                  <SelectItem value="2" className="text-white">Hanafi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                {i18n.language === "so" ? "Daqiiqado ka hor salaadda" : "Minutes before prayer"}
              </label>
              <Select
                value={localSettings.notificationMinutesBefore.toString()}
                onValueChange={(value) => setLocalSettings(prev => ({ ...prev, notificationMinutesBefore: parseInt(value) }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="5" className="text-white">5 {i18n.language === "so" ? "daqiiqo" : "minutes"}</SelectItem>
                  <SelectItem value="10" className="text-white">10 {i18n.language === "so" ? "daqiiqo" : "minutes"}</SelectItem>
                  <SelectItem value="15" className="text-white">15 {i18n.language === "so" ? "daqiiqo" : "minutes"}</SelectItem>
                  <SelectItem value="30" className="text-white">30 {i18n.language === "so" ? "daqiiqo" : "minutes"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                onClick={requestLocation}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300"
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {i18n.language === "so" ? "GPS" : "GPS"}
              </Button>
              <Button
                onClick={handleSaveSettings}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {i18n.language === "so" ? "Kaydi" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQibla} onOpenChange={setShowQibla}>
        <DialogContent className="bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl">
              {i18n.language === "so" ? "Qiblada" : "Qibla Direction"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            <div className="relative w-64 h-64">
              <div 
                className="absolute inset-0 rounded-full border-4 border-amber-500/30"
                style={{
                  background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)"
                }}
              />
              
              <div 
                className="absolute inset-2 rounded-full border-2 border-slate-600 transition-transform duration-300"
                style={{
                  transform: `rotate(${deviceOrientation !== null ? -deviceOrientation : 0}deg)`
                }}
              >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-amber-400 font-bold text-sm">N</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-400 font-bold text-sm">S</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">W</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">E</div>
                
                <div 
                  className="absolute w-full h-full"
                  style={{
                    transform: `rotate(${qiblaDirection}deg)`
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
                    <span className="text-2xl drop-shadow-lg" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))" }}>🕋</span>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <Navigation 
                  className="w-16 h-16 text-amber-500 drop-shadow-lg" 
                  style={{ filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.5))" }}
                />
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3 h-3 bg-amber-500 rounded-full shadow-lg" />
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-3xl font-bold text-amber-400">
                {qiblaDirection !== null ? `${Math.round(qiblaDirection)}°` : "--"}
              </p>
              <p className="text-slate-400 mt-1">
                {i18n.language === "so" ? "Jihada Makka" : "Direction to Mecca"}
              </p>
            </div>

            {deviceOrientation !== null && (
              <p className="text-emerald-400 text-sm mt-4">
                {i18n.language === "so" ? "Compass-ka wuu shaqeynayaa" : "Compass active"}
              </p>
            )}

            {compassPermission === "denied" && (
              <p className="text-amber-300 text-sm mt-4 text-center">
                {i18n.language === "so" 
                  ? "Rog taleefankaaga jihada fallaarku tusayso" 
                  : "Rotate your phone to point the arrow towards Qibla"}
              </p>
            )}

            {deviceOrientation === null && compassPermission === "granted" && (
              <p className="text-slate-400 text-sm mt-4 text-center">
                {i18n.language === "so" 
                  ? "Rog taleefankaaga si compass-ka u shaqeeyo" 
                  : "Rotate your device to activate compass"}
              </p>
            )}

            <div className="mt-6 bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-white font-medium">{settings?.cityName}</p>
              <p className="text-slate-400 text-sm">{settings?.countryName}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
