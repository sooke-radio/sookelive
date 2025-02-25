import React from 'react'

import { generateGradientStyle } from './generator'

type GradientFillProps = {
  id: string
}

export const GradientFill: React.FC<GradientFillProps> = ({ id }) => {
  return (
    <div 
      className="absolute inset-0 w-full h-full -z-10 transition-[height] duration-300 ease-in-out"
      style={generateGradientStyle()}
      id={`gradient-fill-${id}`}
    />
  )
}
