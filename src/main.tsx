import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Шрифты ставятся локально, не с Google CDN: внешний CDN — зависимость,
// недоступность которой ломает вид приложения целиком (Design-System.md).
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource-variable/manrope'

import './index.css'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Не нашли #root — проверь index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
