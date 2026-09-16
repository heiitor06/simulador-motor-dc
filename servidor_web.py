"""API local e servidor dos arquivos compilados do frontend React."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from metodos_numericos import simular
from motor_dc import ParametrosMotor, equilibrio, rpm


RAIZ = Path(__file__).resolve().parent
DIST = RAIZ / "frontend" / "dist"


def parametros_do_json(dados: dict) -> ParametrosMotor:
    return ParametrosMotor(
        tensao=float(dados.get("tensao", 24)),
        resistencia=float(dados.get("resistencia", 2)),
        indutancia=float(dados.get("indutancia", 0.5)),
        ke=float(dados.get("ke", 0.1)),
        kt=float(dados.get("kt", 0.1)),
        inercia=float(dados.get("inercia", 0.02)),
        atrito=float(dados.get("atrito", 0.002)),
        torque_carga=float(dados.get("torque_carga", 0.02)),
    )


def executar_simulacao(dados: dict) -> dict:
    parametros = parametros_do_json(dados)
    corrente_eq, velocidade_eq = equilibrio(parametros)
    pontos = simular(
        parametros,
        float(dados.get("corrente_inicial", 0)),
        float(dados.get("velocidade_inicial", 0)),
        float(dados.get("dt", 0.01)),
        float(dados.get("duracao", 12)),
        str(dados.get("metodo", "RK4")),
    )
    return {
        "equilibrio": {
            "corrente": corrente_eq,
            "velocidade": velocidade_eq,
            "rpm": rpm(velocidade_eq),
        },
        "pontos": [asdict(ponto) for ponto in pontos],
    }


class Manipulador(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def _json(self, conteudo: dict, status: int = 200) -> None:
        corpo = json.dumps(conteudo, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        caminho = urlparse(self.path).path
        if caminho == "/api/health":
            self._json({"status": "ok"})
            return
        if caminho == "/api/config":
            parametros = ParametrosMotor()
            corrente_eq, velocidade_eq = equilibrio(parametros)
            self._json({
                "parametros": asdict(parametros),
                "equilibrio": {
                    "corrente": corrente_eq,
                    "velocidade": velocidade_eq,
                    "rpm": rpm(velocidade_eq),
                },
            })
            return
        arquivo = DIST / caminho.lstrip("/")
        if caminho != "/" and not arquivo.is_file():
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/simular":
            self._json({"erro": "Rota não encontrada."}, 404)
            return
        try:
            tamanho = int(self.headers.get("Content-Length", "0"))
            if tamanho <= 0 or tamanho > 1_000_000:
                raise ValueError("Requisição inválida.")
            dados = json.loads(self.rfile.read(tamanho).decode("utf-8"))
            if not isinstance(dados, dict):
                raise ValueError("Os parâmetros devem formar um objeto JSON.")
            self._json(executar_simulacao(dados))
        except (ValueError, TypeError, json.JSONDecodeError) as erro:
            self._json({"erro": str(erro)}, 400)

    def log_message(self, formato: str, *args) -> None:
        print(f"[web] {self.address_string()} - {formato % args}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8090)
    argumentos = parser.parse_args()
    if not (DIST / "index.html").is_file():
        raise SystemExit("Frontend não compilado. Execute npm run build na pasta frontend.")
    servidor = ThreadingHTTPServer(("127.0.0.1", argumentos.port), Manipulador)
    print(f"Laboratório disponível em http://localhost:{argumentos.port}")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()

