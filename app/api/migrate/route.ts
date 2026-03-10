import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: err1 } = await supabaseAdmin.rpc('exec_sql', {
      sql: `ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
    });

    const { error: err2 } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        INSERT INTO settings (key, value)
        VALUES ('entry_fields', '[
          {"id": "nombre", "label": "Nombre", "required": false, "enabled": true},
          {"id": "bloque", "label": "Bloque", "required": false, "enabled": true},
          {"id": "casa", "label": "Casa", "required": false, "enabled": true},
          {"id": "celular", "label": "Celular", "required": false, "enabled": true}
        ]')
        ON CONFLICT (key) DO NOTHING;
      `
    });

    return NextResponse.json({ success: true, err1, err2 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
