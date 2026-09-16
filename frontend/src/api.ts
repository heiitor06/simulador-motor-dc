import type { Parametros, Resultado } from './types'

export async function simularMotor(parametros: Parametros): Promise<Resultado> {
  const resposta = await fetch('/api/simular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parametros),
  })
  const dados = await resposta.json()
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível executar a simulação.')
  return dados as Resultado
}

