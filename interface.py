"""Interface desktop do laboratório virtual de motor DC."""

from __future__ import annotations

import os
from math import ceil, cos, pi, sin
from pathlib import Path

_cache = Path(__file__).with_name(".matplotlib-cache")
_cache.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(_cache))

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure
from PySide6.QtCore import QPointF, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import (
    QComboBox,
    QDoubleSpinBox,
    QFormLayout,
    QFrame,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTabWidget,
    QTableWidget,
    QTableWidgetItem,
    QTextBrowser,
    QVBoxLayout,
    QWidget,
)

from metodos_numericos import PontoSimulacao, simular
from motor_dc import ParametrosMotor, equilibrio, rpm, torque_eletromagnetico


FUNDO = "#081119"
PAINEL = "#101d27"
GRADE = "#29404e"
CIANO = "#55d9db"
AZUL = "#58a6d6"
LARANJA = "#f0a65a"
VERDE = "#79ddb3"


class CanvasTemporal(FigureCanvasQTAgg):
    def __init__(self) -> None:
        self.figura = Figure(facecolor="#0b151e", tight_layout=True)
        self.eixo_corrente, self.eixo_velocidade = self.figura.subplots(2, 1, sharex=True)
        super().__init__(self.figura)
        self.setMinimumHeight(330)


class CanvasPlano(FigureCanvasQTAgg):
    def __init__(self) -> None:
        self.figura = Figure(facecolor="#0b151e", tight_layout=True)
        self.eixo = self.figura.add_subplot(111)
        super().__init__(self.figura)
        self.setMinimumHeight(410)


class Cartao(QFrame):
    def __init__(self, titulo: str, unidade: str = "") -> None:
        super().__init__()
        self.setObjectName("cartao")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(2)
        legenda = QLabel(titulo)
        legenda.setObjectName("legenda")
        self.valor = QLabel("—")
        self.valor.setObjectName("valor")
        self.unidade = QLabel(unidade)
        self.unidade.setObjectName("unidade")
        layout.addWidget(legenda)
        linha = QHBoxLayout()
        linha.addWidget(self.valor)
        linha.addWidget(self.unidade)
        linha.addStretch()
        layout.addLayout(linha)


class MotorVisual(QWidget):
    """Desenho técnico simples; o ângulo depende da velocidade simulada."""

    def __init__(self) -> None:
        super().__init__()
        self.angulo = 0.0
        self.velocidade = 0.0
        self.setMinimumSize(270, 185)

    def definir_velocidade(self, velocidade: float) -> None:
        self.velocidade = velocidade

    def avancar(self, segundos: float) -> None:
        velocidade_visual = max(-220.0, min(220.0, self.velocidade))
        self.angulo = (self.angulo + velocidade_visual * segundos * 0.11) % (2 * pi)
        self.update()

    def reiniciar(self) -> None:
        self.angulo = 0.0
        self.velocidade = 0.0
        self.update()

    def paintEvent(self, _evento) -> None:
        pintor = QPainter(self)
        pintor.setRenderHint(QPainter.RenderHint.Antialiasing)
        centro = QPointF(self.width() * 0.47, self.height() * 0.53)
        raio = min(self.width(), self.height()) * 0.29

        pintor.setPen(QPen(QColor("#233c4b"), 2))
        pintor.setBrush(QColor("#0a151d"))
        pintor.drawRoundedRect(QRectF(centro.x() - raio * 1.45, centro.y() - raio * 1.05,
                                     raio * 2.45, raio * 2.1), 18, 18)
        pintor.setBrush(QColor("#162d3a"))
        pintor.setPen(QPen(QColor("#42697b"), 3))
        pintor.drawEllipse(centro, raio, raio)
        pintor.setBrush(QColor("#091219"))
        pintor.drawEllipse(centro, raio * 0.73, raio * 0.73)

        for numero in range(6):
            a = self.angulo + numero * pi / 3
            inicio = QPointF(centro.x() + cos(a) * raio * 0.18,
                             centro.y() + sin(a) * raio * 0.18)
            fim = QPointF(centro.x() + cos(a) * raio * 0.67,
                          centro.y() + sin(a) * raio * 0.67)
            pintor.setPen(QPen(QColor(CIANO), 5, Qt.PenStyle.SolidLine,
                               Qt.PenCapStyle.RoundCap))
            pintor.drawLine(inicio, fim)

        pintor.setBrush(QColor("#b8d3dc"))
        pintor.setPen(QPen(QColor("#e7f5f7"), 2))
        pintor.drawEllipse(centro, raio * 0.15, raio * 0.15)
        pintor.setBrush(QColor("#243b47"))
        pintor.drawRect(QRectF(centro.x() + raio, centro.y() - raio * 0.18,
                              raio * 0.8, raio * 0.36))
        pintor.setBrush(QColor("#aac5ce"))
        pintor.drawRect(QRectF(centro.x() + raio * 1.75, centro.y() - raio * 0.09,
                              raio * 0.58, raio * 0.18))

        pintor.setPen(QColor("#6d8998"))
        pintor.setFont(QFont("Segoe UI", 8))
        pintor.drawText(QRectF(5, 4, self.width() - 10, 20),
                        Qt.AlignmentFlag.AlignCenter, "ROTOR · EIXO · CARCAÇA")


class JanelaMotorDC(QMainWindow):
    INTERVALOS = {"Lenta": 120, "Normal": 60, "Rápida": 25}

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Laboratório Virtual de Motor DC")
        self.resize(1440, 900)
        self.setMinimumSize(1100, 720)
        self.pontos: list[PontoSimulacao] = []
        self.indice = 0
        self.salto = 1
        self.parametros_atuais = ParametrosMotor()
        self.equilibrio_atual = equilibrio(self.parametros_atuais)
        self.executando = False
        self.pausado = False
        self.concluido = False
        self.contador_grafico = 0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._avancar)
        self._montar_interface()
        self._aplicar_estilo()
        self._conectar_eventos()
        self._previsualizar()

    @staticmethod
    def _decimal(minimo: float, maximo: float, valor: float, casas: int = 4) -> QDoubleSpinBox:
        campo = QDoubleSpinBox()
        campo.setRange(minimo, maximo)
        campo.setDecimals(casas)
        campo.setValue(valor)
        campo.setKeyboardTracking(False)
        return campo

    def _montar_interface(self) -> None:
        central = QWidget()
        self.setCentralWidget(central)
        raiz = QVBoxLayout(central)
        raiz.setContentsMargins(20, 16, 20, 18)
        raiz.setSpacing(12)

        cabecalho = QHBoxLayout()
        titulos = QVBoxLayout()
        etiqueta = QLabel("ENGENHARIA DE COMPUTAÇÃO · EQUAÇÕES DIFERENCIAIS")
        etiqueta.setObjectName("etiqueta")
        titulo = QLabel("Laboratório virtual de motor DC")
        titulo.setObjectName("titulo")
        subtitulo = QLabel("Do modelo físico ao comportamento transitório")
        subtitulo.setObjectName("descricao")
        titulos.addWidget(etiqueta)
        titulos.addWidget(titulo)
        titulos.addWidget(subtitulo)
        formula = QLabel("L di/dt = V − Ri − Keω\nJ dω/dt = Kti − bω − τL")
        formula.setObjectName("formula")
        cabecalho.addLayout(titulos)
        cabecalho.addStretch()
        cabecalho.addWidget(formula)
        raiz.addLayout(cabecalho)

        corpo = QHBoxLayout()
        corpo.setSpacing(14)
        corpo.addWidget(self._painel_parametros())
        corpo.addLayout(self._area_principal(), 1)
        raiz.addLayout(corpo, 1)

    def _painel_parametros(self) -> QWidget:
        painel = QFrame()
        painel.setObjectName("painelParametros")
        painel.setFixedWidth(318)
        layout = QVBoxLayout(painel)
        layout.setContentsMargins(12, 12, 12, 12)
        titulo = QLabel("Parâmetros do motor")
        titulo.setObjectName("subtitulo")
        layout.addWidget(titulo)
        self.campos: dict[str, QDoubleSpinBox] = {
            "tensao": self._decimal(-100, 100, 24, 2),
            "resistencia": self._decimal(0, 100, 2, 3),
            "indutancia": self._decimal(0.0001, 100, 0.5, 4),
            "ke": self._decimal(0, 10, 0.1, 4),
            "kt": self._decimal(0, 10, 0.1, 4),
            "inercia": self._decimal(0.00001, 100, 0.02, 5),
            "atrito": self._decimal(0, 10, 0.002, 5),
            "torque_carga": self._decimal(-100, 100, 0.02, 3),
            "corrente_inicial": self._decimal(-1000, 1000, 0, 3),
            "velocidade_inicial": self._decimal(-10000, 10000, 0, 3),
            "dt": self._decimal(0.0001, 0.1, 0.01, 4),
            "duracao": self._decimal(0.1, 60, 12, 2),
        }
        abas_parametros = QTabWidget()

        pagina_motor = QWidget()
        layout_motor = QVBoxLayout(pagina_motor)
        layout_motor.setContentsMargins(4, 7, 4, 4)
        eletrico = QGroupBox("Parte elétrica")
        fe = QFormLayout(eletrico)
        fe.addRow("Tensão V (V)", self.campos["tensao"])
        fe.addRow("Resistência R (Ω)", self.campos["resistencia"])
        fe.addRow("Indutância L (H)", self.campos["indutancia"])
        fe.addRow("Constante Ke", self.campos["ke"])
        layout_motor.addWidget(eletrico)

        mecanico = QGroupBox("Parte mecânica")
        fm = QFormLayout(mecanico)
        fm.addRow("Constante Kt", self.campos["kt"])
        fm.addRow("Inércia J", self.campos["inercia"])
        fm.addRow("Atrito b", self.campos["atrito"])
        fm.addRow("Carga τL (N·m)", self.campos["torque_carga"])
        layout_motor.addWidget(mecanico)
        layout_motor.addStretch()
        abas_parametros.addTab(pagina_motor, "Motor")

        pagina_simulacao = QWidget()
        layout_simulacao = QVBoxLayout(pagina_simulacao)
        layout_simulacao.setContentsMargins(4, 7, 4, 4)
        simulacao = QGroupBox("Simulação")
        fs = QFormLayout(simulacao)
        fs.addRow("Corrente i(0)", self.campos["corrente_inicial"])
        fs.addRow("Velocidade ω(0)", self.campos["velocidade_inicial"])
        fs.addRow("Passo dt (s)", self.campos["dt"])
        fs.addRow("Duração (s)", self.campos["duracao"])
        self.metodo = QComboBox()
        self.metodo.addItems(["RK4", "Euler"])
        self.velocidade_visual = QComboBox()
        self.velocidade_visual.addItems(self.INTERVALOS)
        self.velocidade_visual.setCurrentText("Normal")
        fs.addRow("Método", self.metodo)
        fs.addRow("Animação", self.velocidade_visual)
        layout_simulacao.addWidget(simulacao)
        ajuda = QLabel("dt controla o cálculo. A opção de animação altera somente o tempo entre os quadros.")
        ajuda.setObjectName("ajuda")
        ajuda.setWordWrap(True)
        layout_simulacao.addWidget(ajuda)
        layout_simulacao.addStretch()
        abas_parametros.addTab(pagina_simulacao, "Condições e método")
        layout.addWidget(abas_parametros, 1)

        self.iniciar = QPushButton("▶  Iniciar")
        self.iniciar.setObjectName("principal")
        self.pausar = QPushButton("Pausar")
        self.pausar.setEnabled(False)
        self.reiniciar = QPushButton("Reiniciar")
        layout.addWidget(self.iniciar)
        botoes = QHBoxLayout()
        botoes.addWidget(self.pausar)
        botoes.addWidget(self.reiniciar)
        layout.addLayout(botoes)
        return painel

    def _area_principal(self) -> QVBoxLayout:
        layout = QVBoxLayout()
        layout.setSpacing(10)
        painel_motor = QFrame()
        painel_motor.setObjectName("painel")
        topo = QHBoxLayout(painel_motor)
        topo.setContentsMargins(12, 10, 12, 10)
        self.motor = MotorVisual()
        topo.addWidget(self.motor, 2)

        grade = QGridLayout()
        self.metricas = {
            "rpm": Cartao("VELOCIDADE", "RPM"),
            "corrente": Cartao("CORRENTE", "A"),
            "torque": Cartao("TORQUE ELETROMAGNÉTICO", "N·m"),
        }
        grade.addWidget(self.metricas["rpm"], 0, 0)
        grade.addWidget(self.metricas["corrente"], 0, 1)
        grade.addWidget(self.metricas["torque"], 1, 0, 1, 2)
        self.cartao_equilibrio = QLabel()
        self.cartao_equilibrio.setObjectName("equilibrio")
        self.cartao_equilibrio.setAlignment(Qt.AlignmentFlag.AlignCenter)
        grade.addWidget(self.cartao_equilibrio, 0, 2, 2, 1)
        topo.addLayout(grade, 5)
        layout.addWidget(painel_motor)

        self.abas = QTabWidget()
        self.canvas_temporal = CanvasTemporal()
        aba_temporal = QWidget()
        lt = QVBoxLayout(aba_temporal)
        lt.setContentsMargins(4, 4, 4, 4)
        lt.addWidget(self.canvas_temporal)
        self.abas.addTab(aba_temporal, "Comportamento no tempo")

        self.canvas_plano = CanvasPlano()
        self.abas.addTab(self.canvas_plano, "Plano de estados Δi × Δω")

        aba_dados = QWidget()
        ld = QVBoxLayout(aba_dados)
        descricao_dados = QLabel("Últimos valores revelados pela simulação")
        descricao_dados.setObjectName("ajuda")
        ld.addWidget(descricao_dados)
        self.tabela = QTableWidget(0, 5)
        self.tabela.setHorizontalHeaderLabels(["Tempo", "Corrente", "ω", "RPM", "Torque"])
        self.tabela.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.tabela.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        ld.addWidget(self.tabela)
        self.abas.addTab(aba_dados, "Tabela de dados")

        modelo = QTextBrowser()
        modelo.setObjectName("modelo")
        modelo.setHtml(self._texto_modelo())
        self.abas.addTab(modelo, "Modelo matemático")
        layout.addWidget(self.abas, 1)

        faixa = QFrame()
        faixa.setObjectName("faixa")
        lf = QHBoxLayout(faixa)
        lf.setContentsMargins(12, 8, 12, 8)
        self.status = QLabel("●  Pronto")
        self.status.setObjectName("status")
        self.explicacao = QLabel("Motor inicialmente parado. Pressione Iniciar para aplicar a tensão.")
        self.explicacao.setWordWrap(True)
        self.progresso = QLabel("t = 0,00 s")
        self.progresso.setObjectName("progresso")
        lf.addWidget(self.status)
        lf.addWidget(self.explicacao, 1)
        lf.addWidget(self.progresso)
        layout.addWidget(faixa)
        return layout

    @staticmethod
    def _texto_modelo() -> str:
        return """
        <h2>Modelo matemático do motor DC</h2>
        <table width='100%' cellspacing='12'><tr><td width='50%'>
        <h3>Equação elétrica</h3><p class='formula'>L di/dt = V − Ri − Keω</p>
        <h3>Equação mecânica</h3><p class='formula'>J dω/dt = Kti − bω − τL</p>
        </td><td>
        <h3>Desvios do equilíbrio</h3>
        <p class='formula'>Δi = i − ieq<br>Δω = ω − ωeq</p>
        <p>Os termos constantes desaparecem porque observamos o afastamento do estado de equilíbrio.</p>
        </td></tr></table>
        <hr><h3>EDO homogênea de primeira ordem</h3>
        <p class='formula'>d(Δω)/d(Δi) = −(L/J) · [Kt − b(Δω/Δi)] / [R + Ke(Δω/Δi)]</p>
        <p class='destaque'>Logo, d(Δω)/d(Δi) = F(Δω/Δi).</p>
        <p>Como a derivada depende apenas da razão Δω/Δi, temos uma EDO homogênea de primeira ordem.</p>
        <p>A curva no plano de estados mostra a relação entre os desvios durante o transitório.
        Ela não fornece o tempo: a evolução temporal vem do sistema di/dt e dω/dt.</p>
        """

    def _conectar_eventos(self) -> None:
        self.iniciar.clicked.connect(self._iniciar)
        self.pausar.clicked.connect(self._pausar)
        self.reiniciar.clicked.connect(self._reiniciar)
        self.abas.currentChanged.connect(self._desenhar_aba_atual)
        self.velocidade_visual.currentTextChanged.connect(self._alterar_velocidade)
        for campo in self.campos.values():
            campo.valueChanged.connect(self._previsualizar)

    def _obter_parametros(self) -> ParametrosMotor:
        return ParametrosMotor(
            tensao=self.campos["tensao"].value(),
            resistencia=self.campos["resistencia"].value(),
            indutancia=self.campos["indutancia"].value(),
            ke=self.campos["ke"].value(),
            kt=self.campos["kt"].value(),
            inercia=self.campos["inercia"].value(),
            atrito=self.campos["atrito"].value(),
            torque_carga=self.campos["torque_carga"].value(),
        )

    def _previsualizar(self, *_args) -> None:
        if self.executando:
            return
        try:
            self.parametros_atuais = self._obter_parametros()
            self.equilibrio_atual = equilibrio(self.parametros_atuais)
            self._mostrar_equilibrio()
            corrente = self.campos["corrente_inicial"].value()
            velocidade = self.campos["velocidade_inicial"].value()
            self.metricas["rpm"].valor.setText(f"{rpm(velocidade):,.0f}".replace(",", "."))
            self.metricas["corrente"].valor.setText(f"{corrente:.3f}")
            self.metricas["torque"].valor.setText(
                f"{torque_eletromagnetico(corrente, self.parametros_atuais):.3f}"
            )
            self.motor.definir_velocidade(velocidade)
            self._desenhar_aba_atual()
        except ValueError as erro:
            self.cartao_equilibrio.setText(str(erro))

    def _mostrar_equilibrio(self) -> None:
        ieq, weq = self.equilibrio_atual
        rpm_eq = weq * 60 / (2 * pi)
        self.cartao_equilibrio.setText(
            "PONTO DE EQUILÍBRIO\n\n"
            f"Corrente  {ieq:.3f} A\n"
            f"Velocidade  {weq:.2f} rad/s\n"
            f"Rotação  {rpm_eq:.0f} RPM"
        )

    def _iniciar(self) -> None:
        try:
            self.parametros_atuais = self._obter_parametros()
            self.equilibrio_atual = equilibrio(self.parametros_atuais)
            self.pontos = simular(
                self.parametros_atuais,
                self.campos["corrente_inicial"].value(),
                self.campos["velocidade_inicial"].value(),
                self.campos["dt"].value(),
                self.campos["duracao"].value(),
                self.metodo.currentText(),
            )
        except ValueError as erro:
            QMessageBox.warning(self, "Parâmetros inválidos", str(erro))
            return
        self.indice = 0
        self.salto = max(1, ceil((len(self.pontos) - 1) / 220))
        self.executando = True
        self.pausado = False
        self.concluido = False
        self.contador_grafico = 0
        self._bloquear_campos(True)
        self.iniciar.setEnabled(False)
        self.pausar.setEnabled(True)
        self.pausar.setText("Pausar")
        self.status.setText("●  Simulando")
        self.timer.start(self.INTERVALOS[self.velocidade_visual.currentText()])
        self._mostrar_equilibrio()
        self._atualizar_painel()

    def _pausar(self) -> None:
        if not self.executando:
            return
        if self.pausado:
            self.pausado = False
            self.timer.start(self.INTERVALOS[self.velocidade_visual.currentText()])
            self.pausar.setText("Pausar")
            self.status.setText("●  Equilíbrio aproximado" if self.concluido else "●  Simulando")
        else:
            self.pausado = True
            self.timer.stop()
            self.pausar.setText("Continuar")
            self.status.setText("●  Pausado")

    def _reiniciar(self) -> None:
        self.timer.stop()
        self.pontos = []
        self.indice = 0
        self.executando = False
        self.pausado = False
        self.concluido = False
        self.contador_grafico = 0
        self._bloquear_campos(False)
        self.iniciar.setEnabled(True)
        self.pausar.setEnabled(False)
        self.pausar.setText("Pausar")
        self.motor.reiniciar()
        self.status.setText("●  Pronto")
        self.progresso.setText("t = 0,00 s")
        self.explicacao.setText("Motor inicialmente parado. Pressione Iniciar para aplicar a tensão.")
        for cartao in self.metricas.values():
            cartao.valor.setText("—")
        self.tabela.setRowCount(0)
        self._previsualizar()
        self._desenhar_aba_atual()

    def _bloquear_campos(self, bloquear: bool) -> None:
        for campo in self.campos.values():
            campo.setEnabled(not bloquear)
        self.metodo.setEnabled(not bloquear)

    def _alterar_velocidade(self, texto: str) -> None:
        if self.timer.isActive():
            self.timer.setInterval(self.INTERVALOS[texto])

    def _avancar(self) -> None:
        if not self.pontos:
            return
        intervalo = self.INTERVALOS[self.velocidade_visual.currentText()] / 1000
        self.motor.avancar(intervalo)
        if not self.concluido:
            self.indice = min(self.indice + self.salto, len(self.pontos) - 1)
            if self.indice == len(self.pontos) - 1:
                self.concluido = True
                self.status.setText("●  Equilíbrio aproximado")
            self.contador_grafico += 1
            redesenhar = self.contador_grafico >= 6 or self.concluido
            if redesenhar:
                self.contador_grafico = 0
            self._atualizar_painel(redesenhar)

    def _atualizar_painel(self, redesenhar: bool = True) -> None:
        ponto = self.pontos[self.indice]
        self.metricas["rpm"].valor.setText(f"{ponto.rpm:,.0f}".replace(",", "."))
        self.metricas["corrente"].valor.setText(f"{ponto.corrente:.3f}")
        self.metricas["torque"].valor.setText(f"{ponto.torque:.3f}")
        self.motor.definir_velocidade(ponto.velocidade)
        self.progresso.setText(f"t = {ponto.tempo:.2f} s / {self.pontos[-1].tempo:.2f} s")
        self._atualizar_explicacao(ponto)
        self._atualizar_tabela()
        if redesenhar:
            self._desenhar_aba_atual()

    def _atualizar_explicacao(self, ponto: PontoSimulacao) -> None:
        ieq, weq = self.equilibrio_atual
        inicial = self.pontos[0]
        escala_i = max(abs(inicial.corrente - ieq), 0.1)
        escala_w = max(abs(inicial.velocidade - weq), 1.0)
        desvio = max(abs(ponto.corrente - ieq) / escala_i,
                     abs(ponto.velocidade - weq) / escala_w)
        if ponto.tempo <= max(0.15, self.pontos[-1].tempo * 0.04):
            texto = "O motor está partindo. A velocidade ainda é baixa e a corrente produz torque."
        elif desvio > 0.2:
            texto = "O rotor acelera e a força contraeletromotriz Keω modifica a corrente."
        else:
            texto = "O motor está se aproximando do regime permanente e do ponto de equilíbrio."
        self.explicacao.setText(texto)

    def _atualizar_tabela(self) -> None:
        visiveis = self.pontos[max(0, self.indice - 5): self.indice + 1]
        self.tabela.setRowCount(len(visiveis))
        for linha, ponto in enumerate(visiveis):
            valores = (f"{ponto.tempo:.2f} s", f"{ponto.corrente:.3f} A",
                       f"{ponto.velocidade:.2f}", f"{ponto.rpm:.0f}", f"{ponto.torque:.3f}")
            for coluna, valor in enumerate(valores):
                item = QTableWidgetItem(valor)
                item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                self.tabela.setItem(linha, coluna, item)

    def _preparar_eixo(self, eixo) -> None:
        eixo.set_facecolor("#0b151e")
        eixo.grid(True, color=GRADE, linewidth=0.6, alpha=0.7)
        eixo.tick_params(colors="#7793a3", labelsize=8)
        for borda in eixo.spines.values():
            borda.set_color("#2b4655")

    def _desenhar_aba_atual(self, *_args) -> None:
        indice_aba = self.abas.currentIndex()
        if indice_aba == 0:
            self._desenhar_temporal()
        elif indice_aba == 1:
            self._desenhar_plano()

    def _desenhar_temporal(self) -> None:
        a_i = self.canvas_temporal.eixo_corrente
        a_w = self.canvas_temporal.eixo_velocidade
        a_i.clear()
        a_w.clear()
        self._preparar_eixo(a_i)
        self._preparar_eixo(a_w)
        ieq, weq = self.equilibrio_atual
        a_i.axhline(ieq, color=LARANJA, linestyle="--", linewidth=1,
                   label=f"Equilíbrio: {ieq:.2f} A")
        a_w.axhline(weq * 60 / (2 * pi), color=LARANJA, linestyle="--", linewidth=1,
                   label=f"Equilíbrio: {weq * 60 / (2 * pi):.0f} RPM")
        if self.pontos:
            trecho = self.pontos[: self.indice + 1]
            tempos = [p.tempo for p in trecho]
            a_i.plot(tempos, [p.corrente for p in trecho], color=CIANO, linewidth=2.2)
            a_w.plot(tempos, [p.rpm for p in trecho], color=VERDE, linewidth=2.2)
            a_i.set_xlim(0, self.pontos[-1].tempo)
            a_w.set_xlim(0, self.pontos[-1].tempo)
            correntes = [p.corrente for p in self.pontos] + [ieq]
            rpms = [p.rpm for p in self.pontos] + [weq * 60 / (2 * pi)]
            self._limite_vertical(a_i, correntes)
            self._limite_vertical(a_w, rpms)
        else:
            duracao = self.campos["duracao"].value()
            corrente_inicial = self.campos["corrente_inicial"].value()
            rpm_inicial = rpm(self.campos["velocidade_inicial"].value())
            a_i.scatter([0], [corrente_inicial], color=CIANO, s=28, zorder=4)
            a_w.scatter([0], [rpm_inicial], color=VERDE, s=28, zorder=4)
            a_i.set_xlim(0, duracao)
            a_w.set_xlim(0, duracao)
            self._limite_vertical(a_i, [corrente_inicial, ieq])
            self._limite_vertical(a_w, [rpm_inicial, weq * 60 / (2 * pi)])
        a_i.set_ylabel("Corrente (A)", color="#a8bec9")
        a_w.set_ylabel("Velocidade (RPM)", color="#a8bec9")
        a_w.set_xlabel("Tempo (s)", color="#a8bec9")
        a_i.legend(loc="upper right", fontsize=7, facecolor="#101d27", labelcolor="#c7d7de")
        a_w.legend(loc="lower right", fontsize=7, facecolor="#101d27", labelcolor="#c7d7de")
        self.canvas_temporal.draw_idle()

    @staticmethod
    def _limite_vertical(eixo, valores: list[float]) -> None:
        minimo, maximo = min(valores), max(valores)
        margem = max((maximo - minimo) * 0.16, abs(maximo) * 0.05, 0.1)
        eixo.set_ylim(minimo - margem, maximo + margem)

    def _desenhar_plano(self) -> None:
        eixo = self.canvas_plano.eixo
        eixo.clear()
        self._preparar_eixo(eixo)
        eixo.axhline(0, color="#527080", linewidth=0.8)
        eixo.axvline(0, color="#527080", linewidth=0.8)
        ieq, weq = self.equilibrio_atual
        if self.pontos:
            trecho = self.pontos[: self.indice + 1]
            di = [p.corrente - ieq for p in trecho]
            dw = [p.velocidade - weq for p in trecho]
            eixo.plot(di, dw, color=CIANO, linewidth=2.5)
            eixo.scatter([di[0]], [dw[0]], s=48, color=AZUL, edgecolor="white",
                         linewidth=0.7, label="Condição inicial", zorder=4)
            eixo.scatter([di[-1]], [dw[-1]], s=65, color=VERDE, edgecolor="white",
                         linewidth=0.8, label="Estado atual", zorder=5)
            todos_di = [p.corrente - ieq for p in self.pontos] + [0]
            todos_dw = [p.velocidade - weq for p in self.pontos] + [0]
            self._limite_vertical(eixo, todos_dw)
            xmin, xmax = min(todos_di), max(todos_di)
            margem = max((xmax - xmin) * 0.18, 0.1)
            eixo.set_xlim(xmin - margem, xmax + margem)
        else:
            delta_i = self.campos["corrente_inicial"].value() - ieq
            delta_w = self.campos["velocidade_inicial"].value() - weq
            eixo.scatter([delta_i], [delta_w], s=48, color=AZUL, edgecolor="white",
                         linewidth=0.7, label="Condição inicial", zorder=4)
            margem_x = max(abs(delta_i) * 0.18, 0.1)
            margem_y = max(abs(delta_w) * 0.18, 1.0)
            eixo.set_xlim(min(delta_i, 0) - margem_x, max(delta_i, 0) + margem_x)
            eixo.set_ylim(min(delta_w, 0) - margem_y, max(delta_w, 0) + margem_y)
        eixo.scatter([0], [0], marker="*", s=150, color=LARANJA,
                     edgecolor="white", linewidth=0.6, label="Ponto de equilíbrio", zorder=6)
        eixo.set_xlabel("Δi = i − ieq  (A)", color="#a8bec9")
        eixo.set_ylabel("Δω = ω − ωeq  (rad/s)", color="#a8bec9")
        eixo.set_title("Os desvios convergem para a origem", color="#cfe0e7", fontsize=10)
        eixo.legend(loc="upper right", fontsize=8, facecolor="#101d27", labelcolor="#c7d7de")
        self.canvas_plano.draw_idle()

    def _aplicar_estilo(self) -> None:
        self.setStyleSheet("""
            QMainWindow, QWidget { background: #081119; color: #d8e5ea; font: 12px 'Segoe UI'; }
            QLabel { background: transparent; }
            #etiqueta { color: #63889a; font-size: 10px; letter-spacing: 1px; }
            #titulo { color: #f0f6f8; font-size: 24px; font-weight: 700; }
            #descricao { color: #7897a6; font-size: 12px; }
            #formula { background: #10272b; color: #89e7d5; border: 1px solid #22484c;
                       border-radius: 8px; padding: 10px 16px; font: 13px Consolas; }
            #painel, #painelParametros, #cartao, #faixa { background: #101d27; border: 1px solid #213744; border-radius: 9px; }
            #subtitulo { color: #dce9ed; font-size: 15px; font-weight: 650; padding: 2px 3px 5px 3px; }
            #ajuda { color: #7897a6; font-size: 10px; padding: 7px; }
            #cartao { min-width: 130px; }
            #legenda { color: #6f91a1; font-size: 9px; font-weight: 600; }
            #valor { color: #ecf7f7; font: 22px Consolas; font-weight: 700; }
            #unidade { color: #67a4aa; font-size: 10px; padding-top: 8px; }
            #equilibrio { background: #0b171f; color: #9fc4cb; border: 1px solid #294451;
                          border-radius: 7px; padding: 9px; font: 11px Consolas; min-width: 205px; }
            #status { color: #72deb2; font-weight: 600; min-width: 115px; }
            #progresso { color: #7695a4; font: 11px Consolas; }
            #rolagem { background: #101d27; border: 1px solid #213744; border-radius: 9px; }
            #rolagem > QWidget > QWidget { background: #101d27; }
            QGroupBox { color: #9eb7c2; border: 1px solid #29414e; border-radius: 7px;
                        margin-top: 9px; padding: 9px 7px 6px 7px; font-weight: 600; }
            QGroupBox::title { subcontrol-origin: margin; left: 9px; padding: 0 5px; }
            QDoubleSpinBox, QComboBox { background: #0a151d; color: #dce9ed; border: 1px solid #304b59;
                                       border-radius: 5px; padding: 5px; min-height: 19px; }
            QPushButton { background: #1b3040; color: #c7d9e1; border: 0; border-radius: 6px; padding: 9px; }
            QPushButton:hover { background: #27465a; }
            QPushButton:disabled { color: #5c7480; background: #14242f; }
            #principal { background: #69d5b2; color: #092019; font-weight: 700; padding: 11px; }
            #principal:hover { background: #83e4c4; }
            QTabWidget::pane { border: 1px solid #213744; border-radius: 8px; background: #0b151e; }
            QTabBar::tab { background: #101d27; color: #829eab; padding: 9px 15px; }
            QTabBar::tab:selected { background: #1d4545; color: #8ee5d2; }
            QTableWidget, QTextBrowser { background: #0b151e; color: #bad0d8; border: 1px solid #213744;
                                         gridline-color: #203844; border-radius: 6px; }
            QHeaderView::section { background: #142632; color: #88a8b5; border: 0; padding: 5px; }
            QTextBrowser#modelo { padding: 20px; font-size: 14px; }
            QScrollBar:vertical { width: 9px; background: #0b151e; }
            QScrollBar::handle:vertical { background: #31505d; border-radius: 4px; min-height: 30px; }
        """)
