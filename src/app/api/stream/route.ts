import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const referer = headersList.get('referer')
  
  // if (!referer?.includes('sooke.live')) {
  //   return new NextResponse('Unauthorized', { status: 401 })
  // }

  const streamUrl = `${process.env.AZURACAST_URL}/listen/${process.env.AZURACAST_STATION_ID}/high_192kbps.mp3`;

  const response = await fetch(streamUrl)
  
  return new NextResponse(response.body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'audio/mpeg',
    },
  })
}
