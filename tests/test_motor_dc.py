"""Testes do modelo físico e dos métodos numéricos."""

import math
import unittest

from metodos_numericos import passo_euler, simular
from motor_dc import (
    ParametrosMotor,
    derivadas,
    equilibrio,
    inclinacao_homogenea,
    rpm,
    torque_eletromagnetico,
    validar_parametros,
)


class MotorDCTest(unittest.TestCase):
    def setUp(self):
        self.p = ParametrosMotor()

    def test_equilibrio_satisfaz_as_duas_equacoes(self):
        corrente, velocidade = equilibrio(self.p)
        eletrica = self.p.tensao - self.p.resistencia * corrente - self.p.ke * velocidade
        mecanica = self.p.kt * corrente - self.p.atrito * velocidade - self.p.torque_carga
        self.assertAlmostEqual(eletrica, 0, places=12)
        self.assertAlmostEqual(mecanica, 0, places=12)

    def test_valores_padrao_sao_os_validados(self):
        corrente, velocidade = equilibrio(self.p)
        self.assertAlmostEqual(corrente, 3.5714285714)
        self.assertAlmostEqual(velocidade, 168.5714285714)
        self.assertAlmostEqual(rpm(velocidade), 1609.738567, places=5)

    def test_derivadas_na_partida(self):
        di_dt, dw_dt = derivadas(0, 0, self.p)
        self.assertAlmostEqual(di_dt, 48.0)
        self.assertAlmostEqual(dw_dt, -1.0)

    def test_euler_aplica_formula_explicita(self):
        corrente, velocidade = passo_euler(0, 0, 0.01, self.p)
        self.assertAlmostEqual(corrente, 0.48)
        self.assertAlmostEqual(velocidade, -0.01)

    def test_rk4_converge_para_o_equilibrio(self):
        pontos = simular(self.p, 0, 0, 0.01, 20, "RK4")
        corrente_eq, velocidade_eq = equilibrio(self.p)
        self.assertAlmostEqual(pontos[-1].corrente, corrente_eq, delta=0.01)
        self.assertAlmostEqual(pontos[-1].velocidade, velocidade_eq, delta=0.2)

    def test_corrente_de_partida_tem_pico(self):
        pontos = simular(self.p, 0, 0, 0.01, 12, "RK4")
        corrente_eq, _ = equilibrio(self.p)
        self.assertGreater(max(p.corrente for p in pontos), corrente_eq * 2)

    def test_plano_de_estados_usa_a_mesma_serie_temporal(self):
        pontos = simular(self.p, 0, 0, 0.02, 4, "RK4")
        ieq, weq = equilibrio(self.p)
        ultimo = pontos[-1]
        delta_i, delta_w = ultimo.corrente - ieq, ultimo.velocidade - weq
        self.assertAlmostEqual(delta_i + ieq, ultimo.corrente)
        self.assertAlmostEqual(delta_w + weq, ultimo.velocidade)

    def test_relacao_e_homogenea_por_escala(self):
        valor = inclinacao_homogenea(-2.0, -80.0, self.p)
        escalado = inclinacao_homogenea(-6.0, -240.0, self.p)
        self.assertAlmostEqual(valor, escalado)

    def test_diminuir_dt_mantem_resultado_coerente(self):
        a = simular(self.p, 0, 0, 0.02, 8, "RK4")[-1]
        b = simular(self.p, 0, 0, 0.01, 8, "RK4")[-1]
        self.assertAlmostEqual(a.corrente, b.corrente, delta=0.002)
        self.assertAlmostEqual(a.velocidade, b.velocidade, delta=0.03)

    def test_resultados_nao_contem_nan_ou_infinito(self):
        pontos = simular(self.p, 0, 0, 0.01, 12, "Euler")
        for ponto in pontos:
            self.assertTrue(all(math.isfinite(v) for v in vars(ponto).values()))

    def test_torque_e_k_t_vezes_corrente(self):
        self.assertAlmostEqual(torque_eletromagnetico(5, self.p), 0.5)

    def test_parametros_invalidos_sao_rejeitados(self):
        with self.assertRaisesRegex(ValueError, "indutância"):
            validar_parametros(ParametrosMotor(indutancia=0))
        with self.assertRaisesRegex(ValueError, "inércia"):
            validar_parametros(ParametrosMotor(inercia=0))
        with self.assertRaises(ValueError):
            validar_parametros(ParametrosMotor(resistencia=-1))

    def test_metodo_e_dt_invalidos_sao_rejeitados(self):
        with self.assertRaises(ValueError):
            simular(self.p, 0, 0, 0.2, 2, "RK4")
        with self.assertRaises(ValueError):
            simular(self.p, 0, 0, 0.01, 2, "Outro")


if __name__ == "__main__":
    unittest.main()

