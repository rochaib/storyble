import webpush from 'web-push'
import { sql } from '@/lib/db'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendTurnNotification(playerId: string): Promise<void> {
  const subscriptions = await sql`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions WHERE player_id = ${playerId}
  `
  if (subscriptions.length === 0) return

  const payload = JSON.stringify({
    title: 'Fold & Pass',
    body: "It's your turn!",
    icon: '/icons/icon-192.png',
  })

  await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )
}
