import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    
    // Check if user has parking sessions
    const { count, error: countError } = await supabaseAdmin
      .from('parking_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('guard_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      return NextResponse.json({ error: 'No se puede eliminar un usuario con historial de parqueos. En su lugar, cambie su contraseña para bloquear el acceso.' }, { status: 400 });
    }

    // Delete role first
    await supabaseAdmin.from('user_roles').delete().eq('user_id', id);
    
    // Delete user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const { password, role, parking_lot_id } = await request.json();
    
    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
    }

    if (role || parking_lot_id !== undefined) {
      // Check if role exists
      const { data: existingRole } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', id).single();
      
      const updateData: any = {};
      if (role) updateData.role = role;
      if (parking_lot_id !== undefined) updateData.parking_lot_id = parking_lot_id;

      if (existingRole) {
        const { error } = await supabaseAdmin.from('user_roles').update(updateData).eq('user_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: id, ...updateData });
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
