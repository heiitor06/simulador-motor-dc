import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// Névoa de ambiente: partículas baixas, sem relação com a temperatura do motor.
export default function NevoaBase() {
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

