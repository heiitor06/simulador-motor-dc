import test from 'node:test'
import assert from 'node:assert/strict'
import { campoDesvios, inclinacao, modeloValido } from '../frontend/src/edo.ts'

const p = { tensao: 24, resistencia: 2, indutancia: .5, ke: .1, kt: .1,
  inercia: .02, atrito: .002, torque_carga: .02, corrente_inicial: 0,
  velocidade_inicial: 0, dt: .01, duracao: 12, metodo: 'RK4' as const }
const perto = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`)

test('o campo deslocado corresponde às derivadas físicas do motor', () => {
  for (const carga of [.02, .1]) {
    const motor = { ...p, torque_carga: carga }
    const den = motor.resistencia * motor.atrito + motor.ke * motor.kt
    const ieq = (motor.atrito * motor.tensao + motor.ke * carga) / den
    const weq = (motor.kt * motor.tensao - motor.resistencia * carga) / den
    const x = 2, y = -60, i = ieq + x, w = weq + y
    const campo = campoDesvios(x, y, motor)
    perto(campo.dx, (motor.tensao - motor.resistencia * i - motor.ke * w) / motor.indutancia)
    perto(campo.dy, (motor.kt * i - motor.atrito * w - carga) / motor.inercia)
  }
})

test('as tangentes preservam a inclinação para fatores positivos e negativos', () => {
  for (const motor of [p, { ...p, resistencia: 3, inercia: .05, ke: .2 }]) {
    for (const k of [.5, 1, 2, 3, -2]) {
      perto(inclinacao(2 * k, -60 * k, motor)!, inclinacao(2, -60, motor)!)
    }
  }
  perto(inclinacao(2, -60, p)!, 4)
})

test('tangente vertical e equilíbrio não produzem inclinação infinita ou NaN', () => {
  assert.equal(inclinacao(2, -40, p), null)
  assert.equal(inclinacao(0, 0, p), null)
})

test('em x=0 o campo temporal ainda é válido embora y/x não exista', () => {
  const campo = campoDesvios(0, -40, p)
  assert.ok(Number.isFinite(campo.dx) && Number.isFinite(campo.dy))
  perto(inclinacao(0, -40, p)!, .5)
})

test('parâmetros singulares e não finitos impedem a demonstração', () => {
  assert.ok(modeloValido(p))
  assert.equal(modeloValido({ ...p, indutancia: 0 }), false)
  assert.equal(modeloValido({ ...p, inercia: -1 }), false)
  assert.equal(modeloValido({ ...p, ke: 0, atrito: 0 }), false)
  assert.equal(modeloValido({ ...p, tensao: Infinity }), false)
})
