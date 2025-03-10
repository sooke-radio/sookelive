type RequestMethod = 'GET' | 'POST'

interface RequestOptions {
  method?: RequestMethod
  body?: any
}

const BASE_URL = 'https://stream.sooke.live/api/station/sookelive'

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
