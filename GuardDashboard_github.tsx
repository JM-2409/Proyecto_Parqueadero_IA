import { toast } from 'sonner';
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Car, Bike, Motorbike, Clock, LogOut, CheckCircle, Search, DollarSign, Zap, History, Share2, Image as ImageIcon, UserCircle, Shield, Edit2, Plus } from 'lucide-react';
import { format, differenceInMinutes, subDays } from 'date-fns';
import html2canvas from 'html2canvas';

export default function GuardDashboard({ user, onLogout, parkingLotId, onSwitchView, currentView }: { user: any, onLogout: () => void, parkingLotId: string | null, onSwitchView?: (view: 'admin' | 'guard') => void, currentView?: 'admin' | 'guard' }) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [mobileView, setMobileView] = useState<'entry' | 'list'>('entry');
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [guardPermissions, setGuardPermissions] = useState({ show_history: false, history_days: 1 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [entryFields, setEntryFields] = useState<any[]>([]);
  const [capacitySettings, setCapacitySettings] = useState<any>({ enforce: false });
  const [revenueSettings, setRevenueSettings] = useState<any>({ show_to_guards: true, last_closing: null });
  const [specialVehicles, setSpecialVehicles] = useState<any[]>([]);
  const [privateSpots, setPrivateSpots] = useState<any[]>([]);
  const [privateSpotFields, setPrivateSpotFields] = useState<any[]>([
    { id: 'spotNumber', label: 'Espacio', required: true, enabled: true },
    { id: 'ownerName', label: 'Propietario', required: true, enabled: true },
    { id: 'licensePlate', label: 'Placa', required: true, enabled: true },
    { id: 'vehicleType', label: 'Tipo', required: true, enabled: true },
    { id: 'notes', label: 'Notas', required: false, enabled: true }
  ]);
  const [showPrivateSpots, setShowPrivateSpots] = useState(false);
  const [privateSpotsSearch, setPrivateSpotsSearch] = useState('');
  const [privateSpotsSort, setPrivateSpotsSort] = useState('spotNumber');
  const [editingSpot, setEditingSpot] = useState<any | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<'car' | 'motorcycle' | 'bicycle'>('car');
  const [loading, setLoading] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);
  const [completedSession, setCompletedSession] = useState<any | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [autoCompleted, setAutoCompleted] = useState(false);
  
  // Guard Name / Shift Management
  const [guardName, setGuardName] = useState('');
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [tempGuardName, setTempGuardName] = useState('');

  // Novelties State
  const [noveltyModalVehicle, setNoveltyModalVehicle] = useState<any | null>(null);
  const [novelties, setNovelties] = useState<any[]>([]);
  const [newNoveltyObservation, setNewNoveltyObservation] = useState('');
  const [newNoveltyPhoto, setNewNoveltyPhoto] = useState<File | null>(null);
  const [noveltyLoading, setNoveltyLoading] = useState(false);

  // Entry Novelty State
  const [hasEntryNovelty, setHasEntryNovelty] = useState(false);
  const [entryNoveltyObservation, setEntryNoveltyObservation] = useState('');
  const [entryNoveltyPhoto, setEntryNoveltyPhoto] = useState<File | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedGuardName = localStorage.getItem('current_guard_name');
    if (storedGuardName) {
      setGuardName(storedGuardName);
    } else {
      setShowGuardModal(true);
    }
  }, []);

  useEffect(() => {
    const allowCars = capacitySettings?.allow_cars !== false;
    const allowMotorcycles = capacitySettings?.allow_motorcycles !== false;
    const allowBicycles = capacitySettings?.allow_bicycles === true;

    if (type === 'car' && !allowCars) {
      setType(allowMotorcycles ? 'motorcycle' : (allowBicycles ? 'bicycle' : 'car'));
    } else if (type === 'motorcycle' && !allowMotorcycles) {
      setType(allowCars ? 'car' : (allowBicycles ? 'bicycle' : 'car'));
    } else if (type === 'bicycle' && !allowBicycles) {
      setType(allowCars ? 'car' : (allowMotorcycles ? 'motorcycle' : 'car'));
    }
  }, [capacitySettings, type]);

  useEffect(() => {
    fetchActiveSessions();
    fetchActiveRates();
    fetchSettings();
    fetchGlobalSettings();
    
    // Refresh times every minute without re-fetching data
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    // Realtime subscriptions for auto-updating settings and rates
    const channel = supabase.channel('guard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `parking_lot_id=eq.${parkingLotId}` }, () => {
        fetchSettings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rates', filter: `parking_lot_id=eq.${parkingLotId}` }, () => {
        fetchActiveRates();
      })
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
    const { data } = await supabase
      .from('parking_lots')
      .select('name, nit, address, phone, email, logo_url')
      .eq('id', parkingLotId)
      .single();
    if (data) {
      setGlobalSettings(data);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .eq('parking_lot_id', parkingLotId);
      
    if (data) {
      const entryFieldsData = data.find(d => d.key === 'entry_fields');
      if (entryFieldsData) setEntryFields(entryFieldsData.value);

      const capacityData = data.find(d => d.key === 'capacity_settings');
      if (capacityData) setCapacitySettings(capacityData.value);

      const revenueData = data.find(d => d.key === 'revenue_settings');
      if (revenueData) setRevenueSettings(revenueData.value);

      const specialData = data.find(d => d.key === 'special_vehicles');
      if (specialData) setSpecialVehicles(specialData.value);

      const privateSpotsData = data.find(d => d.key === 'private_spots');
      if (privateSpotsData) setPrivateSpots(privateSpotsData.value);

      const privateSpotFieldsData = data.find(d => d.key === 'private_spot_fields');
      if (privateSpotFieldsData) setPrivateSpotFields(privateSpotFieldsData.value);

      const permissionsData = data.find(d => d.key === 'guard_permissions');
      if (permissionsData) setGuardPermissions(permissionsData.value);
    }
  };

  const savePrivateSpots = async (updatedSpots: any[]) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'private_spots', value: updatedSpots, parking_lot_id: parkingLotId }, { onConflict: 'key,parking_lot_id' });
    if (error) {
      toast.error('Error al guardar parqueaderos privados: ' + error.message);
    } else {
      setPrivateSpots(updatedSpots);
      setEditingSpot(null);
    }
  };

  const fetchTotalRevenue = async (lastClosing: string | null) => {
    let query = supabase
      .from('parking_sessions')
      .select('amount_paid')
      .eq('status', 'completed')
      .eq('parking_lot_id', parkingLotId);

    if (lastClosing) {
      query = query.gte('exit_time', lastClosing);
    }

    const { data } = await query;
    if (data) {
      const total = data.reduce((sum, session) => sum + (session.amount_paid || 0), 0);
      setTotalRevenue(total);
    }
  };

  const fetchActiveSessions = async () => {
    const { data } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('status', 'active')
      .eq('parking_lot_id', parkingLotId)
      .order('entry_time', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchHistorySessions = useCallback(async () => {
    if (!guardPermissions.show_history) return;
    
    const cutoffDate = subDays(new Date(), guardPermissions.history_days).toISOString();
    
    const { data, error } = await supabase
      .from('parking_sessions')
      .select('*, rate:rates(name)')
      .eq('parking_lot_id', parkingLotId)
      .eq('status', 'completed')
      .gte('exit_time', cutoffDate)
      .order('exit_time', { ascending: false });
      
    if (!error && data) {
      setHistorySessions(data);
    }
  }, [guardPermissions, parkingLotId]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistorySessions();
    }
  }, [activeTab, guardPermissions, fetchHistorySessions]);

  const fetchActiveRates = async () => {
    const { data } = await supabase
      .from('rates')
      .select('*')
      .eq('is_active', true)
      .eq('parking_lot_id', parkingLotId)
      .order('name');
    if (data) setRates(data);
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlate(val);
    setAutoCompleted(false);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length >= 5) {
      searchTimeoutRef.current = setTimeout(async () => {
        // Buscamos la sesión más reciente para esta placa en este parqueadero
        const { data, error } = await supabase
          .from('parking_sessions')
          .select('vehicle_type, metadata')
          .eq('parking_lot_id', parkingLotId)
          .eq('license_plate', val)
          .order('entry_time', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastSession = data[0];
          setType(lastSession.vehicle_type);

          if (lastSession.metadata && typeof lastSession.metadata === 'object') {
            const filteredMetadata = { ...lastSession.metadata };
            // Limpiamos campos internos que no queremos autocompletar
            const internalFields = ['guard_name', 'checkout_guard_name', 'admin_checkout_observation', 'admin_checkout_by', 'admin_checkout_time'];
            internalFields.forEach(field => delete filteredMetadata[field]);

            setFieldValues(filteredMetadata);
          }
          setAutoCompleted(true);
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
        toast.error(`El ingreso de ${type === 'car' ? 'carros' : type === 'motorcycle' ? 'motos' : 'bicicletas'} no está permitido.`);
        setLoading(false);
        return;
      }

      const capacity = capacitySettings[`capacity_${type}s`];
      if (capacity > 0) {
        // Count active sessions for this type
        const { count } = await supabase
          .from('parking_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('vehicle_type', type)
          .eq('parking_lot_id', parkingLotId);

        if (count !== null && count >= capacity) {
          toast.error(`Capacidad máxima alcanzada para ${type === 'car' ? 'carros' : type === 'motorcycle' ? 'motos' : 'bicicletas'}. No se puede ingresar.`);
          setLoading(false);
          return;
        }
      }
    }

    // Check if already active
    const { data: existing } = await supabase
      .from('parking_sessions')
      .select('id')
      .eq('license_plate', formattedPlate)
      .eq('status', 'active')
      .eq('parking_lot_id', parkingLotId)
      .single();
      
    if (existing) {
      toast.error('Este vehículo ya se encuentra en el parqueadero.');
      setLoading(false);
      return;
    }

    const sessionMetadata = {
      ...fieldValues,
      guard_name: guardName
    };

    const { data: newSession, error } = await supabase.from('parking_sessions').insert({
      license_plate: formattedPlate,
      vehicle_type: type,
      guard_id: user.id,
      metadata: sessionMetadata,
      parking_lot_id: parkingLotId
    }).select().single();

    if (!error && newSession) {
      if (hasEntryNovelty && entryNoveltyObservation.trim()) {
        let photoUrl = null;
        if (entryNoveltyPhoto) {
          const fileExt = entryNoveltyPhoto.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${parkingLotId}/${newSession.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('novelties')
            .upload(filePath, entryNoveltyPhoto);
            
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('novelties')
              .getPublicUrl(filePath);
            photoUrl = publicUrlData.publicUrl;
          }
        }

        await supabase.from('vehicle_novelties').insert({
          parking_lot_id: parkingLotId,
          license_plate: formattedPlate,
          vehicle_type: 'visitor',
          observation: entryNoveltyObservation,
          photo_url: photoUrl,
          guard_name: guardName
        });
      }

      setPlate('');
      setFieldValues({});
      setAutoCompleted(false);
      setHasEntryNovelty(false);
      setEntryNoveltyObservation('');
      setEntryNoveltyPhoto(null);
      setMobileView('list');
      fetchActiveSessions();
      toast.error(`Ingreso registrado exitosamente.\nNúmero de Recibo: ${newSession.ticket_number}`);
    } else {
      if (error?.code === '23505') {
        toast.error('Este vehículo ya se encuentra en el parqueadero (sesión activa).');
      } else {
        toast.error(`Error al registrar ingreso: ${error?.message || 'Error desconocido'}`);
      }
    }
    setLoading(false);
  };

  const calculateCostWithRate = (session: any, rateRule: any, exitTime: Date = new Date()) => {
    if (!rateRule) return 0;
    const entryTime = new Date(session.entry_time);
    const mins = Math.max(1, differenceInMinutes(exitTime, entryTime));
    const hours = Math.ceil(mins / 60);
    const days = Math.ceil(mins / (60 * 24));
    
    switch (rateRule.type) {
      case 'minute':
        return mins * rateRule.rate;
      case 'hour':
        return hours * rateRule.rate;
      case 'hour_minute':
        if (mins <= 60) return rateRule.base_rate;
        return rateRule.base_rate + ((mins - 60) * rateRule.rate);
      case 'hour_fraction':
        if (mins <= 60) return rateRule.base_rate;
        const extraMins = mins - 60;
        const fractions = Math.ceil(extraMins / (rateRule.fraction_minutes || 60));
        return rateRule.base_rate + (fractions * rateRule.rate);
      case 'day_night': {
        const gracePeriodMins = rateRule.fraction_minutes || 15;
        const msGrace = gracePeriodMins * 60 * 1000;
        let totalCost = 0;
        
        // Find the start of the shift containing entryTime
        let currentShiftStart = new Date(entryTime);
        if (currentShiftStart.getHours() >= 6 && currentShiftStart.getHours() < 18) {
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
      case 'day':
      case 'night':
      case 'daily':
        return days * rateRule.rate;
      case 'flat':
        return rateRule.rate;
      default:
        return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCheckoutClick = (session: any) => {
    setCheckoutSession(session);
    setConfirmAmount(false);

    const specialVehicle = specialVehicles.find(v => v.plate === session.license_plate);
    if (specialVehicle) {
      setSelectedRateId('special');
      return;
    }

    // Find applicable rates
    const applicableRates = rates.filter(r => r.vehicle_type === 'all' || r.vehicle_type === session.vehicle_type);
    if (applicableRates.length > 0) {
      // Default to day_night, then hour_fraction, then minute, or first available
      const defaultRate = applicableRates.find(r => r.type === 'day_night') || 
                          applicableRates.find(r => r.type === 'hour_fraction') || 
                          applicableRates.find(r => r.type === 'minute') || 
                          applicableRates[0];
      setSelectedRateId(defaultRate.id);
    } else {
      setSelectedRateId('');
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
    if (selectedRateId === 'special') {
      const specialVehicle = specialVehicles.find(v => v.plate === checkoutSession.license_plate);
      cost = specialVehicle ? (specialVehicle.paid_to_admin ? 0 : specialVehicle.amount) : 0;
    } else {
      const selectedRate = rates.find(r => r.id === selectedRateId);
      cost = calculateCostWithRate(checkoutSession, selectedRate);
    }
    
    const updatedMetadata = {
      ...(checkoutSession.metadata || {}),
      checkout_guard_name: guardName
    };

    const { error } = await supabase
      .from('parking_sessions')
      .update({
        status: 'completed',
        exit_time: new Date().toISOString(),
        amount_paid: cost,
        rate_id: selectedRateId === 'special' ? null : selectedRateId,
        rate_name: selectedRateId === 'special' ? 'Tarifa Especial' : rates.find(r => r.id === selectedRateId)?.name || 'Desconocida',
        metadata: updatedMetadata
      })
      .eq('id', checkoutSession.id);

    if (!error) {
      setCheckoutSession(null);
      setCompletedSession({
        ...checkoutSession,
        exit_time: new Date().toISOString(),
        amount_paid: cost,
        rate: selectedRateId === 'special' ? { name: 'Tarifa Especial' } : rates.find(r => r.id === selectedRateId)
      });
      fetchActiveSessions();
      if (revenueSettings?.show_to_guards) {
        fetchTotalRevenue(revenueSettings.last_closing);
      }
    } else {
      toast.error('Error al registrar salida.');
    }
    setLoading(false);
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleWhatsAppShare = async () => {
    if (!completedSession || !whatsappNumber) return;
    
    setIsSharing(true);
    try {
      const receiptElement = document.getElementById('receipt-content');
      let imageCopied = false;
      
      if (receiptElement) {
        try {
          const canvas = await html2canvas(receiptElement, {
            scale: 2,
            backgroundColor: '#ffffff',
          });
          
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
          });
          
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              imageCopied = true;
            } catch (clipboardError) {
              console.warn('No se pudo copiar la imagen al portapapeles', clipboardError);
            }
          }
        } catch (canvasError) {
          console.error('Error generando la imagen del recibo', canvasError);
        }
      }

      const entryTime = format(new Date(completedSession.entry_time), 'dd/MM/yy h:mm a');
      const exitTime = format(new Date(completedSession.exit_time), 'dd/MM/yy h:mm a');
      const totalMinutes = Math.max(1, differenceInMinutes(new Date(completedSession.exit_time), new Date(completedSession.entry_time)));
      
      let message = `*RECIBO DE PARQUEADERO* 🚗\n\n` +
        `*Parqueadero:* ${globalSettings.name || 'Parqueadero'}\n` +
        `*Recibo No:* ${completedSession.ticket_number}\n` +
        `*Placa:* ${completedSession.license_plate}\n` +
        `*Ingreso:* ${entryTime}\n` +
        `*Salida:* ${exitTime}\n` +
        `*Tiempo Total:* ${totalMinutes} minutos\n` +
        `*Tarifa Aplicada:* ${completedSession.rate?.name || 'N/A'}\n` +
        `*Total Pagado:* ${formatCurrency(completedSession.amount_paid)}\n\n` +
        `¡Gracias por su visita!`;
        
      if (imageCopied) {
        message += `\n\n_(Puede pegar la imagen del recibo que se ha copiado en su portapapeles)_`;
      }

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    } catch (error) {
      console.error('Error al compartir', error);
      toast.error('Hubo un error al preparar el mensaje.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveGuardName = () => {
    if (!tempGuardName.trim()) {
      toast.error('Por favor, ingresa tu nombre.');
      return;
    }
    setGuardName(tempGuardName);
    localStorage.setItem('current_guard_name', tempGuardName);
    setShowGuardModal(false);
  };

  const handleLockScreen = () => {
    setGuardName('');
    setTempGuardName('');
    localStorage.removeItem('current_guard_name');
    setShowGuardModal(true);
  };

  const handleOpenNovelties = async (vehicle: any, type: 'visitor' | 'special') => {
    setNoveltyModalVehicle({ ...vehicle, type });
    setNoveltyLoading(true);
    
    const { data, error } = await supabase
      .from('vehicle_novelties')
      .select('*')
      .eq('parking_lot_id', parkingLotId)
      .eq('license_plate', vehicle.plate || vehicle.license_plate)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setNovelties(data);
    }
    setNoveltyLoading(false);
  };

  const handleSaveNovelty = async () => {
    if (!newNoveltyObservation.trim()) {
      toast.error('Por favor, ingresa una observación.');
      return;
    }
    
    setNoveltyLoading(true);
    let photoUrl = null;
    
    if (newNoveltyPhoto) {
      const fileExt = newNoveltyPhoto.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${parkingLotId}/${noveltyModalVehicle.plate || noveltyModalVehicle.license_plate}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('novelties')
        .upload(filePath, newNoveltyPhoto);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('novelties')
          .getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    const { data: newNovelty, error } = await supabase
      .from('vehicle_novelties')
      .insert({
        parking_lot_id: parkingLotId,
        license_plate: noveltyModalVehicle.plate || noveltyModalVehicle.license_plate,
        vehicle_type: noveltyModalVehicle.type,
        observation: newNoveltyObservation,
        photo_url: photoUrl,
        guard_name: guardName
      })
      .select()
      .single();

    if (!error && newNovelty) {
      setNovelties([newNovelty, ...novelties]);
      setNewNoveltyObservation('');
      setNewNoveltyPhoto(null);
      toast.error('Novedad registrada exitosamente.');
    } else {
      toast.error('Error al registrar la novedad.');
    }
    setNoveltyLoading(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareImage = async () => {
    if (!completedSession) return;
    
    setIsSharing(true);
    try {
      const receiptElement = document.getElementById('receipt-content');
      if (!receiptElement) return;

      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) throw new Error('No se pudo generar la imagen');

      const file = new File([blob], `recibo-${completedSession.ticket_number}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Recibo de Parqueadero',
          text: `Recibo No: ${completedSession.ticket_number}`,
        });
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recibo-${completedSession.ticket_number}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error al compartir imagen', error);
      toast.error('Hubo un error al generar la imagen.');
    } finally {
      setIsSharing(false);
    }
  };

  const applicableRates = checkoutSession ? rates.filter(r => r.vehicle_type === 'all' || r.vehicle_type === checkoutSession.vehicle_type) : [];
  
  let currentCost = 0;
  if (checkoutSession) {
    if (selectedRateId === 'special') {
      const specialVehicle = specialVehicles.find(v => v.plate === checkoutSession.license_plate);
      currentCost = specialVehicle ? (specialVehicle.paid_to_admin ? 0 : specialVehicle.amount) : 0;
    } else {
      const selectedRateObj = rates.find(r => r.id === selectedRateId);
      currentCost = selectedRateObj ? calculateCostWithRate(checkoutSession, selectedRateObj) : 0;
    }
  }

  const filteredSessions = sessions.filter(s => s.license_plate.includes(searchQuery.toUpperCase()));

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4 sm:gap-6 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden shadow-inner shrink-0 border border-indigo-100">
            <img src={globalSettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; }} />
            <Car className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 hidden" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 truncate leading-tight">
              {globalSettings.name || 'Control de Parqueadero'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">{globalSettings.address || 'Panel de Vigilancia'}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
          {onSwitchView && (
            <div className="bg-slate-100 rounded-xl p-1 flex border border-slate-200 shadow-sm order-1 md:order-none">
              <button
                onClick={() => onSwitchView('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] md:min-h-0 ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchView('guard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] md:min-h-0 ${currentView === 'guard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Vigilancia
              </button>
            </div>
          )}
          <button
            onClick={() => setShowPrivateSpots(true)}
            className="px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-colors font-medium text-xs sm:text-sm min-h-[44px] sm:min-h-0 order-2 md:order-none"
          >
            <Car className="w-4 h-4" />
            <span>Privados</span>
          </button>
          {revenueSettings?.show_to_guards && (
            <div className="bg-emerald-50 text-emerald-700 px-3 sm:px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2 font-medium text-xs sm:text-sm min-h-[44px] sm:min-h-0 order-3 md:order-none">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Recaudo: {formatCurrency(totalRevenue)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 order-last md:order-none ml-auto md:ml-0">
            <span className="text-xs sm:text-sm font-medium text-slate-700">Turno: {guardName || 'Sin asignar'}</span>
            <button
              onClick={handleLockScreen}
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors min-h-[32px]"
              title="Entregar Turno / Bloquear"
            >
              <UserCircle className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors font-medium text-xs sm:text-sm min-h-[44px] sm:min-h-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile View Toggle */}
      <div className="lg:hidden mb-8 bg-white rounded-2xl p-1.5 flex border border-slate-200 shadow-sm">
        <button
          onClick={() => setMobileView('entry')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2 ${mobileView === 'entry' ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Plus className="w-4 h-4" />
          Registrar Ingreso
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2 ${mobileView === 'list' ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Car className="w-4 h-4" />
          Vehículos Activos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Ingreso */}
        <div className={`lg:col-span-1 ${mobileView === 'entry' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Placa del Vehículo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={plate}
                    onChange={handlePlateChange}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white uppercase font-mono text-lg tracking-wider"
                    placeholder="ABC123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Vehículo</label>
                <div className={`grid gap-3 ${
                  [capacitySettings?.allow_cars !== false, capacitySettings?.allow_motorcycles !== false, capacitySettings?.allow_bicycles === true].filter(Boolean).length === 3 ? 'grid-cols-3' :
                  [capacitySettings?.allow_cars !== false, capacitySettings?.allow_motorcycles !== false, capacitySettings?.allow_bicycles === true].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  {capacitySettings?.allow_cars !== false && (
                    <button
                      type="button"
                      onClick={() => setType('car')}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'car' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Car className="w-6 h-6" />
                      <span className="font-medium text-sm">Carro</span>
                      {capacitySettings?.enforce && capacitySettings?.capacity_cars > 0 && (
                        <span className="text-xs font-medium opacity-75">
                          {capacitySettings.capacity_cars - sessions.filter(s => s.vehicle_type === 'car').length} disp.
                        </span>
                      )}
                    </button>
                  )}
                  {capacitySettings?.allow_motorcycles !== false && (
                    <button
                      type="button"
                      onClick={() => setType('motorcycle')}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'motorcycle' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Motorbike className="w-6 h-6" />
                      <span className="font-medium text-sm">Moto</span>
                      {capacitySettings?.enforce && capacitySettings?.capacity_motorcycles > 0 && (
                        <span className="text-xs font-medium opacity-75">
                          {capacitySettings.capacity_motorcycles - sessions.filter(s => s.vehicle_type === 'motorcycle').length} disp.
                        </span>
                      )}
                    </button>
                  )}
                  {capacitySettings?.allow_bicycles === true && (
                    <button
                      type="button"
                      onClick={() => setType('bicycle')}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'bicycle' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Bike className="w-6 h-6" />
                      <span className="font-medium text-sm">Bicicleta</span>
                      {capacitySettings?.enforce && capacitySettings?.capacity_bicycles > 0 && (
                        <span className="text-xs font-medium opacity-75">
                          {capacitySettings.capacity_bicycles - sessions.filter(s => s.vehicle_type === 'bicycle').length} disp.
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {entryFields.filter(f => f.enabled && f.label.trim().toLowerCase() !== 'placa').map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={field.required}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => setFieldValues({...fieldValues, [field.id]: e.target.value})}
                    className="block w-full px-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder={`Ingrese ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading || plate.length < 5}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm mt-4"
              >
                {loading ? 'Registrando...' : 'Dar Ingreso'}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Vehículos Activos e Historial */}
        <div className={`lg:col-span-2 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'active' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    Vehículos Activos
                  </button>
                  {guardPermissions.show_history && (
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      <History className="w-4 h-4" />
                      Historial (Minuta)
                    </button>
                  )}
                </div>
                {activeTab === 'active' && (
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por placa..."
                      className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] lg:max-h-[600px]">
              {activeTab === 'active' ? (
                filteredSessions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>{searchQuery ? 'No se encontraron vehículos con esa placa.' : 'No hay vehículos en el parqueadero en este momento.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSessions.map((session) => {
                      const mins = Math.max(1, differenceInMinutes(currentTime, new Date(session.entry_time)));
                      return (
                        <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${session.vehicle_type === 'car' ? 'bg-blue-50 text-blue-600' : session.vehicle_type === 'motorcycle' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                              {session.vehicle_type === 'car' ? <Car className="w-6 h-6" /> : session.vehicle_type === 'motorcycle' ? <Motorbike className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 font-mono tracking-wider">{session.license_plate}</h3>
                                {session.ticket_number && (
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                                    #{session.ticket_number}
                                  </span>
                                )}
                              </div>
                              {session.metadata && Object.keys(session.metadata).length > 0 && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 mb-1">
                                  {Object.entries(session.metadata)
                                    .filter(([k]) => k !== 'guard_name' && k !== 'checkout_guard_name' && k !== 'admin_checkout_observation' && k !== 'admin_checkout_by' && k !== 'admin_checkout_time')
                                    .sort(([keyA], [keyB]) => {
                                      const labelA = entryFields.find(f => f.id === keyA)?.label?.toLowerCase() || '';
                                      const labelB = entryFields.find(f => f.id === keyB)?.label?.toLowerCase() || '';
                                      if (labelA.includes('nombre')) return -1;
                                      if (labelB.includes('nombre')) return 1;
                                      return 0;
                                    })
                                    .map(([key, value]) => {
                                      const fieldDef = entryFields.find(f => f.id === key);
                                      const displayLabel = fieldDef ? fieldDef.label : key;
                                      const isNameField = displayLabel.toLowerCase().includes('nombre');

                                      return (
                                        <span key={key} className={`${isNameField ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded-md font-medium`}>
                                          {isNameField ? String(value) : `${displayLabel}: ${value}`}
                                        </span>
                                      );
                                    })}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{format(new Date(session.entry_time), 'dd/MM/yy h:mm a')}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-indigo-600">{mins} min</span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleCheckoutClick(session)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
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
                      <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                        <th className="px-4 py-3 font-medium">Recibo</th>
                        <th className="px-4 py-3 font-medium">Placa</th>
                        <th className="px-4 py-3 font-medium">Tipo</th>
                        <th className="px-4 py-3 font-medium">Ingreso</th>
                        <th className="px-4 py-3 font-medium">Salida</th>
                        <th className="px-4 py-3 font-medium">Tiempo</th>
                        <th className="px-4 py-3 font-medium">Tarifa</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historySessions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            No hay registros en el historial para el período seleccionado.
                          </td>
                        </tr>
                      ) : (
                        historySessions.map((session) => {
                          const mins = Math.max(1, differenceInMinutes(new Date(session.exit_time), new Date(session.entry_time)));
                          return (
                            <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-500 text-sm">{session.ticket_number}</td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-800">{session.license_plate}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {session.vehicle_type === 'car' ? 'Carro' : session.vehicle_type === 'motorcycle' ? 'Moto' : 'Bicicleta'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{format(new Date(session.entry_time), 'dd/MM/yy h:mm a')}</td>
                              <td className="px-4 py-3 text-slate-600">{format(new Date(session.exit_time), 'dd/MM/yy h:mm a')}</td>
                              <td className="px-4 py-3 text-slate-600">{mins} min</td>
                              <td className="px-4 py-3 text-slate-600">{session.rate_name || session.rate?.name || 'Tarifa Especial'}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(session.amount_paid || 0)}</td>
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
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Car className="w-6 h-6 text-indigo-600" />
                Parqueaderos Privados
              </h2>
              <button 
                onClick={() => setShowPrivateSpots(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 border-b border-slate-100 bg-white">
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
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={privateSpotsSort}
                    onChange={(e) => setPrivateSpotsSort(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    {privateSpotFields.filter(f => f.enabled).map(field => (
                      <option key={field.id} value={field.id}>Por {field.label}</option>
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
                    .map(spot => {
                    const activeSession = sessions.find(s => s.license_plate === spot.licensePlate);
                    return (
                      <div key={spot.id} className="border border-slate-200 rounded-2xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10"></div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-2xl font-bold text-indigo-900">{spot.spotNumber || 'N/A'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingSpot(spot)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${activeSession ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {activeSession ? 'Ocupado' : 'Libre'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {privateSpotFields.filter(f => f.enabled && f.id !== 'spotNumber').map(field => (
                            <p key={field.id} className="text-sm text-slate-600">
                              <span className="font-medium text-slate-800">{field.label}:</span>{' '}
                              <span className={field.id === 'licensePlate' ? 'font-mono' : ''}>
                                {field.id === 'vehicleType' 
                                  ? (spot[field.id] === 'car' ? 'Carro' : spot[field.id] === 'motorcycle' ? 'Moto' : spot[field.id] === 'bicycle' ? 'Bicicleta' : spot[field.id])
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
              <h2 className="text-xl font-bold text-slate-800">Editar Parqueadero</h2>
              <button onClick={() => setEditingSpot(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updatedSpot: any = { ...editingSpot };
              privateSpotFields.forEach(field => {
                if (field.enabled) {
                  updatedSpot[field.id] = formData.get(field.id)?.toString() || '';
                  if (field.id === 'licensePlate') {
                    updatedSpot[field.id] = updatedSpot[field.id].toUpperCase();
                  }
                }
              });
              savePrivateSpots(privateSpots.map(s => s.id === editingSpot.id ? updatedSpot : s));
              setEditingSpot(null);
            }} className="p-6 space-y-4">
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
                <button type="button" onClick={() => setEditingSpot(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recibo (Completed Session) */}
      {completedSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                Pago Exitoso
              </h2>
              <p className="text-slate-500 mb-6 font-mono text-lg">{completedSession.license_plate}</p>
              
              <div id="receipt-content" className="bg-white p-8 mb-6 text-left border border-slate-200 shadow-sm relative mx-auto w-full max-w-[320px] font-sans">
                {/* Simulated Paper Edge */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100"></div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="text-center mb-6 border-b-2 border-dashed border-slate-300 pb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 shadow-sm border-2 border-slate-100 bg-white">
                      <img src={globalSettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} />
                      <div className="w-full h-full bg-slate-50 hidden items-center justify-center">
                        <Car className="w-12 h-12 text-slate-400" />
                      </div>
                    </div>
                    <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-none mb-1">{globalSettings.name || 'Parqueadero'}</h3>
                    {globalSettings.nit && (
                      <p className="text-[11px] font-bold text-slate-500 font-mono">NIT: {globalSettings.nit}</p>
                    )}
                    {globalSettings.address && (
                      <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase leading-tight px-4">{globalSettings.address}</p>
                    )}
                    {globalSettings.phone && (
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">TEL: {globalSettings.phone}</p>
                    )}

                    <div className="mt-5 border-t border-b border-slate-200 py-1 inline-block px-4">
                      <p className="text-[10px] font-black text-slate-900 tracking-[0.3em] uppercase">Recibo No: {completedSession.ticket_number}</p>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="space-y-6">
                    {/* Plate Section */}
                    <div className="text-center bg-slate-900 text-white py-3 rounded-lg shadow-inner">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Placa del Vehículo</p>
                      <p className="text-4xl font-black font-mono tracking-[0.1em]">{completedSession.license_plate}</p>
                    </div>

                    {/* Times & Info Grid */}
                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-b-2 border-dashed border-slate-200 pb-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight">
                          {format(new Date(completedSession.entry_time), 'dd/MM/yyyy')}<br/>
                          <span className="text-base tracking-tight">{format(new Date(completedSession.entry_time), 'h:mm a')}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salida</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight">
                          {format(new Date(completedSession.exit_time), 'dd/MM/yyyy')}<br/>
                          <span className="text-base tracking-tight">{format(new Date(completedSession.exit_time), 'h:mm a')}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiempo Total</p>
                        <p className="text-sm font-black text-slate-900">{Math.max(1, differenceInMinutes(new Date(completedSession.exit_time), new Date(completedSession.entry_time)))} Minutos</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo Tarifa</p>
                        <p className="text-xs font-bold text-slate-800 truncate" title={completedSession.rate?.name}>{completedSession.rate?.name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Total Section */}
                    <div className="pt-2">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total Cobrado</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">COP</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                        <span className="text-4xl font-black text-emerald-600 leading-none">{formatCurrency(completedSession.amount_paid)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-10 text-center space-y-4">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] italic">¡Gracias por preferirnos!</p>
                    <div className="flex justify-center items-center gap-1 opacity-20 grayscale">
                      <div className="h-[1px] w-8 bg-black"></div>
                      <Car className="w-3 h-3" />
                      <div className="h-[1px] w-8 bg-black"></div>
                    </div>
                  </div>
                </div>

                {/* Simulated Paper Bottom */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100"></div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Enviar por WhatsApp</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="Número (ej. 573001234567)"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      onClick={handleWhatsAppShare}
                      disabled={!whatsappNumber || isSharing}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSharing ? 'Preparando...' : 'Enviar'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-left">
                    Se copiará una imagen del recibo al portapapeles para que pueda pegarla en el chat.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCompletedSession(null);
                    setWhatsappNumber('');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleShareImage}
                  disabled={isSharing}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {checkoutSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAmount ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                {confirmAmount ? <DollarSign className="w-8 h-8 text-emerald-600" /> : <CheckCircle className="w-8 h-8 text-indigo-600" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {confirmAmount ? 'Confirmar Pago' : 'Confirmar Salida'}
              </h2>
              <p className="text-slate-500 mb-6 font-mono text-lg">{checkoutSession.license_plate}</p>
              
              {!confirmAmount ? (
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Ingreso:</span>
                    <span className="font-medium text-slate-800">{format(new Date(checkoutSession.entry_time), 'dd/MM/yy h:mm a')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Salida:</span>
                    <span className="font-medium text-slate-800">{format(new Date(), 'dd/MM/yy h:mm a')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tiempo Transcurrido:</span>
                    <span className="font-medium text-slate-800">{Math.max(1, differenceInMinutes(new Date(), new Date(checkoutSession.entry_time)))} minutos</span>
                  </div>
                  
                  {selectedRateId === 'special' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Tarifa Aplicada:</span>
                      <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Tarifa Especial</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">Total a Pagar:</span>
                    <span className="text-2xl font-bold text-indigo-600">{formatCurrency(currentCost)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-6">
                  <p className="text-emerald-800 mb-2">¿Confirma que ha recibido el pago exacto de:</p>
                  <p className="text-4xl font-bold text-emerald-600">{formatCurrency(currentCost)}?</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => confirmAmount ? setConfirmAmount(false) : setCheckoutSession(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  {confirmAmount ? 'Atrás' : 'Cancelar'}
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading || !selectedRateId}
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-medium disabled:opacity-50 transition-colors shadow-sm ${confirmAmount ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {loading ? 'Procesando...' : (confirmAmount ? 'Sí, Dar Salida' : 'Cobrar')}
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
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-indigo-50">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Turno de Guarda
              </h2>
              <p className="text-slate-500 mb-6 text-sm">
                Por favor, ingresa tu nombre para registrar las operaciones a tu cargo.
              </p>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Guarda</label>
                  <input
                    type="text"
                    value={tempGuardName}
                    onChange={(e) => setTempGuardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGuardName()}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="Ej. Juan Pérez"
                    autoFocus
                  />
                </div>
                
                <button
                  onClick={handleSaveGuardName}
                  disabled={!tempGuardName.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
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
