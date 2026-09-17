import { useMemo } from 'react'
import { campoDesvios } from '../edo'
import type { Equilibrio, Parametros, Ponto } from '../types'

const W = 720, H = 410, esquerda = 65, direita = 660, topo = 35, base = 350
const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function TrajetoriaEDO({ pontos, todos, equilibrio: eq, origem, etapa }: {
  pontos: Ponto[]; todos: Ponto[]; equilibrio: Equilibrio; origem: number; etapa: number
}) {
  // Escala fixa durante a reprodução: mover os eixos não modifica a trajetória física.
  const limites = useMemo(() => {
    let minI = Math.min(0, eq.corrente), maxI = Math.max(0, eq.corrente)
    let minW = Math.min(0, eq.velocidade), maxW = Math.max(0, eq.velocidade)
    for (const p of todos) {
      minI = Math.min(minI, p.corrente); maxI = Math.max(maxI, p.corrente)
      minW = Math.min(minW, p.velocidade); maxW = Math.max(maxW, p.velocidade)
    }
    const fi = Math.max((maxI - minI) * .16, 1), fw = Math.max((maxW - minW) * .16, 10)
    return { minI: minI - fi, maxI: maxI + fi, minW: minW - fw, maxW: maxW + fw }
  }, [todos, eq.corrente, eq.velocidade])
  const x = (v: number) => esquerda + (v - limites.minI) / (limites.maxI - limites.minI) * (direita - esquerda)
  const y = (v: number) => base - (v - limites.minW) / (limites.maxW - limites.minW) * (base - topo)
  const salto = Math.max(1, Math.ceil(pontos.length / 650))
  const amostra = pontos.filter((_, i) => i % salto === 0 || i === pontos.length - 1)
  const caminho = amostra.map((p, i) => `${i ? 'L' : 'M'}${x(p.corrente)},${y(p.velocidade)}`).join(' ')
  const ultimo = pontos.at(-1)
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={etapa >= 2 ? 'Trajetória com origem deslocada para o equilíbrio' : 'Trajetória de corrente e velocidade'}>
    {Array.from({ length: 6 }, (_, i) => {
      const vx = limites.minI + (limites.maxI - limites.minI) * i / 5
      const vy = limites.minW + (limites.maxW - limites.minW) * i / 5
      return <g key={i}><line x1={x(vx)} x2={x(vx)} y1={topo} y2={base} className="edo-grade" />
        <line x1={esquerda} x2={direita} y1={y(vy)} y2={y(vy)} className="edo-grade" />
        <text x={x(vx)} y={base + 22} textAnchor="middle">{numero(vx - origem * eq.corrente)}</text>
        <text x={esquerda - 10} y={y(vy) + 4} textAnchor="end">{numero(vy - origem * eq.velocidade)}</text></g>
    })}
    <line x1={x(origem * eq.corrente)} x2={x(origem * eq.corrente)} y1={topo} y2={base} className="edo-eixo" />
    <line x1={esquerda} x2={direita} y1={y(origem * eq.velocidade)} y2={y(origem * eq.velocidade)} className="edo-eixo" />
    <path d={caminho} fill="none" stroke="#66dbff" strokeWidth="3" strokeLinecap="round" />
    {etapa >= 1 && <g><circle cx={x(eq.corrente)} cy={y(eq.velocidade)} r="10" fill="#ffbb7433" stroke="#ffbf7d" />
      <circle cx={x(eq.corrente)} cy={y(eq.velocidade)} r="3" fill="#ffcf99" />
      <text x={x(eq.corrente)} y={y(eq.velocidade) - 17} textAnchor="middle" className="edo-texto-dourado">{origem > .99 ? 'Equilíbrio (0, 0)' : 'Equilíbrio'}</text></g>}
    {ultimo && <circle cx={x(ultimo.corrente)} cy={y(ultimo.velocidade)} r="6" fill="#b4f3ff" stroke="white" strokeWidth="2" />}
    <text x="362" y="400" textAnchor="middle">{etapa >= 2 ? 'x = Δi (A)' : 'Corrente i (A)'}</text>
    <text x="17" y="195" textAnchor="middle" transform="rotate(-90 17 195)">{etapa >= 2 ? 'y = Δω (rad/s)' : 'Velocidade ω (rad/s)'}</text>
  </svg>
}

export function CampoHomogeneo({ parametros, px, py, k }: { parametros: Parametros; px: number; py: number; k: number }) {
  const naOrigem = Math.abs(px) + Math.abs(py) < 1e-10
  const coincidentes = Math.abs(k - 1) < .02
  const sx = (direita - esquerda) / 15, sy = (base - topo) / 420
  const x = (v: number) => esquerda + (v + 7.5) * sx
  const y = (v: number) => base - (v + 210) * sy
  const segmento = (vx: number, vy: number, tamanho: number) => {
    const { dx, dy } = campoDesvios(vx, vy, parametros)
    const modulo = Math.hypot(dx * sx, dy * sy)
    if (!Number.isFinite(modulo) || modulo < 1e-10) return null
    const ax = dx * sx / modulo * tamanho, ay = -dy * sy / modulo * tamanho
    return { x1: x(vx) - ax, y1: y(vy) - ay, x2: x(vx) + ax, y2: y(vy) + ay }
  }
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Campo homogêneo: tangentes paralelas em P e kP">
    {Array.from({ length: 9 }, (_, i) => Array.from({ length: 7 }, (_, j) => {
      const vx = -6 + i * 1.5, vy = -180 + j * 60
      const s = segmento(vx, vy, 9)
      return s && <line key={`${i}-${j}`} {...s} className="edo-campo-segmento" />
    }))}
    {[-6, -3, 0, 3, 6].map(v => <g key={v}><line x1={x(v)} x2={x(v)} y1={topo} y2={base} className="edo-grade" /><text x={x(v)} y={base + 22} textAnchor="middle">{v}</text></g>)}
    {[-180, -90, 0, 90, 180].map(v => <g key={v}><line x1={esquerda} x2={direita} y1={y(v)} y2={y(v)} className="edo-grade" /><text x={esquerda - 10} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
    <line x1={x(0)} x2={x(0)} y1={topo} y2={base} className="edo-eixo" />
    <line x1={esquerda} x2={direita} y1={y(0)} y2={y(0)} className="edo-eixo" />
    <line x1={x(0)} y1={y(0)} x2={x(px * 3.2)} y2={y(py * 3.2)} className="edo-raio" />
    <circle cx={x(0)} cy={y(0)} r="5" fill="#ecf8ff" />
    <text x={x(0) - 12} y={y(0) - 13} textAnchor="end">Equilíbrio (0, 0)</text>
    {(naOrigem ? [] : coincidentes ? [{ vx: px, vy: py, cor: '#e7f7ff', nome: 'P = Q' }] : [{ vx: px, vy: py, cor: '#67e4ff', nome: 'P (x, y)' }, { vx: px * k, vy: py * k, cor: '#ffc381', nome: 'Q (kx, ky)' }]).map(({ vx, vy, cor, nome }) => {
      const s = segmento(vx, vy, 36)
      return <g key={nome}>{s && <line {...s} stroke={cor} strokeWidth="3" strokeLinecap="round" />}
        <circle cx={x(vx)} cy={y(vy)} r="6" fill={cor} />
        <text x={x(vx) - 8} y={y(vy) + 20} textAnchor="end" style={{ fill: cor }}>{nome}</text></g>
    })}
    <text x="362" y="400" textAnchor="middle">x = Δi (A)</text>
    <text x="17" y="195" textAnchor="middle" transform="rotate(-90 17 195)">y = Δω (rad/s)</text>
  </svg>
}
