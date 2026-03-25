let echo = null

const broadcastAuthEndpoint = import.meta.env.VITE_BROADCASTING_AUTH_ENDPOINT
  || 'http://localhost:8000/broadcasting/auth'

export async function initEcho() {
  if (echo) return echo

  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ])

  window.Pusher = Pusher

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8081,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8081,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: broadcastAuthEndpoint,

    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        fetch(broadcastAuthEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => callback(null, data))
          .catch((err) => callback(err))
      },
    }),
  })

  return echo
}

export function getEcho() {
  return echo
}

export function destroyEcho() {
  if (echo) {
    echo.disconnect()
    echo = null
  }
}

export async function subscribeUserChannels(userId, { authStore, notificationStore }) {
  const echoInstance = await initEcho()
  const userChannel = echoInstance.private(`App.Models.User.${userId}`)

  userChannel.listen('.user.permissions-updated', () => {
    authStore.fetchPermissions()
  })

  userChannel.notification((notification) => {
    if (notificationStore) {
      notificationStore.handleRealtimeNotification(notification)
    }
  })

  userChannel.listen('.user.profile-updated', (e) => {
    if (!e.data) return
    authStore.updateUserFromEvent(e.data)
    authStore.broadcastProfileUpdate(e.data)
  })
}
