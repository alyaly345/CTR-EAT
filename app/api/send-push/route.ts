import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { livreur_id, title, body, url } = await req.json()

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('livreur_id', livreur_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 })
    }

    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title, body, url })
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}