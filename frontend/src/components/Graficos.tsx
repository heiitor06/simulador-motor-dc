import type { Ponto } from '../types'

interface GraficoProps {
  pontos: Ponto[]
  campo: 'corrente' | 'rpm'
  titulo: string
  unidade: string
  equilibrio: number
  cor: string
  duracao: number
}

const largura = 800
const altura = 250
const margem = { esquerda: 58, direita: 20, topo: 26, base: 38 }

function escala(valor: number, minimo: number, maximo: number, inicio: number, fim: number) {
  if (maximo === minimo) return (inicio + fim) / 2
  return inicio + ((valor - minimo) / (maximo - minimo)) * (fim - inicio)
}

export function GraficoTemporal({ pontos, campo, titulo, unidade, equilibrio, cor, duracao }: GraficoProps) {
  const valores = pontos.length ? pontos.map((p) => p[campo]) : [0]
  const minimoBruto = Math.min(...valores, equilibrio, 0)
  const maximoBruto = Math.max(...valores, equilibrio, 0)
  const folga = Math.max((maximoBruto - minimoBruto) * 0.12, 0.1)
  const minimo = minimoBruto - folga
  const maximo = maximoBruto + folga
  const x = (tempo: number) => escala(tempo, 0, duracao, margem.esquerda, largura - margem.direita)
  const y = (valor: number) => escala(valor, minimo, maximo, altura - margem.base, margem.topo)
  const caminho = pontos.map((p, indice) => `${indice ? 'L' : 'M'} ${x(p.tempo)} ${y(p[campo])}`).join(' ')
  const ultimo = pontos.at(-1)

  return (
    <article className="grafico-card">
      <header><span>{titulo}</span><strong>{ultimo ? ultimo[campo].toFixed(campo === 'rpm' ? 0 : 3) : '0'} {unidade}</strong></header>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={titulo}>
        {Array.from({ length: 5 }, (_, i) => {
          const gy = margem.topo + i * ((altura - margem.topo - margem.base) / 4)
          const valor = maximo - i * ((maximo - minimo) / 4)
          return <g key={i}><line x1={margem.esquerda} x2={largura - margem.direita} y1={gy} y2={gy} className="grade" />
            <text x={margem.esquerda - 8} y={gy + 4} textAnchor="end">{valor.toFixed(campo === 'rpm' ? 0 : 1)}</text></g>
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const tempo = i * duracao / 6
          const gx = x(tempo)
          return <g key={i}><line x1={gx} x2={gx} y1={margem.topo} y2={altura - margem.base} className="grade vertical" />
            <text x={gx} y={altura - 14} textAnchor="middle">{tempo.toFixed(0)}s</text></g>
        })}
        <line x1={margem.esquerda} x2={largura - margem.direita} y1={y(equilibrio)} y2={y(equilibrio)} className="equilibrio" />
        <text x={largura - margem.direita - 4} y={y(equilibrio) - 7} textAnchor="end" className="texto-equilibrio">equilíbrio</text>
        {caminho && <path d={caminho} fill="none" stroke={cor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {ultimo && <circle cx={x(ultimo.tempo)} cy={y(ultimo[campo])} r="5" fill={cor} stroke="#eaffff" strokeWidth="2" />}
      </svg>
    </article>
  )
}

interface PlanoProps {
  pontos: Ponto[]
  correnteEq: number
  velocidadeEq: number
}

export function PlanoEstados({ pontos, correnteEq, velocidadeEq }: PlanoProps) {
  const di = pontos.map((p) => p.corrente - correnteEq)
  const dw = pontos.map((p) => p.velocidade - velocidadeEq)
  const valoresX = di.length ? [...di, 0] : [-correnteEq, 0]
  const valoresY = dw.length ? [...dw, 0] : [-velocidadeEq, 0]
  const minX = Math.min(...valoresX); const maxX = Math.max(...valoresX)
  const minY = Math.min(...valoresY); const maxY = Math.max(...valoresY)
  const folgaX = Math.max((maxX - minX) * 0.14, 0.2)
  const folgaY = Math.max((maxY - minY) * 0.14, 2)
  const x = (v: number) => escala(v, minX - folgaX, maxX + folgaX, margem.esquerda, largura - margem.direita)
  const y = (v: number) => escala(v, minY - folgaY, maxY + folgaY, altura - margem.base, margem.topo)
  const caminho = di.map((valor, indice) => `${indice ? 'L' : 'M'} ${x(valor)} ${y(dw[indice])}`).join(' ')
  const atualX = di.at(-1); const atualY = dw.at(-1)

  return (
    <article className="grafico-card plano-card">
      <header><span>PLANO DE ESTADOS</span><strong>Δi × Δω → equilíbrio</strong></header>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Plano de estados">
        {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={margem.esquerda + i * 120} x2={margem.esquerda + i * 120}
          y1={margem.topo} y2={altura - margem.base} className="grade" />)}
        {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} x1={margem.esquerda} x2={largura - margem.direita}
          y1={margem.topo + i * 46} y2={margem.topo + i * 46} className="grade" />)}
        <line x1={x(0)} x2={x(0)} y1={margem.topo} y2={altura - margem.base} className="eixo-zero" />
        <line x1={margem.esquerda} x2={largura - margem.direita} y1={y(0)} y2={y(0)} className="eixo-zero" />
        {caminho && <path d={caminho} fill="none" stroke="#54b5fa" strokeWidth="3" strokeLinecap="round" />}
        <circle cx={x(0)} cy={y(0)} r="8" fill="#f3a75f" stroke="#fff4df" strokeWidth="2" />
        <text x={x(0) - 10} y={y(0) - 13} textAnchor="end" className="texto-equilibrio">equilíbrio (0,0)</text>
        {atualX !== undefined && atualY !== undefined && <circle cx={x(atualX)} cy={y(atualY)} r="6" fill="#b1c9e8" stroke="white" strokeWidth="2" />}
        <text x={largura / 2} y={altura - 8} textAnchor="middle">Δi (A)</text>
        <text x="15" y={altura / 2} transform={`rotate(-90 15 ${altura / 2})`} textAnchor="middle">Δω (rad/s)</text>
      </svg>
    </article>
  )
}

