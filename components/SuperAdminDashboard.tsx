'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Users, LogOut, Plus, Edit2, Trash2, Shield, Key, Loader2, Search, Power, PowerOff } from 'lucide-react';

export default function SuperAdminDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'parking_lots' | 'users'>('parking_lots');
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Parking Lot Form
  const [showLotForm, setShowLotForm] = useState(false);
  const [editingLot, setEditingLot] = useState<any>(null);
  const [lotName, setLotName] = useState('');
  const [lotNit, setLotNit] = useState('');
  const [lotAddress, setLotAddress] = useState('');
  const [lotPhone, setLotPhone] = useState('');
  const [lotEmail, setLotEmail] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // User Form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'guard'>('admin');
  const [userLotId, setUserLotId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch parking lots
    const { data: lotsData } = await supabase.from('parking_lots').select('*').order('created_at', { ascending: false });
    if (lotsData) setParkingLots(lotsData);

    // Fetch users (only admins and guards)
    const { data: rolesData } = await supabase.from('user_roles').select('*, parking_lots(name)').neq('role', 'superadmin');
    
    if (rolesData) {
      // We need to fetch the actual emails for these users via our API
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const authUsers = await res.json();
          
          const combinedUsers = rolesData.map(role => {
            const authUser = authUsers.find((u: any) => u.id === role.user_id);
            return {
              ...role,
              email: authUser?.email || 'Usuario Desconocido',
              parking_lot_name: role.parking_lots?.name || 'Sin asignar'
            };
          });
          setUsers(combinedUsers);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
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
      email: lotEmail
    };

    if (editingLot) {
      await supabase.from('parking_lots').update(lotData).eq('id', editingLot.id);
    } else {
      await supabase.from('parking_lots').insert(lotData);
    }

    setFormLoading(false);
    setShowLotForm(false);
    fetchData();
  };

  const handleToggleLotStatus = async (lot: any) => {
    const newStatus = lot.status === 'active' ? 'suspended' : 'active';
    await supabase.from('parking_lots').update({ status: newStatus }).eq('id', lot.id);
    fetchData();
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@parqueadero.local`;

      if (editingUser) {
        await fetch(`/api/users/${editingUser.user_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: password || undefined, role: userRole, parking_lot_id: userLotId })
        });
      } else {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: userRole, parking_lot_id: userLotId })
        });
      }
      
      setShowUserForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel Super Administrador</h1>
          <p className="text-slate-500">Gestión global de parqueaderos y administradores</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('parking_lots')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'parking_lots' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Building2 className="w-4 h-4" />
          Parqueaderos
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'parking_lots' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Parqueaderos Registrados
                </h2>
                <button
                  onClick={() => {
                    setEditingLot(null);
                    setLotName('');
                    setLotNit('');
                    setLotAddress('');
                    setLotPhone('');
                    setLotEmail('');
                    setShowLotForm(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Parqueadero
                </button>
              </div>
              
              <div className="divide-y divide-slate-100">
                {parkingLots.map(lot => (
                  <div key={lot.id} className={`p-6 flex items-center justify-between hover:bg-slate-50 transition-colors ${lot.status === 'suspended' ? 'opacity-60' : ''}`}>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">{lot.name}</h3>
                      <div className="text-sm text-slate-500 mt-1 flex gap-4">
                        <span>NIT: {lot.nit || 'N/A'}</span>
                        <span>Dir: {lot.address || 'N/A'}</span>
                      </div>
                      {lot.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                          <PowerOff className="w-3 h-3" /> Suspendido
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleLotStatus(lot)}
                        className={`p-2 rounded-lg transition-colors ${lot.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={lot.status === 'active' ? 'Suspender' : 'Activar'}
                      >
                        {lot.status === 'active' ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingLot(lot);
                          setLotName(lot.name);
                          setLotNit(lot.nit || '');
                          setLotAddress(lot.address || '');
                          setLotPhone(lot.phone || '');
                          setLotEmail(lot.email || '');
                          setShowLotForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
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

          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Administradores y Vigilantes
                </h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUsername('');
                    setPassword('');
                    setUserRole('admin');
                    setUserLotId(parkingLots[0]?.id || '');
                    setShowUserForm(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Usuario
                </button>
              </div>
              
              <div className="divide-y divide-slate-100">
                {users.map(u => (
                  <div key={u.user_id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {u.role === 'admin' ? <Key className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{u.email.split('@')[0]}</h3>
                        <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                            {u.role === 'admin' ? 'Administrador' : 'Vigilante'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {u.parking_lot_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setUsername(u.email.split('@')[0]);
                          setPassword('');
                          setUserRole(u.role);
                          setUserLotId(u.parking_lot_id || '');
                          setShowUserForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.user_id)}
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
        </>
      )}

      {/* Lot Form Modal */}
      {showLotForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingLot ? 'Editar Parqueadero' : 'Nuevo Parqueadero'}
              </h3>
            </div>
            <form onSubmit={handleSaveLot} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input type="text" required value={lotName} onChange={e => setLotName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
                <input type="text" value={lotNit} onChange={e => setLotNit(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <input type="text" value={lotAddress} onChange={e => setLotAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={lotPhone} onChange={e => setLotPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={lotEmail} onChange={e => setLotEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowLotForm(false)} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)} disabled={!!editingUser} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}</label>
                <input type="password" required={!editingUser} minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parqueadero</label>
                <select required value={userLotId} onChange={e => setUserLotId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">Seleccione un parqueadero</option>
                  {parkingLots.map(lot => (
                    <option key={lot.id} value={lot.id}>{lot.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setUserRole('admin')} className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 ${userRole === 'admin' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <Key className="w-4 h-4" /> Admin
                  </button>
                  <button type="button" onClick={() => setUserRole('guard')} className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 ${userRole === 'guard' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                    <Shield className="w-4 h-4" /> Vigilante
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
