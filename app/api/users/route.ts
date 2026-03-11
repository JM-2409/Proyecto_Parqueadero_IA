import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
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
    const { username, password, role, parking_lot_id } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    // Format email to use as username
    const cleanUsername = username.trim().toLowerCase();
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@parqueadero.local`;

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    if (authData.user) {
      // Set role
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: authData.user.id,
        role: role || 'guard',
        parking_lot_id: parking_lot_id || null
      });

      if (roleError) throw roleError;
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
