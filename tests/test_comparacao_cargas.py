"""Valida a interpretação física dos dois ensaios independentes."""
from dataclasses import replace
import unittest

from motor_dc import ParametrosMotor, derivadas, equilibrio, inclinacao_homogenea
from metodos_numericos import simular


class ComparacaoCargasTest(unittest.TestCase):
    def test_maior_carga_exige_mais_corrente_e_reduz_velocidade(self):
        a = ParametrosMotor(torque_carga=0.02)
        b = replace(a, torque_carga=0.10)
        ia, wa = equilibrio(a)
        ib, wb = equilibrio(b)
        self.assertGreater(ib, ia)
        self.assertLess(wb, wa)
        for p in (a, b):
            i, w = equilibrio(p)
            final = simular(p, 0, 0, 0.01, 30, "RK4")[-1]
            self.assertAlmostEqual(final.corrente, i, delta=0.001)
            self.assertAlmostEqual(final.velocidade, w, delta=0.01)

    def test_deslocar_cada_equilibrio_preserva_mesmo_campo_homogeneo(self):
        # Um mesmo desvio representa estados físicos diferentes em cada ensaio.
        x, y = -2.0, -80.0
        derivadas_desvios = []
        for carga in (0.02, 0.10):
            p = ParametrosMotor(torque_carga=carga)
            i, w = equilibrio(p)
            di, dw = derivadas(i + x, w + y, p)
            derivadas_desvios.append((di, dw))
            self.assertAlmostEqual(dw / di, inclinacao_homogenea(x, y, p))
        for a, b in zip(*derivadas_desvios):
            self.assertAlmostEqual(a, b)
