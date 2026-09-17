import { Edges, Line, RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import FluxoEnergia from './FluxoEnergia'
import type { ModoMotor, PecaMotor } from './pecas'

interface Props {
  modo: ModoMotor; selecionada: PecaMotor | null; selecionar: (peca: PecaMotor) => void
  rpm: number; corrente: number; executando: boolean
  afastamento: number; flutuando: boolean; torque: number; mostrarFluxo: boolean
}

// Cada subconjunto abre em uma etapa e flutua em ritmo próprio.
// Apenas a apresentação muda; a posição das peças não entra nas EDOs.
function Conjunto({ destino, aberto, afastamento, flutuando, fase = 0, atraso = 0, children }: {
  destino: [number, number, number]; aberto: boolean; afastamento: number
  flutuando: boolean; fase?: number; atraso?: number; children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const movimento = useRef({ abertura: 0, espera: 0, tempo: 0, distancia: 1 })
  useEffect(() => { movimento.current.espera = aberto ? atraso : 0 }, [aberto, atraso])
  useFrame((_, delta) => {
    if (!ref.current) return
    const dt = Math.min(delta, .05)
    const m = movimento.current
    m.espera = Math.max(0, m.espera - dt)
    m.abertura = THREE.MathUtils.damp(m.abertura, aberto && m.espera === 0 ? 1 : 0, 3.2, dt)
    m.distancia = THREE.MathUtils.damp(m.distancia, afastamento, 4, dt)
    if (flutuando) m.tempo += dt
    const p = m.abertura
    const t = m.tempo + fase
    // A flutuação ganha força no final da abertura; a pausa congela sua fase.
    const flutuar = p * p
    const arco = Math.sin(p * Math.PI) * .24
    ref.current.position.set(
      destino[0] * p * m.distancia + Math.sin(t * .65) * .055 * flutuar,
      destino[1] * p * m.distancia + arco + Math.sin(t * 1.15) * .14 * flutuar,
      destino[2] * p * m.distancia + Math.cos(t * .8) * .07 * flutuar,
    )
    ref.current.rotation.set(
      Math.sin(t * .7) * .075 * flutuar,
      Math.sin(t * .6 + .8) * .065 * flutuar,
      Math.cos(t * .85) * .045 * flutuar,
    )
  })
  return <group ref={ref}>{children}</group>
}

function Cilindro({ raio, comprimento, cor, x = 0, metal = .8 }: { raio: number; comprimento: number; cor: string; x?: number; metal?: number }) {
  return <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
    <cylinderGeometry args={[raio, raio, comprimento, 64]} />
    <meshStandardMaterial color={cor} metalness={metal} roughness={.27} />
  </mesh>
}

function Anel({ x, raio, espessura, cor }: { x: number; raio: number; espessura: number; cor: string }) {
  return <mesh position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
    <torusGeometry args={[raio, espessura, 10, 64]} />
    <meshStandardMaterial color={cor} metalness={.85} roughness={.24} />
  </mesh>
}

function Tampa({ x, ativa, raiox }: { x: number; ativa: boolean; raiox: boolean }) {
  return <group position={[x, 0, 0]}>
    <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
      <ringGeometry args={[.32, 1.27, 64]} />
      <meshPhysicalMaterial color={raiox ? '#39bffa' : '#457c9c'} metalness={.85} roughness={.25}
        side={THREE.DoubleSide} transparent={raiox} opacity={raiox ? .17 : 1} depthWrite={!raiox}
        emissive="#38baff" emissiveIntensity={ativa ? .5 : 0} />
    </mesh>
    <Anel x={0} raio={1.25} espessura={.065} cor="#91a9b6" />
    <Anel x={.02} raio={.34} espessura={.095} cor="#8eabb9" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = i * Math.PI / 4
      return <mesh key={i} position={[.06, Math.cos(a) * 1.07, Math.sin(a) * 1.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[.068, .068, .1, 6]} />
        <meshStandardMaterial color="#c7d1d7" metalness={.9} roughness={.23} />
      </mesh>
    })}
  </group>
}

// Uma espira fechada em torno de um polo da armadura (representação didática).
function Enrolamento({ ativa, corrente }: { ativa: boolean; corrente: number }) {
  const curva = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.79, .69, -.18), new THREE.Vector3(.79, .69, -.18),
    new THREE.Vector3(.97, .70, 0), new THREE.Vector3(.79, .69, .18),
    new THREE.Vector3(-.79, .69, .18), new THREE.Vector3(-.97, .70, 0),
  ], true, 'centripetal'), [])
  return <group>
    {Array.from({ length: 10 }, (_, i) => <mesh key={i} scale={[1 - i * .007, 1 + i * .017, 1 + i * .012]} castShadow>
      <tubeGeometry args={[curva, 60, .014, 5, true]} />
      <meshStandardMaterial color="#d58a4d" metalness={.88} roughness={.27} emissive={ativa ? '#53caff' : '#9f3e13'}
        emissiveIntensity={ativa ? .65 : .02 + Math.min(Math.abs(corrente) / 15, 1) * .13} />
    </mesh>)}
  </group>
}

export default function ModeloMotor({ modo, selecionada, selecionar, rpm, corrente, executando, afastamento, flutuando, torque, mostrarFluxo }: Props) {
  const rotor = useRef<THREE.Group>(null)
  const conjunto = useRef<THREE.Group>(null)
  const explodido = modo === 'explodido'
  const raiox = modo === 'raiox'
  const animacao = { aberto: explodido, afastamento, flutuando }
  const escolher = (peca: PecaMotor) => (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation()
    // Arrastar a câmera não deve selecionar uma peça.
    if (evento.delta <= 5) selecionar(peca)
  }
  useFrame((_, dt) => {
    // Alinha a armadura na vista explodida para a separação não depender do instante da pausa.
    if (rotor.current && explodido) rotor.current.rotation.x = THREE.MathUtils.damp(rotor.current.rotation.x, 0, 5, dt)
    if (rotor.current && executando && !explodido) {
      rotor.current.rotation.x = (rotor.current.rotation.x + Math.sign(rpm) * Math.min(Math.abs(rpm) / 1600, 1.4) * Math.min(dt, .05) * 3) % (Math.PI * 2)
    }
    if (conjunto.current) {
      const escala = THREE.MathUtils.damp(conjunto.current.scale.x, explodido ? .68 / Math.max(1, afastamento * .85) : 1.12, 4, dt)
      conjunto.current.scale.setScalar(escala)
    }
  })
  return <group ref={conjunto} rotation={[.04, -.15, 0]}>
    <Conjunto {...animacao} destino={[0, 2.15, -.15]} fase={0} atraso={.18}>
      <group onClick={escolher('carcaca')}>
        {/* Corte aberto na parte superior/frontal para expor a armadura. */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[1.22, 1.22, 2.6, 64, 1, true, Math.PI / 2, Math.PI * 1.5]} />
          <meshPhysicalMaterial color={raiox ? '#42caff' : '#155779'} metalness={.72} roughness={.3} clearcoat={.45}
            side={THREE.DoubleSide} transparent={raiox} opacity={raiox ? .12 : 1} depthWrite={!raiox}
            emissive="#279edc" emissiveIntensity={selecionada === 'carcaca' ? .48 : .015} />
          {raiox && <Edges color="#73d9ff" />}
        </mesh>
        {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[-1.16 + i * .193, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.32, 1.32, .034, 64, 1, true, Math.PI / 2, Math.PI * 1.5]} />
          <meshStandardMaterial color={raiox ? '#50bce5' : '#27779a'} metalness={.8} roughness={.32} side={THREE.DoubleSide}
            transparent={raiox} opacity={raiox ? .35 : 1} depthWrite={!raiox} />
        </mesh>)}
        {[-1, 1].map(s => <mesh key={s} position={[0, 0, s * .98]}>
          <boxGeometry args={[1.7, .43, .15]} />
          <meshStandardMaterial color="#34404c" metalness={.45} roughness={.5} transparent={raiox} opacity={raiox ? .18 : 1} />
        </mesh>)}
        <RoundedBox args={[.64, .25, .5]} radius={.035} position={[-.62, 1.34, -.45]}>
          <meshStandardMaterial color="#214b66" metalness={.7} roughness={.3} />
        </RoundedBox>
      </group>
    </Conjunto>

    <group ref={rotor}>
      <group onClick={escolher('rotor')}>
        <Cilindro raio={.61} comprimento={1.83} cor={selecionada === 'rotor' ? '#78d7ed' : '#73828b'} />
        {Array.from({ length: 25 }, (_, i) => <Anel key={i} x={-.85 + i * .071} raio={.612} espessura={.011} cor="#364753" />)}
      </group>
      <Conjunto {...animacao} destino={[0, .5, 1.85]} fase={1.7} atraso={.38}>
        <group onClick={escolher('bobinas')}>
          {Array.from({ length: 6 }, (_, i) => <group key={i} rotation={[i * Math.PI / 3, 0, 0]}>
            <Enrolamento ativa={selecionada === 'bobinas'} corrente={corrente} />
          </group>)}
        </group>
      </Conjunto>
      <Conjunto {...animacao} destino={[1.25, 0, 0]} fase={3.2} atraso={.28}>
        <group onClick={escolher('eixo')}>
          <Cilindro raio={.19} comprimento={4.7} cor={selecionada === 'eixo' ? '#91def4' : '#ccd6dd'} />
          <Cilindro raio={.27} comprimento={.21} x={1.56} cor="#b4c1ce" />
          <RoundedBox args={[.52, .06, .1]} radius={.015} position={[2.01, .18, 0]}>
            <meshStandardMaterial color="#768d9a" metalness={.9} roughness={.25} />
          </RoundedBox>
        </group>
      </Conjunto>
      <group onClick={escolher('escovas')}>
        <Cilindro raio={.39} comprimento={.44} x={-1.13} cor={selecionada === 'escovas' ? '#9ae1f1' : '#cc8250'} />
        {Array.from({ length: 16 }, (_, i) => {
          const a = i * Math.PI / 8
          return <mesh key={i} position={[-1.13, Math.cos(a) * .39, Math.sin(a) * .39]} rotation={[a, 0, 0]}>
            <boxGeometry args={[.45, .018, .018]} /><meshStandardMaterial color="#1b242c" />
          </mesh>
        })}
      </group>
    </group>

    <Conjunto {...animacao} destino={[-1.55, .1, -.1]} fase={2.4}>
      <group onClick={escolher('carcaca')}><Tampa x={-1.42} ativa={selecionada === 'carcaca'} raiox={raiox} /></group>
    </Conjunto>
    <Conjunto {...animacao} destino={[1.8, .1, 0]} fase={4.1} atraso={.08}>
      <group onClick={escolher('eixo')}><Tampa x={1.42} ativa={selecionada === 'eixo'} raiox={raiox} /></group>
    </Conjunto>
    <Conjunto {...animacao} destino={[-.8, -.55, 1.5]} fase={5.4} atraso={.5}>
      <group onClick={escolher('escovas')}>
        {[-1, 1].map(s => <group key={s} position={[-1.13, s * .57, 0]}>
          <RoundedBox args={[.28, .3, .22]} radius={.025}>
            <meshStandardMaterial color={selecionada === 'escovas' ? '#8fdcf2' : '#283440'} metalness={.2} roughness={.7} />
          </RoundedBox>
          <mesh position={[0, s * .23, 0]}><cylinderGeometry args={[.055, .055, .2, 12]} /><meshStandardMaterial color="#c1a578" metalness={.7} /></mesh>
        </group>)}
      </group>
    </Conjunto>
    <group onClick={escolher('carcaca')}>
      <RoundedBox args={[3.25, .17, 2]} radius={.07} position={[0, -1.48, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial color="#184867" metalness={.8} roughness={.32} clearcoat={.35} />
      </RoundedBox>
      {[-.85, .85].map(x => <RoundedBox key={x} args={[.42, .4, 1.45]} radius={.03} position={[x, -1.24, 0]}><meshStandardMaterial color="#194c68" metalness={.7} roughness={.34} /></RoundedBox>)}
      {[-1.25, 1.25].map(x => [-.78, .78].map(z => <mesh key={`${x}${z}`} position={[x, -1.35, z]}>
        <cylinderGeometry args={[.09, .09, .1, 6]} /><meshStandardMaterial color="#b8c9d5" metalness={.9} roughness={.25} />
      </mesh>))}
    </group>
    {mostrarFluxo && !explodido && <FluxoEnergia potencia={torque * rpm * 2 * Math.PI / 60} animar={executando} />}
    {explodido && <Line points={[[-3.3, 0, 0], [3.8, 0, 0]]} color="#63ceff" lineWidth={1} dashed dashSize={.09} gapSize={.09} transparent opacity={.45} />}
    {raiox && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
      <ringGeometry args={[2.1, 2.12, 96]} /><meshBasicMaterial color="#4ccbff" transparent opacity={.6} side={THREE.DoubleSide} />
    </mesh>}
  </group>
}
