'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import GuardDashboard from '@/components/GuardDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { Car, User, Lock, Loader2 } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'superadmin' | 'admin' | 'guard' | null>(null);
  const [parkingLotId, setParkingLotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
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
    if (currentUser) {
      // Check role
      const { data: roles } = await supabase.from('user_roles').select('*');
      
      if (!roles || roles.length === 0) {
        // First user becomes superadmin
        await supabase.from('user_roles').insert({ user_id: currentUser.id, role: 'superadmin' });
        setRole('superadmin');
        setParkingLotId(null);
      } else {
        const { data: myRole } = await supabase.from('user_roles').select('role, parking_lot_id').eq('user_id', currentUser.id).single();
        if (!myRole) {
          // If no role, assign guard and try to assign to the first parking lot
          const { data: firstLot } = await supabase.from('parking_lots').select('id').limit(1).single();
          const lotId = firstLot?.id || null;
          await supabase.from('user_roles').insert({ user_id: currentUser.id, role: 'guard', parking_lot_id: lotId });
          setRole('guard');
          setParkingLotId(lotId);
        } else {
          setRole(myRole.role as 'superadmin' | 'admin' | 'guard');
          setParkingLotId(myRole.parking_lot_id);
        }
      }
    } else {
      setRole(null);
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
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Car className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">Sistema de Parqueadero</h1>
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

  return (
    <main className="min-h-screen bg-slate-50 pb-12 pt-6">
      {role === 'superadmin' ? (
        <SuperAdminDashboard user={user} onLogout={handleLogout} />
      ) : role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} userRole={role} parkingLotId={parkingLotId} />
      ) : (
        <GuardDashboard user={user} onLogout={handleLogout} parkingLotId={parkingLotId} />
      )}
    </main>
  );
}
