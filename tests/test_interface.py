"""Testes básicos da interface em modo sem tela."""

import os
import unittest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication

from interface import JanelaMotorDC


class InterfaceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        self.janela = JanelaMotorDC()

    def tearDown(self):
        self.janela.timer.stop()
        self.janela.close()

    def test_abre_com_motor_parado_e_rk4(self):
        self.assertEqual(self.janela.motor.velocidade, 0)
        self.assertEqual(self.janela.metodo.currentText(), "RK4")
        self.assertIn("3.571", self.janela.cartao_equilibrio.text())

    def test_iniciar_pausar_continuar_e_reiniciar(self):
        self.janela._iniciar()
        self.janela.timer.stop()
        self.assertTrue(self.janela.executando)
        self.janela._avancar()
        self.assertGreater(self.janela.indice, 0)
        self.janela._pausar()
        self.assertTrue(self.janela.pausado)
        self.janela._pausar()
        self.janela.timer.stop()
        self.assertFalse(self.janela.pausado)
        self.janela._reiniciar()
        self.assertFalse(self.janela.executando)
        self.assertEqual(self.janela.indice, 0)

    def test_metricas_tabela_graficos_e_rotor_atualizam(self):
        self.janela._iniciar()
        self.janela.timer.stop()
        angulo = self.janela.motor.angulo
        for _ in range(30):
            self.janela._avancar()
        self.assertNotEqual(self.janela.metricas["corrente"].valor.text(), "—")
        self.assertGreater(self.janela.tabela.rowCount(), 0)
        self.assertNotEqual(self.janela.motor.angulo, angulo)
        self.janela.abas.setCurrentIndex(1)
        self.janela._desenhar_plano()
        self.assertGreater(len(self.janela.canvas_plano.eixo.lines), 0)

    def test_euler_e_condicao_inicial_alternativa(self):
        self.janela.metodo.setCurrentText("Euler")
        self.janela.campos["corrente_inicial"].setValue(2.0)
        self.janela.campos["velocidade_inicial"].setValue(50.0)
        self.janela._iniciar()
        self.janela.timer.stop()
        self.assertEqual(self.janela.pontos[0].corrente, 2.0)
        self.assertEqual(self.janela.pontos[0].velocidade, 50.0)


if __name__ == "__main__":
    unittest.main()

