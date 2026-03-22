'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import GuardDashboard from '@/components/GuardDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { Car, User, Lock, Loader2, Target, Eye, ShieldCheck, Clock, BarChart3, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'superadmin' | 'admin' | 'guard' | null>(null);
  const [viewMode, setViewMode] = useState<'superadmin' | 'admin' | 'guard' | null>(null);
  const [parkingLotId, setParkingLotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  
  // Auth form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<{ app_name: string, logo_url: string | null }>({ app_name: 'NexoPark', logo_url: null });

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("https://formspree.io/f/xyzpjjdy", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        toast.success("¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.");
        form.reset();
      } else {
        toast.error("Hubo un problema al enviar el mensaje. Por favor, intenta de nuevo.");
      }
    } catch (error) {
      toast.error("Error de red al enviar el mensaje.");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  useEffect(() => {
    // Fetch global settings
    supabase.from('global_app_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setGlobalSettings({ app_name: data.app_name, logo_url: data.logo_url });
      }
    });

    // Dark Mode initialization
    const storedDarkMode = localStorage.getItem('dark_mode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (storedDarkMode) {
      document.documentElement.classList.add('dark');
    }

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

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('dark_mode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
        <div className="min-h-screen bg-brand-bg/10 text-slate-900 font-sans transition-colors duration-300">
          {/* Header Rediseñado */}
          <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/80 backdrop-blur-xl border border-white z-50 rounded-[2.5rem] shadow-xl transition-all duration-300">
            <div className="px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-full blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-md bg-white">
                    <img
                      src={globalSettings.logo_url || "/logo.png"}
                      alt={globalSettings.app_name}
                      className="w-full h-full object-cover transform transition duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                </div>
                <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-900">{globalSettings.app_name}</span>
              </div>
              
              <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-brand-accent hover:bg-white rounded-xl transition-all">Características</button>
                <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-brand-accent hover:bg-white rounded-xl transition-all">Precios</button>
                <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-brand-accent hover:bg-white rounded-xl transition-all">Contacto</button>
              </nav>

              <button
                onClick={() => setShowLogin(true)}
                className="bg-brand-accent hover:brightness-110 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-black transition-all duration-300 shadow-lg shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 text-xs sm:text-sm flex items-center gap-2 uppercase tracking-widest"
              >
                <span>Acceso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-brand-primary mb-6 uppercase">
              El control total de tu <span className="text-brand-accent">parqueadero</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              Software en la nube diseñado para administrar estacionamientos de manera eficiente. Controla ingresos, salidas, tarifas, mensualidades y cierres de caja en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-primary hover:brightness-110 text-white px-10 py-4 rounded-[2.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-brand-primary/20">
                Ver Planes y Precios
              </button>
            </div>
          </section>

          {/* Vision & Mission */}
          <section className="py-24 bg-white/40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-xl border border-white group hover:-translate-y-2 transition-transform duration-500">
                  <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-7 h-7 text-brand-accent" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Nuestra Misión</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Proveer a los administradores de parqueaderos una herramienta tecnológica intuitiva, segura y accesible que simplifique sus operaciones diarias, evite fugas de dinero y mejore la experiencia tanto del personal como de los clientes.
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-xl border border-white group hover:-translate-y-2 transition-transform duration-500">
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
          <section id="features" className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                <h2 className="text-4xl font-black text-brand-primary mb-4 uppercase tracking-tighter">¿Para qué sirve {globalSettings.app_name}?</h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">Todo lo que necesitas para operar tu negocio sin complicaciones.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-10">
                <div className="p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6 text-brand-accent" />
                  </div>
                  <h4 className="text-xl font-black text-brand-primary mb-3 uppercase tracking-tight">Control de Seguridad</h4>
                  <p className="text-slate-600 leading-relaxed text-sm font-medium">Registra placas, tipos de vehículos y novedades (rayones, golpes) con evidencia fotográfica al instante.</p>
                </div>
                <div className="p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-brand-accent" />
                  </div>
                  <h4 className="text-xl font-black text-brand-primary mb-3 uppercase tracking-tight">Tarifas Flexibles</h4>
                  <p className="text-slate-600 leading-relaxed text-sm font-medium">Configura cobros por minuto, hora, fracción, día o noche. El sistema calcula automáticamente el valor a pagar.</p>
                </div>
                <div className="p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-brand-accent" />
                  </div>
                  <h4 className="text-xl font-black text-brand-primary mb-3 uppercase tracking-tight">Reportes y Cierres</h4>
                  <p className="text-slate-600 leading-relaxed text-sm font-medium">Visualiza ingresos en tiempo real, realiza cierres de caja por turno y mantén un historial detallado de operaciones.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-24 bg-brand-primary text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent rounded-full blur-[150px] opacity-20 -mr-48 -mt-48"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-20">
                <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">Planes de Suscripción</h2>
                <p className="text-lg text-slate-300 max-w-2xl mx-auto font-medium">Elige el plan que mejor se adapte a tu negocio. Paga de forma segura a través de Bold.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                {/* Mensual */}
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col hover:bg-slate-800/60 transition-all">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Mensual</h3>
                  <p className="text-slate-400 mb-8 text-sm font-medium">Ideal para empezar</p>
                  <div className="mb-10">
                    <span className="text-5xl font-black">$50.000</span>
                    <span className="text-slate-400 font-bold">/mes</span>
                  </div>
                  <ul className="space-y-5 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Soporte básico</span></li>
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_IL54FGTSDC" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-4 px-6 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-brand-accent/20">
                    Suscribirse
                  </a>
                </div>

                {/* Semestral */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-white flex flex-col relative transform md:-translate-y-6 shadow-2xl scale-105 z-20">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-accent text-white px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-lg">
                    MÁS POPULAR
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-brand-primary uppercase tracking-tight">Semestral</h3>
                  <p className="text-brand-accent font-bold mb-8 text-sm">Ahorra un 10%</p>
                  <div className="mb-10 text-brand-primary">
                    <span className="text-5xl font-black">$270.000</span>
                    <span className="text-slate-400 font-bold">/6 meses</span>
                  </div>
                  <ul className="space-y-5 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Soporte prioritario</span></li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_8O3EX4CD1E" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-4 px-6 rounded-2xl bg-brand-primary text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20">
                    Suscribirse
                  </a>
                </div>

                {/* Anual */}
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col hover:bg-slate-800/60 transition-all">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Anual</h3>
                  <p className="text-slate-400 mb-8 text-sm font-medium">Ahorra un 20%</p>
                  <div className="mb-10">
                    <span className="text-5xl font-black">$480.000</span>
                    <span className="text-slate-400 font-bold">/año</span>
                  </div>
                  <ul className="space-y-5 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Acceso completo</span></li>
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Soporte 24/7</span></li>
                    <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-brand-accent" /> <span>Actualizaciones</span></li>
                  </ul>
                  <a href="https://checkout.bold.co/payment/LNK_HEOP6AYS3L" target="_blank" rel="noopener noreferrer" className="w-full block text-center py-4 px-6 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-brand-accent/20">
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
          <section id="contact" className="py-24 bg-brand-bg/10">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-brand-primary mb-4 uppercase tracking-tighter">Contáctanos</h2>
                <p className="text-lg text-slate-500 font-medium">¿Tienes dudas o necesitas un plan personalizado? Escríbenos.</p>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-6 bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                    <input type="text" name="name" id="name" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all" placeholder="Ej. Juan Pérez" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                    <input type="email" name="email" id="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all" placeholder="ejemplo@correo.com" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono (Opcional)</label>
                    <input type="tel" name="phone" id="phone" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all" placeholder="+57 300 000 0000" />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">Nombre del Parqueadero / Empresa</label>
                    <input type="text" name="company" id="company" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all" placeholder="Ej. Parqueadero Central" />
                  </div>
                </div>
                <div>
                  <label htmlFor="request_type" className="block text-sm font-medium text-slate-700 mb-1">Tipo de Solicitud</label>
                  <select name="request_type" id="request_type" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all bg-white">
                    <option value="">Selecciona una opción...</option>
                    <option value="Información de planes">Información de planes</option>
                    <option value="Soporte técnico">Soporte técnico</option>
                    <option value="Plan personalizado">Plan personalizado</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Mensaje o Detalles Adicionales</label>
                  <textarea name="message" id="message" rows={4} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all resize-none" placeholder="Cuéntanos más sobre lo que necesitas..."></textarea>
                </div>
                <button type="submit" disabled={isSubmittingContact} className="w-full py-4 bg-brand-accent text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmittingContact ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitud"
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-slate-700 bg-white">
                  <img
                    src={globalSettings.logo_url || "/logo.png"}
                    alt={globalSettings.app_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.png";
                    }}
                  />
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
      <div className="min-h-screen bg-brand-bg/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-primary/20 rounded-full blur-[100px] opacity-30"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-accent/20 rounded-full blur-[100px] opacity-30"></div>
        </div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500">
          <button
            onClick={() => setShowLogin(false)}
            className="absolute top-8 left-8 p-2 rounded-xl bg-brand-bg text-slate-400 hover:text-brand-accent hover:bg-white hover:shadow-sm transition-all active:scale-95"
            title="Volver"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>

          <div className="text-center mb-10">
            <div className="relative inline-block group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center mx-auto shadow-xl border-4 border-white overflow-hidden bg-white">
                <img
                  src={globalSettings.logo_url || "/logo.png"}
                  alt={globalSettings.app_name}
                  className="w-full h-full object-cover transform transition duration-700 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
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
                  <User className="h-5 w-5 text-slate-300 group-focus-within:text-brand-accent transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all font-bold text-slate-800 placeholder:text-slate-400"
                  placeholder="ej. guard1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Segura</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-brand-accent transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-100/50 border border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all font-bold text-slate-800 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 px-6 rounded-2xl bg-brand-accent hover:brightness-110 text-white font-black transition-all duration-300 shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
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
            &copy; {new Date().getFullYear()} {globalSettings.app_name} cloud v3.0
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
            El tiempo de uso de la plataforma ha culminado. Para continuar utilizando <strong className="text-brand-accent font-black">{globalSettings.app_name}</strong>, por favor renueva tu suscripción.
          </p>
          
          <div className="space-y-4">
            <a
              href="https://checkout.bold.co/payment/LNK_IL54FGTSDC"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-4 px-6 rounded-2xl bg-brand-accent hover:brightness-110 text-white font-black transition-all duration-300 shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-sm"
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
    <main className="min-h-screen bg-brand-bg/20 dark:bg-slate-950 pb-12 pt-6 transition-colors duration-300">
      {viewMode === 'superadmin' ? (
        <SuperAdminDashboard
          user={user}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      ) : viewMode === 'admin' ? (
        <AdminDashboard 
          user={user} 
          onLogout={handleLogout} 
          userRole={role as 'admin'} 
          parkingLotId={parkingLotId} 
          onSwitchView={role === 'admin' ? setViewMode : undefined}
          currentView={viewMode}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      ) : (
        <GuardDashboard 
          user={user} 
          onLogout={handleLogout} 
          parkingLotId={parkingLotId} 
          onSwitchView={role === 'admin' ? setViewMode : undefined}
          currentView={viewMode as 'admin' | 'guard'}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
    </main>
  );
}
