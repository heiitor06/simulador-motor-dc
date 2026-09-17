import { useEffect, useMemo, useRef, useState } from 'react'
import { simularMotor } from './api'
import Motor3D from './components/Motor3D'
import EnergiaMotor from './components/EnergiaMotor'
import ExploradorEDO from './components/ExploradorEDO'
import ComparacaoCargas from './components/ComparacaoCargas'
import { GraficoTemporal, PlanoEstados } from './components/Graficos'
import type { Equilibrio, Parametros, Ponto, Resultado, VelocidadeVisual } from './types'

const padrao: Parametros = {
  tensao: 24,
  resistencia: 2,
  indutancia: 0.5,
  ke: 0.1,
  kt: 0.1,
  inercia: 0.02,
  atrito: 0.002,
  torque_carga: 0.02,
  corrente_inicial: 0,
  velocidade_inicial: 0,
  dt: 0.01,
  duracao: 12,
  metodo: 'RK4',
}

const equilibrioPadrao: Equilibrio = {
  corrente: 3.571428571,
  velocidade: 168.571428571,
  rpm: 1609.738567,
}

type Status = 'pronto' | 'calculando' | 'simulando' | 'pausado' | 'concluido' | 'erro'
type Aba = 'graficos' | 'plano' | 'modelo' | 'dados' | 'comparacao'

function Campo({ rotulo, unidade, valor, passo, onChange, disabled = false }: {
  rotulo: string; unidade?: string; valor: number; passo: number
  onChange: (valor: number) => void; disabled?: boolean
}) {
  return <label className="campo"><span>{rotulo}<small>{unidade}</small></span>
    <input type="number" step={passo} value={valor} disabled={disabled}
      onChange={(evento) => onChange(Number(evento.target.value))} /></label>
}

function equilibrioLocal(p: Parametros): Equilibrio {
  const denominador = p.resistencia * p.atrito + p.ke * p.kt
  if (denominador <= 0) return equilibrioPadrao
  const corrente = (p.atrito * p.tensao + p.ke * p.torque_carga) / denominador
  const velocidade = (p.kt * p.tensao - p.resistencia * p.torque_carga) / denominador
  return { corrente, velocidade, rpm: velocidade * 60 / (2 * Math.PI) }
}

function App() {
  const [parametros, setParametros] = useState(padrao)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [indice, setIndice] = useState(0)
  const [status, setStatus] = useState<Status>('pronto')
  const [velocidadeVisual, setVelocidadeVisual] = useState<VelocidadeVisual>('Normal')
  const [tela, setTela] = useState<'energia' | 'edo'>('energia')
  const requisicao = useRef(0)
  const [aba, setAba] = useState<Aba>('graficos')
  const [erro, setErro] = useState('')
  const [flutuacao, setFlutuacao] = useState(true)
  const equilibrio = resultado?.equilibrio ?? equilibrioLocal(parametros)
  const pontoInicial: Ponto = {
    tempo: 0, corrente: parametros.corrente_inicial,
    velocidade: parametros.velocidade_inicial,
    rpm: parametros.velocidade_inicial * 60 / (2 * Math.PI),
    torque: parametros.kt * parametros.corrente_inicial,
  }
  const ponto = resultado?.pontos[indice] ?? pontoInicial
  const pontosVisiveis = useMemo(() => resultado?.pontos.slice(0, indice + 1) ?? [pontoInicial],
    [resultado, indice, parametros.corrente_inicial, parametros.velocidade_inicial, parametros.kt])
  const bloqueado = status === 'simulando' || status === 'pausado' || status === 'calculando'

  useEffect(() => {
    if (status !== 'simulando' || !resultado) return
    const atrasos = { Lenta: 120, Normal: 60, Rápida: 25 }
    const salto = Math.max(1, Math.ceil((resultado.pontos.length - 1) / 220))
    const timer = window.setInterval(() => {
      setIndice((atual) => {
        const proximo = Math.min(atual + salto, resultado.pontos.length - 1)
        if (proximo === resultado.pontos.length - 1) setStatus('concluido')
        return proximo
      })
    }, atrasos[velocidadeVisual])
    return () => window.clearInterval(timer)
  }, [status, resultado, velocidadeVisual])

  function alterar(nome: keyof Parametros, valor: number | string) {
    setParametros((anterior) => ({ ...anterior, [nome]: valor }))
    if (resultado) {
      setResultado(null)
      setIndice(0)
      setStatus('pronto')
      setErro('')
    }
  }

  function restaurarPadrao() {
    setParametros(padrao)
    setResultado(null)
    setIndice(0)
    setStatus('pronto')
    setErro('')
  }

  async function iniciar() {
    const id = ++requisicao.current
    setStatus('calculando'); setErro('')
    try {
      const dados = await simularMotor(parametros)
      if (id !== requisicao.current) return
      setResultado(dados); setIndice(0); setStatus('simulando')
    } catch (e) {
      if (id !== requisicao.current) return
      setErro(e instanceof Error ? e.message : 'Erro desconhecido.')
      setStatus('erro')
    }
  }

  function pausar() {
    if (status === 'simulando') setStatus('pausado')
    else if (status === 'pausado') setStatus('simulando')
  }

  function reiniciar() {
    requisicao.current += 1
    setResultado(null); setIndice(0); setStatus('pronto'); setErro('')
  }

  const textosStatus: Record<Status, string> = {
    pronto: 'PRONTO PARA PARTIDA', calculando: 'CALCULANDO MODELO', simulando: 'SIMULAÇÃO EM ANDAMENTO',
    pausado: 'SIMULAÇÃO PAUSADA', concluido: 'SIMULAÇÃO CONCLUÍDA', erro: 'REVISE OS PARÂMETROS',
  }
  const desvio = Math.max(
    Math.abs(ponto.corrente - equilibrio.corrente) / Math.max(Math.abs(equilibrio.corrente), 0.1),
    Math.abs(ponto.velocidade - equilibrio.velocidade) / Math.max(Math.abs(equilibrio.velocidade), 1),
  )
  const explicacao = status === 'pronto' ? 'Escolha os parâmetros e inicie a simulação. Explore as peças para entender as equações.' : ponto.tempo < 0.5
    ? 'A tensão foi aplicada. A corrente começa a produzir torque no rotor.'
    : desvio > 0.18
      ? 'O rotor acelera; a força contraeletromotriz Keω cresce e modifica a corrente.'
      : 'Corrente e velocidade estão se aproximando do ponto de equilíbrio.'

  return <div className={`app-shell ${flutuacao ? '' : 'sem-flutuacao'}`}>
    <header className="cabecalho">
      <div className="identidade"><span className="sobretitulo">ENGENHARIA DE COMPUTAÇÃO · EDO</span>
        <h1>{tela === 'energia' ? <>Motor de Corrente Contínua</> : <>Do motor à EDO homogênea</>}</h1><p>{tela === 'energia' ? 'Explore a energia que se transforma em movimento' : 'O mesmo experimento, explicado pela matemática'}</p></div>

    </header>


    <nav className="telas-navegacao" role="tablist" aria-label="Telas do laboratório">
      <button id="tab-energia" role="tab" aria-selected={tela === 'energia'} aria-controls="tela-energia" onClick={() => setTela('energia')}><span>01</span><div>Motor e energia<small>Funcionamento e exploração 3D</small></div></button>
      <button id="tab-edo" role="tab" aria-selected={tela === 'edo'} aria-controls="tela-edo" onClick={() => setTela('edo')}><span>02</span><div>EDO homogênea<small>Gráfico, equilíbrio e demonstração</small></div></button>
    </nav>
        <div className="dock-holografico painel simulacao-compartilhada">
        <div className="acoes">
          <button className="iniciar" onClick={iniciar} disabled={bloqueado}>▶ INICIAR</button>
          <button onClick={pausar} disabled={status !== 'simulando' && status !== 'pausado'}>{status === 'pausado' ? 'CONTINUAR' : 'PAUSAR'}</button>
          <button onClick={reiniciar} disabled={status === 'pronto'}>REINICIAR</button>
          <button className="padrao" onClick={restaurarPadrao} disabled={bloqueado}>RESTAURAR VALORES PADRÃO</button>
          <button className="alternar-flutuacao" aria-pressed={flutuacao} onClick={() => setFlutuacao(!flutuacao)}>FLUTUAÇÃO {flutuacao ? 'LIGADA' : 'DESLIGADA'}</button>
        </div>
        {erro && <p className="erro">{erro}</p>}
<div className="campos-dock">          <Campo rotulo="Passo numérico" unidade="dt · s" valor={parametros.dt} passo={0.001} disabled={bloqueado} onChange={(v) => alterar('dt', v)} />
          <Campo rotulo="Duração" unidade="s" valor={parametros.duracao} passo={1} disabled={bloqueado} onChange={(v) => alterar('duracao', v)} />
</div>
        <div className="tempo-compartilhado"><span className={`status ${status}`}><i />{textosStatus[status]}</span><label>Tempo simulado
          <input aria-label="Percorrer tempo da simulação" type="range" min="0" max={Math.max(1, (resultado?.pontos.length ?? 1) - 1)} value={indice} disabled={!resultado || status === 'calculando'}
            onChange={e => { setIndice(Number(e.target.value)); setStatus('pausado') }} /><output>{ponto.tempo.toFixed(2)} s</output></label>
          <small>As duas telas compartilham parâmetros, tempo e resultados.</small></div>
        </div>

    <main className="dashboard tela-energia" id="tela-energia" role="tabpanel" aria-labelledby="tab-energia" hidden={tela !== 'energia'}>
      <aside className="controles painel">
        <div className="titulo-painel"><span>PARÂMETROS</span><i>01</i></div>
        <div className={`estado-edicao ${bloqueado ? 'bloqueado' : ''}`}>
          <i />{bloqueado ? 'SIMULAÇÃO ATIVA · REINICIE PARA EDITAR' : 'EDIÇÃO LIBERADA · CLIQUE NOS VALORES'}
        </div>
        <details open><summary>Parte elétrica</summary>
          <Campo rotulo="Tensão" unidade="V" valor={parametros.tensao} passo={1} disabled={bloqueado} onChange={(v) => alterar('tensao', v)} />
          <Campo rotulo="Resistência" unidade="R · Ω" valor={parametros.resistencia} passo={0.1} disabled={bloqueado} onChange={(v) => alterar('resistencia', v)} />
          <Campo rotulo="Indutância" unidade="L · H" valor={parametros.indutancia} passo={0.01} disabled={bloqueado} onChange={(v) => alterar('indutancia', v)} />
          <Campo rotulo="Força contraeletromotriz" unidade="Ke" valor={parametros.ke} passo={0.01} disabled={bloqueado} onChange={(v) => alterar('ke', v)} />
        </details>
        <details><summary>Parte mecânica</summary>
          <Campo rotulo="Constante de torque" unidade="Kt" valor={parametros.kt} passo={0.01} disabled={bloqueado} onChange={(v) => alterar('kt', v)} />
          <Campo rotulo="Inércia" unidade="J" valor={parametros.inercia} passo={0.001} disabled={bloqueado} onChange={(v) => alterar('inercia', v)} />
          <Campo rotulo="Atrito viscoso" unidade="b" valor={parametros.atrito} passo={0.001} disabled={bloqueado} onChange={(v) => alterar('atrito', v)} />
          <Campo rotulo="Torque de carga" unidade="τL · N·m" valor={parametros.torque_carga} passo={0.01} disabled={bloqueado} onChange={(v) => alterar('torque_carga', v)} />
        </details>
        <details><summary>Condições e método</summary>
          <Campo rotulo="Corrente inicial" unidade="i(0) · A" valor={parametros.corrente_inicial} passo={0.1} disabled={bloqueado} onChange={(v) => alterar('corrente_inicial', v)} />
          <Campo rotulo="Velocidade inicial" unidade="ω(0)" valor={parametros.velocidade_inicial} passo={1} disabled={bloqueado} onChange={(v) => alterar('velocidade_inicial', v)} />
          <label className="campo"><span>Método<small>numérico</small></span><select value={parametros.metodo} disabled={bloqueado}
            onChange={(e) => alterar('metodo', e.target.value)}><option>RK4</option><option>Euler</option></select></label>
          <label className="campo"><span>Velocidade<small>visual</small></span><select value={velocidadeVisual}
            onChange={(e) => setVelocidadeVisual(e.target.value as VelocidadeVisual)}>
            <option>Lenta</option><option>Normal</option><option>Rápida</option></select></label>
        </details>
      </aside>

      <section className="area-central">
        <div className="cena painel">
          <div className="cena-cabecalho"><div><span>VISUALIZAÇÃO 3D</span><strong>CORTE TÉCNICO INTERATIVO</strong></div>
            <div className={`status ${status}`}><i />{textosStatus[status]}</div></div>
          <Motor3D rpm={ponto.rpm} corrente={ponto.corrente} torque={ponto.torque}
            parametros={parametros} visivel={tela === 'energia'} iniciado={resultado !== null} executando={status === 'simulando' || status === 'concluido'} />

        </div>


      </section>

      <aside className="telemetria painel">
        <div className="titulo-painel"><span>ESTADO SIMULADO</span><i>02</i></div>
        <div className="metrica destaque"><span>VELOCIDADE</span><strong>{ponto.rpm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong><small>RPM</small></div>
        <div className="metrica"><span>CORRENTE</span><strong>{ponto.corrente.toFixed(3)}</strong><small>A</small><div className="barra"><i style={{ width: `${Math.min(Math.abs(ponto.corrente) / 11 * 100, 100)}%` }} /></div></div>
        <div className="metrica"><span>TORQUE ELETROMAGNÉTICO</span><strong>{ponto.torque.toFixed(3)}</strong><small>N·m</small></div>
        <div className="metrica"><span>TEMPO SIMULADO</span><strong>{ponto.tempo.toFixed(2)}</strong><small>s</small></div>
        <div className="equilibrio-card painel"><span>PONTO DE EQUILÍBRIO</span>
          <dl><div><dt>Corrente</dt><dd>{equilibrio.corrente.toFixed(3)} A</dd></div>
            <div><dt>Velocidade</dt><dd>{equilibrio.velocidade.toFixed(2)} rad/s</dd></div>
            <div><dt>Rotação</dt><dd>{equilibrio.rpm.toFixed(0)} RPM</dd></div></dl></div>
        <div className="explicacao painel"><span>O QUE ESTÁ ACONTECENDO?</span><p>{explicacao}</p></div>
      </aside>
      <EnergiaMotor parametros={parametros} ponto={ponto} iniciado={resultado !== null} />
      <button className="ponte-edo" onClick={() => { setTela('edo'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Onde está a EDO nesse movimento? <span>Explorar a matemática →</span></button>
    </main>
    <main id="tela-edo" role="tabpanel" aria-labelledby="tab-edo" hidden={tela !== 'edo'}>
      <ExploradorEDO parametros={parametros} equilibrio={equilibrio} ponto={ponto} pontos={pontosVisiveis}
        todos={resultado?.pontos ?? pontosVisiveis} iniciado={resultado !== null} visivel={tela === 'edo'} />
      <h2 className="titulo-analise">Análise do mesmo experimento</h2>
        <section className="resultados-holograficos">
        <nav className="abas">
          {([['graficos', 'GRÁFICOS TEMPORAIS'], ['plano', 'PLANO DE ESTADOS'], ['comparacao', 'COMPARAR CARGAS'], ['modelo', 'MODELO MATEMÁTICO'], ['dados', 'DADOS']] as [Aba, string][])
            .map(([id, nome]) => <button key={id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>{nome}</button>)}
        </nav>
        <div className="conteudo-aba">
          {aba === 'comparacao' && <ComparacaoCargas parametros={parametros} />}
          {aba === 'graficos' && <div className="grade-graficos">
            <GraficoTemporal pontos={pontosVisiveis} campo="corrente" titulo="CORRENTE i(t)" unidade="A"
              equilibrio={equilibrio.corrente} cor="#54b5fa" duracao={parametros.duracao} />
            <GraficoTemporal pontos={pontosVisiveis} campo="rpm" titulo="VELOCIDADE ω(t)" unidade="RPM"
              equilibrio={equilibrio.rpm} cor="#b1c9e8" duracao={parametros.duracao} />
          </div>}
          {aba === 'plano' && <PlanoEstados pontos={pontosVisiveis} correnteEq={equilibrio.corrente} velocidadeEq={equilibrio.velocidade} />}
          {aba === 'modelo' && <section className="modelo">
            <div><span>EQUAÇÃO ELÉTRICA</span><strong>L di/dt = V − Ri − Keω</strong></div>
            <div><span>EQUAÇÃO MECÂNICA</span><strong>J dω/dt = Kti − bω − τL</strong></div>
            <div><span>DESVIOS DO EQUILÍBRIO</span><strong>Δi = i − ieq &nbsp; · &nbsp; Δω = ω − ωeq</strong></div>
            <div className="homogenea"><span>EDO HOMOGÊNEA DE PRIMEIRA ORDEM</span>
              <strong>d(Δω)/d(Δi) = −(L/J) · [Kt − b(Δω/Δi)] / [R + Ke(Δω/Δi)]</strong>
              <p>A derivada depende somente da razão Δω/Δi. A curva do plano de estados mostra essa relação; o tempo vem do sistema original.</p></div>
          </section>}
          {aba === 'dados' && <div className="tabela-wrap"><table><thead><tr><th>Tempo</th><th>Corrente</th><th>ω</th><th>RPM</th><th>Torque</th></tr></thead>
            <tbody>{pontosVisiveis.slice(-12).map((p) => <tr key={p.tempo}><td>{p.tempo.toFixed(2)} s</td><td>{p.corrente.toFixed(3)} A</td>
              <td>{p.velocidade.toFixed(2)} rad/s</td><td>{p.rpm.toFixed(0)}</td><td>{p.torque.toFixed(3)} N·m</td></tr>)}</tbody></table></div>}
        </div>
        </section>
    </main>
  </div>
}

export default App
