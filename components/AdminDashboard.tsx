'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Users, History, DollarSign, LogOut, Car, Bike, Motorbike, Clock, ChevronLeft, ChevronRight, UserPlus, Shield, Trash2, Edit2, Key, Settings, Plus, Building2, X, Search } from 'lucide-react';
import { format, differenceInMinutes, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard({ user, onLogout, userRole, parkingLotId, onSwitchView, currentView }: { user: any, onLogout: () => void, userRole: 'admin', parkingLotId: string | null, onSwitchView?: (view: 'admin' | 'guard') => void, currentView?: 'admin' | 'guard' }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'rates' | 'settings' | 'private_spots'>('dashboard');
  
  // Dashboard state
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, activeVehicles: 0, totalToday: 0, activeCars: 0, activeMotorcycles: 0, activeBicycles: 0 });
  const [loading, setLoading] = useState(true);
  
  // Admin checkout state
  const [adminCheckoutSession, setAdminCheckoutSession] = useState<any | null>(null);
  const [adminCheckoutObservation, setAdminCheckoutObservation] = useState('');
  const [adminCheckoutLoading, setAdminCheckoutLoading] = useState(false);
  
  // Settings state
  const [entryFields, setEntryFields] = useState<any[]>([]);
  const [privateSpotFields, setPrivateSpotFields] = useState<any[]>([
    { id: 'spotNumber', label: 'Espacio', required: true, enabled: true },
    { id: 'ownerName', label: 'Propietario', required: true, enabled: true },
    { id: 'licensePlate', label: 'Placa', required: true, enabled: true },
    { id: 'vehicleType', label: 'Tipo', required: true, enabled: true },
    { id: 'notes', label: 'Notas', required: false, enabled: true }
  ]);
  const [capacitySettings, setCapacitySettings] = useState({
    enforce: false,
    allow_cars: true,
    allow_motorcycles: true,
    allow_bicycles: false,
    capacity_cars: 20,
    capacity_motorcycles: 10,
    capacity_bicycles: 5
  });
  const [revenueSettings, setRevenueSettings] = useState({
    show_to_guards: false,
    last_closing: new Date().toISOString()
  });
  const [guardPermissions, setGuardPermissions] = useState({
    show_history: false,
    history_days: 1
  });
  const [specialVehicles, setSpecialVehicles] = useState<any[]>([]);
  const [privateSpots, setPrivateSpots] = useState<any[]>([]);
  const [privateSpotsSearch, setPrivateSpotsSearch] = useState('');
  const [privateSpotsSort, setPrivateSpotsSort] = useState('spotNumber');
  const [bulkClearColumn, setBulkClearColumn] = useState('');
  const [editingSpot, setEditingSpot] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Superadmin settings state
  const [parkingLotName, setParkingLotName] = useState('Parqueadero Central');
  const [parkingLotAddress, setParkingLotAddress] = useState('Calle Principal 123');
  const [parkingLotNit, setParkingLotNit] = useState('900.123.456-7');
  const [parkingLotLogo, setParkingLotLogo] = useState<string | null>(null);
  const [parkingLotSubscriptionPlan, setParkingLotSubscriptionPlan] = useState('trial');
  const [parkingLotSubscriptionEndDate, setParkingLotSubscriptionEndDate] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [loadingSuperSettings, setLoadingSuperSettings] = useState(false);
  const [savingSuperSettings, setSavingSuperSettings] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // User form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'guard'>('guard');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Rates state
  const [ratesList, setRatesList] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  // Rate form state
  const [rateName, setRateName] = useState('');
  const [rateVehicleType, setRateVehicleType] = useState<'car' | 'motorcycle' | 'bicycle' | 'all'>('all');
  const [rateType, setRateType] = useState<'minute' | 'hour_fraction' | 'day' | 'night' | 'day_night' | 'hour' | 'hour_minute' | 'flat' | 'daily'>('minute');
  const [rateValue, setRateValue] = useState<number>(0);
  const [rateBaseValue, setRateBaseValue] = useState<number>(0);
  const [rateFraction, setRateFraction] = useState<number>(15);
  const [rateActive, setRateActive] = useState(true);
  const [rateFormLoading, setRateFormLoading] = useState(false);
  
  // Deletion state
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchHistory, setSearchHistory] = useState('');

  // Chart state
  const [chartStartDate, setChartStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [chartEndDate, setChartEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [chartType, setChartType] = useState<'both' | 'revenue' | 'vehicles'>('both');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'rates') {
      fetchRates();
    } else if (activeTab === 'settings' || activeTab === 'private_spots') {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    setLoadingSuperSettings(true);
    
    // Fetch all settings for this parking lot
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .eq('parking_lot_id', parkingLotId);

    if (settingsData) {
      settingsData.forEach(setting => {
        if (setting.key === 'entry_fields') setEntryFields(setting.value);
        if (setting.key === 'private_spot_fields') setPrivateSpotFields(setting.value);
        if (setting.key === 'capacity_settings') setCapacitySettings(setting.value);
        if (setting.key === 'revenue_settings') setRevenueSettings(setting.value);
        if (setting.key === 'guard_permissions') setGuardPermissions(setting.value);
        if (setting.key === 'special_vehicles') setSpecialVehicles(setting.value);
        if (setting.key === 'private_spots') setPrivateSpots(setting.value);
      });
    }
    
    // Fetch global settings (parking lot details)
    const { data: lotData } = await supabase
      .from('parking_lots')
      .select('name, nit, address, phone, email, logo_url, subscription_plan, subscription_end_date')
      .eq('id', parkingLotId)
      .single();
      
    if (lotData) {
      setParkingLotName(lotData.name || 'Parqueadero Central');
      setParkingLotNit(lotData.nit || '900.123.456-7');
      setParkingLotAddress(lotData.address || '');
      setParkingLotLogo(lotData.logo_url || null);
      setParkingLotSubscriptionPlan(lotData.subscription_plan || 'trial');
      setParkingLotSubscriptionEndDate(lotData.subscription_end_date || '');
    }
    
    setLoadingSettings(false);
    setLoadingSuperSettings(false);
  };

  const saveCapacitySettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'capacity_settings', value: capacitySettings, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar configuración de capacidad: ' + error.message);
    } else {
      alert('Configuración de capacidad guardada exitosamente.');
    }
    setSavingSettings(false);
  };

  const saveRevenueSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'revenue_settings', value: revenueSettings, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar configuración de ingresos: ' + error.message);
    } else {
      alert('Configuración de ingresos guardada exitosamente.');
    }
    setSavingSettings(false);
  };

  const saveGuardPermissions = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'guard_permissions', value: guardPermissions, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar permisos de guardas: ' + error.message);
    } else {
      alert('Permisos de guardas guardados exitosamente.');
    }
    setSavingSettings(false);
  };

  const handleCashClosing = async () => {
    if (!window.confirm('¿Estás seguro de que deseas realizar el cierre de caja? Esto reiniciará el contador de ingresos acumulados a cero.')) return;
    
    const newSettings = { ...revenueSettings, last_closing: new Date().toISOString() };
    setRevenueSettings(newSettings);
    
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'revenue_settings', value: newSettings, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al realizar el cierre de caja: ' + error.message);
    } else {
      alert('Cierre de caja realizado exitosamente.');
      fetchData(); // Refresh stats
    }
    setSavingSettings(false);
  };

  const saveSpecialVehicles = async (updatedVehicles: any[]) => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'special_vehicles', value: updatedVehicles, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar vehículos especiales: ' + error.message);
    } else {
      setSpecialVehicles(updatedVehicles);
    }
    setSavingSettings(false);
  };

  const handleBulkClear = () => {
    if (!bulkClearColumn) return;
    if (!confirm(`¿Estás seguro de que deseas vaciar la columna "${bulkClearColumn}" para TODOS los parqueaderos privados? Esta acción no se puede deshacer.`)) return;
    
    const updatedSpots = privateSpots.map(spot => ({
      ...spot,
      [bulkClearColumn]: ''
    }));
    savePrivateSpots(updatedSpots);
    setBulkClearColumn('');
  };

  const savePrivateSpots = async (updatedSpots: any[]) => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'private_spots', value: updatedSpots, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar parqueaderos privados: ' + error.message);
    } else {
      setPrivateSpots(updatedSpots);
    }
    setSavingSettings(false);
  };

  const saveSettings = async () => {
    // Validation
    const labels = entryFields.map(f => f.label.trim().toLowerCase());
    
    // Check for empty labels
    if (labels.some(l => l === '')) {
      alert('Error: No se pueden guardar campos con nombres vacíos.');
      return;
    }
    
    // Check for duplicates
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
      alert('Error: Existen campos con nombres duplicados. Por favor, usa nombres únicos.');
      return;
    }

    // Enforce 'Placa' to be always required and enabled
    const processedFields = entryFields.map(f => {
      if (f.label.trim().toLowerCase() === 'placa') {
        return { ...f, required: true, enabled: true };
      }
      return f;
    });

    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'entry_fields', value: processedFields, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar configuración: ' + error.message);
    } else {
      setEntryFields(processedFields); // Update state to reflect enforced changes
      alert('Configuración guardada exitosamente.');
    }
    setSavingSettings(false);
  };

  const saveSuperSettings = async () => {
    setSavingSuperSettings(true);
    
    let finalLogoUrl = parkingLotLogo;

    if (newLogoFile) {
      const fileExt = newLogoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${parkingLotId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, newLogoFile);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
        finalLogoUrl = publicUrlData.publicUrl;
        setParkingLotLogo(finalLogoUrl);
      } else {
        alert('Error al subir el logo: ' + uploadError.message);
      }
    }

    const { error } = await supabase
      .from('parking_lots')
      .update({ 
        name: parkingLotName,
        address: parkingLotAddress,
        nit: parkingLotNit,
        logo_url: finalLogoUrl
      })
      .eq('id', parkingLotId);
      
    if (error) {
      alert('Error al guardar configuración: ' + error.message);
    } else {
      setNewLogoFile(null);
      alert('Configuración guardada exitosamente.');
    }
    setSavingSuperSettings(false);
  };

  const addEntryField = () => {
    const newId = `campo_${Date.now()}`;
    setEntryFields([...entryFields, { id: newId, label: `Nuevo Campo ${entryFields.length + 1}`, required: false, enabled: true }]);
  };

  const removeEntryField = (id: string) => {
    setEntryFields(entryFields.filter(f => f.id !== id));
  };

  const updateEntryField = (id: string, updates: any) => {
    setEntryFields(entryFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addPrivateSpotField = () => {
    const newId = `campo_${Date.now()}`;
    setPrivateSpotFields([...privateSpotFields, { id: newId, label: `Nuevo Campo ${privateSpotFields.length + 1}`, required: false, enabled: true }]);
  };

  const removePrivateSpotField = (id: string) => {
    setPrivateSpotFields(privateSpotFields.filter(f => f.id !== id));
  };

  const updatePrivateSpotField = (id: string, updates: any) => {
    setPrivateSpotFields(privateSpotFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const savePrivateSpotFields = async () => {
    const labels = privateSpotFields.map(f => f.label.trim().toLowerCase());
    if (labels.some(l => l === '')) {
      alert('Error: No se pueden guardar campos con nombres vacíos.');
      return;
    }
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
      alert('Error: Existen campos con nombres duplicados. Por favor, usa nombres únicos.');
      return;
    }

    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'private_spot_fields', value: privateSpotFields, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      alert('Error al guardar configuración de campos privados: ' + error.message);
    } else {
      alert('Configuración de campos privados guardada exitosamente.');
    }
    setSavingSettings(false);
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch revenue settings to get last closing time
    const { data: revSettings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'revenue_settings')
      .eq('parking_lot_id', parkingLotId)
      .single();
      
    const lastClosing = revSettings?.value?.last_closing || new Date(0).toISOString();

    const { data: sessions } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('parking_lot_id', parkingLotId)
      .order('entry_time', { ascending: false });
      
    if (sessions) {
      setHistory(sessions);
      
      const today = new Date().toISOString().split('T')[0];
      let revenue = 0;
      let active = 0;
      let todayCount = 0;
      let activeCars = 0;
      let activeMotorcycles = 0;
      let activeBicycles = 0;
      
      sessions.forEach(s => {
        if (s.status === 'active') {
          active++;
          if (s.vehicle_type === 'car') activeCars++;
          if (s.vehicle_type === 'motorcycle') activeMotorcycles++;
          if (s.vehicle_type === 'bicycle') activeBicycles++;
        }
        if (s.entry_time.startsWith(today)) todayCount++;
        if (s.status === 'completed' && s.exit_time && new Date(s.exit_time) >= new Date(lastClosing)) {
          revenue += Number(s.amount_paid);
        }
      });
      
      setStats({ totalRevenue: revenue, activeVehicles: active, totalToday: todayCount, activeCars, activeMotorcycles, activeBicycles });
    }
    setLoading(false);
  };

  const chartData = useMemo(() => {
    if (!history.length) return [];
    
    const start = new Date(chartStartDate);
    const end = new Date(chartEndDate);
    
    // Ensure start is before or equal to end
    if (start > end) return [];
    
    // Calculate difference in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Limit to 31 days to prevent performance issues
    const daysCount = Math.min(diffDays, 31);
    
    const days = Array.from({ length: daysCount }).map((_, i) => {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    return days.map(day => {
      const daySessions = history.filter(s => s.entry_time.startsWith(day));
      const dayCompleted = history.filter(s => s.status === 'completed' && s.exit_time?.startsWith(day));
      
      const revenue = dayCompleted.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
      const vehicles = daySessions.length;
      
      return {
        date: format(parseISO(day), 'EEE dd', { locale: es }),
        Ingresos: revenue,
        Vehículos: vehicles
      };
    });
  }, [history, chartStartDate, chartEndDate]);

  const handleAdminCheckout = async () => {
    if (!adminCheckoutSession || !adminCheckoutObservation.trim()) {
      alert('Por favor, ingresa una observación.');
      return;
    }

    setAdminCheckoutLoading(true);
    
    // Calculate a default cost or set to 0 since it's an admin forced checkout
    // For simplicity, we'll set it to 0 and note it in metadata
    const updatedMetadata = {
      ...(adminCheckoutSession.metadata || {}),
      admin_checkout_observation: adminCheckoutObservation,
      admin_checkout_by: user.id,
      admin_checkout_time: new Date().toISOString()
    };

    const { error } = await supabase
      .from('parking_sessions')
      .update({
        status: 'completed',
        exit_time: new Date().toISOString(),
        amount_paid: 0,
        rate_name: 'Salida Forzada',
        metadata: updatedMetadata
      })
      .eq('id', adminCheckoutSession.id);

    setAdminCheckoutLoading(false);

    if (error) {
      alert('Error al procesar la salida: ' + error.message);
    } else {
      setAdminCheckoutSession(null);
      setAdminCheckoutObservation('');
      fetchData(); // Refresh history
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/users?parking_lot_id=${parkingLotId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsersList(data);
    } catch (err: any) {
      console.error(err);
      alert('Error al cargar usuarios');
    }
    setLoadingUsers(false);
  };

  const fetchRates = async () => {
    setLoadingRates(true);
    const { data, error } = await supabase.from('rates').select('*').eq('parking_lot_id', parkingLotId).order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      alert('Error al cargar tarifas');
    } else {
      setRatesList(data || []);
    }
    setLoadingRates(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password: password || undefined, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ username, password, role, parking_lot_id: parkingLotId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      
      setShowUserForm(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteUser = (id: string) => {
    setDeletingUserId(id);
  };

  const executeDeleteUser = async () => {
    if (!deletingUserId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/users/${deletingUserId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateFormLoading(true);
    
    const generatedName = `${getRateTypeName(rateType)} - ${rateVehicleType === 'car' ? 'Carro' : rateVehicleType === 'motorcycle' ? 'Moto' : rateVehicleType === 'bicycle' ? 'Bicicleta' : 'Todos'}`;
    
    const rateData = {
      name: generatedName,
      vehicle_type: rateVehicleType,
      type: rateType,
      rate: rateValue,
      base_rate: rateBaseValue,
      fraction_minutes: rateFraction,
      is_active: rateActive,
      parking_lot_id: parkingLotId
    };

    try {
      if (editingRate) {
        const { error } = await supabase.from('rates').update(rateData).eq('id', editingRate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rates').insert(rateData);
        if (error) throw error;
      }
      setShowRateForm(false);
      fetchRates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRateFormLoading(false);
    }
  };

  const confirmDeleteRate = (id: string) => {
    setDeletingRateId(id);
  };

  const executeDeleteRate = async () => {
    if (!deletingRateId) return;
    const { error } = await supabase.from('rates').delete().eq('id', deletingRateId);
    if (error) alert(error.message);
    else fetchRates();
    setDeletingRateId(null);
  };

  const openNewUserForm = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setRole('guard');
    setFormError('');
    setShowUserForm(true);
  };

  const openEditUserForm = (u: any) => {
    setEditingUser(u);
    setUsername(u.username || u.email);
    setPassword(''); // Don't show existing password
    setRole(u.role);
    setFormError('');
    setShowUserForm(true);
  };

  const openNewRateForm = () => {
    setEditingRate(null);
    setRateName('');
    setRateVehicleType('all');
    setRateType('minute');
    setRateValue(0);
    setRateBaseValue(0);
    setRateFraction(15);
    setRateActive(true);
    setShowRateForm(true);
  };

  const openEditRateForm = (r: any) => {
    setEditingRate(r);
    setRateName(r.name);
    setRateVehicleType(r.vehicle_type);
    setRateType(r.type);
    setRateValue(r.rate);
    setRateBaseValue(r.base_rate);
    setRateFraction(r.fraction_minutes);
    setRateActive(r.is_active);
    setShowRateForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRateTypeName = (type: string) => {
    switch (type) {
      case 'minute': return 'Por Minuto';
      case 'hour_fraction': return 'Hora y Fracción';
      case 'day': return 'Día';
      case 'night': return 'Noche';
      case 'day_night': return 'Día y Noche';
      case 'hour': return 'Por Hora (Legado)';
      case 'hour_minute': return 'Hora + Minuto (Legado)';
      case 'flat': return 'Tarifa Plana (Legado)';
      case 'daily': return 'Por Día (Legado)';
      default: return type;
    }
  };

  // Pagination logic
  const filteredHistory = history.filter(s => 
    s.license_plate.includes(searchHistory.toUpperCase()) || 
    (s.ticket_number && String(s.ticket_number).includes(searchHistory))
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            {parkingLotName || 'Control de Parqueadero'}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {onSwitchView && (
            <div className="bg-slate-800 rounded-xl p-1 flex border border-slate-700">
              <button
                onClick={() => onSwitchView('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'admin' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchView('guard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'guard' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                Vigilancia
              </button>
            </div>
          )}
          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded-xl flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'rates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Settings className="w-4 h-4" />
          Tarifas
        </button>
        <button
          onClick={() => setActiveTab('private_spots')}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'private_spots' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Car className="w-4 h-4" />
          Privados
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Ingresos Hoy</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalRevenue)}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Car className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 mb-1">Vehículos Activos</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-2xl font-bold text-slate-800">{stats.activeVehicles}</h3>
                  <div className="flex gap-3 text-xs text-slate-500 mb-1">
                    <span title="Carros" className="flex items-center gap-1"><Car className="w-3 h-3" /> {stats.activeCars}</span>
                    <span title="Motos" className="flex items-center gap-1"><Motorbike className="w-3 h-3" /> {stats.activeMotorcycles}</span>
                    {stats.activeBicycles > 0 && <span title="Bicicletas" className="flex items-center gap-1"><Bike className="w-3 h-3" /> {stats.activeBicycles}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <History className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Ingresos Hoy</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.totalToday}</h3>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                Estadísticas
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="both">Ingresos y Vehículos</option>
                  <option value="revenue">Solo Ingresos</option>
                  <option value="vehicles">Solo Vehículos</option>
                </select>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={chartStartDate} 
                    onChange={(e) => setChartStartDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-slate-400">a</span>
                  <input 
                    type="date" 
                    value={chartEndDate} 
                    onChange={(e) => setChartEndDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="h-64 sm:h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    
                    {(chartType === 'both' || chartType === 'revenue') && (
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value/1000}k`} />
                    )}
                    
                    {(chartType === 'both' || chartType === 'vehicles') && (
                      <YAxis yAxisId="right" orientation={chartType === 'both' ? 'right' : 'left'} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={chartType === 'both' ? 10 : -10} />
                    )}
                    
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: any) => [name === 'Ingresos' ? formatCurrency(Number(value)) : value, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {(chartType === 'both' || chartType === 'revenue') && (
                      <Bar yAxisId="left" dataKey="Ingresos" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    )}
                    
                    {(chartType === 'both' || chartType === 'vehicles') && (
                      <Line yAxisId="right" type="monotone" dataKey="Vehículos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  No hay datos suficientes para mostrar la gráfica.
                </div>
              )}
            </div>
          </div>

          {/* Historial Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                Historial General
              </h2>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchHistory}
                    onChange={(e) => {
                      setSearchHistory(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar placa o recibo..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                  />
                </div>
                <button onClick={() => { setCurrentPage(1); fetchData(); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap">
                  Actualizar
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    <th className="px-6 py-4 font-medium">Recibo</th>
                    <th className="px-6 py-4 font-medium">Placa</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Detalles</th>
                    <th className="px-6 py-4 font-medium">Ingreso</th>
                    <th className="px-6 py-4 font-medium">Salida</th>
                    <th className="px-6 py-4 font-medium">Tiempo</th>
                    <th className="px-6 py-4 font-medium">Tarifa</th>
                    <th className="px-6 py-4 font-medium text-right">Valor Pagado</th>
                    <th className="px-6 py-4 font-medium text-center">Estado</th>
                    <th className="px-6 py-4 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-500">Cargando datos...</td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                        {searchHistory ? 'No se encontraron registros con esa búsqueda.' : 'No hay registros en el sistema.'}
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((session) => {
                      const isCompleted = session.status === 'completed';
                      const exitTime = isCompleted ? new Date(session.exit_time) : new Date();
                      const mins = Math.max(1, differenceInMinutes(exitTime, new Date(session.entry_time)));
                      
                      return (
                        <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-500 text-sm">
                            {session.ticket_number ? `#${session.ticket_number}` : '-'}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">{session.license_plate}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              {session.vehicle_type === 'car' ? <Car className="w-4 h-4 text-blue-500" /> : session.vehicle_type === 'motorcycle' ? <Motorbike className="w-4 h-4 text-orange-500" /> : <Bike className="w-4 h-4 text-green-500" />}
                              <span className="capitalize text-sm">{session.vehicle_type === 'car' ? 'Carro' : session.vehicle_type === 'motorcycle' ? 'Moto' : 'Bicicleta'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                            {session.metadata && Object.keys(session.metadata).length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {Object.entries(session.metadata)
                                  .filter(([k]) => k !== 'guard_name' && k !== 'checkout_guard_name')
                                  .map(([key, value]) => {
                                    const fieldDef = entryFields.find(f => f.id === key);
                                    const displayKey = fieldDef ? fieldDef.label : key;
                                    return (
                                      <span key={key} className="text-slate-700 font-medium">{String(value)}</span>
                                    );
                                  })}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sin detalles</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {format(new Date(session.entry_time), 'dd/MM/yy h:mm a')}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {isCompleted ? format(new Date(session.exit_time), 'dd/MM/yy h:mm a') : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {mins} min
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {session.rate_name || '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-800">
                            {isCompleted ? formatCurrency(session.amount_paid) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isCompleted ? 'Completado' : 'Activo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!isCompleted && (
                              <button
                                onClick={() => setAdminCheckoutSession(session)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                              >
                                Forzar Salida
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {!loading && filteredHistory.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
                <div className="text-sm text-slate-500">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredHistory.length)}</span> de <span className="font-medium">{filteredHistory.length}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                        }
                        if (currentPage > totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        }
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum 
                              ? 'bg-indigo-600 text-white' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              Gestión de Usuarios
            </h2>
            <button 
              onClick={openNewUserForm}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="px-6 py-4 font-medium">Usuario</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Fecha Creación</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Cargando usuarios...</td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No hay usuarios registrados.</td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{u.username || u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'superadmin' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Administrador' : 'Vigilante'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(u.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {u.role !== 'superadmin' && (
                            <button 
                              onClick={() => openEditUserForm(u)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {u.id !== user.id && u.role !== 'superadmin' && (
                            <button 
                              onClick={() => confirmDeleteUser(u.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" />
              Gestión de Tarifas
            </h2>
            <button 
              onClick={openNewRateForm}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarifa
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Vehículo</th>
                  <th className="px-6 py-4 font-medium">Tipo de Cobro</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium text-center">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRates ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Cargando tarifas...</td>
                  </tr>
                ) : ratesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No hay tarifas configuradas.</td>
                  </tr>
                ) : (
                  ratesList.map((r, index) => (
                    <tr key={r.id} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-indigo-50/50`}>
                      <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          {r.vehicle_type === 'car' ? <Car className="w-4 h-4 text-blue-500" /> : r.vehicle_type === 'motorcycle' ? <Motorbike className="w-4 h-4 text-orange-500" /> : r.vehicle_type === 'bicycle' ? <Bike className="w-4 h-4 text-green-500" /> : <div className="flex"><Car className="w-4 h-4 text-blue-500" /><Motorbike className="w-4 h-4 text-orange-500" /><Bike className="w-4 h-4 text-green-500" /></div>}
                          <span className="capitalize text-sm">{r.vehicle_type === 'car' ? 'Carro' : r.vehicle_type === 'motorcycle' ? 'Moto' : r.vehicle_type === 'bicycle' ? 'Bicicleta' : 'Todos'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getRateTypeName(r.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                        {r.type === 'minute' || r.type === 'hour' || r.type === 'flat' || r.type === 'daily' || r.type === 'day' || r.type === 'night' ? (
                          formatCurrency(r.rate)
                        ) : r.type === 'day_night' ? (
                          `Día: ${formatCurrency(r.base_rate)} / Noche: ${formatCurrency(r.rate)}`
                        ) : r.type === 'hour_minute' ? (
                          `${formatCurrency(r.base_rate)} (1ra hr) + ${formatCurrency(r.rate)}/min`
                        ) : (
                          `${formatCurrency(r.base_rate)} (1ra hr) + ${formatCurrency(r.rate)}/${r.fraction_minutes}min`
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {r.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditRateForm(r)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar tarifa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDeleteRate(r.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar tarifa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'private_spots' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Car className="w-5 h-5 text-indigo-600" />
              Gestión de Parqueaderos Privados
            </h2>
          </div>
          <div className="p-6">
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="font-medium text-slate-800">Asignar Nuevo Parqueadero</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkClearColumn}
                    onChange={(e) => setBulkClearColumn(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                  >
                    <option value="">Seleccionar columna a vaciar...</option>
                    {privateSpotFields.filter(f => f.enabled).map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkClear}
                    disabled={!bulkClearColumn}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    Vaciar Columna
                  </button>
                </div>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newSpot: any = {
                    id: Math.random().toString(36).substr(2, 9),
                  };
                  privateSpotFields.forEach(field => {
                    if (field.enabled) {
                      newSpot[field.id] = formData.get(field.id)?.toString() || '';
                      if (field.id === 'licensePlate') {
                        newSpot[field.id] = newSpot[field.id].toUpperCase();
                      }
                    }
                  });
                  savePrivateSpots([...privateSpots, newSpot]);
                  e.currentTarget.reset();
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {privateSpotFields.filter(f => f.enabled).map(field => (
                  <div key={field.id} className={field.id === 'notes' ? 'md:col-span-2 lg:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                    {field.id === 'vehicleType' ? (
                      <select name={field.id} required={field.required} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                        <option value="car">Carro</option>
                        <option value="motorcycle">Moto</option>
                        <option value="bicycle">Bicicleta</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        name={field.id} 
                        required={field.required} 
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none ${field.id === 'licensePlate' ? 'uppercase' : ''}`} 
                        placeholder={field.id === 'spotNumber' ? 'Ej. A-12' : field.id === 'licensePlate' ? 'ABC-123' : ''} 
                      />
                    )}
                  </div>
                ))}
                <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">
                    Asignar Espacio
                  </button>
                </div>
              </form>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={privateSpotsSearch}
                  onChange={(e) => setPrivateSpotsSearch(e.target.value)}
                  placeholder="Buscar por placa, propietario o espacio..."
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={privateSpotsSort}
                  onChange={(e) => setPrivateSpotsSort(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                >
                  {privateSpotFields.filter(f => f.enabled).map(field => (
                    <option key={field.id} value={field.id}>Por {field.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    {privateSpotFields.filter(f => f.enabled).map(field => (
                      <th key={field.id} className="px-4 py-3 font-medium">{field.label}</th>
                    ))}
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {privateSpots.length === 0 ? (
                    <tr>
                      <td colSpan={privateSpotFields.filter(f => f.enabled).length + 1} className="px-4 py-8 text-center text-slate-500">
                        No hay parqueaderos privados asignados
                      </td>
                    </tr>
                  ) : (
                    privateSpots
                      .filter(spot => 
                        privateSpotFields.filter(f => f.enabled).some(field => 
                          (spot[field.id] || '').toLowerCase().includes(privateSpotsSearch.toLowerCase())
                        )
                      )
                      .sort((a, b) => {
                        const valA = a[privateSpotsSort] || '';
                        const valB = b[privateSpotsSort] || '';
                        return valA.localeCompare(valB, undefined, { numeric: true });
                      })
                      .map((spot) => (
                      <tr key={spot.id} className="border-b border-slate-100 hover:bg-slate-50">
                        {privateSpotFields.filter(f => f.enabled).map(field => (
                          <td key={field.id} className={`px-4 py-3 ${field.id === 'licensePlate' ? 'font-mono text-slate-600' : field.id === 'spotNumber' ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                            {field.id === 'vehicleType' 
                              ? (spot[field.id] === 'car' ? 'Carro' : spot[field.id] === 'motorcycle' ? 'Moto' : spot[field.id] === 'bicycle' ? 'Bicicleta' : spot[field.id])
                              : spot[field.id]}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => {
                              setEditingSpot(spot);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors mr-2"
                            title="Editar asignación"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => savePrivateSpots(privateSpots.filter(s => s.id !== spot.id))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Información del Parqueadero
              </h2>
              <button
                onClick={saveSuperSettings}
                disabled={savingSuperSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingSuperSettings ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            
            <div className="p-6">
              {loadingSuperSettings ? (
                <div className="py-12 text-center text-slate-500">Cargando información...</div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group shadow-sm">
                      {(newLogoFile || parkingLotLogo) ? (
                        <img 
                          src={newLogoFile ? URL.createObjectURL(newLogoFile) : parkingLotLogo!} 
                          alt="Logo" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Cambiar</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setNewLogoFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-800">Logo del Parqueadero</h3>
                      <p className="text-xs text-slate-500 mt-1">Sube una imagen para mostrar en los recibos y en el panel. Recomendado: PNG o JPG, máx 2MB.</p>
                      {newLogoFile && (
                        <button 
                          onClick={() => setNewLogoFile(null)}
                          className="text-xs text-red-600 mt-2 font-medium hover:underline"
                        >
                          Cancelar cambio de logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Parqueadero</label>
                      <input
                        type="text"
                        value={parkingLotName}
                        disabled
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                        placeholder="Ej. Parqueadero Central"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">NIT / RUT</label>
                      <input
                        type="text"
                        value={parkingLotNit}
                        disabled
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                        placeholder="Ej. 900.123.456-7"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">* El Nombre y el NIT solo pueden ser modificados por el Super Administrador.</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
                    <input
                      type="text"
                      value={parkingLotAddress}
                      onChange={(e) => setParkingLotAddress(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                      placeholder="Ej. Calle Principal 123"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-sm font-medium text-indigo-900 mb-1">Plan de Suscripción</label>
                      <div className="font-semibold text-indigo-700 capitalize">
                        {parkingLotSubscriptionPlan === 'trial' ? 'Prueba (Trial)' : 
                         parkingLotSubscriptionPlan === 'monthly' ? 'Mensual' : 
                         parkingLotSubscriptionPlan === 'semi-annual' ? 'Semestral' : 
                         parkingLotSubscriptionPlan === 'annual' ? 'Anual' : 
                         parkingLotSubscriptionPlan === 'expired' ? 'Expirado' : parkingLotSubscriptionPlan}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-indigo-900 mb-1">Fecha de Vencimiento</label>
                      <div className="font-semibold text-indigo-700">
                        {parkingLotSubscriptionEndDate ? new Date(parkingLotSubscriptionEndDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capacity Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Car className="w-5 h-5 text-indigo-600" />
                Límites de Capacidad y Tipos de Vehículos
              </h2>
              <button
                onClick={saveCapacitySettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6 max-w-3xl">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="enforce_capacity"
                    checked={capacitySettings.enforce}
                    onChange={(e) => setCapacitySettings({...capacitySettings, enforce: e.target.checked})}
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="enforce_capacity" className="font-medium text-slate-800">
                    Habilitar límites de capacidad (No permitir ingresos si el parqueadero está lleno)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cars */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allow_cars"
                        checked={capacitySettings.allow_cars}
                        onChange={(e) => setCapacitySettings({...capacitySettings, allow_cars: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="allow_cars" className="font-medium text-slate-700 flex items-center gap-2">
                        <Car className="w-4 h-4" /> Permitir Carros
                      </label>
                    </div>
                    {capacitySettings.allow_cars && (
                      <div>
                        <label className="block text-sm text-slate-500 mb-1">Capacidad Máxima</label>
                        <input
                          type="number"
                          min="0"
                          value={capacitySettings.capacity_cars}
                          onChange={(e) => setCapacitySettings({...capacitySettings, capacity_cars: parseInt(e.target.value) || 0})}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Motorcycles */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allow_motorcycles"
                        checked={capacitySettings.allow_motorcycles}
                        onChange={(e) => setCapacitySettings({...capacitySettings, allow_motorcycles: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="allow_motorcycles" className="font-medium text-slate-700 flex items-center gap-2">
                        <Motorbike className="w-4 h-4" /> Permitir Motos
                      </label>
                    </div>
                    {capacitySettings.allow_motorcycles && (
                      <div>
                        <label className="block text-sm text-slate-500 mb-1">Capacidad Máxima</label>
                        <input
                          type="number"
                          min="0"
                          value={capacitySettings.capacity_motorcycles}
                          onChange={(e) => setCapacitySettings({...capacitySettings, capacity_motorcycles: parseInt(e.target.value) || 0})}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bicycles */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allow_bicycles"
                        checked={capacitySettings.allow_bicycles}
                        onChange={(e) => setCapacitySettings({...capacitySettings, allow_bicycles: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="allow_bicycles" className="font-medium text-slate-700 flex items-center gap-2">
                        <Bike className="w-4 h-4" /> Permitir Bicicletas
                      </label>
                    </div>
                    {capacitySettings.allow_bicycles && (
                      <div>
                        <label className="block text-sm text-slate-500 mb-1">Capacidad Máxima</label>
                        <input
                          type="number"
                          min="0"
                          value={capacitySettings.capacity_bicycles}
                          onChange={(e) => setCapacitySettings({...capacitySettings, capacity_bicycles: parseInt(e.target.value) || 0})}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guard Permissions Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Permisos de Guardas
              </h2>
              <button
                onClick={saveGuardPermissions}
                disabled={savingSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6 max-w-2xl">
                <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                  <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guardPermissions.show_history}
                      onChange={(e) => setGuardPermissions({ ...guardPermissions, show_history: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Permitir a los guardas ver el historial de vehículos (Minuta)</span>
                  </label>
                  
                  {guardPermissions.show_history && (
                    <div className="ml-8 mt-4 pt-4 border-t border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Días de historial visibles
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={guardPermissions.history_days}
                          onChange={(e) => setGuardPermissions({ ...guardPermissions, history_days: parseInt(e.target.value) || 1 })}
                          className="w-32 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-slate-500 text-sm">días hacia atrás</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Define cuántos días de historial pueden consultar los guardas en su panel.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Cierre de Caja y Visibilidad
              </h2>
              <button
                onClick={saveRevenueSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="show_to_guards"
                    checked={revenueSettings.show_to_guards}
                    onChange={(e) => setRevenueSettings({...revenueSettings, show_to_guards: e.target.checked})}
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="show_to_guards" className="font-medium text-slate-800">
                    Mostrar ingresos acumulados a los vigilantes
                  </label>
                </div>

                <div className="p-6 border border-slate-200 rounded-xl bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">Cierre de Caja</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Último cierre: {format(new Date(revenueSettings.last_closing), 'dd/MM/yyyy h:mm a')}
                    </p>
                    <p className="text-sm text-slate-500">
                      Ingresos acumulados desde el último cierre: <strong className="text-emerald-600">{formatCurrency(stats.totalRevenue)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleCashClosing}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Realizar Cierre de Caja
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Special Vehicles */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Tarifas Especiales y Mensualidades
              </h2>
            </div>
            <div className="p-6">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newVehicle = {
                    id: crypto.randomUUID(),
                    plate: formData.get('plate')?.toString().toUpperCase(),
                    type: formData.get('type'),
                    rate_type: formData.get('rate_type'),
                    amount: Number(formData.get('amount')),
                    paid_to_admin: formData.get('paid_to_admin') === 'on'
                  };
                  saveSpecialVehicles([...specialVehicles, newVehicle]);
                  e.currentTarget.reset();
                }}
                className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200"
              >
                <h3 className="font-medium text-slate-800 mb-4">Agregar Vehículo Especial</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Placa</label>
                    <input name="plate" type="text" required maxLength={6} className="w-full px-3 py-2 border rounded-lg uppercase" placeholder="ABC123" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo</label>
                    <select name="type" className="w-full px-3 py-2 border rounded-lg">
                      <option value="car">Carro</option>
                      <option value="motorcycle">Moto</option>
                      <option value="bicycle">Bicicleta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tarifa</label>
                    <select name="rate_type" className="w-full px-3 py-2 border rounded-lg">
                      <option value="monthly">Mensualidad</option>
                      <option value="fixed_daily">Fijo por Día</option>
                      <option value="day_only">Solo Día</option>
                      <option value="night_only">Solo Noche</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Valor</label>
                    <input name="amount" type="number" required min="0" className="w-full px-3 py-2 border rounded-lg" placeholder="0" />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input type="checkbox" name="paid_to_admin" id="paid_to_admin" className="w-4 h-4" />
                    <label htmlFor="paid_to_admin" className="text-sm text-slate-700">Pagado a Admin</label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Agregar Vehículo
                  </button>
                </div>
              </form>

              {specialVehicles.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="pb-3 font-medium">Placa</th>
                        <th className="pb-3 font-medium">Tipo</th>
                        <th className="pb-3 font-medium">Tarifa</th>
                        <th className="pb-3 font-medium">Valor</th>
                        <th className="pb-3 font-medium">Pago a</th>
                        <th className="pb-3 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {specialVehicles.map((v) => (
                        <tr key={v.id}>
                          <td className="py-3 font-mono font-medium">{v.plate}</td>
                          <td className="py-3 capitalize">{v.type === 'car' ? 'Carro' : v.type === 'motorcycle' ? 'Moto' : 'Bicicleta'}</td>
                          <td className="py-3">
                            {v.rate_type === 'monthly' ? 'Mensualidad' : 
                             v.rate_type === 'fixed_daily' ? 'Fijo por Día' : 
                             v.rate_type === 'day_only' ? 'Solo Día' : 'Solo Noche'}
                          </td>
                          <td className="py-3 font-medium text-emerald-600">{formatCurrency(v.amount)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${v.paid_to_admin ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                              {v.paid_to_admin ? 'Administración' : 'Vigilante'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button 
                              onClick={() => saveSpecialVehicles(specialVehicles.filter(sv => sv.id !== v.id))}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">No hay vehículos con tarifas especiales configurados.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                Configuración de Campos de Parqueaderos Privados
              </h2>
            <button
              onClick={savePrivateSpotFields}
              disabled={savingSettings}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {savingSettings ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 mb-6">
              Configura los campos que se deben llenar al registrar un parqueadero privado.
            </p>

            {loadingSettings ? (
              <div className="py-12 text-center text-slate-500">Cargando configuración...</div>
            ) : (
              <div className="space-y-4">
                {privateSpotFields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border border-slate-200 rounded-2xl bg-slate-50">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Nombre del Campo</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updatePrivateSpotField(field.id, { label: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                        placeholder="Ej. Espacio, Propietario..."
                      />
                    </div>
                    
                    <div className="flex items-center gap-6 mt-2 sm:mt-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updatePrivateSpotField(field.id, { required: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Requerido</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) => updatePrivateSpotField(field.id, { enabled: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Habilitado</span>
                      </label>

                      <button
                        onClick={() => removePrivateSpotField(field.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar campo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addPrivateSpotField}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Nuevo Campo
                </button>
              </div>
            )}
          </div>
        </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                Configuración de Campos de Ingreso
              </h2>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {savingSettings ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 mb-6">
              Configura los campos adicionales que el vigilante debe llenar al registrar el ingreso de un vehículo. La placa siempre es obligatoria.
            </p>

            {loadingSettings ? (
              <div className="py-12 text-center text-slate-500">Cargando configuración...</div>
            ) : (
              <div className="space-y-4">
                {entryFields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border border-slate-200 rounded-2xl bg-slate-50">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Nombre del Campo</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateEntryField(field.id, { label: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                        placeholder="Ej. Nombre, Celular, Bloque..."
                      />
                    </div>
                    
                    <div className="flex items-center gap-6 mt-2 sm:mt-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateEntryField(field.id, { required: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Obligatorio</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) => updateEntryField(field.id, { enabled: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Activo</span>
                      </label>

                      <button
                        onClick={() => removeEntryField(field.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar campo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addEntryField}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Nuevo Campo
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Private Spot Edit Modal */}
      {showEditModal && editingSpot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Editar Parqueadero Privado
              </h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const updatedSpot: any = { id: editingSpot.id };
                  privateSpotFields.forEach(field => {
                    if (field.enabled) {
                      updatedSpot[field.id] = formData.get(field.id)?.toString() || '';
                      if (field.id === 'licensePlate') {
                        updatedSpot[field.id] = updatedSpot[field.id].toUpperCase();
                      }
                    }
                  });
                  savePrivateSpots(privateSpots.map(s => s.id === editingSpot.id ? updatedSpot : s));
                  setShowEditModal(false);
                  setEditingSpot(null);
                }}
                className="space-y-4"
              >
                {privateSpotFields.filter(f => f.enabled).map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                    {field.id === 'vehicleType' ? (
                      <select name={field.id} defaultValue={editingSpot[field.id]} required={field.required} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
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
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none ${field.id === 'licensePlate' ? 'uppercase' : ''}`} 
                      />
                    )}
                  </div>
                ))}
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSpot(null);
                    }} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {editingUser ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-indigo-600" />}
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white disabled:opacity-50"
                    placeholder="ej. vigilante1"
                  />
                  {editingUser && <p className="text-xs text-slate-500 mt-1">El nombre de usuario no se puede cambiar.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña {editingUser && <span className="text-slate-400 font-normal">(Dejar en blanco para no cambiar)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rol del Sistema</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('guard')}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${role === 'guard' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Shield className="w-4 h-4" />
                      <span className="font-medium text-sm">Vigilante</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${role === 'admin' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Key className="w-4 h-4" />
                      <span className="font-medium text-sm">Admin</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {formLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rate Form Modal */}
      {showRateForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {editingRate ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                {editingRate ? 'Editar Tarifa' : 'Nueva Tarifa'}
              </h2>

              <form onSubmit={handleSaveRate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Vehículo</label>
                    <select
                      value={rateVehicleType}
                      onChange={(e) => setRateVehicleType(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="all">Todos</option>
                      <option value="car">Carro</option>
                      <option value="motorcycle">Moto</option>
                      <option value="bicycle">Bicicleta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cobro</label>
                    <select
                      value={rateType}
                      onChange={(e) => setRateType(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="minute">Por Minuto</option>
                      <option value="hour_fraction">Hora y Fracción</option>
                      <option value="day">Día</option>
                      <option value="night">Noche</option>
                      <option value="day_night">Día y Noche</option>
                      {['hour', 'hour_minute', 'flat', 'daily'].includes(rateType) && (
                        <option value={rateType}>{getRateTypeName(rateType)}</option>
                      )}
                    </select>
                  </div>
                </div>

                {(rateType === 'hour_fraction' || rateType === 'hour_minute' || rateType === 'day_night') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {rateType === 'day_night' ? 'Valor Día' : 'Valor de la Primera Hora'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400">$</span>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        value={rateBaseValue}
                        onChange={(e) => setRateBaseValue(Number(e.target.value))}
                        className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {(rateType === 'hour_fraction' || rateType === 'day_night') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {rateType === 'day_night' ? 'Minutos de Gracia (No se cobra si entra/sale en este margen)' : 'Minutos por Fracción'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={rateFraction}
                      onChange={(e) => setRateFraction(Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {rateType === 'minute' ? 'Valor por Minuto' :
                     rateType === 'hour_fraction' ? 'Valor por Fracción Adicional' :
                     rateType === 'day' ? 'Valor Día' :
                     rateType === 'night' ? 'Valor Noche' :
                     rateType === 'day_night' ? 'Valor Noche' :
                     'Valor Total'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400">$</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      value={rateValue}
                      onChange={(e) => setRateValue(Number(e.target.value))}
                      className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="rateActive"
                    checked={rateActive}
                    onChange={(e) => setRateActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="rateActive" className="text-sm font-medium text-slate-700">
                    Tarifa Activa (Visible para vigilantes)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRateForm(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={rateFormLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {rateFormLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUserId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar usuario?</h3>
              <p className="text-slate-600 mb-6">Esta acción no se puede deshacer. El usuario perderá el acceso al sistema.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUserId(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteUser}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rate Confirmation Modal */}
      {deletingRateId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar tarifa?</h3>
              <p className="text-slate-600 mb-6">Esta acción no se puede deshacer. La tarifa ya no estará disponible.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingRateId(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteRate}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Checkout Modal */}
      {adminCheckoutSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Forzar Salida de Vehículo</h2>
                <button onClick={() => setAdminCheckoutSession(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">Placa</p>
                <p className="text-xl font-mono font-bold text-slate-800">{adminCheckoutSession.license_plate}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observación (Requerida)</label>
                  <textarea
                    required
                    value={adminCheckoutObservation}
                    onChange={(e) => setAdminCheckoutObservation(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-slate-50 focus:bg-white min-h-[100px] resize-none"
                    placeholder="Indica la razón por la cual estás forzando la salida de este vehículo..."
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Esta acción marcará el vehículo como completado con valor $0 y guardará tu observación en el registro.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setAdminCheckoutSession(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAdminCheckout}
                    disabled={adminCheckoutLoading || !adminCheckoutObservation.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {adminCheckoutLoading ? 'Procesando...' : 'Confirmar Salida'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
