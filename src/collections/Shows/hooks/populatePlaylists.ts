const fetchPlaylists = async () => {
  const response = await fetch('https://stream.sooke.live/api/station/sookelive/playlists', {
    headers: {
      'x-api-key': process.env.AZURACAST_KEY || ''
    }
  })
  const playlists = await response.json()
  
  return playlists.map(playlist => ({
    label: playlist.name,
    value: playlist.id
  }))
}

export const populatePlaylists = async () => {
  try {
    return await fetchPlaylists()
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return []
  }
}

// this needs work: use hooks to pull the playlists?