import { ContactShadows, Environment, Grid } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, Suspense, useState, type ReactNode } from 'react'
import CameraMotor from './motor/CameraMotor'
import ModeloMotor from './motor/ModeloMotor'
import NevoaBase from './motor/NevoaBase'
import { pecas, type ModoMotor, type PecaMotor } from './motor/pecas'
import type { Parametros } from '../types'

interface Props { rpm: number; corrente: number; torque: number; executando: boolean; parametros: Parametros; visivel: boolean; iniciado: boolean }

// As luzes locais continuam disponíveis caso o arquivo de iluminação falhe.
class AmbienteSeguro extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() { return this.state.falhou ? null : this.props.children }
}

export default function Motor3D(props: Props) {
  const [modo, setModo] = useState<ModoMotor>('realista')
  const [selecionada, setSelecionada] = useState<PecaMotor | null>(null)
  const [recentrar, setRecentrar] = useState(0)
  const [afastamento, setAfastamento] = useState(1)
  const [flutuando, setFlutuando] = useState(true)
  const explicacao = selecionada ? pecas[selecionada] : null
  const velocidade = props.rpm * 2 * Math.PI / 60
  const leitura = selecionada === 'bobinas' ? `Corrente: ${props.corrente.toFixed(3)} A · Torque: ${props.torque.toFixed(3)} N·m`
    : selecionada === 'rotor' ? `Velocidade: ${props.rpm.toFixed(0)} RPM · Inércia: ${props.parametros.inercia} kg·m²`
    : selecionada === 'carcaca' ? `Tensão interna: ${(props.parametros.ke * velocidade).toFixed(2)} V`
    : selecionada === 'eixo' ? `Potência convertida: ${(props.torque * velocidade).toFixed(2)} W`
    : `Corrente na armadura: ${props.corrente.toFixed(3)} A`

  return <div className={`motor-explorador ${modo === 'explodido' ? 'vista-explodida' : ''}`}>
    <div className="modos-motor" role="group" aria-label="Modo de visualização do motor">
      {([['realista', 'Realista'], ['raiox', 'Raio-X'], ['explodido', 'Explodido']] as [ModoMotor, string][]).map(([id, nome]) =>
        <button key={id} aria-pressed={modo === id} onClick={() => setModo(id)}>{nome}</button>)}
      <button className="camera-reset" onClick={() => setRecentrar(n => n + 1)} title="Restaurar posição e zoom">Recentrar</button>
    </div>
    {modo === 'explodido' && <div className="ajustes-explosao">
      <label>Afastamento <input aria-label="Afastamento das peças" type="range" min="0.7" max="1.3" step="0.05"
        value={afastamento} onChange={e => setAfastamento(Number(e.target.value))} /><output>{Math.round(afastamento * 100)}%</output></label>
      <button aria-pressed={!flutuando} onClick={() => setFlutuando(v => !v)}>{flutuando ? 'Pausar flutuação' : 'Retomar flutuação'}</button>
    </div>}
    <div className="motor-viewport" aria-label={`Motor em modo ${modo}`}>
      <Canvas frameloop={props.visivel ? 'always' : 'never'} camera={{ position: [6.3, 3, 6.8], fov: 34 }} dpr={[1, 1.5]} shadows gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={.45} />
        <hemisphereLight args={['#d4eafa', '#111f30', 1.1]} />
        <directionalLight position={[3, 7, 5]} intensity={2.1} color="#e4f2ff" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-3, 2, -4]} color="#368ccc" intensity={22} />
        <pointLight position={[0, 1, 4]} color="#ffb174" intensity={5} />
        <AmbienteSeguro><Suspense fallback={null}>
          <Environment files="/ambientes/studio_small_03_1k.hdr" environmentIntensity={.9} />
        </Suspense></AmbienteSeguro>
        <ModeloMotor {...props} modo={modo} selecionada={selecionada} selecionar={setSelecionada} afastamento={afastamento} flutuando={flutuando} mostrarFluxo={props.iniciado} />
        <NevoaBase />
        <Grid position={[0, -1.66, 0]} args={[12, 12]} cellSize={.5} cellThickness={.35} cellColor="#1a3b52"
          sectionSize={2.5} sectionThickness={.6} sectionColor="#286c8c" fadeDistance={9} infiniteGrid />
        <ContactShadows position={[0, -1.65, 0]} opacity={.5} scale={9} blur={2.8} far={5} resolution={256} />
        <CameraMotor recentrar={recentrar} />
      </Canvas>
    </div>
    <div className="explorador-inferior">
      <p className="instrucao-motor">{modo === 'explodido' ? 'Desmontagem ilustrativa · flutuação independente da simulação' : 'Pulsos no eixo = potência convertida · arraste para girar'}</p>
      <div className="pecas-motor" role="group" aria-label="Peças do motor">
        {(Object.keys(pecas) as PecaMotor[]).map(id => <button key={id} aria-pressed={selecionada === id} onClick={() => setSelecionada(selecionada === id ? null : id)}>{pecas[id].nome}</button>)}
      </div>
      <div className="inspecao-peca" aria-live="polite">
        {explicacao ? <><div><strong>{explicacao.nome}</strong><span>{leitura}</span></div><code>{explicacao.formula}</code><p>{explicacao.descricao}</p></>
          : <><strong>Explore a engenharia por dentro</strong><p>Clique no motor ou escolha uma peça acima para relacionar sua função às equações. Modelo didático de motor CC com escovas; rotação visual reduzida.</p><span className="credito-ambiente">Iluminação: Poly Haven · Studio Small 03 · CC0</span></>}
      </div>
    </div>
  </div>
}
