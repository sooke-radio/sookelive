'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

import { generateGradientStyle } from './generator'

type GradientFillProps = {
  id: string
}

export const GradientFill = dynamic(() => Promise.resolve(({ id }: GradientFillProps) => {

  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div 
    className={`absolute inset-0 w-full h-full transition-all duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    style={generateGradientStyle()}
      id={`gradient-fill-${id}`}
    />
  )
}), { ssr: false })