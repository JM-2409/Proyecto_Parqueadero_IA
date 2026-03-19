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
  const [globalSettings, setGlobalSettings] = useState<{ app_name: string, logo_url: string | null }>({ app_name: 'NexoPark', logo_url: null });

  useEffect(() => {
    // Fetch global settings
    supabase.from('global_app_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setGlobalSettings({ app_name: data.app_name, logo_url: data.logo_url });
      }
    });

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
        const { data: myRole } = await supabase.from('user_roles').select('role, parking_lot_id').eq('user_id', currentUser.id).limit(1).single();
        
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
          {/* Header Rediseñado */}
          <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/80 backdrop-blur-xl border border-slate-200/60 z-50 rounded-[2rem] shadow-lg transition-all duration-300">
            <div className="px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-indigo-300 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-md">
                    <img src="/logo.png" alt={globalSettings.app_name} className="w-full h-full object-cover transform transition duration-500 group-hover:scale-110" />
                  </div>
                </div>
                <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-900">{globalSettings.app_name}</span>
              </div>
              
              <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all">Características</button>
                <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all">Precios</button>
                <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all">Contacto</button>
              </nav>

              <button
                onClick={() => setShowLogin(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-black transition-all duration-300 shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-widest"
              >
                <span>Acceso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              El control total de tu <span className="text-indigo-600">parqueadero</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
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
                <h2 className="text-3xl font-bold text-slate-900 mb-4">¿Para qué sirve {globalSettings.app_name}?</h2>
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
                  <a href="https://checkout.bold.co/payment/LNK_IL54FGTSDC" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
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
                  <a href="https://checkout.bold.co/payment/LNK_8O3EX4CD1E" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-50 transition-colors">
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
                  <a href="https://checkout.bold.co/payment/LNK_HEOP6AYS3L" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
                    Suscribirse
                  </a>
                </div>
              </div>
              
              <div className="mt-12 bg-slate-800/50 rounded-2xl p-6 max-w-3xl mx-auto border border-slate-700 text-sm text-slate-300">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-400"/> Información de Pago Importante</h4>
                <p className="mb-3">Vas a pagar a <strong className="text-white">Park app</strong>. Confirma que el método de pago que elijas:</p>
                <ul className="space-y-2 ml-2">
                  <li className="flex items-start gap-2"><span className="text-lg">💸</span> <span>Tenga dinero disponible.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">✅</span> <span>No esté bloqueado ni restringido.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">🛍️</span> <span>Esté habilitado para compras internacionales si tu tarjeta no es Colombiana.</span></li>
                  <li className="flex items-start gap-2"><span className="text-lg">👌</span> <span>Tenga topes que le permitan pagar el valor de tu compra.</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Form */}
          <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Contáctanos</h2>
                <p className="text-lg text-slate-600">¿Tienes dudas o necesitas un plan personalizado? Escríbenos.</p>
              </div>
              <form action="https://formspree.io/f/xyzpjjdy" method="POST" className="space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input type="text" name="name" id="name" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" name="email" id="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Mensaje</label>
                  <textarea name="message" id="message" rows={4} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"></textarea>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-slate-700">
                  <img src="/logo.png" alt={globalSettings.app_name} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-lg text-white">{globalSettings.app_name}</span>
              </div>
              <p className="text-sm text-center md:text-left">
                &copy; {new Date().getFullYear()} {globalSettings.app_name}. Todos los derechos reservados.
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Términos</a>
                <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200 rounded-full blur-[100px] opacity-30"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-200 rounded-full blur-[100px] opacity-30"></div>
        </div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500">
          <button
            onClick={() => setShowLogin(false)}
            className="absolute top-8 left-8 p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all active:scale-95"
            title="Volver"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>

          <div className="text-center mb-10">
            <div className="relative inline-block group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center mx-auto shadow-xl border-4 border-white overflow-hidden bg-white">
                <img src="/logo.png" alt={globalSettings.app_name} className="w-full h-full object-cover transform transition duration-700 group-hover:scale-110" />
              </div>
            </div>
            <h1 className="mt-6 text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">{globalSettings.app_name}</h1>
            <p className="text-slate-500 font-medium mt-2">Acceso a la plataforma administrativa</p>
          </div>
          
          {authError && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-bold animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {authError}
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-400"
                  placeholder="ej. guard1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Segura</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-all duration-300 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
            >
              {authLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} {globalSettings.app_name} cloud v2.0
          </p>
        </div>
      </div>
    );
  }

  if (subscriptionExpired && role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-30"></div>
        </div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Suscripción Expirada</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            El tiempo de uso de la plataforma ha culminado. Para continuar utilizando <strong className="text-indigo-600 font-black">{globalSettings.app_name}</strong>, por favor renueva tu suscripción.
          </p>
          
          <div className="space-y-4">
            <a
              href="https://checkout.bold.co/payment/LNK_IL54FGTSDC"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-all duration-300 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-sm"
            >
              Renovar Suscripción
            </a>

            <button
              onClick={handleLogout}
              className="w-full py-4 text-slate-400 hover:text-slate-900 font-bold uppercase tracking-widest text-xs transition-colors"
            >
              Cerrar Sesión actual
            </button>
          </div>
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
