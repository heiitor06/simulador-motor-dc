"""Testes da integração usada pelo frontend React."""

import unittest

from servidor_web import executar_simulacao, parametros_do_json


class ServidorWebTest(unittest.TestCase):
    def test_json_vira_parametros_do_motor(self):
        parametros = parametros_do_json({"tensao": 12, "torque_carga": 0.1})
        self.assertEqual(parametros.tensao, 12)
        self.assertEqual(parametros.torque_carga, 0.1)
        self.assertEqual(parametros.resistencia, 2)

    def test_api_retorna_equilibrio_e_serie(self):
        resposta = executar_simulacao({"dt": 0.01, "duracao": 1, "metodo": "RK4"})
        self.assertEqual(len(resposta["pontos"]), 101)
        self.assertAlmostEqual(resposta["equilibrio"]["rpm"], 1609.738567, places=5)
        self.assertEqual(resposta["pontos"][0]["corrente"], 0)

    def test_api_rejeita_valor_invalido(self):
        with self.assertRaisesRegex(ValueError, "indutância"):
            executar_simulacao({"indutancia": 0})


if __name__ == "__main__":
    unittest.main()

