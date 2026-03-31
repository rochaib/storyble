import webpush from 'web-push'
import { sql } from '@/lib/db'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendGameClosedNotification(
  gameId: string,
  excludePlayerId: string
): Promise<void> {
  const subscriptions = await sql`
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    JOIN players p ON p.id = ps.player_id
    WHERE p.game_id = ${gameId}
      AND p.id != ${excludePlayerId}
  `
  if (subscriptions.length === 0) return

  const payload = JSON.stringify({
    title: 'Storyble',
    body: 'The host has ended the game.',
    icon: '/icons/icon-192.png',
  })

  await Promise.allSettled(
    subscriptions.map((sub: Record<string, unknown>) =>
      webpush.sendNotification(
        { endpoint: sub['endpoint'] as string, keys: { p256dh: sub['p256dh'] as string, auth: sub['auth'] as string } },
        payload
      )
    )
  )
}

export async function sendTurnNotification(playerId: string): Promise<void> {
  const subscriptions = await sql`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions WHERE player_id = ${playerId}
  `
  if (subscriptions.length === 0) return

  const payload = JSON.stringify({
    title: 'Storyble',
    body: "It's your turn!",
    icon: '/icons/icon-192.png',
  })

  await Promise.allSettled(
    subscriptions.map((sub: Record<string, unknown>) =>
      webpush.sendNotification(
        { endpoint: sub['endpoint'] as string, keys: { p256dh: sub['p256dh'] as string, auth: sub['auth'] as string } },
        payload
      )
    )
  )
}
