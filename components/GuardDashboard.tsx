'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Car, Bike, Clock, LogOut, CheckCircle, Search, DollarSign } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

export default function GuardDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [entryFields, setEntryFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<'car' | 'motorcycle'>('car');
  const [loading, setLoading] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchActiveSessions();
    fetchActiveRates();
    fetchEntryFields();
    
    // Refresh times every minute without re-fetching data
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchEntryFields = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'entry_fields')
      .single();
    if (data && data.value) {
      setEntryFields(data.value);
    }
  };

  const fetchActiveSessions = async () => {
    const { data } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('status', 'active')
      .order('entry_time', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchActiveRates = async () => {
    const { data } = await supabase
      .from('rates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setRates(data);
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate) return;
    setLoading(true);
    
    const formattedPlate = plate.trim().toUpperCase();
    
    // Check if already active
    const { data: existing } = await supabase
      .from('parking_sessions')
      .select('id')
      .eq('license_plate', formattedPlate)
      .eq('status', 'active')
      .single();
      
    if (existing) {
      alert('Este vehículo ya se encuentra en el parqueadero.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('parking_sessions').insert({
      license_plate: formattedPlate,
      vehicle_type: type,
      guard_id: user.id,
      metadata: fieldValues
    });

    if (!error) {
      setPlate('');
      setFieldValues({});
      fetchActiveSessions();
    } else {
      alert('Error al registrar ingreso.');
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
    
    const selectedRate = rates.find(r => r.id === selectedRateId);
    const cost = calculateCostWithRate(checkoutSession, selectedRate);
    
    const { error } = await supabase
      .from('parking_sessions')
      .update({
        status: 'completed',
        exit_time: new Date().toISOString(),
        amount_paid: cost
      })
      .eq('id', checkoutSession.id);

    if (!error) {
      setCheckoutSession(null);
      fetchActiveSessions();
    } else {
      alert('Error al registrar salida.');
    }
    setLoading(false);
  };

  const applicableRates = checkoutSession ? rates.filter(r => r.vehicle_type === 'all' || r.vehicle_type === checkoutSession.vehicle_type) : [];
  const selectedRateObj = rates.find(r => r.id === selectedRateId);
  const currentCost = checkoutSession && selectedRateObj ? calculateCostWithRate(checkoutSession, selectedRateObj) : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Parqueadero</h1>
          <p className="text-slate-500 text-sm">Panel de Vigilancia - {user.email}</p>
        </div>
        
        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Ingreso */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Registrar Ingreso
            </h2>
            
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
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white uppercase font-mono text-lg tracking-wider"
                    placeholder="ABC123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Vehículo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('car')}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'car' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Car className="w-6 h-6" />
                    <span className="font-medium text-sm">Carro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('motorcycle')}
                    className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'motorcycle' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Bike className="w-6 h-6" />
                    <span className="font-medium text-sm">Moto</span>
                  </button>
                </div>
              </div>

              {entryFields.filter(f => f.enabled).map(field => (
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

        {/* Lista de Vehículos Activos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Vehículos en Parqueadero</h2>
              <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm font-medium">
                {sessions.length} activos
              </span>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No hay vehículos en el parqueadero en este momento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => {
                  const mins = Math.max(1, differenceInMinutes(currentTime, new Date(session.entry_time)));
                  return (
                    <div key={session.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${session.vehicle_type === 'car' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {session.vehicle_type === 'car' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 font-mono tracking-wider">{session.license_plate}</h3>
                          {session.metadata && Object.keys(session.metadata).length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 mb-1">
                              {Object.entries(session.metadata).map(([key, value]) => (
                                <span key={key} className="bg-slate-100 px-2 py-0.5 rounded-md">
                                  <strong className="capitalize">{key}:</strong> {String(value)}
                                </span>
                              ))}
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
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
