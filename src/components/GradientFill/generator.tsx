// import resolveConfig from 'tailwindcss/resolveConfig'
// import tailwindConfig from 'tailwind.config.mjs'

// const fullConfig = resolveConfig(tailwindConfig)
// const colors = fullConfig.theme.colors

const getRandomPoint = () => ({
  x: Math.floor(Math.random() * 100),
  y: Math.floor(Math.random() * 100),
  size: 20 + Math.floor(Math.random() * 80)
})

const colors = [
  "hsl(187, 100%, 48%)",
  "hsl(133, 97%, 38%)",
  "hsl(298, 100%, 48%)",
  "hsl(268, 100%, 53%)",
  "hsl(77, 100%, 50%)"
]

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)]

export const generateGradientStyle = () => {
  const points = [
    { ...getRandomPoint(), color: getRandomColor() },
    { ...getRandomPoint(), color: getRandomColor() },
    { ...getRandomPoint(), color: getRandomColor() },
    { ...getRandomPoint(), color: getRandomColor() }
  ]

  // console.log(points)

  return {
    background: points.map(point => 
      `radial-gradient(circle at ${point.x}% ${point.y}%, ${point.color} 0%, transparent ${point.size}%)`
    ).join(', ')
  }
}