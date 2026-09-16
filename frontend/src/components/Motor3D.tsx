import { ContactShadows, Grid, Html, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  rpm: number
  corrente: number
  torque: number
  executando: boolean
}

function FluxoDeEnergia({ rpm, torque, executando }: Pick<Props, 'rpm' | 'torque' | 'executando'>) {
  const grupo = useRef<THREE.Group>(null)
  const progresso = useRef(0)
  const quantidade = 26

  useFrame((_, delta) => {
    const intensidade = Math.min(Math.abs(rpm) / 1600, 1.4)
    if (executando) progresso.current += delta * intensidade * 0.75
    grupo.current?.children.forEach((objeto, indice) => {
      const fase = (progresso.current + indice / quantidade) % 1
      const volta = fase * Math.PI * 5 + indice * 0.37
      objeto.position.set(2.05 + fase * 3.2, Math.sin(volta) * 0.35 * (1 - fase),
        Math.cos(volta) * 0.35 * (1 - fase))
      const escala = 0.35 + (1 - fase) * 0.8
      objeto.scale.setScalar(escala)
    })
  })

  const opacidade = rpm === 0 ? 0 : Math.min(0.28 + Math.abs(torque) * 0.7, 0.95)
  return (
    <group ref={grupo}>
      {Array.from({ length: quantidade }, (_, indice) => (
        <mesh key={indice}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={indice % 3 === 0 ? '#f6aa55' : '#72c7ff'} transparent opacity={opacidade} />
        </mesh>
      ))}
    </group>
  )
}

// Névoa de ambiente: partículas baixas, sem relação com a temperatura do motor.
function NevoaBase() {
  const grupo = useRef<THREE.Group>(null)
  const textura = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const contexto = canvas.getContext('2d')!
    const gradiente = contexto.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradiente.addColorStop(0, 'rgba(190, 218, 245, 0.55)')
    gradiente.addColorStop(0.4, 'rgba(156, 193, 228, 0.22)')
    gradiente.addColorStop(1, 'rgba(156, 193, 228, 0)')
    contexto.fillStyle = gradiente
    contexto.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(({ clock }) => {
    grupo.current?.children.forEach((particula, i) => {
      const fase = i * Math.PI * 2 / 14 + clock.elapsedTime * 0.045
      particula.position.set(Math.cos(fase) * 2.05, -1.24 + Math.sin(fase * 3) * 0.07, Math.sin(fase) * 1.25)
      particula.scale.set(2.2 + Math.sin(fase) * 0.3, 0.48, 1)
    })
  })

  return <group ref={grupo}>
    {Array.from({ length: 14 }, (_, i) => <sprite key={i} position={[0, -1.3, 0]}>
      <spriteMaterial map={textura} transparent opacity={0.28} depthWrite={false} />
    </sprite>)}
  </group>
}

function Motor({ rpm, corrente, torque, executando }: Props) {
  const rotor = useRef<THREE.Group>(null)
  const intensidade = Math.min(Math.abs(corrente) / 10.5, 1)
  const brilho = 0.035 + intensidade * 0.38

  useFrame((_, delta) => {
    if (!rotor.current || !executando) return
    const sentido = rpm < 0 ? -1 : 1
    const velocidadeVisual = Math.min(Math.abs(rpm) / 1600, 1.25) * 3.4
    rotor.current.rotation.x += sentido * velocidadeVisual * delta
  })

  const arco = useMemo(() => Array.from({ length: 52 }, (_, indice) => {
    const angulo = (indice / 51) * Math.PI * 1.55 + 0.3
    return new THREE.Vector3(2.45, Math.cos(angulo) * 0.62, Math.sin(angulo) * 0.62)
  }), [])

  return (
    <group rotation={[0.04, -0.18, -0.04]}>
      {/* Nervuras, parafusos e base de montagem da carcaça. */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`nervura${i}`} position={[-1.05 + i * 0.26, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.245, 0.025, 8, 64, Math.PI * 1.15]} />
          <meshStandardMaterial color="#315867" metalness={0.65} roughness={0.38} />
        </mesh>
      ))}
      {[-1.33, 1.33].map(x => Array.from({ length: 8 }, (_, i) => {
        const a = i * Math.PI / 4
        return <mesh key={`bolt${x}${i}`} position={[x, Math.cos(a) * 1.2, Math.sin(a) * 1.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.12, 6]} />
          <meshStandardMaterial color="#adc2cb" metalness={0.8} roughness={0.3} />
        </mesh>
      }))}
      <RoundedBox args={[3.1, 0.15, 1.85]} radius={0.07} smoothness={3} position={[0, -1.39, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#244554" metalness={0.65} roughness={0.4} />
      </RoundedBox>
      {[-0.85, 0.85].map(x => [-0.75, 0.75].map(z => (
        <mesh key={`base${x}${z}`} position={[x, -1.29, z]}>
          <cylinderGeometry args={[0.065, 0.065, 0.07, 6]} />
          <meshStandardMaterial color="#9aafb9" metalness={0.8} roughness={0.32} />
        </mesh>
      )))}
      <group ref={rotor}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.68, 0.68, 2.45, 48]} />
          <meshStandardMaterial color="#172b34" metalness={0.85} roughness={0.24} />
        </mesh>
        {Array.from({ length: 8 }, (_, indice) => {
          const angulo = indice * Math.PI / 4
          return (
            <mesh key={indice} position={[0, Math.cos(angulo) * 0.77, Math.sin(angulo) * 0.77]}
              rotation={[angulo, 0, 0]} castShadow>
              <boxGeometry args={[1.72, 0.17, 0.24]} />
              <meshStandardMaterial color="#b97645" emissive="#bc5c25" emissiveIntensity={brilho}
                metalness={0.72} roughness={0.28} />
            </mesh>
          )
        })}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 4.4, 32]} />
          <meshStandardMaterial color="#b7c8cf" metalness={1} roughness={0.16} />
        </mesh>
        <mesh position={[1.35, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.72, 0.08, 10, 48]} />
          <meshStandardMaterial color="#94c9eb" emissive="#409fe0" emissiveIntensity={0.22} />
        </mesh>
        {Array.from({ length: 6 }, (_, indice) => {
          const angulo = indice * Math.PI / 3
          return (
            <mesh key={indice} position={[1.35, Math.cos(angulo) * 0.42, Math.sin(angulo) * 0.42]}
              rotation={[angulo, 0, 0]}>
              <boxGeometry args={[0.12, 0.65, 0.13]} />
              <meshStandardMaterial color="#779ba4" metalness={0.75} roughness={0.32} />
            </mesh>
          )
        })}
      </group>

      <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[1.23, 1.23, 2.65, 64, 1, true]} />
        <meshPhysicalMaterial color="#163d50" transparent opacity={0.18} metalness={0.38}
          roughness={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-1.32, 1.32].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[1.21, 0.11, 12, 64]} />
          <meshStandardMaterial color="#527684" metalness={0.65} roughness={0.32} />
        </mesh>
      ))}

      <mesh position={[-0.7, -1.28, 0]} castShadow>
        <boxGeometry args={[0.55, 0.28, 1.4]} />
        <meshStandardMaterial color="#152a35" metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh position={[0.7, -1.28, 0]} castShadow>
        <boxGeometry args={[0.55, 0.28, 1.4]} />
        <meshStandardMaterial color="#152a35" metalness={0.72} roughness={0.3} />
      </mesh>

      <Line points={arco} color="#7ccaff" lineWidth={2.1} transparent opacity={rpm === 0 ? 0.15 : 0.85} />
      <FluxoDeEnergia rpm={rpm} torque={torque} executando={executando} />


      <Html position={[-0.4, 1.62, 0]} center className="etiqueta-3d">BOBINAS · {corrente.toFixed(2)} A</Html>
      <Html position={[2.65, 0.95, 0]} center className="etiqueta-3d saida">SAÍDA MECÂNICA</Html>
    </group>
  )
}

export default function Motor3D(props: Props) {
  return (
    <Canvas camera={{ position: [6.3, 3.1, 6.8], fov: 32 }} dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} shadows>
      <fog attach="fog" args={['#050b12', 11, 22]} />
      <ambientLight intensity={0.85} /><hemisphereLight args={["#d6eaf2", "#17202a", 1.5]} />
      <directionalLight position={[4, 7, 5]} intensity={3.4} color="#e9f3ff" castShadow />
      <pointLight position={[-3, 1, 4]} intensity={18} distance={9} color="#167db0" />
      <pointLight position={[3, 0, -3]} intensity={12} distance={8} color="#d85b24" />
      <Motor {...props} />
      <NevoaBase />
      <Grid position={[0, -1.48, 0]} args={[12, 12]} cellSize={0.45} cellThickness={0.45}
        cellColor="#163049" sectionSize={2.25} sectionThickness={0.65} sectionColor="#28577b"
        fadeDistance={9} fadeStrength={1.2} infiniteGrid />
      <ContactShadows position={[0, -1.46, 0]} opacity={0.52} scale={8} blur={2.4} far={4} />
      <OrbitControls enablePan={false} minDistance={6} maxDistance={13} minPolarAngle={0.55}
        maxPolarAngle={Math.PI / 2.05} target={[0.5, 0, 0]} />
    </Canvas>
  )
}


