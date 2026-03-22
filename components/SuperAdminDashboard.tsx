"use client";
import { toast } from 'sonner';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Users,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Loader2,
  Search,
  Power,
  PowerOff,
  Settings,
  X,
  Car,
  UserCircle,
  Zap,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import UpdatesModal from "./UpdatesModal";

export default function SuperAdminDashboard({
  user,
  onLogout,
  isDarkMode,
  toggleDarkMode,
}: {
  user: any;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "parking_lots" | "users" | "settings"
  >("parking_lots");
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Global Settings Form
  const [globalAppName, setGlobalAppName] = useState("NexoPark");
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string | null>(null);
  const [newGlobalLogoFile, setNewGlobalLogoFile] = useState<File | null>(null);
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);

  // Parking Lot Form
  const [showLotForm, setShowLotForm] = useState(false);
  const [editingLot, setEditingLot] = useState<any>(null);
  const [lotName, setLotName] = useState("");
  const [lotNit, setLotNit] = useState("");
  const [lotAddress, setLotAddress] = useState("");
  const [lotPhone, setLotPhone] = useState("");
  const [lotEmail, setLotEmail] = useState("");
  const [lotSubscriptionPlan, setLotSubscriptionPlan] = useState("trial");
  const [lotSubscriptionEndDate, setLotSubscriptionEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [formLoading, setFormLoading] = useState(false);

  // User Form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "guard">("admin");
  const [userLotId, setUserLotId] = useState("");

  // Delete Modals
  const [deletingLot, setDeletingLot] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [showUpdates, setShowUpdates] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch global settings
    const { data: globalData } = await supabase
      .from("global_app_settings")
      .select("*")
      .limit(1)
      .single();
    if (globalData) {
      setGlobalAppName(globalData.app_name);
      setGlobalLogoUrl(globalData.logo_url);
    }

    // Fetch parking lots
    const { data: lotsData } = await supabase
      .from("parking_lots")
      .select("*")
      .order("created_at", { ascending: false });
    if (lotsData) setParkingLots(lotsData);

    // Fetch users (only admins and guards)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("*, parking_lots(name)")
      .neq("role", "superadmin");

    if (rolesData) {
      // We need to fetch the actual emails for these users via our API
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      try {
        const res = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const authUsers = await res.json();

          const combinedUsers = rolesData.map((role) => {
            const authUser = authUsers.find((u: any) => u.id === role.user_id);
            return {
              ...role,
              email: authUser?.email || "Usuario Desconocido",
              parking_lot_name: role.parking_lots?.name || "Sin asignar",
            };
          });
          setUsers(combinedUsers);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }

    setLoading(false);
  };

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const lotData = {
      name: lotName,
      nit: lotNit,
      address: lotAddress,
      phone: lotPhone,
      email: lotEmail,
      subscription_plan: lotSubscriptionPlan,
      subscription_end_date: lotSubscriptionEndDate
        ? new Date(lotSubscriptionEndDate).toISOString()
        : null,
    };

    try {
      if (editingLot) {
        const { error } = await supabase
          .from("parking_lots")
          .update(lotData)
          .eq("id", editingLot.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parking_lots").insert(lotData);
        if (error) throw error;
      }

      setShowLotForm(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al guardar el parqueadero: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleLotStatus = async (lot: any) => {
    const newStatus = lot.status === "active" ? "suspended" : "active";
    await supabase
      .from("parking_lots")
      .update({ status: newStatus })
      .eq("id", lot.id);
    fetchData();
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const email = cleanUsername.includes("@")
        ? cleanUsername
        : `${cleanUsername}@parqueadero.local`;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      let res;
      if (editingUser) {
        res = await fetch(`/api/users/${editingUser.user_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password: password || undefined,
            role: userRole,
            parking_lot_id: userLotId,
          }),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: email,
            password,
            role: userRole,
            parking_lot_id: userLotId,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      setShowUserForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el usuario");
    } finally {
      setFormLoading(false);
    }
  };

  const executeDeleteLot = async () => {
    if (!deletingLot) return;
    setFormLoading(true);
    try {
      // First, we need to delete all users associated with this lot via API
      const usersInLot = users.filter(
        (u) => u.parking_lot_id === deletingLot.id,
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      for (const u of usersInLot) {
        await fetch(`/api/users/${u.user_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Then delete the lot (cascade will handle rates, sessions, settings, user_roles)
      const { error } = await supabase
        .from("parking_lots")
        .delete()
        .eq("id", deletingLot.id);
      if (error) throw error;

      setDeletingLot(null);
      fetchData();
    } catch (err: any) {
      toast.error("Error al eliminar parqueadero: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setSavingGlobalSettings(true);
    try {
      let finalLogoUrl = globalLogoUrl;

      if (newGlobalLogoFile) {
        const fileExt = newGlobalLogoFile.name.split(".").pop();
        const fileName = `global_logo_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("logos")
          .upload(fileName, newGlobalLogoFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(fileName);

        finalLogoUrl = publicUrl;
      }

      // Check if row exists
      const { data: existing } = await supabase
        .from("global_app_settings")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("global_app_settings")
          .update({
            app_name: globalAppName,
            logo_url: finalLogoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("global_app_settings").insert({
          app_name: globalAppName,
          logo_url: finalLogoUrl,
        });
      }

      setGlobalLogoUrl(finalLogoUrl);
      setNewGlobalLogoFile(null);

      toast.error(
        "Configuración global guardada exitosamente. Recarga la página para ver los cambios.",
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!deletingUser) return;
    setFormLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/users/${deletingUser.user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDeletingUser(null);
      fetchData();
    } catch (err: any) {
      toast.error("Error al eliminar usuario: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-colors duration-300">
      {/* Header Rediseñado - Glassmorphism */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-8 gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-xl relative overflow-hidden transition-all duration-300 p-4 sm:p-5 rounded-[2.5rem]">
        {/* Lado Izquierdo: Branding */}
        <div className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-accent to-brand-primary rounded-full blur opacity-20 group-hover:opacity-35 transition duration-300"></div>
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-md shrink-0 aspect-square bg-white">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-cover transform transition duration-500 group-hover:scale-110"
              />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-brand-primary dark:text-white truncate leading-none mb-1 uppercase">
              Super Admin
            </h1>
            <div className="flex items-center gap-1.5 text-brand-primary/70 dark:text-white/70">
              <Zap className="w-3.5 h-3.5 text-brand-accent" />
              <p className="text-xs sm:text-sm font-semibold truncate uppercase tracking-wider opacity-80">
                Gestión Global NexoPark
              </p>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Perfil y Logout */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
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

          <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white dark:bg-slate-800 pl-4 pr-2 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm group">
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[10px] font-black text-brand-primary/50 dark:text-white/50 uppercase tracking-tighter leading-none mb-0.5">
                Root Access
              </span>
              <span className="text-sm font-bold text-brand-primary dark:text-white truncate max-w-[150px]">
                {user.email.split("@")[0]}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-white transition-all shadow-sm border border-brand-primary/10">
              <Shield className="w-5 h-5" />
            </div>
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
            className="p-3.5 rounded-2xl bg-brand-primary hover:bg-red-600 text-white transition-all duration-300 shadow-lg hover:shadow-red-200 group"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <UpdatesModal
        isOpen={showUpdates}
        onClose={() => setShowUpdates(false)}
        userRole="superadmin"
      />

      <div className="flex flex-col lg:flex-row gap-4 mb-6 sm:mb-8 justify-between items-start lg:items-center">
        <div className="flex gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-full overflow-x-auto no-scrollbar sticky top-0 z-30">
          <button
            onClick={() => {
              setActiveTab("parking_lots");
              setSearchTerm("");
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap min-h-[44px] sm:min-h-0 ${activeTab === "parking_lots" ? "bg-brand-primary text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Building2 className="w-4 h-4" />
            Parqueaderos
          </button>
          <button
            onClick={() => {
              setActiveTab("users");
              setSearchTerm("");
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap min-h-[44px] sm:min-h-0 ${activeTab === "users" ? "bg-brand-primary text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Users className="w-4 h-4" />
            Usuarios
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setSearchTerm("");
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap min-h-[44px] sm:min-h-0 ${activeTab === "settings" ? "bg-brand-primary text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </div>

        <div className="relative w-full lg:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-white dark:bg-slate-800 dark:text-white shadow-sm text-sm min-h-[48px] lg:min-h-0"
            placeholder={`Buscar ${activeTab === "parking_lots" ? "parqueaderos" : "usuarios"}...`}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === "parking_lots" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Building2 className="w-5 h-5 text-brand-accent" />
                  Parqueaderos Registrados
                </h2>
                <button
                  onClick={() => {
                    setEditingLot(null);
                    setLotName("");
                    setLotNit("");
                    setLotAddress("");
                    setLotPhone("");
                    setLotEmail("");
                    setLotSubscriptionPlan("trial");

                    // Default to 14 days from now
                    const defaultEndDate = new Date();
                    defaultEndDate.setDate(defaultEndDate.getDate() + 14);
                    setLotSubscriptionEndDate(
                      defaultEndDate.toISOString().split("T")[0],
                    );

                    setShowLotForm(true);
                  }}
                  className="px-4 py-2 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Parqueadero
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
                {parkingLots
                  .filter(
                    (lot) =>
                      lot.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      (lot.nit && lot.nit.includes(searchTerm)),
                  )
                  .map((lot) => (
                    <div
                      key={lot.id}
                      className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${lot.status === "suspended" ? "opacity-60" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-white text-lg truncate">
                          {lot.name}
                        </h3>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          <span className="truncate">
                            NIT: {lot.nit || "N/A"}
                          </span>
                          <span className="truncate">
                            Dir: {lot.address || "N/A"}
                          </span>
                          <span className="capitalize truncate">
                            Plan:{" "}
                            {lot.subscription_plan === "trial"
                              ? "Prueba"
                              : lot.subscription_plan}
                          </span>
                          <span className="truncate">
                            Vence:{" "}
                            {lot.subscription_end_date
                              ? new Date(
                                  lot.subscription_end_date,
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        {lot.status === "suspended" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                            <PowerOff className="w-3 h-3" /> Suspendido
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleToggleLotStatus(lot)}
                          className={`p-2 rounded-lg transition-colors ${lot.status === "active" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          title={
                            lot.status === "active" ? "Suspender" : "Activar"
                          }
                        >
                          {lot.status === "active" ? (
                            <PowerOff className="w-5 h-5" />
                          ) : (
                            <Power className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingLot(lot);
                            setLotName(lot.name);
                            setLotNit(lot.nit || "");
                            setLotAddress(lot.address || "");
                            setLotPhone(lot.phone || "");
                            setLotEmail(lot.email || "");
                            setLotSubscriptionPlan(
                              lot.subscription_plan || "trial",
                            );
                            setLotSubscriptionEndDate(
                              lot.subscription_end_date
                                ? new Date(lot.subscription_end_date)
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                            );
                            setShowLotForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeletingLot(lot)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                {parkingLots.length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    No hay parqueaderos registrados.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Users className="w-5 h-5 text-brand-accent" />
                  Administradores y Vigilantes
                </h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUsername("");
                    setPassword("");
                    setUserRole("admin");
                    setUserLotId(parkingLots[0]?.id || "");
                    setShowUserForm(true);
                  }}
                  className="px-4 py-2 bg-brand-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Usuario
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {users
                  .filter(
                    (u) =>
                      u.email
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      (u.parking_lot_name &&
                        u.parking_lot_name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())),
                  )
                  .map((u) => (
                    <div
                      key={u.user_id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.role === "admin" ? "bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent" : "bg-brand-accent/10 dark:bg-brand-accent/30 text-brand-accent"}`}
                        >
                          {u.role === "admin" ? (
                            <Key className="w-5 h-5" />
                          ) : (
                            <Shield className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 dark:text-white truncate uppercase tracking-tight">
                            {u.email.split("@")[0]}
                          </h3>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${u.role === "admin" ? "bg-brand-primary/5 dark:bg-brand-primary/40 text-brand-primary dark:text-brand-accent" : "bg-brand-accent/5 dark:bg-brand-accent/40 text-brand-accent"}`}
                            >
                              {u.role === "admin"
                                ? "Administrador"
                                : "Vigilante"}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0">
                              <Building2 className="w-3 h-3 shrink-0" />{" "}
                              <span className="truncate max-w-[150px] sm:max-w-xs font-medium">
                                {u.parking_lot_name}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setUsername(u.email.split("@")[0]);
                            setPassword("");
                            setUserRole(u.role);
                            setUserLotId(u.parking_lot_id || "");
                            setShowUserForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                {users.length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    No hay usuarios registrados.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-brand-primary dark:text-white flex items-center gap-2 uppercase tracking-tight">
                  <Settings className="w-5 h-5 text-brand-accent" />
                  Configuración Global del Sistema
                </h2>
              </div>

              <div className="p-6 sm:p-8 max-w-2xl">
                <div className="space-y-8">
                  {/* App Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">
                      Nombre de la Aplicación
                    </label>
                    <input
                      type="text"
                      value={globalAppName}
                      onChange={(e) => setGlobalAppName(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-800 dark:text-white"
                      placeholder="Ej. NexoPark"
                    />
                    <p className="text-xs text-slate-500">Este nombre aparecerá en el encabezado y en los recibos generados.</p>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">
                      Logo de la Plataforma
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg shrink-0 flex items-center justify-center">
                          {newGlobalLogoFile ? (
                            <img
                              src={URL.createObjectURL(newGlobalLogoFile)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : globalLogoUrl ? (
                            <img
                              src={globalLogoUrl}
                              alt="Global Logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        {newGlobalLogoFile && (
                          <button
                            onClick={() => setNewGlobalLogoFile(null)}
                            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 space-y-3 w-full">
                        <input
                          type="file"
                          id="global-logo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setNewGlobalLogoFile(file);
                          }}
                        />
                        <label
                          htmlFor="global-logo-upload"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-all shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Subir Nuevo Logo
                        </label>
                        <p className="text-[10px] text-slate-400 text-center sm:text-left leading-relaxed">
                          Recomendado: Imagen cuadrada PNG o JPG, mín. 400x400px. El logo se visualizará de forma circular.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleSaveGlobalSettings}
                      disabled={savingGlobalSettings}
                      className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl hover:shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {savingGlobalSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          Guardar Configuración
                          <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}

      {/* Lot Form Modal */}
      {showLotForm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowLotForm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in duration-300 relative border border-white/20 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent border border-brand-primary/20 dark:border-brand-primary/50">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {editingLot ? "Editar Parqueadero" : "Nuevo Parqueadero"}
                </h3>
              </div>
              <button
                onClick={() => setShowLotForm(false)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={handleSaveLot}
              className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  NIT
                </label>
                <input
                  type="text"
                  value={lotNit}
                  onChange={(e) => setLotNit(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={lotAddress}
                  onChange={(e) => setLotAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={lotPhone}
                    onChange={(e) => setLotPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={lotEmail}
                    onChange={(e) => setLotEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Plan de Suscripción
                  </label>
                  <select
                    value={lotSubscriptionPlan}
                    onChange={(e) => setLotSubscriptionPlan(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                  >
                    <option value="trial">Prueba (Trial)</option>
                    <option value="monthly">Mensual</option>
                    <option value="semi-annual">Semestral</option>
                    <option value="annual">Anual</option>
                    <option value="expired">Expirado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={lotSubscriptionEndDate}
                    onChange={(e) => setLotSubscriptionEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLotForm(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-primary text-white font-black uppercase tracking-widest text-xs hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowUserForm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in duration-300 relative border border-white/20 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                </h3>
              </div>
              <button
                onClick={() => setShowUserForm(false)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={handleSaveUser}
              className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contraseña{" "}
                  {editingUser && "(Dejar en blanco para no cambiar)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Parqueadero
                </label>
                <select
                  required
                  value={userLotId}
                  onChange={(e) => setUserLotId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Seleccione un parqueadero</option>
                  {parkingLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rol
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserRole("admin")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${userRole === "admin" ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-bold" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                  >
                    <Key className="w-4 h-4" /> Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole("guard")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${userRole === "guard" ? "border-brand-accent bg-brand-accent/10 text-brand-accent font-bold" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                  >
                    <Shield className="w-4 h-4" /> Vigilante
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-accent text-white font-black uppercase tracking-widest text-xs hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Lot Modal */}
      {deletingLot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in duration-300 relative border border-white/20 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Eliminar Parqueadero
                </h3>
              </div>
              <button
                onClick={() => setDeletingLot(null)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                ¿Estás seguro de que deseas eliminar el parqueadero{" "}
                <strong className="text-slate-900 dark:text-white">{deletingLot.name}</strong>?
                <br />
                <br />
                <span className="text-red-600 dark:text-red-400 font-bold uppercase text-xs tracking-widest">
                  ¡Advertencia!
                </span>{" "}
                Esta acción eliminará permanentemente todos los usuarios, tarifas,
                configuraciones y registros de vehículos asociados a este
                parqueadero. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingLot(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteLot}
                  disabled={formLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md my-auto animate-in fade-in zoom-in duration-300 relative border border-white/20 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Eliminar Usuario
                </h3>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                ¿Estás seguro de que deseas eliminar al usuario{" "}
                <strong className="text-slate-900 dark:text-white">{deletingUser.email}</strong>? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteUser}
                  disabled={formLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
