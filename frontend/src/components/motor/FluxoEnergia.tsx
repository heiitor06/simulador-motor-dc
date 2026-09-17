import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// Pulsos ilustram Pconv = τe·ω; não são matéria, fumaça ou uma medição real.
export default function FluxoEnergia({ potencia, animar }: { potencia: number; animar: boolean }) {
  const particulas = useRef<THREE.InstancedMesh>(null)
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const fase = useRef(0)
  const objeto = useMemo(() => new THREE.Object3D(), [])
  const intensidade = Math.min(Math.abs(potencia) / 80, 1)
  useFrame((_, delta) => {
    if (!particulas.current) return
    if (animar) fase.current += Math.min(delta, .05) * (.25 + intensidade * .8) * Math.sign(potencia)
    for (let i = 0; i < 36; i++) {
      const progresso = ((i / 36 + fase.current) % 1 + 1) % 1
      const angulo = i * 2.4 + progresso * 5
      const raio = .12 + progresso * .26
      objeto.position.set(2.4 + progresso * 1.45, Math.cos(angulo) * raio, Math.sin(angulo) * raio)
      objeto.scale.setScalar((.018 + intensidade * .019) * Math.sin(Math.PI * progresso))
      objeto.updateMatrix()
      particulas.current.setMatrixAt(i, objeto.matrix)
    }
    particulas.current.instanceMatrix.needsUpdate = true
    if (material.current) material.current.opacity = Math.min(Math.abs(potencia) / 3, .9)
  })
  return <group visible={Number.isFinite(potencia) && Math.abs(potencia) > .01}>
    <instancedMesh ref={particulas} args={[undefined, undefined, 36]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial ref={material} color={potencia >= 0 ? '#75e8ff' : '#ffbb73'} transparent depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </group>
}
