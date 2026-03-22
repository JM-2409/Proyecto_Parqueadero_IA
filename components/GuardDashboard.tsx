"use client";
import { toast } from 'sonner';

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Car,
  Bike,
  Motorbike,
  Clock,
  LogOut,
  CheckCircle,
  Search,
  DollarSign,
  Zap,
  History,
  Share2,
  Image as ImageIcon,
  UserCircle,
  Shield,
  Edit2,
  Plus,
  X,
  Printer,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import UpdatesModal from "./UpdatesModal";
import { format, differenceInMinutes, subDays } from "date-fns";
import { es } from "date-fns/locale";

export default function GuardDashboard({
  user,
  onLogout,
  parkingLotId,
  onSwitchView,
  currentView,
  isDarkMode,
  toggleDarkMode,
}: {
  user: any;
  onLogout: () => void;
  parkingLotId: string | null;
  onSwitchView?: (view: "admin" | "guard") => void;
  currentView?: "admin" | "guard";
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [mobileView, setMobileView] = useState<"entry" | "list">("entry");
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [guardPermissions, setGuardPermissions] = useState({
    show_history: false,
    history_days: 1,
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [entryFields, setEntryFields] = useState<any[]>([]);
  const [capacitySettings, setCapacitySettings] = useState<any>({
    enforce: false,
  });
  const [revenueSettings, setRevenueSettings] = useState<any>({
    show_to_guards: true,
    last_closing: null,
  });
  const [specialVehicles, setSpecialVehicles] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [privateSpots, setPrivateSpots] = useState<any[]>([]);
  const [privateSpotFields, setPrivateSpotFields] = useState<any[]>([
    { id: "spotNumber", label: "Espacio", required: true, enabled: true },
    { id: "ownerName", label: "Propietario", required: true, enabled: true },
    { id: "licensePlate", label: "Placa", required: true, enabled: true },
    { id: "vehicleType", label: "Tipo", required: true, enabled: true },
    { id: "notes", label: "Notas", required: false, enabled: true },
  ]);
  const [showPrivateSpots, setShowPrivateSpots] = useState(false);
  const [privateSpotsSearch, setPrivateSpotsSearch] = useState("");
  const [privateSpotsSort, setPrivateSpotsSort] = useState("spotNumber");
  const [editingSpot, setEditingSpot] = useState<any | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [globalAppName, setGlobalAppName] = useState("NexoPark");
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<"car" | "motorcycle" | "bicycle">("car");
  const [loading, setLoading] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);
  const [completedSession, setCompletedSession] = useState<any | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+57");
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [autoCompleted, setAutoCompleted] = useState(false);

  const plateInputRef = useRef<HTMLInputElement>(null);

  // Guard Name / Shift Management
  const [guardName, setGuardName] = useState("");
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [tempGuardName, setTempGuardName] = useState("");
  const [showUpdates, setShowUpdates] = useState(false);

  // Novelties State
  const [noveltyModalVehicle, setNoveltyModalVehicle] = useState<any | null>(
    null,
  );
  const [novelties, setNovelties] = useState<any[]>([]);
  const [newNoveltyObservation, setNewNoveltyObservation] = useState("");
  const [newNoveltyPhoto, setNewNoveltyPhoto] = useState<File | null>(null);
  const [noveltyLoading, setNoveltyLoading] = useState(false);

  // Entry Novelty State
  const [hasEntryNovelty, setHasEntryNovelty] = useState(false);
  const [entryNoveltyObservation, setEntryNoveltyObservation] = useState("");
  const [entryNoveltyPhoto, setEntryNoveltyPhoto] = useState<File | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedGuardName = localStorage.getItem("current_guard_name");
    if (storedGuardName) {
      setGuardName(storedGuardName);
    } else {
      setShowGuardModal(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "k") || e.key === "F2") {
        e.preventDefault();
        setMobileView("entry");
        plateInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const allowCars = capacitySettings?.allow_cars !== false;
    const allowMotorcycles = capacitySettings?.allow_motorcycles !== false;
    const allowBicycles = capacitySettings?.allow_bicycles === true;

    if (type === "car" && !allowCars) {
      setType(
        allowMotorcycles ? "motorcycle" : allowBicycles ? "bicycle" : "car",
      );
    } else if (type === "motorcycle" && !allowMotorcycles) {
      setType(allowCars ? "car" : allowBicycles ? "bicycle" : "car");
    } else if (type === "bicycle" && !allowBicycles) {
      setType(allowCars ? "car" : allowMotorcycles ? "motorcycle" : "car");
    }
  }, [capacitySettings, type]);

  useEffect(() => {
    fetchActiveSessions();
    fetchActiveRates();
    fetchSettings();
    fetchGlobalSettings();
    fetchResidents();

    // Refresh times every minute without re-fetching data
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Realtime subscriptions for auto-updating settings and rates
    const channel = supabase
      .channel("guard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
          filter: `parking_lot_id=eq.${parkingLotId}`,
        },
        () => {
          fetchSettings();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rates",
          filter: `parking_lot_id=eq.${parkingLotId}`,
        },
        () => {
          fetchActiveRates();
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkingLotId]);

  useEffect(() => {
    if (revenueSettings) {
      fetchTotalRevenue(revenueSettings.last_closing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueSettings, parkingLotId]);

  const fetchGlobalSettings = async () => {
    // Fetch individual parking lot settings
    const { data: lotData } = await supabase
      .from("parking_lots")
      .select("name, nit, address, phone, email, logo_url")
      .eq("id", parkingLotId)
      .single();
    if (lotData) {
      setGlobalSettings(lotData);
    }

    // Fetch global app settings
    const { data: globalData } = await supabase
      .from("global_app_settings")
      .select("*")
      .limit(1)
      .single();

    if (globalData) {
      setGlobalAppName(globalData.app_name);
      setGlobalLogoUrl(globalData.logo_url);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .eq("parking_lot_id", parkingLotId);

    if (data) {
      const entryFieldsData = data.find((d) => d.key === "entry_fields");
      if (entryFieldsData) setEntryFields(entryFieldsData.value);

      const capacityData = data.find((d) => d.key === "capacity_settings");
      if (capacityData) setCapacitySettings(capacityData.value);

      const revenueData = data.find((d) => d.key === "revenue_settings");
      if (revenueData) setRevenueSettings(revenueData.value);

      const specialData = data.find((d) => d.key === "special_vehicles");
      if (specialData) setSpecialVehicles(specialData.value);

      const privateSpotsData = data.find((d) => d.key === "private_spots");
      if (privateSpotsData) setPrivateSpots(privateSpotsData.value);

      const privateSpotFieldsData = data.find(
        (d) => d.key === "private_spot_fields",
      );
      if (privateSpotFieldsData)
        setPrivateSpotFields(privateSpotFieldsData.value);

      const permissionsData = data.find((d) => d.key === "guard_permissions");
      if (permissionsData) setGuardPermissions(permissionsData.value);
    }
  };

  const savePrivateSpots = async (updatedSpots: any[]) => {
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "private_spots",
          value: updatedSpots,
          parking_lot_id: parkingLotId,
        },
        { onConflict: "key,parking_lot_id" },
      );
    if (error) {
      toast.error("Error al guardar parqueaderos privados: " + error.message);
    } else {
      setPrivateSpots(updatedSpots);
      setEditingSpot(null);
    }
  };

  const fetchTotalRevenue = async (lastClosing: string | null) => {
    let query = supabase
      .from("parking_sessions")
      .select("amount_paid")
      .eq("status", "completed")
      .eq("parking_lot_id", parkingLotId);

    if (lastClosing) {
      query = query.gte("exit_time", lastClosing);
    }

    const { data } = await query;
    if (data) {
      const total = data.reduce(
        (sum, session) => sum + (session.amount_paid || 0),
        0,
      );
      setTotalRevenue(total);
    }
  };

  const fetchActiveSessions = async () => {
    const { data } = await supabase
      .from("parking_sessions")
      .select("*")
      .eq("status", "active")
      .eq("parking_lot_id", parkingLotId)
      .order("entry_time", { ascending: false });
    if (data) setSessions(data);
  };

  const fetchHistorySessions = useCallback(async () => {
    if (!guardPermissions.show_history) return;

    const cutoffDate = subDays(
      new Date(),
      guardPermissions.history_days,
    ).toISOString();

    const { data, error } = await supabase
      .from("parking_sessions")
      .select("*, rate:rates(name)")
      .eq("parking_lot_id", parkingLotId)
      .eq("status", "completed")
      .gte("exit_time", cutoffDate)
      .order("exit_time", { ascending: false });

    if (!error && data) {
      setHistorySessions(data);
    }
  }, [guardPermissions, parkingLotId]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistorySessions();
    }
  }, [activeTab, guardPermissions, fetchHistorySessions]);

  const fetchActiveRates = async () => {
    const { data } = await supabase
      .from("rates")
      .select("*")
      .eq("is_active", true)
      .eq("parking_lot_id", parkingLotId)
      .order("name");
    if (data) setRates(data);
  };

  const fetchResidents = async () => {
    const { data, error } = await supabase
      .from("residents")
      .select("*")
      .eq("parking_lot_id", parkingLotId);
    if (!error && data) {
      setResidents(data);
    }
  };

  const validatePlate = (plate: string, vehicleType: string) => {
    if (vehicleType === "car") {
      return /^[A-Z]{3}[0-9]{3}$/.test(plate);
    } else if (vehicleType === "motorcycle") {
      return /^[A-Z]{3}[0-9]{2}[A-Z]$/.test(plate);
    }
    return plate.length >= 3; // Basic validation for bicycles or others
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setPlate(val);
    setAutoCompleted(false);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length >= 5) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Buscamos la sesión más reciente para esta placa en este parqueadero
          const { data, error } = await supabase
            .from("parking_sessions")
            .select("vehicle_type, metadata")
            .eq("parking_lot_id", parkingLotId)
            .eq("license_plate", val)
            .order("entry_time", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(
              "Error fetching previous session for autocomplete:",
              error,
            );
            return;
          }

          if (data) {
            setType(data.vehicle_type);

            // If it's a resident, we might want to prioritize their resident data or at least mark it
            const resident = residents.find(r => r.license_plate === val);

            if (data.metadata && typeof data.metadata === "object") {
              const filteredMetadata = { ...data.metadata };
              // Limpiamos campos internos que no queremos autocompletar
              const internalFields = [
                "guard_name",
                "checkout_guard_name",
                "admin_checkout_observation",
                "admin_checkout_by",
                "admin_checkout_time",
              ];
              internalFields.forEach((field) => delete filteredMetadata[field]);

              if (resident) {
                filteredMetadata.resident_info = `${resident.tower} - ${resident.apartment}`;
                filteredMetadata.owner_name = resident.owner_name;
              }

              setFieldValues(filteredMetadata);
            }
            setAutoCompleted(true);
          } else {
            // Check if it's a resident even if no previous session
            const resident = residents.find(r => r.license_plate === val);
            if (resident) {
              setFieldValues({
                resident_info: `${resident.tower} - ${resident.apartment}`,
                owner_name: resident.owner_name,
              });
              setAutoCompleted(true);
            }
          }
        } catch (err) {
          console.error("Unexpected error during autocomplete:", err);
        }
      }, 400); // debounce 400ms
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return;
    setLoading(true);

    const formattedPlate = plate.trim().toUpperCase();

    // Check capacity limits
    if (capacitySettings?.enforce) {
      const isAllowed = capacitySettings[`allow_${type}s`];
      if (!isAllowed) {
        toast.error(
          `El ingreso de ${type === "car" ? "carros" : type === "motorcycle" ? "motos" : "bicicletas"} no está permitido.`,
        );
        setLoading(false);
        return;
      }

      const capacity = capacitySettings[`capacity_${type}s`];
      if (capacity > 0) {
        // Count active sessions for this type
        const { count } = await supabase
          .from("parking_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("vehicle_type", type)
          .eq("parking_lot_id", parkingLotId);

        if (count !== null && count >= capacity) {
          toast.error(
            `Capacidad máxima alcanzada para ${type === "car" ? "carros" : type === "motorcycle" ? "motos" : "bicicletas"}. No se puede ingresar.`,
          );
          setLoading(false);
          return;
        }
      }
    }

    // Check if already active
    const { data: existing } = await supabase
      .from("parking_sessions")
      .select("id")
      .eq("license_plate", formattedPlate)
      .eq("status", "active")
      .eq("parking_lot_id", parkingLotId)
      .single();

    if (existing) {
      toast.error("Este vehículo ya se encuentra en el parqueadero.");
      setLoading(false);
      return;
    }

    const resident = residents.find(r => r.license_plate === formattedPlate);

    const sessionMetadata = {
      ...fieldValues,
      guard_name: guardName,
    };

    const { data: newSession, error } = await supabase
      .from("parking_sessions")
      .insert({
        license_plate: formattedPlate,
        vehicle_type: type,
        guard_id: user.id,
        metadata: sessionMetadata,
        parking_lot_id: parkingLotId,
        is_resident: !!resident,
      })
      .select()
      .single();

    if (!error && newSession) {
      // Configurar sesión para renderizado del recibo (invisible)
      const sessionForReceipt = {
        ...newSession,
        entry_time: new Date().toISOString(),
        rate: { name: "Ingreso Registrado" },
        amount_paid: 0,
      };
      setCompletedSession(sessionForReceipt);

      // Auto-print receipt on entry
      setTimeout(() => {
        handlePrintReceipt();
        // Limpiar después de imprimir para no dejar el modal abierto
        setTimeout(() => setCompletedSession(null), 2000);
      }, 500);

      if (hasEntryNovelty && entryNoveltyObservation.trim()) {
        let photoUrl = null;
        if (entryNoveltyPhoto) {
          let photoToUpload: Blob | File = entryNoveltyPhoto;
          if (entryNoveltyPhoto.size > 1024 * 1024) {
            try {
              photoToUpload = await compressImage(entryNoveltyPhoto);
            } catch (err) {
              console.error("Compression failed", err);
            }
          }

          const fileExt = "jpg";
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${parkingLotId}/${newSession.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("novelties")
            .upload(filePath, photoToUpload, { contentType: "image/jpeg" });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("novelties")
              .getPublicUrl(filePath);
            photoUrl = publicUrlData.publicUrl;
          }
        }

        await supabase.from("vehicle_novelties").insert({
          parking_lot_id: parkingLotId,
          license_plate: formattedPlate,
          vehicle_type: "visitor",
          observation: entryNoveltyObservation,
          photo_url: photoUrl,
          guard_name: guardName,
        });
      }

      setPlate("");
      setFieldValues({});
      setAutoCompleted(false);
      setHasEntryNovelty(false);
      setEntryNoveltyObservation("");
      setEntryNoveltyPhoto(null);
      setMobileView("list");
      fetchActiveSessions();
    } else {
      if (error?.code === "23505") {
        toast.error(
          "Este vehículo ya se encuentra en el parqueadero (sesión activa).",
        );
      } else {
        toast.error(
          `Error al registrar ingreso: ${error?.message || "Error desconocido"}`,
        );
      }
    }
    setLoading(false);
  };

  const calculateCostWithRate = (
    session: any,
    rateRule: any,
    exitTime: Date = new Date(),
  ) => {
    if (!rateRule) return 0;
    const entryTime = new Date(session.entry_time);
    const mins = Math.max(1, differenceInMinutes(exitTime, entryTime));
    const hours = Math.ceil(mins / 60);
    const days = Math.ceil(mins / (60 * 24));

    switch (rateRule.type) {
      case "minute":
        return mins * rateRule.rate;
      case "hour":
        return hours * rateRule.rate;
      case "hour_minute":
        if (mins <= 60) return rateRule.base_rate;
        return rateRule.base_rate + (mins - 60) * rateRule.rate;
      case "hour_fraction":
        if (mins <= 60) return rateRule.base_rate;
        const extraMins = mins - 60;
        const fractions = Math.ceil(
          extraMins / (rateRule.fraction_minutes || 60),
        );
        return rateRule.base_rate + fractions * rateRule.rate;
      case "day_night": {
        const gracePeriodMins = rateRule.fraction_minutes || 15;
        const msGrace = gracePeriodMins * 60 * 1000;
        let totalCost = 0;

        // Find the start of the shift containing entryTime
        let currentShiftStart = new Date(entryTime);
        if (
          currentShiftStart.getHours() >= 6 &&
          currentShiftStart.getHours() < 18
        ) {
          currentShiftStart.setHours(6, 0, 0, 0);
        } else {
          if (currentShiftStart.getHours() < 6) {
            currentShiftStart.setDate(currentShiftStart.getDate() - 1);
          }
          currentShiftStart.setHours(18, 0, 0, 0);
        }

        let safety = 0;
        while (currentShiftStart < exitTime && safety < 1000) {
          safety++;
          let isDayShift = currentShiftStart.getHours() === 6;
          let currentShiftEnd = new Date(currentShiftStart);
          currentShiftEnd.setHours(currentShiftStart.getHours() + 12);

          let shiftRate = isDayShift ? rateRule.base_rate : rateRule.rate;
          let chargeShift = true;

          // Entered very close to the end of this shift
          if (entryTime >= new Date(currentShiftEnd.getTime() - msGrace)) {
            chargeShift = false;
          }

          // Exited very close to the start of this shift
          if (exitTime <= new Date(currentShiftStart.getTime() + msGrace)) {
            chargeShift = false;
          }

          if (chargeShift) {
            totalCost += shiftRate;
          }

          currentShiftStart = currentShiftEnd;
        }

        // Ensure at least one charge if totalCost is 0, but they stayed more than grace period
        if (totalCost === 0) {
          const isDay = entryTime.getHours() >= 6 && entryTime.getHours() < 18;
          totalCost = isDay ? rateRule.base_rate : rateRule.rate;
        }

        return totalCost;
      }
      case "day":
      case "night":
      case "daily":
        return days * rateRule.rate;
      case "flat":
        return rateRule.rate;
      default:
        return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckoutClick = (session: any) => {
    setCheckoutSession(session);
    setConfirmAmount(false);

    const resident = residents.find(
      (r) => r.license_plate === session.license_plate,
    );
    if (resident) {
      setSelectedRateId("resident");
      return;
    }

    const specialVehicle = specialVehicles.find(
      (v) => v.plate === session.license_plate,
    );
    if (specialVehicle) {
      setSelectedRateId("special");
      return;
    }

    // Find applicable rates
    const applicableRates = rates.filter(
      (r) =>
        r.vehicle_type === "all" || r.vehicle_type === session.vehicle_type,
    );
    if (applicableRates.length > 0) {
      // Default to day_night, then hour_fraction, then minute, or first available
      const defaultRate =
        applicableRates.find((r) => r.type === "day_night") ||
        applicableRates.find((r) => r.type === "hour_fraction") ||
        applicableRates.find((r) => r.type === "minute") ||
        applicableRates[0];
      setSelectedRateId(defaultRate.id);
    } else {
      setSelectedRateId("");
    }
  };

  const handleCheckout = async () => {
    if (!checkoutSession || !selectedRateId) return;

    if (!confirmAmount) {
      setConfirmAmount(true);
      return;
    }

    setLoading(true);

    let cost = 0;
    if (selectedRateId === "resident") {
      cost = 0;
    } else if (selectedRateId === "special") {
      const specialVehicle = specialVehicles.find(
        (v) => v.plate === checkoutSession.license_plate,
      );
      cost = specialVehicle
        ? specialVehicle.paid_to_admin
          ? 0
          : specialVehicle.amount
        : 0;
    } else {
      const selectedRate = rates.find((r) => r.id === selectedRateId);
      cost = calculateCostWithRate(checkoutSession, selectedRate);
    }

    const updatedMetadata = {
      ...(checkoutSession.metadata || {}),
      checkout_guard_name: guardName,
    };

    const { error } = await supabase
      .from("parking_sessions")
      .update({
        status: "completed",
        exit_time: new Date().toISOString(),
        amount_paid: cost,
        rate_id: selectedRateId === "special" ? null : selectedRateId,
        rate_name:
          selectedRateId === "resident"
            ? "Residente (Exento)"
            : selectedRateId === "special"
              ? "Tarifa Especial"
              : rates.find((r) => r.id === selectedRateId)?.name ||
                "Desconocida",
        metadata: updatedMetadata,
      })
      .eq("id", checkoutSession.id);

    if (!error) {
      setCheckoutSession(null);
      const sessionForReceipt = {
        ...checkoutSession,
        exit_time: new Date().toISOString(),
        amount_paid: cost,
        rate:
          selectedRateId === "resident"
            ? { name: "Residente (Exento)" }
            : selectedRateId === "special"
              ? { name: "Tarifa Especial" }
              : rates.find((r) => r.id === selectedRateId),
      };
      setCompletedSession(sessionForReceipt);

      // Auto-print on checkout
      setTimeout(() => {
        handlePrintReceipt();
        // Limpiar después de imprimir para no dejar el modal abierto
        setTimeout(() => setCompletedSession(null), 2000);
      }, 500);

      fetchActiveSessions();
      if (revenueSettings?.show_to_guards) {
        fetchTotalRevenue(revenueSettings.last_closing);
      }
    } else {
      toast.error("Error al registrar salida.");
    }
    setLoading(false);
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleWhatsAppShare = async () => {
    if (!completedSession || !whatsappNumber) return;

    setIsSharing(true);
    try {
      const entryTime = format(
        new Date(completedSession.entry_time),
        "dd/MM/yy h:mm a",
      );
      const exitTime = format(
        new Date(completedSession.exit_time),
        "dd/MM/yy h:mm a",
      );
      const totalMinutes = Math.max(
        1,
        differenceInMinutes(
          new Date(completedSession.exit_time),
          new Date(completedSession.entry_time),
        ),
      );

      let message =
        `*RECIBO DE PARQUEADERO* 🚗\n\n` +
        `*Parqueadero:* ${globalSettings.app_name || "Parqueadero"}\n` +
        `*Recibo No:* ${completedSession.ticket_number}\n` +
        `*Placa:* ${completedSession.license_plate}\n` +
        `*Ingreso:* ${entryTime}\n` +
        `*Salida:* ${exitTime}\n` +
        `*Tiempo Total:* ${totalMinutes} minutos\n` +

        `*Total Pagado:* ${formatCurrency(completedSession.amount_paid)}\n\n` +
        `¡Gracias por su visita!`;

      const encodedMessage = encodeURIComponent(message);
      window.open(
        `https://wa.me/${whatsappCountryCode.replace("+", "")}${whatsappNumber}?text=${encodedMessage}`,
        "_blank",
      );
    } catch (error) {
      console.error("Error al compartir", error);
      toast.error("Hubo un error al preparar el mensaje.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveGuardName = () => {
    if (!tempGuardName.trim()) {
      toast.error("Por favor, ingresa tu nombre.");
      return;
    }
    setGuardName(tempGuardName);
    localStorage.setItem("current_guard_name", tempGuardName);
    setShowGuardModal(false);
  };

  const handleLockScreen = () => {
    setGuardName("");
    setTempGuardName("");
    localStorage.removeItem("current_guard_name");
    setShowGuardModal(true);
  };

  const handleOpenNovelties = async (
    vehicle: any,
    type: "visitor" | "special",
  ) => {
    setNoveltyModalVehicle({ ...vehicle, type });
    setNoveltyLoading(true);

    const { data, error } = await supabase
      .from("vehicle_novelties")
      .select("*")
      .eq("parking_lot_id", parkingLotId)
      .eq("license_plate", vehicle.plate || vehicle.license_plate)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNovelties(data);
    }
    setNoveltyLoading(false);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Canvas to Blob conversion failed"));
              }
            },
            "image/jpeg",
            0.8,
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveNovelty = async () => {
    if (!newNoveltyObservation.trim()) {
      toast.error("Por favor, ingresa una observación.");
      return;
    }

    setNoveltyLoading(true);
    let photoUrl = null;

    if (newNoveltyPhoto) {
      let photoToUpload: Blob | File = newNoveltyPhoto;
      if (newNoveltyPhoto.size > 1024 * 1024) {
        try {
          photoToUpload = await compressImage(newNoveltyPhoto);
        } catch (err) {
          console.error("Compression failed", err);
        }
      }

      const fileExt = "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${parkingLotId}/${noveltyModalVehicle.plate || noveltyModalVehicle.license_plate}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("novelties")
        .upload(filePath, photoToUpload, { contentType: "image/jpeg" });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("novelties")
          .getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    const { data: newNovelty, error } = await supabase
      .from("vehicle_novelties")
      .insert({
        parking_lot_id: parkingLotId,
        license_plate:
          noveltyModalVehicle.plate || noveltyModalVehicle.license_plate,
        vehicle_type: noveltyModalVehicle.type,
        observation: newNoveltyObservation,
        photo_url: photoUrl,
        guard_name: guardName,
      })
      .select()
      .single();

    if (!error && newNovelty) {
      setNovelties([newNovelty, ...novelties]);
      setNewNoveltyObservation("");
      setNewNoveltyPhoto(null);
      toast.success("Novedad registrada exitosamente.");
    } else {
      toast.error("Error al registrar la novedad.");
    }
    setNoveltyLoading(false);
  };

  const handlePrintReceipt = () => {
    const receiptElement = document.getElementById("receipt-content");
    if (!receiptElement) return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((el) => el.outerHTML)
      .join("\n");

    iframeDoc.write(
      "<html><head><title>Recibo</title>" +
        styles +
        "<style>@page { size: auto; margin: 0mm; } body { margin: 0; padding: 20px; background: white; } #receipt-content { transform: none !important; margin: 0 auto; box-shadow: none !important; border: none !important; width: 100% !important; max-width: 300px !important; }</style></head><body>" +
        receiptElement.outerHTML +
        "</body></html>",
    );
    iframeDoc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const applicableRates = checkoutSession
    ? rates.filter(
        (r) =>
          r.vehicle_type === "all" ||
          r.vehicle_type === checkoutSession.vehicle_type,
      )
    : [];

  let currentCost = 0;
  if (checkoutSession) {
    if (selectedRateId === "resident") {
      currentCost = 0;
    } else if (selectedRateId === "special") {
      const specialVehicle = specialVehicles.find(
        (v) => v.plate === checkoutSession.license_plate,
      );
      currentCost = specialVehicle
        ? specialVehicle.paid_to_admin
          ? 0
          : specialVehicle.amount
        : 0;
    } else {
      const selectedRateObj = rates.find((r) => r.id === selectedRateId);
      currentCost = selectedRateObj
        ? calculateCostWithRate(checkoutSession, selectedRateObj)
        : 0;
    }
  }

  const filteredSessions = sessions.filter((s) =>
    s.license_plate.includes(searchQuery.toUpperCase()),
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-20 transition-colors duration-300">
      {/* Header Rediseñado - Glassmorphism */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-8 gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-xl relative overflow-hidden transition-all duration-300 p-4 sm:p-5 rounded-[2.5rem]">
        {/* Lado Izquierdo: Branding */}
        <div className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-accent to-brand-primary rounded-full blur opacity-20 group-hover:opacity-35 transition duration-300"></div>
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-md shrink-0 aspect-square bg-white">
              <img
                src={globalLogoUrl || "/logo.png"}
                alt="Logo"
                className="w-full h-full object-cover transform transition duration-500 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-brand-primary dark:text-white truncate leading-none mb-1 uppercase">
              {globalSettings.name || globalAppName}
            </h1>
            <div className="flex items-center gap-1.5 text-brand-primary/70 dark:text-white/70">
              <Shield className="w-3.5 h-3.5 text-brand-accent" />
              <p className="text-xs sm:text-sm font-semibold truncate uppercase tracking-wider opacity-80">
                Punto de Control
              </p>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Acciones y Usuario */}
        <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4">
          {/* Centro de Acciones Rápidas */}
          <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
            {onSwitchView && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-1 flex border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <button
                  onClick={() => onSwitchView("admin")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === "admin" ? "bg-brand-primary text-white shadow-md" : "text-slate-500 dark:text-slate-400 hover:text-brand-primary"}`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onSwitchView("guard")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === "guard" ? "bg-brand-primary text-white shadow-md" : "text-slate-500 dark:text-slate-400 hover:text-brand-primary"}`}
                >
                  Vigilancia
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPrivateSpots(true)}
              className="px-4 py-2 rounded-xl flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-accent/10 dark:hover:bg-brand-accent/20 hover:text-brand-accent border border-slate-200 dark:border-slate-700 transition-all font-bold text-xs shadow-sm shrink-0"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Privados</span>
            </button>
            {revenueSettings?.show_to_guards && (
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-md shrink-0">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
            )}
          </div>

          {/* Perfil de Usuario y Logout */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={toggleDarkMode}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-brand-primary dark:text-white transition-all shadow-sm"
              title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1 sm:flex-none flex items-center gap-3 bg-white dark:bg-slate-800 pl-4 pr-2 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group">
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-black text-brand-primary/50 dark:text-white/50 uppercase tracking-tighter leading-none mb-0.5">
                  Operador en turno
                </span>
                <span className="text-sm font-bold text-brand-primary dark:text-white truncate max-w-[120px]">
                  {guardName || "Sin Asignar"}
                </span>
              </div>
              <button
                onClick={handleLockScreen}
                className="p-2 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-white transition-all shadow-sm border border-brand-primary/10"
                title="Cambiar Turno / Bloquear"
              >
                <UserCircle className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowUpdates(true)}
              className="p-3.5 rounded-2xl bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white transition-all duration-300 border border-brand-accent/20 shadow-sm group relative"
              title="Novedades"
            >
              <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
            </button>

            <button
              onClick={onLogout}
              className="p-3.5 rounded-2xl bg-brand-primary hover:bg-red-600 text-white transition-all duration-300 shadow-lg hover:shadow-red-200 group relative"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <UpdatesModal
        isOpen={showUpdates}
        onClose={() => setShowUpdates(false)}
        userRole="guard"
      />

      {/* Mobile View Toggle */}
      <div className="lg:hidden mb-8 bg-white dark:bg-slate-900 rounded-2xl p-1.5 flex border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setMobileView("entry")}
          className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2 ${mobileView === "entry" ? "bg-brand-primary text-white shadow-md transform scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          <Plus className="w-4 h-4" />
          Registrar Ingreso
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2 ${mobileView === "list" ? "bg-brand-primary text-white shadow-md transform scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          <Car className="w-4 h-4" />
          Vehículos Activos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {/* Formulario de Ingreso */}
        <div
          className={`lg:col-span-4 ${mobileView === "entry" ? "block" : "hidden lg:block"}`}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sticky top-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Registrar Ingreso
              </h2>
              {autoCompleted && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Zap className="w-3 h-3" /> Autocompletado
                </span>
              )}
            </div>

            <form onSubmit={handleEntry} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Placa del Vehículo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    ref={plateInputRef}
                    type="text"
                    required
                    maxLength={6}
                    value={plate}
                    onChange={handlePlateChange}
                    className={`block w-full pl-10 pr-3 py-4 border rounded-xl outline-none transition-all font-mono text-2xl tracking-widest uppercase text-center lg:text-left ${
                      plate.length >= 5
                        ? validatePlate(plate, type)
                          ? "border-brand-accent bg-brand-accent/5 focus:ring-brand-accent"
                          : "border-rose-500 bg-rose-50 dark:bg-rose-900/10 focus:ring-rose-500"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-brand-primary"
                    } focus:ring-2`}
                    placeholder="ABC123"
                  />
                </div>
                {plate.length >= 5 && !validatePlate(plate, type) && (
                  <p className="text-rose-500 text-[10px] mt-1 font-bold uppercase tracking-wider">
                    Formato inválido para {type === "car" ? "carro" : "moto"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Vehículo
                </label>
                <div
                  className={`grid gap-3 ${
                    [
                      capacitySettings?.allow_cars !== false,
                      capacitySettings?.allow_motorcycles !== false,
                      capacitySettings?.allow_bicycles === true,
                    ].filter(Boolean).length === 3
                      ? "grid-cols-3"
                      : [
                            capacitySettings?.allow_cars !== false,
                            capacitySettings?.allow_motorcycles !== false,
                            capacitySettings?.allow_bicycles === true,
                          ].filter(Boolean).length === 2
                        ? "grid-cols-2"
                        : "grid-cols-1"
                  }`}
                >
                  {capacitySettings?.allow_cars !== false && (
                    <button
                      type="button"
                      onClick={() => setType("car")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === "car" ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:text-brand-accent dark:border-brand-accent" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                    >
                      <Car className="w-6 h-6" />
                      <span className="font-medium text-sm">Carro</span>
                      {capacitySettings?.enforce &&
                        capacitySettings?.capacity_cars > 0 && (
                          <span className="text-xs font-medium opacity-75">
                            {capacitySettings.capacity_cars -
                              sessions.filter((s) => s.vehicle_type === "car")
                                .length}{" "}
                            disp.
                          </span>
                        )}
                    </button>
                  )}
                  {capacitySettings?.allow_motorcycles !== false && (
                    <button
                      type="button"
                      onClick={() => setType("motorcycle")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === "motorcycle" ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:text-brand-accent dark:border-brand-accent" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                    >
                      <Motorbike className="w-6 h-6" />
                      <span className="font-medium text-sm">Moto</span>
                      {capacitySettings?.enforce &&
                        capacitySettings?.capacity_motorcycles > 0 && (
                          <span className="text-xs font-medium opacity-75">
                            {capacitySettings.capacity_motorcycles -
                              sessions.filter(
                                (s) => s.vehicle_type === "motorcycle",
                              ).length}{" "}
                            disp.
                          </span>
                        )}
                    </button>
                  )}
                  {capacitySettings?.allow_bicycles === true && (
                    <button
                      type="button"
                      onClick={() => setType("bicycle")}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === "bicycle" ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:text-brand-accent dark:border-brand-accent" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                    >
                      <Bike className="w-6 h-6" />
                      <span className="font-medium text-sm">Bicicleta</span>
                      {capacitySettings?.enforce &&
                        capacitySettings?.capacity_bicycles > 0 && (
                          <span className="text-xs font-medium opacity-75">
                            {capacitySettings.capacity_bicycles -
                              sessions.filter(
                                (s) => s.vehicle_type === "bicycle",
                              ).length}{" "}
                            disp.
                          </span>
                        )}
                    </button>
                  )}
                </div>
              </div>

              {entryFields
                .filter(
                  (f) => f.enabled && f.label.trim().toLowerCase() !== "placa",
                )
                .map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {field.label}{" "}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required={field.required}
                      value={fieldValues[field.id] || ""}
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          [field.id]: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 dark:text-white"
                      placeholder={`Ingrese ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}

              <div className="lg:static sticky bottom-0 -mx-6 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 lg:border-0 lg:bg-transparent lg:p-0 lg:m-0 z-20 mt-4">
                <button
                  type="submit"
                  disabled={loading || plate.length < 3 || (type !== "bicycle" && !validatePlate(plate, type))}
                  className="w-full py-4 px-4 rounded-xl bg-brand-accent text-white font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-brand-accent/20 cursor-pointer text-sm"
                >
                  {loading ? "Registrando..." : "Dar Ingreso"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Lista de Vehículos Activos e Historial */}
        <div
          className={`lg:col-span-8 ${mobileView === "list" ? "block" : "hidden lg:block"}`}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-brand-bg/30 dark:bg-slate-800/50 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`px-4 py-2 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${activeTab === "active" ? "bg-brand-primary text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                  >
                    Vehículos Activos
                  </button>
                  {guardPermissions.show_history && (
                    <button
                      onClick={() => setActiveTab("history")}
                      className={`px-4 py-2 rounded-xl font-bold transition-all text-sm uppercase tracking-wider flex items-center gap-2 ${activeTab === "history" ? "bg-brand-primary text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                    >
                      <History className="w-4 h-4" />
                      Historial (Minuta)
                    </button>
                  )}
                </div>
                {activeTab === "active" && (
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por placa..."
                      className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-white dark:bg-slate-800 dark:text-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] lg:max-h-[600px] dark:bg-slate-900">
              {activeTab === "active" ? (
                filteredSessions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>
                      {searchQuery
                        ? "No se encontraron vehículos con esa placa."
                        : "No hay vehículos en el parqueadero en este momento."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSessions.map((session) => {
                      const mins = Math.max(
                        1,
                        differenceInMinutes(
                          currentTime,
                          new Date(session.entry_time),
                        ),
                      );
                      return (
                        <div
                          key={session.id}
                          className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-3 rounded-xl ${session.vehicle_type === "car" ? "bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-accent" : session.vehicle_type === "motorcycle" ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"}`}
                            >
                              {session.vehicle_type === "car" ? (
                                <Car className="w-6 h-6" />
                              ) : session.vehicle_type === "motorcycle" ? (
                                <Motorbike className="w-6 h-6" />
                              ) : (
                                <Bike className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white font-mono tracking-wider">
                                  {session.license_plate}
                                </h3>
                                {session.ticket_number && (
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-xs font-medium">
                                    #{session.ticket_number}
                                  </span>
                                )}
                                {residents.some(
                                  (r) =>
                                    r.license_plate === session.license_plate,
                                ) && (
                                  <span className="bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse border border-brand-accent/20">
                                    Residente
                                  </span>
                                )}
                              </div>
                              {session.metadata &&
                                Object.keys(session.metadata).length > 0 && (
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 mb-1">
                                    {Object.entries(session.metadata)
                                      .filter(
                                        ([k]) =>
                                          k !== "guard_name" &&
                                          k !== "checkout_guard_name" &&
                                          k !== "admin_checkout_observation" &&
                                          k !== "admin_checkout_by" &&
                                          k !== "admin_checkout_time",
                                      )
                                      .sort(([keyA], [keyB]) => {
                                        const labelA =
                                          entryFields
                                            .find((f) => f.id === keyA)
                                            ?.label?.toLowerCase() || "";
                                        const labelB =
                                          entryFields
                                            .find((f) => f.id === keyB)
                                            ?.label?.toLowerCase() || "";
                                        if (labelA.includes("nombre"))
                                          return -1;
                                        if (labelB.includes("nombre")) return 1;
                                        return 0;
                                      })
                                      .map(([key, value]) => {
                                        const fieldDef = entryFields.find(
                                          (f) => f.id === key || f.label === key,
                                        );
                                        let displayLabel = fieldDef
                                          ? fieldDef.label
                                          : key;

                                        if (!fieldDef && key.startsWith("campo_")) {
                                          displayLabel = "Dato";
                                        }

                                        const isNameField = displayLabel
                                          .toLowerCase()
                                          .includes("nombre");

                                        return (
                                          <span
                                            key={key}
                                            className={`${isNameField ? "bg-brand-accent/10 text-brand-accent" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"} px-2 py-0.5 rounded-md font-medium`}
                                          >
                                            {isNameField
                                              ? String(value)
                                              : `${displayLabel}: ${value}`}
                                          </span>
                                        );
                                      })}
                                  </div>
                                )}
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {format(
                                    new Date(session.entry_time),
                                    "dd/MM/yy h:mm a",
                                  )}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="font-bold text-brand-primary dark:text-brand-accent">
                                  {mins} min
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCheckoutClick(session)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-primary dark:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-md"
                          >
                            Dar Salida
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-medium">Recibo</th>
                        <th className="px-4 py-3 font-medium">Placa</th>
                        <th className="px-4 py-3 font-medium">Tipo</th>
                        <th className="px-4 py-3 font-medium">Ingreso</th>
                        <th className="px-4 py-3 font-medium">Salida</th>
                        <th className="px-4 py-3 font-medium">Tiempo</th>
                        <th className="px-4 py-3 font-medium">Tarifa</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historySessions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No hay registros en el historial para el período
                            seleccionado.
                          </td>
                        </tr>
                      ) : (
                        historySessions.map((session) => {
                          const mins = Math.max(
                            1,
                            differenceInMinutes(
                              new Date(session.exit_time),
                              new Date(session.entry_time),
                            ),
                          );
                          return (
                            <tr
                              key={session.id}
                              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                            >
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                                {session.ticket_number}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-white">
                                {session.license_plate}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                {session.vehicle_type === "car"
                                  ? "Carro"
                                  : session.vehicle_type === "motorcycle"
                                    ? "Moto"
                                    : "Bicicleta"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {format(
                                  new Date(session.entry_time),
                                  "dd/MM/yy h:mm a",
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {format(
                                  new Date(session.exit_time),
                                  "dd/MM/yy h:mm a",
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {mins} min
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {session.rate_name ||
                                  session.rate?.name ||
                                  "Tarifa Especial"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                {formatCurrency(session.amount_paid || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Parqueaderos Privados */}
      {showPrivateSpots && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-white/20 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-brand-primary dark:text-white flex items-center gap-2">
                <Car className="w-6 h-6 text-brand-accent" />
                Parqueaderos Privados
              </h2>
              <button
                onClick={() => setShowPrivateSpots(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={privateSpotsSearch}
                    onChange={(e) => setPrivateSpotsSearch(e.target.value)}
                    placeholder="Buscar por placa, propietario o espacio..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={privateSpotsSort}
                    onChange={(e) => setPrivateSpotsSort(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none bg-white dark:bg-slate-800 dark:text-white"
                  >
                    {privateSpotFields
                      .filter((f) => f.enabled)
                      .map((field) => (
                        <option key={field.id} value={field.id}>
                          Por {field.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {privateSpots.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No hay parqueaderos privados asignados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {privateSpots
                    .filter((spot) =>
                      privateSpotFields
                        .filter((f) => f.enabled)
                        .some((field) =>
                          (spot[field.id] || "")
                            .toLowerCase()
                            .includes(privateSpotsSearch.toLowerCase()),
                        ),
                    )
                    .sort((a, b) => {
                      const valA = a[privateSpotsSort] || "";
                      const valB = b[privateSpotsSort] || "";
                      return valA.localeCompare(valB, undefined, {
                        numeric: true,
                      });
                    })
                    .map((spot) => {
                      const activeSession = sessions.find(
                        (s) => s.license_plate === spot.licensePlate,
                      );
                      return (
                        <div
                          key={spot.id}
                          className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 relative overflow-hidden group bg-white dark:bg-slate-800"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-accent/5 dark:bg-brand-accent/10 rounded-bl-full -z-10"></div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-2xl font-bold text-brand-primary dark:text-brand-accent">
                              {spot.spotNumber || "N/A"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingSpot(spot)}
                                  className="p-1.5 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 dark:hover:bg-brand-accent/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${activeSession ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}
                              >
                                {activeSession ? "Ocupado" : "Libre"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {privateSpotFields
                              .filter((f) => f.enabled && f.id !== "spotNumber")
                              .map((field) => (
                                <p
                                  key={field.id}
                                  className="text-sm text-slate-600 dark:text-slate-400"
                                >
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {field.label}:
                                  </span>{" "}
                                  <span
                                    className={
                                      field.id === "licensePlate"
                                        ? "font-mono"
                                        : ""
                                    }
                                  >
                                    {field.id === "vehicleType"
                                      ? spot[field.id] === "car"
                                        ? "Carro"
                                        : spot[field.id] === "motorcycle"
                                          ? "Moto"
                                          : spot[field.id] === "bicycle"
                                            ? "Bicicleta"
                                            : spot[field.id]
                                      : spot[field.id]}
                                  </span>
                                </p>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Parqueadero Privado */}
      {editingSpot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                Editar Parqueadero
              </h2>
              <button
                onClick={() => setEditingSpot(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedSpot: any = { ...editingSpot };
                privateSpotFields.forEach((field) => {
                  if (field.enabled) {
                    updatedSpot[field.id] =
                      formData.get(field.id)?.toString() || "";
                    if (field.id === "licensePlate") {
                      updatedSpot[field.id] =
                        updatedSpot[field.id].toUpperCase();
                    }
                  }
                });
                savePrivateSpots(
                  privateSpots.map((s) =>
                    s.id === editingSpot.id ? updatedSpot : s,
                  ),
                );
                setEditingSpot(null);
              }}
              className="p-6 space-y-4"
            >
              {privateSpotFields
                .filter((f) => f.enabled)
                .map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label}
                    </label>
                    {field.id === "vehicleType" ? (
                      <select
                        name={field.id}
                        defaultValue={editingSpot[field.id]}
                        required={field.required}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none bg-white"
                      >
                        <option value="car">Carro</option>
                        <option value="motorcycle">Moto</option>
                        <option value="bicycle">Bicicleta</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        name={field.id}
                        defaultValue={editingSpot[field.id]}
                        required={field.required}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none ${field.id === "licensePlate" ? "uppercase" : ""}`}
                      />
                    )}
                  </div>
                ))}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSpot(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recibo (Completed Session) */}
      {completedSession && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden"
          onClick={() => {
            setCompletedSession(null);
            setWhatsappNumber("");
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full my-auto animate-in fade-in zoom-in duration-300 relative border border-white/20 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 right-0 flex justify-end p-4 z-20 pointer-events-none">
              <button
                onClick={() => {
                  setCompletedSession(null);
                  setWhatsappNumber("");
                }}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-all shadow-sm border border-white dark:border-slate-700 pointer-events-auto"
                title="Cerrar Recibo"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 pb-8 text-center -mt-6">
              <div className="w-20 h-20 rounded-3xl bg-brand-accent/10 dark:bg-brand-accent/20 flex items-center justify-center mx-auto mb-4 border border-brand-accent/20 shadow-inner">
                <CheckCircle className="w-10 h-10 text-brand-accent" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                Pago Registrado
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-mono font-bold text-lg bg-slate-50 dark:bg-slate-800 inline-block px-4 py-1 rounded-xl border border-slate-100 dark:border-slate-700">
                {completedSession.license_plate}
              </p>

              <div
                className="bg-white p-6 mb-8 text-left border border-slate-200 shadow-xl relative mx-auto w-full max-w-[320px] font-mono text-[11px] text-slate-800 rounded-lg transform scale-95"
                id="receipt-content"
                style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '10px 10px' }}
              >
                {/* Header */}
                <div className="text-center mb-4 border-b border-slate-200 pb-4">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={globalLogoUrl || "/logo.png"}
                      alt="Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                  <h3 className="font-bold text-lg">
                    {globalSettings.name || globalAppName}
                  </h3>
                  {globalSettings.nit && (
                    <p className="text-sm text-slate-500">
                      NIT: {globalSettings.nit}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    Recibo de Parqueo
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 border-b border-slate-200 pb-4 text-sm">
                  <div className="flex justify-between">
                    <span>No. Recibo:</span>
                    <span className="font-bold">
                      {completedSession.ticket_number}
                    </span>
                  </div>
                  {completedSession.metadata &&
                    Object.keys(completedSession.metadata).length > 0 && (
                      <div className="space-y-1">
                        {Object.entries(completedSession.metadata)
                          .filter(
                            ([k]) =>
                              k !== "guard_name" &&
                              k !== "checkout_guard_name" &&
                              k !== "admin_checkout_observation" &&
                              k !== "admin_checkout_by" &&
                              k !== "admin_checkout_time",
                          )
                          .map(([key, value]) => {
                            const fieldDef = entryFields.find(
                              (f) => f.id === key || f.label === key,
                            );
                            let displayLabel = fieldDef ? fieldDef.label : key;
                            if (!fieldDef && key.startsWith("campo_")) {
                              displayLabel = "Dato";
                            }
                            return (
                              <div key={key} className="flex justify-between">
                                <span>{displayLabel}:</span>
                                <span className="font-bold text-right truncate max-w-[150px]">
                                  {String(value)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  <div className="flex justify-between">
                    <span>Placa:</span>
                    <span className="font-bold text-lg">
                      {completedSession.license_plate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ingreso:</span>
                    <span className="text-right">
                      {format(
                        new Date(completedSession.entry_time),
                        "dd/MM/yyyy HH:mm",
                        { locale: es },
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salida:</span>
                    <span className="text-right">
                      {format(
                        new Date(completedSession.exit_time),
                        "dd/MM/yyyy HH:mm",
                        { locale: es },
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiempo:</span>
                    <span>
                      {Math.floor(
                        differenceInMinutes(
                          new Date(completedSession.exit_time),
                          new Date(completedSession.entry_time),
                        ) / 60,
                      )}
                      h{" "}
                      {differenceInMinutes(
                        new Date(completedSession.exit_time),
                        new Date(completedSession.entry_time),
                      ) % 60}
                      m
                    </span>
                  </div>
                  
                </div>

                {/* Total */}
                <div className="text-center mb-4">
                  <p className="text-sm mb-1">VALOR A PAGAR</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(completedSession.amount_paid)}
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center text-xs space-y-1">
                  <p>¡Gracias por su visita!</p>
                  <p>Conserve este recibo</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1 text-left">
                    Enviar por WhatsApp
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={whatsappCountryCode}
                      onChange={(e) => setWhatsappCountryCode(e.target.value)}
                      className="w-14 sm:w-16 px-1 sm:px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center shrink-0 bg-white dark:bg-slate-800 dark:text-white"
                      placeholder="+57"
                    />
                    <input
                      type="tel"
                      placeholder="Número"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="flex-1 min-w-0 px-2 sm:px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      onClick={handleWhatsAppShare}
                      disabled={!whatsappNumber || isSharing}
                      className="px-3 sm:px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0 whitespace-nowrap"
                    >
                      {isSharing ? "..." : "Enviar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 px-2">
                <button
                  onClick={handlePrintReceipt}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-brand-primary text-white hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg group"
                >
                  <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Imprimir Recibo
                </button>
                <button
                  onClick={() => {
                    setCompletedSession(null);
                    setWhatsappNumber("");
                  }}
                  className="w-full py-4 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-300 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  Finalizar Operación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {checkoutSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 relative border border-white/20 dark:border-slate-800">
            <button
              onClick={() => {
                setCheckoutSession(null);
                setConfirmAmount(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 text-center overflow-y-auto">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAmount ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-brand-accent/10"}`}
              >
                {confirmAmount ? (
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-brand-accent" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                {confirmAmount ? "Confirmar Pago" : "Confirmar Salida"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-mono text-lg">
                {checkoutSession.license_plate}
              </p>

              {!confirmAmount ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6 text-left space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Ingreso:</span>
                    <span className="font-medium text-slate-800 dark:text-white">
                      {format(
                        new Date(checkoutSession.entry_time),
                        "dd/MM/yy h:mm a",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Salida:</span>
                    <span className="font-medium text-slate-800 dark:text-white">
                      {format(new Date(), "dd/MM/yy h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tiempo Transcurrido:</span>
                    <span className="font-medium text-slate-800 dark:text-white">
                      {Math.max(
                        1,
                        differenceInMinutes(
                          new Date(),
                          new Date(checkoutSession.entry_time),
                        ),
                      )}{" "}
                      minutos
                    </span>
                  </div>

                  {selectedRateId === "resident" && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-black text-brand-accent bg-brand-accent/5 px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-brand-accent/20">
                        Vehículo Residente
                      </span>
                    </div>
                  )}

                  {selectedRateId === "special" && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-brand-primary dark:text-brand-accent bg-brand-bg/50 px-2 py-0.5 rounded text-xs uppercase tracking-widest">
                        Tarifa Especial
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-semibold text-slate-800 dark:text-white uppercase tracking-tighter text-sm">
                      Total a Pagar:
                    </span>
                    <span className="text-3xl font-black text-brand-primary dark:text-brand-accent">
                      {formatCurrency(currentCost)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 mb-6">
                  <p className="text-emerald-800 dark:text-emerald-400 mb-2">
                    ¿Confirma que ha recibido el pago exacto de:
                  </p>
                  <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(currentCost)}?
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    confirmAmount
                      ? setConfirmAmount(false)
                      : setCheckoutSession(null)
                  }
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {confirmAmount ? "Atrás" : "Cancelar"}
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading || !selectedRateId}
                  className={`flex-1 py-4 px-4 rounded-xl text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-50 transition-all shadow-lg ${confirmAmount ? "bg-brand-accent hover:brightness-110" : "bg-brand-primary hover:brightness-110"}`}
                >
                  {loading
                    ? "..."
                    : confirmAmount
                      ? "Confirmar Salida"
                      : "Cobrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guard Name Modal (Lock Screen) */}
      {showGuardModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-brand-accent/10">
                <Shield className="w-8 h-8 text-brand-accent" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Turno de Guarda
              </h2>
              <p className="text-slate-500 mb-6 text-sm">
                Por favor, ingresa tu nombre para registrar las operaciones a tu
                cargo.
              </p>

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre del Guarda
                  </label>
                  <input
                    type="text"
                    value={tempGuardName}
                    onChange={(e) => setTempGuardName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSaveGuardName()
                    }
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="Ej. Juan Pérez"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleSaveGuardName}
                  disabled={!tempGuardName.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-brand-accent text-white font-black uppercase tracking-widest text-[10px] hover:brightness-110 disabled:opacity-50 transition-all shadow-md"
                >
                  Iniciar Turno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
