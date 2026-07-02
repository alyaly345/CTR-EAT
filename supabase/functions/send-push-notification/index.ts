import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Body reçu:', JSON.stringify(body))

    const record = body.record ?? body
    console.log('Record:', JSON.stringify(record))

    if (record.status !== 'sent' || !record.livreur_id) {
      return new Response(
        JSON.stringify({ message: 'ignored', status: record.status, livreur_id: record.livreur_id }),
        { status: 200 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('livreur_id', record.livreur_id)
      .single()

    console.log('Subscription data:', JSON.stringify(data), 'Error:', error?.message)

    if (error || !data) {
      return new Response(
        JSON.stringify({ message: 'no subscription found', livreur_id: record.livreur_id }),
        { status: 200 }
      )
    }

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({
        title: '🔔 Nouvelle commande !',
        body: `Une commande de ${record.total?.toLocaleString('fr-FR') ?? ''} FCFA vous a été assignée.`,
        url: '/livreur/dashboard',
      })
    )

    return new Response(JSON.stringify({ message: 'push sent' }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})