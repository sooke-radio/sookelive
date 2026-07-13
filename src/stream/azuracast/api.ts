type RequestMethod = 'GET' | 'POST'

interface RequestOptions {
  method?: RequestMethod
  body?: any
}

// AZURACAST_URL/AZURACAST_STATION_ID (server-side only) let tests point this
// at a mock server; fall back to the NEXT_PUBLIC_ variants already set in
// every real environment, then to the previously-hardcoded production
// values so behavior is unchanged where neither is set.
const AZURACAST_URL =
  process.env.AZURACAST_URL || process.env.NEXT_PUBLIC_AZURACAST_URL || 'https://stream.sooke.live'
const AZURACAST_STATION_ID =
  process.env.AZURACAST_STATION_ID || process.env.NEXT_PUBLIC_AZURACAST_STATION_ID || 'sookelive'

const BASE_URL = `${AZURACAST_URL}/api/station/${AZURACAST_STATION_ID}`

export const azuracastAPI = {
  request: async (path: string, options: RequestOptions = {}) => {
    // console.log(path)
    const { method = 'GET', body } = options
    
    const config = {
      method,
      headers: {
        'X-API-Key': `${process.env.AZURACAST_KEY}`,
        'Content-Type': 'application/json'
      },
      ...(body && { body: JSON.stringify(body) })
    }

    const response = await fetch(`${BASE_URL}/${path}`, config)
    // console.log(response)
    return response.json()
  },

  get: async (path: string) => {
    return azuracastAPI.request(path)
  },

  post: async (path: string, data: any) => {
    return azuracastAPI.request(path, { 
      method: 'POST',
      body: data 
    })
  },
  
  getOptions: async (path: string) => {
    const data = await azuracastAPI.get(path)
    return data.map(item => ({
      label: item.name,
      value: item.id
    }))
  }
}
