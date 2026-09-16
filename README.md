# Motor de Corrente Contínua

## Organização do projeto

- `frontend/`: interface React/TypeScript, gráficos e visualização 3D.
- `tests/`: testes do modelo, servidor e interface desktop.
- `docs/guias/`: guia em PDF para estudo e apresentação.
- `docs/referencias/`: capturas de versões anteriores, preservadas como referência visual.
- `docs/ESTRUTURA.md`: mapa dos arquivos e responsabilidades.
- Arquivos Python e inicializadores na raiz: preservados nessa localização para manter os caminhos e imports existentes sem modificar o código.

Consulte [o mapa da estrutura](docs/ESTRUTURA.md) e [o guia de apresentação](docs/guias/Guia_Motor_de_Corrente_Continua.pdf).

Aplicação acadêmica desktop para visualizar o comportamento transitório de um motor de corrente contínua e relacioná-lo a uma equação diferencial homogênea de primeira ordem. O projeto foi criado para a disciplina de Equações Diferenciais Ordinárias do curso de Engenharia de Computação.

Este é um modelo acadêmico simplificado. Ele demonstra princípios matemáticos e computacionais e não substitui ensaios físicos, MATLAB/Simulink, SPICE ou ferramentas industriais.

## Tecnologias

- Python 3.11 ou superior
- NumPy
- Matplotlib
- PySide6
- React + TypeScript
- React Three Fiber + Drei + Three.js
- Vite

O modo web roda somente no computador local. Ele não utiliza banco de dados, autenticação ou API externa.

## Modelo físico

O circuito de armadura e a dinâmica mecânica são representados por:

```text
L di/dt = V - R i - Ke ω
J dω/dt = Kt i - b ω - τL
```

| Símbolo | Significado | Unidade |
|---|---|---|
| `i` | corrente da armadura | A |
| `ω` | velocidade angular | rad/s |
| `V` | tensão aplicada | V |
| `R` | resistência da armadura | Ω |
| `L` | indutância da armadura | H |
| `Ke` | constante de força contraeletromotriz | V·s/rad |
| `Kt` | constante de torque | N·m/A |
| `J` | momento de inércia | kg·m² |
| `b` | atrito viscoso | N·m·s/rad |
| `τL` | torque de carga | N·m |

Não são modelados saturação, comutação, aquecimento, PWM, PID ou eletrônica de potência detalhada.

## Ponto de equilíbrio

No regime permanente, `di/dt = 0` e `dω/dt = 0`. A solução algébrica usada pelo programa é:

```text
ieq = (bV + Ke τL) / (Rb + KeKt)
ωeq = (KtV - RτL) / (Rb + KeKt)
```

Com os valores padrão, o equilíbrio é aproximadamente `3,571 A`, `168,571 rad/s` e `1.610 RPM`. A substituição desses valores nas duas equações produz resíduos numericamente iguais a zero.

## Conexão com a EDO homogênea

Definimos os desvios em relação ao equilíbrio:

```text
Δi = i - ieq
Δω = ω - ωeq
```

Como tensão e carga são constantes, os termos independentes desaparecem:

```text
L d(Δi)/dt = -RΔi - KeΔω
J d(Δω)/dt = KtΔi - bΔω
```

Dividindo a segunda derivada temporal pela primeira:

```text
d(Δω)/d(Δi)
= [d(Δω)/dt] / [d(Δi)/dt]
= -(L/J) (KtΔi - bΔω) / (RΔi + KeΔω)
= -(L/J) [Kt - b(Δω/Δi)] / [R + Ke(Δω/Δi)]
= F(Δω/Δi)
```

Portanto, a relação no plano de estados é uma EDO homogênea de primeira ordem. Essa EDO descreve a geometria da curva entre `Δi` e `Δω`. O tempo continua sendo obtido pelo sistema original `di/dt` e `dω/dt`.

## Métodos numéricos

O projeto implementa diretamente Euler e Runge-Kutta de quarta ordem. RK4 é o padrão por oferecer boa precisão sem transformar o cálculo em uma caixa-preta. O passo matemático `dt` é independente da velocidade visual da animação.

## Interface e gráficos

- motor 3D em corte técnico cuja velocidade visual acompanha `ω`;
- carcaça transparente, rotor, eixo, bobinas e ventilador modelados no código;
- brilho das bobinas relacionado à corrente;
- fluxo de partículas saindo do eixo relacionado à potência mecânica;
- câmera orbitável com rotação e zoom;
- indicadores de RPM, corrente e torque `Kt·i`;
- ponto de equilíbrio calculado automaticamente;
- gráficos progressivos de `i(t)` e RPM;
- linhas de equilíbrio nos gráficos temporais;
- plano de estados `Δi × Δω`, convergindo para `(0,0)`;
- aba com o modelo matemático;
- tabela compacta dos últimos valores;
- explicações curtas durante partida, aceleração e regime permanente.

## Instalação e execução

No Windows, dê dois cliques em `executar.cmd`. Na primeira abertura, ele prepara Python e o frontend React. Depois compila o site, inicia o servidor local e abre:

```text
http://localhost:8090
```

É necessário ter Python 3.11 ou superior e Node.js instalados.

Execução manual no PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Para desenvolvimento do frontend:

```powershell
python servidor_web.py --port 8090
cd frontend
npm install
npm run dev
```

O servidor Python fornece `/api/simular`, utilizando diretamente `motor_dc.py` e `metodos_numericos.py`. O React controla a apresentação e a animação; ele não duplica o integrador numérico.

A versão desktop anterior permanece disponível em `executar_desktop.cmd`.

## Testes

```powershell
python -m unittest discover -s tests -v
```

Os testes cobrem equilíbrio, derivadas, Euler, RK4, convergência, variação de `dt`, ausência de NaN e infinito, validações, condição inicial, controles da interface, gráficos, tabela e animação do rotor.
