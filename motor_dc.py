"""Modelo físico simplificado de um motor de corrente contínua."""

from dataclasses import dataclass
from math import isfinite, pi


@dataclass(frozen=True)
class ParametrosMotor:
    tensao: float = 24.0
    resistencia: float = 2.0
    indutancia: float = 0.5
    ke: float = 0.1
    kt: float = 0.1
    inercia: float = 0.02
    atrito: float = 0.002
    torque_carga: float = 0.02


def validar_parametros(p: ParametrosMotor) -> None:
    valores = vars(p).values()
    if not all(isfinite(valor) for valor in valores):
        raise ValueError("Todos os parâmetros precisam ser números finitos.")
    if p.indutancia <= 0:
        raise ValueError("A indutância L deve ser maior que zero.")
    if p.inercia <= 0:
        raise ValueError("A inércia J deve ser maior que zero.")
    if p.resistencia < 0 or p.ke < 0 or p.kt < 0 or p.atrito < 0:
        raise ValueError("R, Ke, Kt e b não podem ser negativos.")
    if p.resistencia * p.atrito + p.ke * p.kt <= 0:
        raise ValueError("Os parâmetros não permitem calcular um equilíbrio único.")


def derivadas(
    corrente: float, velocidade: float, p: ParametrosMotor
) -> tuple[float, float]:
    """Retorna di/dt e dω/dt a partir das duas equações do motor."""
    di_dt = (p.tensao - p.resistencia * corrente - p.ke * velocidade) / p.indutancia
    domega_dt = (p.kt * corrente - p.atrito * velocidade - p.torque_carga) / p.inercia
    if not isfinite(di_dt) or not isfinite(domega_dt):
        raise ValueError("O cálculo produziu um valor numérico inválido.")
    return di_dt, domega_dt


def equilibrio(p: ParametrosMotor) -> tuple[float, float]:
    """Resolve analiticamente o sistema algébrico no regime permanente."""
    validar_parametros(p)
    denominador = p.resistencia * p.atrito + p.ke * p.kt
    corrente_eq = (p.atrito * p.tensao + p.ke * p.torque_carga) / denominador
    velocidade_eq = (p.kt * p.tensao - p.resistencia * p.torque_carga) / denominador
    return corrente_eq, velocidade_eq


def rpm(velocidade: float) -> float:
    return velocidade * 60.0 / (2.0 * pi)


def torque_eletromagnetico(corrente: float, p: ParametrosMotor) -> float:
    return p.kt * corrente


def inclinacao_homogenea(delta_i: float, delta_omega: float, p: ParametrosMotor) -> float:
    """Calcula d(Δω)/d(Δi); essa relação não representa uma derivada temporal."""
    denominador = p.resistencia * delta_i + p.ke * delta_omega
    escala = max(1.0, abs(p.resistencia * delta_i), abs(p.ke * delta_omega))
    if abs(denominador) <= 1e-12 * escala:
        raise ValueError("A inclinação no plano de estados é vertical neste ponto.")
    return -(p.indutancia / p.inercia) * (
        p.kt * delta_i - p.atrito * delta_omega
    ) / denominador

