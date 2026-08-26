import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // 1. Authorization check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Initialize using your custom helper
    const supabase = await createServerSupabase();

    // 3. Ping Supabase
    const { data, error } = await supabase.from('receipts').select('id').limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}