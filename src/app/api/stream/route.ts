import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const referer = headersList.get('referer')
  
  // Check if request is coming from your domain
  // if (!referer?.includes('sooke.live')) {
  //   return new NextResponse('Unauthorized', { status: 401 })
  // }

  const response = await fetch('https://stream.sooke.live/listen/sookelive/high_192kbps.mp3')
  
  return new NextResponse(response.body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'audio/mpeg',
    },
  })
}
