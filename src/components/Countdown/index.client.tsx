'use client'
import React, { useState, useEffect } from 'react'

export const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    // Target date: April 6th at noon PST
    const targetDate = new Date('2025-04-06T12:00:00-07:00')
    
    const calculateTimeLeft = () => {
      const now = new Date()
      const difference = targetDate.getTime() - now.getTime()
      
      if (difference <= 0) {
        setIsLive(true)
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        }
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      }
    }
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft())
    
    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    
    // Clear interval on component unmount
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="text-black text-center bg-bright p-4">
      <p className="mb-1">Stream coming soon!</p>
      <div className="font-mono font-bold">
        <span>{String(timeLeft.days).padStart(2, '0')}:</span>
        <span>{String(timeLeft.hours).padStart(2, '0')}:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}:</span>
        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  )
}
