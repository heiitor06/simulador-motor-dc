import type { Parametros } from './types'

// Campo do sistema após deslocar o equilíbrio: x = Δi, y = Δω.
export function campoDesvios(x: number, y: number, p: Parametros) {
  return { dx: (-p.resistencia * x - p.ke * y) / p.indutancia,
    dy: (p.kt * x - p.atrito * y) / p.inercia }
}

export function inclinacao(x: number, y: number, p: Parametros): number | null {
  const { dx, dy } = campoDesvios(x, y, p)
  const escala = Math.max(1, Math.abs(p.resistencia * x), Math.abs(p.ke * y))
  if (Math.abs(p.resistencia * x + p.ke * y) <= 1e-12 * escala) return null
  return dy / dx
}

export function modeloValido(p: Parametros) {
  return Object.values(p).every(v => typeof v !== 'number' || Number.isFinite(v)) &&
    p.indutancia > 0 && p.inercia > 0 && p.resistencia >= 0 && p.ke >= 0 && p.kt >= 0 && p.atrito >= 0 &&
    p.resistencia * p.atrito + p.ke * p.kt > 0
}
