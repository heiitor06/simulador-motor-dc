import { useEffect, useRef, useState } from 'react'
import { simularMotor } from '../api'
import type { Parametros, Resultado } from '../types'

interface Experimento { a: Resultado; b: Resultado; cargaA: number; cargaB: number; parametros: Parametros }
const corA = '#62cfff'
const corB = '#ffbd77'
const numero = (n: number, casas = 3) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })

function Curvas({ experimento, campo }: { experimento: Experimento; campo: 'corrente' | 'rpm' | 'plano' }) {
  const { a, b } = experimento
  const plano = campo === 'plano'
  const coordenadas = (r: Resultado) => r.pontos.map(p => ({
    x: plano ? p.corrente - r.equilibrio.corrente : p.tempo,
    y: plano ? p.velocidade - r.equilibrio.velocidade : p[campo as 'corrente' | 'rpm'],
  }))
  const series = [coordenadas(a), coordenadas(b)]
  const eq = [a, b].map(r => campo === 'rpm' ? r.equilibrio.rpm : r.equilibrio.corrente)
  // Limites comuns: a comparação não usa escalas diferentes para A e B.
  let xmin = 0, xmax = plano ? 0 : experimento.parametros.duracao
  let ymin = plano ? 0 : Math.min(0, ...eq), ymax = plano ? 0 : Math.max(0, ...eq)
  for (const serie of series) for (const p of serie) {
    xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x)
    ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y)
  }
  const folgaY = Math.max((ymax - ymin) * .12, .1)
  ymin -= folgaY; ymax += folgaY
  if (plano) { const f = Math.max((xmax - xmin) * .12, .1); xmin -= f; xmax += f }
  const x = (v: number) => 65 + (v - xmin) / Math.max(xmax - xmin, .001) * 620
  const y = (v: number) => 222 - (v - ymin) / (ymax - ymin) * 184
  const titulo = plano ? 'Plano de estados · desvios do próprio equilíbrio' : campo === 'rpm' ? 'Velocidade (RPM)' : 'Corrente (A)'
  return <article className="grafico-card comparacao-grafico">
    <header><strong>{titulo}</strong></header>
    <svg viewBox="0 0 720 265" role="img" aria-label={`Comparação: ${titulo}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = ymin + (ymax - ymin) * i / 4
        const vx = xmin + (xmax - xmin) * i / 4
        return <g key={i}>
          <line x1="65" x2="685" y1={y(v)} y2={y(v)} className="grade" />
          <text x="57" y={y(v) + 4} textAnchor="end">{numero(v, campo === 'corrente' ? 1 : 0)}</text>
          <text x={x(vx)} y="242" textAnchor="middle">{numero(vx, 1)}</text>
        </g>
      })}
      {plano ? <g><line x1={x(0)} x2={x(0)} y1="38" y2="222" className="eixo-zero" />
        <line x1="65" x2="685" y1={y(0)} y2={y(0)} className="eixo-zero" />
        <circle cx={x(0)} cy={y(0)} r="5" fill="white" /><text x={x(0) - 9} y={y(0) - 10} textAnchor="end">equilíbrio de cada cenário</text></g>
        : eq.map((v, i) => <line key={i} x1="65" x2="685" y1={y(v)} y2={y(v)} stroke={i ? corB : corA} strokeDasharray="6 5" opacity=".6" />)}
      {series.map((serie, i) => <path key={i} d={serie.map((p, j) => `${j ? 'L' : 'M'}${x(p.x).toFixed(2)},${y(p.y).toFixed(2)}`).join(' ')}
        fill="none" stroke={i ? corB : corA} strokeWidth="2.6" strokeDasharray={i ? '8 3' : undefined} />)}
      <text x="375" y="260" textAnchor="middle">{plano ? 'Δi (A) · eixo vertical: Δω (rad/s)' : 'Tempo (s)'}</text>
    </svg>
  </article>
}

export default function ComparacaoCargas({ parametros }: { parametros: Parametros }) {
  const [cargaA, setCargaA] = useState('0.02')
  const [cargaB, setCargaB] = useState('0.10')
  const [experimento, setExperimento] = useState<Experimento | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState('')
  const requisicao = useRef(0)
  useEffect(() => {
    setExperimento(null); setErro(''); setCalculando(false)
    requisicao.current += 1
    return () => { requisicao.current += 1 }
  }, [parametros])

  async function comparar() {
    const ca = Number(cargaA), cb = Number(cargaB)
    if (!cargaA.trim() || !cargaB.trim() || !Number.isFinite(ca) || !Number.isFinite(cb) || ca < 0 || cb < 0) {
      setErro('Informe duas cargas finitas, maiores ou iguais a zero.'); return
    }
    const id = ++requisicao.current
    setCalculando(true); setErro(''); setExperimento(null)
    try {
      const [a, b] = await Promise.all([
        simularMotor({ ...parametros, torque_carga: ca }),
        simularMotor({ ...parametros, torque_carga: cb }),
      ])
      if (id === requisicao.current) setExperimento({ a, b, cargaA: ca, cargaB: cb, parametros: { ...parametros } })
    } catch (e) {
      if (id === requisicao.current) setErro(e instanceof Error ? e.message : 'Não foi possível comparar as cargas.')
    } finally { if (id === requisicao.current) setCalculando(false) }
  }

  const editar = (a: boolean, valor: string) => {
    if (a) setCargaA(valor); else setCargaB(valor)
    setExperimento(null); setErro('')
  }
  return <section className="comparacao-cargas">
    <div className="comparacao-intro painel">
      <span className="sobretitulo">EXPERIMENTO A / B</span>
      <h2>O mesmo motor. Duas cargas.</h2>
      <p>Compare dois ensaios independentes. Tensão, condições iniciais, duração e método vêm dos parâmetros atuais. Somente a carga muda entre os cenários; ela permanece constante durante cada ensaio.</p>
      <div className="comparacao-form">
        <label>Carga A (N·m)<input type="number" min="0" step="0.01" value={cargaA} disabled={calculando} onChange={e => editar(true, e.target.value)} /></label>
        <label>Carga B (N·m)<input type="number" min="0" step="0.01" value={cargaB} disabled={calculando} onChange={e => editar(false, e.target.value)} /></label>
        <button onClick={comparar} disabled={calculando}>{calculando ? 'Calculando os ensaios…' : 'Comparar cargas'}</button>
      </div>
      <p className="config-comparacao">{numero(parametros.tensao, 1)} V · {parametros.metodo} · dt = {numero(parametros.dt, 4)} s · {numero(parametros.duracao, 1)} s</p>
      {erro && <p role="alert" className="erro">{erro}</p>}
    </div>
    {experimento && <>
      <div className="legenda-comparacao"><span style={{ color: corA }}>━ A · {numero(experimento.cargaA)} N·m</span><span style={{ color: corB }}>┄ B · {numero(experimento.cargaB)} N·m</span><span>Linhas horizontais tracejadas = equilíbrios previstos</span></div>
      <div className="grade-graficos"><Curvas experimento={experimento} campo="corrente" /><Curvas experimento={experimento} campo="rpm" /></div>
      <Curvas experimento={experimento} campo="plano" />
      <div className="tabela-wrap"><table><caption>Resultado ao final do ensaio e equilíbrio previsto</caption>
        <thead><tr><th>Cenário</th><th>Corrente final</th><th>RPM final</th><th>Corrente de equilíbrio</th><th>RPM de equilíbrio</th></tr></thead>
        <tbody>{[experimento.a, experimento.b].map((r, i) => <tr key={i}><td>{i ? 'B' : 'A'}</td><td>{numero(r.pontos.at(-1)!.corrente)} A</td><td>{numero(r.pontos.at(-1)!.rpm, 0)}</td><td>{numero(r.equilibrio.corrente)} A</td><td>{numero(r.equilibrio.rpm, 0)}</td></tr>)}</tbody>
      </table></div>
      <div className="explicacao-comparacao painel"><h3>Por que continuamos no tema da EDO homogênea?</h3>
        <p>Cada carga constante tem seu próprio equilíbrio. Em cada cenário usamos x = i − ieq e y = ω − ωeq. Eliminando o tempo, obtemos a mesma forma homogênea:</p>
        <code>dy/dx = −(L/J) · [Kt − b(y/x)] / [R + Ke(y/x)]</code>
        <p>Essa escrita usa x ≠ 0 e dx/dt ≠ 0. Nas tangentes verticais, seguimos calculando pelo sistema temporal original.</p>
        <p>As duas origens do plano representam estados físicos diferentes. Não há troca de carga no meio de um ensaio. Os valores finais podem ainda não ter alcançado o equilíbrio.</p>
        {experimento.a.equilibrio.rpm < 0 || experimento.b.equilibrio.rpm < 0 ? <p>A carga escolhida leva a equilíbrio com rotação negativa neste modelo de torque constante. Ele não inclui trava ou atrito estático.</p> : <p>Com os parâmetros padrão, aumentar a carga reduz a velocidade de equilíbrio e aumenta a corrente exigida pelo motor.</p>}
      </div>
    </>}
  </section>
}
