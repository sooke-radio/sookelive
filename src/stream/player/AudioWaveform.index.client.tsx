'use client'
import { useEffect, useRef, useState } from 'react'

export const AudioWaveform = ({ 
  audioContext, 
  source 
}: { 
  audioContext: AudioContext
  source: MediaElementAudioSourceNode 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    
    const analyser = audioContext.createAnalyser()
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    const draw = () => {
      if (!ctx) return; 
      
      const WIDTH = canvas.width
      const HEIGHT = canvas.height
      
      requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      
      ctx.fillStyle = 'rgb(0, 0, 0)'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      
      const barWidth = (WIDTH / bufferLength) * 2.5
      let barHeight
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2
        ctx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }    
    draw()
  }, [audioContext, source])

  return (
    <canvas 
      ref={canvasRef} 
      width="300" 
      height="80" 
      className="border border-bright"
    />
  )
}
