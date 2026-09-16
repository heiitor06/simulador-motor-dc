"""Métodos numéricos explícitos aplicados ao modelo do motor DC."""

from dataclasses import dataclass
from math import isfinite

from motor_dc import ParametrosMotor, derivadas, rpm, torque_eletromagnetico, validar_parametros


@dataclass(frozen=True)
class PontoSimulacao:
    tempo: float
    corrente: float
    velocidade: float
    rpm: float
    torque: float


def passo_euler(
    corrente: float, velocidade: float, dt: float, p: ParametrosMotor
) -> tuple[float, float]:
    di_dt, domega_dt = derivadas(corrente, velocidade, p)
    return corrente + dt * di_dt, velocidade + dt * domega_dt


def passo_rk4(
    corrente: float, velocidade: float, dt: float, p: ParametrosMotor
) -> tuple[float, float]:
    k1_i, k1_w = derivadas(corrente, velocidade, p)
    k2_i, k2_w = derivadas(
        corrente + dt * k1_i / 2, velocidade + dt * k1_w / 2, p
    )
    k3_i, k3_w = derivadas(
        corrente + dt * k2_i / 2, velocidade + dt * k2_w / 2, p
    )
    k4_i, k4_w = derivadas(corrente + dt * k3_i, velocidade + dt * k3_w, p)
    nova_corrente = corrente + dt * (k1_i + 2 * k2_i + 2 * k3_i + k4_i) / 6
    nova_velocidade = velocidade + dt * (k1_w + 2 * k2_w + 2 * k3_w + k4_w) / 6
    return nova_corrente, nova_velocidade


def simular(
    p: ParametrosMotor,
    corrente_inicial: float,
    velocidade_inicial: float,
    dt: float,
    duracao: float,
    metodo: str = "RK4",
) -> list[PontoSimulacao]:
    validar_parametros(p)
    if not all(isfinite(v) for v in (corrente_inicial, velocidade_inicial, dt, duracao)):
        raise ValueError("Condições iniciais, dt e duração devem ser finitos.")
    if dt <= 0 or dt > 0.1:
        raise ValueError("Use um passo dt maior que zero e menor ou igual a 0,1 s.")
    if duracao <= 0 or duracao > 60:
        raise ValueError("Use uma duração maior que zero e menor ou igual a 60 s.")
    quantidade = round(duracao / dt)
    if quantidade < 1 or quantidade > 20000:
        raise ValueError("A simulação deve ter entre 1 e 20.000 passos.")
    metodo_normalizado = metodo.upper()
    if metodo_normalizado not in ("EULER", "RK4"):
        raise ValueError("Escolha o método Euler ou RK4.")
    funcao_passo = passo_rk4 if metodo_normalizado == "RK4" else passo_euler

    corrente, velocidade = corrente_inicial, velocidade_inicial
    pontos = [PontoSimulacao(0.0, corrente, velocidade, rpm(velocidade),
                             torque_eletromagnetico(corrente, p))]
    for numero in range(1, quantidade + 1):
        corrente, velocidade = funcao_passo(corrente, velocidade, dt, p)
        if not isfinite(corrente) or not isfinite(velocidade):
            raise ValueError("A simulação divergiu. Reduza dt ou revise os parâmetros.")
        if abs(corrente) > 1e6 or abs(velocidade) > 1e7:
            raise ValueError("A simulação divergiu. Reduza dt ou revise os parâmetros.")
        tempo = numero * dt
        pontos.append(PontoSimulacao(tempo, corrente, velocidade, rpm(velocidade),
                                     torque_eletromagnetico(corrente, p)))
    return pontos

