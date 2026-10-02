import React from 'react'

import { AudioSourceProvider } from './AudioSource'
import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>
        <AudioSourceProvider>{children}</AudioSourceProvider>
      </HeaderThemeProvider>
    </ThemeProvider>
  )
}
