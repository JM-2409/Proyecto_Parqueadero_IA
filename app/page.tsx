'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import GuardDashboard from '@/components/GuardDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { Car, User, Lock, Loader2, Target, Eye, ShieldCheck, Clock, BarChart3, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'superadmin' | 'admin' | 'guard' | null>(null);
  const [viewMode, setViewMode] = useState<'superadmin' | 'admin' | 'guard' | null>(null);
  const [parkingLotId, setParkingLotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  
  // Auth form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserSession(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserSession(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = async (currentUser: any) => {
    setUser(currentUser);
    setSubscriptionExpired(false);
    
    if (currentUser) {
      // Check role
      const { data: roles } = await supabase.from('user_roles').select('*');
      
      if (!roles || roles.length === 0) {
        // First user becomes superadmin
        await supabase.from('user_roles').insert({ user_id: currentUser.id, role: 'superadmin' });
        setRole('superadmin');
        setViewMode('superadmin');
        setParkingLotId(null);
      } else {
        const { data: myRole } = await supabase.from('user_roles').select('role, parking_lot_id').eq('user_id', currentUser.id).single();
        
        let currentLotId = myRole?.parking_lot_id;
        let currentRole = myRole?.role as 'superadmin' | 'admin' | 'guard';

        if (!myRole) {
          // If no role, assign guard and try to assign to the first parking lot
          const { data: firstLot } = await supabase.from('parking_lots').select('id').limit(1).single();
          currentLotId = firstLot?.id || null;
          await supabase.from('user_roles').insert({ user_id: currentUser.id, role: 'guard', parking_lot_id: currentLotId });
          currentRole = 'guard';
        }

        setRole(currentRole);
        setViewMode(currentRole);
        setParkingLotId(currentLotId);

        // Check subscription if not superadmin
        if (currentRole !== 'superadmin' && currentLotId) {
          const { data: lotData } = await supabase
            .from('parking_lots')
            .select('subscription_end_date, status')
            .eq('id', currentLotId)
            .single();

          if (lotData) {
            const isExpired = new Date(lotData.subscription_end_date) < new Date() || lotData.status === 'suspended';
            if (isExpired) {
              setSubscriptionExpired(true);
            }
          }
        }
      }
    } else {
      setRole(null);
      setViewMode(null);
      setParkingLotId(null);
    }
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Format email to use as username if it doesn't contain @
      const cleanUsername = username.trim().toLowerCase();
      const loginEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@parqueadero.local`;
      const originalEmail = username.includes('@') ? username : `${username}@parqueadero.local`;
      
      let { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      
      if (error && error.message.includes('Invalid login credentials')) {
        // Try with original username in case it was created before the trim/lowercase change
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: originalEmail,
          password,
        });
        
        if (retryError) {
          // If both fail, check if this is the first user ever
          const { data: roles } = await supabase.from('user_roles').select('id').limit(1);
          if (!roles || roles.length === 0) {
            // First user, sign up automatically
            const { error: signUpError } = await supabase.auth.signUp({
              email: loginEmail,
              password,
            });
            if (signUpError) throw signUpError;
          } else {
            throw retryError;
          }
        }
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError('Usuario o contraseña incorrectos.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (!showLogin) {
      return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
          {/* Header */}
          <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="ParqueoPro" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} />
                <div className="w-8 h-8 bg-indigo-600 rounded-lg hidden items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800">ParqueoPro</span>
              </div>
              <button
                onClick={() => setShowLogin(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-5 py-2 rounded-full font-medium transition-colors shadow-sm text-sm sm:text-base"
              >
                <span className="sm:hidden">Login</span>
                <span className="hidden sm:inline">Ingresar a la Plataforma</span>
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              El control total de tu <span className="text-indigo-600">parqueadero</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Software en la nube diseñado para administrar estacionamientos de manera eficiente. Controla ingresos, salidas, tarifas, mensualidades y cierres de caja en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg hover:shadow-xl">
                Ver Planes y Precios
              </button>
            </div>
          </section>

          {/* Vision & Mission */}
          <section className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Nuestra Misión</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Proveer a los administradores de parqueaderos una herramienta tecnológica intuitiva, segura y accesible que simplifique sus operaciones diarias, evite fugas de dinero y mejore la experiencia tanto del personal como de los clientes.
                  </p>
                </div>
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                    <Eye className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Nuestra Visión</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Ser la plataforma líder en gestión de estacionamientos en Latinoamérica, reconocida por nuestra innovación continua, soporte excepcional y capacidad para adaptarnos a las necesidades de cualquier tipo de parqueadero, desde pequeños lotes hasta grandes complejos comerciales.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">¿Para qué sirve ParqueoPro?</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">Todo lo que necesitas para operar tu negocio sin complicaciones.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <ShieldCheck className="w-10 h-10 text-indigo-600 mb-4" />
                  <h4 className="text-xl font-bold mb-2">Control de Seguridad</h4>
                  <p className="text-slate-600">Registra placas, tipos de vehículos y novedades (rayones, golpes) con evidencia fotográfica al instante.</p>
                </div>
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <Clock className="w-10 h-10 text-indigo-600 mb-4" />
                  <h4 className="text-xl font-bold mb-2">Tarifas Flexibles</h4>
                  <p className="text-slate-600">Configura cobros por minuto, hora, fracción, día o noche. El sistema calcula automáticamente el valor a pagar.</p>
                </div>
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <BarChart3 className="w-10 h-10 text-indigo-600 mb-4" />
                  <h4 className="text-xl font-bold mb-2">Reportes y Cierres</h4>
                  <p className="text-slate-600">Visualiza ingresos en tiempo real, realiza cierres de caja por turno y mantén un historial detallado de operaciones.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-20 bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes de Suscripción</h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">Elige el plan que mejor se adapte a tu negocio. Paga de forma segura a través de Bold.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Mensual */}
                <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col">
                  <h3 className="text-2xl font-bold mb-2">Mensual</h3>
                  <p className="text-slate-400 mb-6">Ideal para empezar</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">$50.000</span>
                    <span className="text-slate-400">/mes</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Soporte básico</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_K28068U1KC" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
                    Suscribirse
                  </a>
                </div>

                {/* Semestral */}
                <div className="bg-indigo-600 rounded-3xl p-8 border border-indigo-500 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-400 text-white px-3 py-1 rounded-full text-sm font-bold tracking-wide">
                    MÁS POPULAR
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Semestral</h3>
                  <p className="text-indigo-200 mb-6">Ahorra un 10%</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">$270.000</span>
                    <span className="text-indigo-200">/6 meses</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> <span>Soporte prioritario</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-white" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_K28068U1KC" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-50 transition-colors">
                    Suscribirse
                  </a>
                </div>

                {/* Anual */}
                <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 flex flex-col">
                  <h3 className="text-2xl font-bold mb-2">Anual</h3>
                  <p className="text-slate-400 mb-6">Ahorra un 20%</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">$480.000</span>
                    <span className="text-slate-400">/año</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Soporte 24/7</span></li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_K28068U1KC" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
                    Suscribirse
                  </a>
                </div>
              </div>
              
              <div className="mt-12 bg-slate-800/50 rounded-2xl p-6 max-w-3xl mx-auto border border-slate-700 text-sm text-slate-300">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-400"/> Información de Pago Importante</h4>
                <p className="mb-3">Vas a pagar a <strong className="text-white">Juan munar</strong>. Confirma que el método de pago que elijas:</p>
                <ul className="space-y-2 ml-2">
                  <li className="flex items-start gap-2"><span className="text-lg">💸</span> <span>Tenga dinero disponible.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">✅</span> <span>No esté bloqueado ni restringido.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">🛍️</span> <span>Esté habilitado para compras internacionales si tu tarjeta no es Colombiana.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">👌</span> <span>Tenga topes que le permitan pagar el valor de tu compra.</span></li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative">
          <button onClick={() => setShowLogin(false)} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600">
            <ArrowRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner mt-4 overflow-hidden">
            <img src="/logo.png" alt="ParqueoPro" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; }} />
            <Car className="w-10 h-10 text-indigo-600 hidden" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">ParqueoPro</h1>
          <p className="text-slate-500 mb-8 text-center leading-relaxed">
            Inicia sesión para continuar
          </p>
          
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="ej. guard1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm mt-6"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (subscriptionExpired && role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Suscripción Expirada</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            El tiempo de uso de la plataforma ha culminado. Para continuar utilizando ParqueoPro, por favor renueva tu suscripción.
          </p>
          
          <a href="https://checkout.bold.co/payment/LNK_K28068U1KC" target="_blank" rel="noopener noreferrer" className="w-full block py-4 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm mb-4">
            Renovar Suscripción
          </a>
          
          <button onClick={handleLogout} className="text-slate-500 hover:text-slate-700 font-medium">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12 pt-6">
      {viewMode === 'superadmin' ? (
        <SuperAdminDashboard user={user} onLogout={handleLogout} />
      ) : viewMode === 'admin' ? (
        <AdminDashboard 
          user={user} 
          onLogout={handleLogout} 
          userRole={role as 'admin'} 
          parkingLotId={parkingLotId} 
          onSwitchView={role === 'admin' ? setViewMode : undefined}
          currentView={viewMode}
        />
      ) : (
        <GuardDashboard 
          user={user} 
          onLogout={handleLogout} 
          parkingLotId={parkingLotId} 
          onSwitchView={role === 'admin' ? setViewMode : undefined}
          currentView={viewMode as 'admin' | 'guard'}
        />
      )}
    </main>
  );
}
