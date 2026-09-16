"""Ponto de entrada do Laboratório Virtual de Motor DC."""

import sys

from PySide6.QtWidgets import QApplication

from interface import JanelaMotorDC


def main() -> int:
    aplicativo = QApplication(sys.argv)
    aplicativo.setApplicationName("Laboratório Virtual de Motor DC")
    janela = JanelaMotorDC()
    janela.show()
    return aplicativo.exec()


if __name__ == "__main__":
    raise SystemExit(main())

