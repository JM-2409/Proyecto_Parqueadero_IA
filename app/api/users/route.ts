import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    if (verifyError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verify role
    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).single();
    if (!roleData || (roleData.role !== 'superadmin' && roleData.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parkingLotId = searchParams.get('parking_lot_id');

    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    let query = supabaseAdmin.from('user_roles').select('*');
    if (parkingLotId) {
      query = query.eq('parking_lot_id', parkingLotId);
    }
    
    const { data: roles, error: rolesError } = await query;
    if (rolesError) throw rolesError;

    // Filter users that have a role in the fetched roles
    const usersWithRoles = users
      .filter(user => roles.some(r => r.user_id === user.id))
      .map(user => {
        const userRole = roles.find(r => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          username: user.email?.replace('@parqueadero.local', ''),
          role: userRole?.role || 'guard',
          created_at: user.created_at
        };
      });

    return NextResponse.json(usersWithRoles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    if (verifyError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verify role
    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).single();
    if (!roleData || (roleData.role !== 'superadmin' && roleData.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { username, password, role, parking_lot_id } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    // Format email to use as username
    const cleanUsername = username.trim().toLowerCase();
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@parqueadero.local`;

    let userId = null;

    // Try to create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.status === 422) {
        return NextResponse.json({ error: 'El nombre de usuario ya está en uso en el sistema. Por favor, elija otro.' }, { status: 400 });
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
    }

    if (userId) {
      // Set role
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        role: role || 'guard',
        parking_lot_id: parking_lot_id || null
      });

      if (roleError) throw roleError;
    }

    return NextResponse.json({ success: true, user: { id: userId, email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
