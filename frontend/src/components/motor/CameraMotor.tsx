import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { OrbitControls as ControlesCamera } from 'three-stdlib'
import { Vector3 } from 'three'

const posicaoInicial = new Vector3(6.3, 3, 6.8)
const alvoInicial = new Vector3(.2, .1, 0)

export default function CameraMotor({ recentrar }: { recentrar: number }) {
  const controles = useRef<ControlesCamera>(null)
  const transicao = useRef<{ tempo: number; posicao: Vector3; alvo: Vector3 } | null>(null)

  useEffect(() => {
    const c = controles.current
    if (!c || recentrar === 0) return
    // Descarta a inércia do último arraste antes de iniciar o retorno.
    // Não depende de position0, que pode ser salvo antes de o Canvas posicionar a câmera.
    c.enableDamping = false
    c.update()
    c.enabled = false
    transicao.current = { tempo: 0, posicao: c.object.position.clone(), alvo: c.target.clone() }
  }, [recentrar])

  useFrame((_, dt) => {
    const c = controles.current
    const t = transicao.current
    if (!c || !t) return
    t.tempo = Math.min(1, t.tempo + Math.min(dt, .05) / .8)
    const suavidade = t.tempo * t.tempo * (3 - 2 * t.tempo)
    c.object.position.lerpVectors(t.posicao, posicaoInicial, suavidade)
    c.target.lerpVectors(t.alvo, alvoInicial, suavidade)
    c.object.zoom = 1
    c.object.updateProjectionMatrix()
    c.update()
    if (t.tempo === 1) {
      c.saveState()
      c.enableDamping = true
      c.enabled = true
      transicao.current = null
    }
  })

  return <OrbitControls ref={controles} makeDefault enablePan={false} minDistance={6} maxDistance={15}
    minPolarAngle={.35} maxPolarAngle={Math.PI / 2.02} target={[.2, .1, 0]} />
}
