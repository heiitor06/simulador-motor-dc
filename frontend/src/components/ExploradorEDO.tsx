import { useEffect, useRef, useState } from 'react'
import { inclinacao, modeloValido } from '../edo'
import { CampoHomogeneo, TrajetoriaEDO } from './GraficoEDO'
import type { Equilibrio, Parametros, Ponto } from '../types'

const etapas = ['O motor', 'Equilíbrio', 'Nova origem', 'Eliminar o tempo', 'Homogeneidade']
const titulos = ['O movimento também é uma curva.', 'Um alvo para a evolução do motor.', 'A mesma trajetória. Uma nova origem.', 'Retire o tempo. Revele a relação.', 'Mesma razão. Mesma inclinação.']
const textos = [
  'Cada ponto reúne a corrente i e a velocidade ω no mesmo instante. Ao iniciar o motor, a luz percorre a trajetória calculada pelas duas equações diferenciais.',
  'Com tensão e carga constantes, o equilíbrio é o estado em que as duas derivadas se anulam. Ele é uma previsão do modelo; o último ponto da simulação pode ainda estar distante dele.',
  'Subtraímos o equilíbrio de cada variável. Observe os eixos deslizando: a trajetória física não mudou. Agora medimos o quanto corrente e velocidade se afastam do equilíbrio.',
  'Dividimos a variação da velocidade pela variação da corrente. Obtemos a inclinação no plano de estados, e não mais a evolução em função do tempo.',
  'P e Q estão na mesma reta que passa pela origem. Multiplicar x e y por k preserva y/x. As tangentes ficam paralelas: a inclinação depende da razão, não da distância até a origem.',
]
const n = (v: number, casas = 2) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas })

export default function ExploradorEDO({ parametros: p, equilibrio: eq, ponto, pontos, todos, iniciado, visivel }: {
  parametros: Parametros; equilibrio: Equilibrio; ponto: Ponto; pontos: Ponto[]; todos: Ponto[]; iniciado: boolean; visivel: boolean
}) {
  const [etapa, setEtapa] = useState(0)
  const [automatico, setAutomatico] = useState(false)
  const [k, setK] = useState(2)
  const [px, setPx] = useState(2)
  const [py, setPy] = useState(-42)
  const [origem, setOrigem] = useState(0)
  const origemAtual = useRef(0)
  const valido = modeloValido(p)

  useEffect(() => {
    if (!visivel) return
    const de = origemAtual.current, para = etapa >= 2 ? 1 : 0
    let quadro = 0
    const inicio = performance.now()
    const animar = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 1400)
      origemAtual.current = de + (para - de) * t * t * (3 - 2 * t)
      setOrigem(origemAtual.current)
      if (t < 1) quadro = requestAnimationFrame(animar)
    }
    quadro = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(quadro)
  }, [etapa, visivel])

  useEffect(() => {
    if (!automatico || !visivel) return
    const timer = window.setTimeout(() => {
      if (etapa < 4) setEtapa(etapa + 1)
      else setAutomatico(false)
    }, 9000)
    return () => clearTimeout(timer)
  }, [automatico, etapa, visivel])

  useEffect(() => {
    if (!automatico || etapa !== 4 || !visivel) return
    const inicio = performance.now()
    let quadro = 0
    const animar = (agora: number) => {
      setK(1.75 + Math.sin((agora - inicio) / 1600) * 1.1)
      quadro = requestAnimationFrame(animar)
    }
    quadro = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(quadro)
  }, [automatico, etapa, visivel])

  const escolher = (i: number) => { setEtapa(i); setAutomatico(false) }
  const mP = valido ? inclinacao(px, py, p) : null
  const mQ = valido ? inclinacao(px * k, py * k, p) : null
  const naOrigem = Math.abs(px) < 1e-10 && Math.abs(py) < 1e-10
  const inclinacaoTexto = (m: number | null) => naOrigem ? 'Indefinida (equilíbrio)' : m === null ? 'Vertical' : n(m, 4)

  return <section className="explorador-edo" aria-label="Demonstração da EDO homogênea">
    <div className="edo-abertura"><div><span className="sobretitulo">DO MOTOR À MATEMÁTICA</span><h2>Veja a EDO acontecer.</h2></div>
      <button className="botao-guia" onClick={() => { if (!automatico && etapa === 4) setEtapa(0); setAutomatico(!automatico) }}>{automatico ? 'Pausar explicação' : '▶ Explicação automática'}</button></div>
    <nav className="etapas-edo" aria-label="Etapas da explicação">
      {etapas.map((nome, i) => <button key={nome} aria-current={etapa === i ? 'step' : undefined} onClick={() => escolher(i)}><b>{i + 1}</b><span>{nome}</span></button>)}
    </nav>
    {!valido ? <div role="alert" className="painel edo-invalida">Revise os parâmetros do motor: L e J precisam ser positivos, R, Ke, Kt e b não podem ser negativos e o equilíbrio deve ser único. Volte à tela Motor e energia para editar.</div> : <>
      <div className="edo-palco">
        <article className="edo-historia painel">
          <span className="edo-numero">0{etapa + 1}<small> / 05</small></span>
          <h3>{titulos[etapa]}</h3><p>{textos[etapa]}</p>
          <div className="edo-formulas-etapa">
            {etapa === 0 && <><code>L di/dt = V − Ri − Keω</code><code>J dω/dt = Kti − bω − τL</code><small>i(t): corrente · ω(t): velocidade</small></>}
            {etapa === 1 && <><code>di/dt = 0 · dω/dt = 0</code><div className="edo-equilibrio"><span>ieq <strong>{n(eq.corrente, 3)} A</strong></span><span>ωeq <strong>{n(eq.velocidade)} rad/s</strong></span></div><small>Resolvemos as duas equações algébricas simultaneamente.</small></>}
            {etapa === 2 && <><code>x = i − ieq</code><code>y = ω − ωeq</code><hr /><code>L dx/dt = −Rx − Key</code><code>J dy/dt = Ktx − by</code><small>Os termos constantes se cancelam pelas equações do equilíbrio.</small></>}
            {etapa === 3 && <><code>dy/dx = (dy/dt) / (dx/dt)</code><code>= −(L/J) · (Ktx − by)/(Rx + Key)</code><small>Dividindo numerador e denominador por x, aparece a razão y/x.</small></>}
            {etapa === 4 && <><code>F(ky/kx) = F(y/x)</code><div className="edo-inclinacoes"><span className="p-ciano">Inclinação em P<strong>{inclinacaoTexto(mP)}</strong></span><span className="p-dourado">Inclinação em Q<strong>{inclinacaoTexto(mQ)}</strong></span></div><small>Valores em (rad/s)/A. A comparação usa os parâmetros atuais do motor.</small></>}
          </div>
          <div className="edo-fala"><span>PARA EXPLICAR AO PROFESSOR</span><p>{[
            '“O computador integra o sistema no tempo. Este gráfico reúne os estados que ele calculou.”',
            '“No equilíbrio, corrente e velocidade deixam de variar. Isso não significa que o motor parou de girar.”',
            '“O que era um estado físico vira nossa nova origem. Passamos a estudar os desvios.”',
            '“A EDO homogênea descreve a geometria da trajetória. O sistema original ainda fornece o tempo.”',
            '“Se multiplicarmos as duas coordenadas pelo mesmo número, a razão e a inclinação permanecem iguais.”',
          ][etapa]}</p></div>
        </article>
        <article className="edo-grafico painel">
          <header><span>{etapa === 4 ? 'CAMPO DE INCLINAÇÕES' : 'TRAJETÓRIA DO MESMO EXPERIMENTO'}</span><b>{etapa === 4 ? 'P → kP' : `t = ${n(ponto.tempo)} s`}</b></header>
          {etapa === 4 ? <CampoHomogeneo parametros={p} px={px} py={py} k={k} /> : <TrajetoriaEDO pontos={pontos} todos={todos} equilibrio={eq} origem={origem} etapa={etapa} />}
          {etapa === 4 ? <div className="edo-interacao">
            <label className="edo-escala">Escala k<input type="range" min="0.5" max="3" step="0.05" value={k} onChange={e => { setK(Number(e.target.value)); setAutomatico(false) }} /><output>{n(k)}</output></label>
            <p className="edo-razao">{px === 0 ? 'x = 0: y/x não está definida. O campo temporal continua disponível.' : `y/x = ${n(py / px, 3)}  ·  ky/kx = ${n(py * k / (px * k), 3)}`}</p>
            <p className="edo-coordenadas">P = ({n(px)}; {n(py)}) · Q = ({n(px * k)}; {n(py * k)})</p>
            <details><summary>Escolher outro ponto P</summary><label>x = Δi (A)<input aria-label="Coordenada x de P" type="range" min="-2" max="2" step="0.1" value={px} onChange={e => { setPx(Number(e.target.value)); setAutomatico(false) }} /><output>{n(px)}</output></label>
              <label>y = Δω (rad/s)<input aria-label="Coordenada y de P" type="range" min="-60" max="60" step="1" value={py} onChange={e => { setPy(Number(e.target.value)); setAutomatico(false) }} /><output>{n(py)}</output></label></details>
            <p className="edo-legenda"><i className="p-ciano">● P</i><i className="p-dourado">● Q = kP</i> Pontos de comparação; não são necessariamente da mesma trajetória.</p>
            {naOrigem && <p className="edo-aviso">No equilíbrio, dx/dt = dy/dt = 0. Não existe uma direção definida pelo quociente 0/0.</p>}
            {!naOrigem && Math.abs(k - 1) < .02 && <p className="edo-aviso">Com k = 1, os dois pontos coincidem.</p>}
            {!naOrigem && mP === null && <p className="edo-aviso">dx/dt = 0: a tangente é vertical. O quociente dy/dx não é finito aqui.</p>}
          </div> : <div className="edo-leitura"><span>i = {n(ponto.corrente, 3)} A</span><span>ω = {n(ponto.velocidade)} rad/s</span>{etapa >= 2 && <span>x = {n(ponto.corrente - eq.corrente)} · y = {n(ponto.velocidade - eq.velocidade)}</span>}
            {!iniciado && <p>Clique em INICIAR, acima, para desenhar a trajetória. A explicação pode ser explorada antes da simulação.</p>}
            {etapa === 2 && <p>A curva permanece no lugar; os eixos e os valores das coordenadas mudam suavemente.</p>}
          </div>}
        </article>
      </div>
      {etapa >= 3 && <div className="edo-equacao-final painel"><span className="sobretitulo">EDO HOMOGÊNEA DE PRIMEIRA ORDEM</span><strong>dy/dx = −(L/J) · [Kt − b(y/x)] / [R + Ke(y/x)] <em>= F(y/x)</em></strong><p>Tensão e carga constantes · esta escrita exige x ≠ 0 e dx/dt ≠ 0. Nas tangentes verticais, seguimos pelo sistema temporal.</p>
        <details><summary>Como isso se conecta à substituição y = vx?</summary><p>Escrevendo y = vx, temos dy/dx = v + x dv/dx. Portanto:</p><code>x dv/dx = F(v) − v</code><p>Onde F(v) − v ≠ 0, separamos as variáveis:</p><code>∫ dv / [F(v) − v] = ln|x| + C</code><p>Os valores constantes de v que satisfazem F(v) = v devem ser analisados separadamente: correspondem a soluções em retas y = vx, onde a equação está definida.</p></details>
      </div>}
    </>}
    <footer className="edo-navegacao"><button onClick={() => escolher(Math.max(0, etapa - 1))} disabled={etapa === 0}>← Anterior</button><span>{etapa + 1} de 5 · {automatico ? 'Explicação automática' : 'Explore no seu ritmo'}</span><button onClick={() => escolher(etapa === 4 ? 0 : etapa + 1)}>{etapa === 4 ? 'Recomeçar explicação ↺' : 'Próxima →'}</button></footer>
  </section>
}
