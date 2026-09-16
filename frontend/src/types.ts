export type Metodo = 'RK4' | 'Euler'
export type VelocidadeVisual = 'Lenta' | 'Normal' | 'Rápida'

export interface Parametros {
  tensao: number
  resistencia: number
  indutancia: number
  ke: number
  kt: number
  inercia: number
  atrito: number
  torque_carga: number
  corrente_inicial: number
  velocidade_inicial: number
  dt: number
  duracao: number
  metodo: Metodo
}

export interface Ponto {
  tempo: number
  corrente: number
  velocidade: number
  rpm: number
  torque: number
}

export interface Equilibrio {
  corrente: number
  velocidade: number
  rpm: number
}

export interface Resultado {
  equilibrio: Equilibrio
  pontos: Ponto[]
}

