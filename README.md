# Motor de Corrente Contínua

## Organização do projeto

- `frontend/`: interface React/TypeScript, gráficos e visualização 3D.
- `tests/`: testes do modelo, servidor e interface desktop.
- `docs/guias/`: guia em PDF para estudo e apresentação.
- `docs/referencias/`: capturas de versões anteriores, preservadas como referência visual.
- `docs/ESTRUTURA.md`: mapa dos arquivos e responsabilidades.
- Arquivos Python e inicializadores na raiz: preservados nessa localização para manter os caminhos e imports existentes sem modificar o código.

Consulte [o mapa da estrutura](docs/ESTRUTURA.md) e [o guia de apresentação](docs/guias/Guia_Motor_de_Corrente_Continua.pdf).

Aplicação acadêmica web e desktop para visualizar o comportamento transitório de um motor de corrente contínua e relacioná-lo a uma equação diferencial homogênea de primeira ordem. O projeto foi criado para a disciplina de Equações Diferenciais Ordinárias do curso de Engenharia de Computação.

Este é um modelo acadêmico simplificado. Ele demonstra princípios matemáticos e computacionais e não substitui ensaios físicos, MATLAB/Simulink, SPICE ou ferramentas industriais.

## Tecnologias

- Python 3.11 ou superior
- NumPy
- Matplotlib
- PySide6
- React + TypeScript
- React Three Fiber + Drei + Three.js
- Vite

O modo web usa uma API local em Python. Não utiliza banco de dados nem autenticação. A iluminação HDR da Poly Haven está incluída no projeto, com licença CC0, e não precisa de uma conexão externa durante a apresentação.

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
- modos Realista, Raio-X e Explodido, com carcaça, armadura, bobinas, eixo, escovas e comutador modelados no código;
- brilho das bobinas relacionado à corrente;
- névoa discreta na base, apenas como efeito visual de ambiente;
- seleção de peças com explicações, fórmulas e leituras simuladas;
- comparação de duas cargas constantes em ensaios independentes;
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

## Explorador 3D e comparação de cargas

1. Abra a versão web com `executar.cmd` e acesse `http://localhost:8090/`.
2. Experimente **Realista**, **Raio-X** e **Explodido**. Arraste para girar, role para ampliar e use **Recentrar** para restaurar a câmera.
3. Clique numa peça ou no seu botão. O painel mostra a função física, a equação relacionada e os valores simulados. No modo Explodido, as peças se afastam em etapas e flutuam suavemente. Ajuste **Afastamento** entre 70% e 130% e use **Pausar flutuação** para estudar os detalhes. A rotação de funcionamento fica suspensa nessa vista; o cálculo temporal não muda. **Recentrar** restaura suavemente posição, alvo e zoom da câmera.
4. Inicie com os valores padrão para observar o pico de corrente e a aceleração. A rotação 3D é reduzida para ser visível; não corresponde a uma medição real.
5. Na tela **EDO homogênea**, na aba **COMPARAR CARGAS**, use A = **0,02 N·m** e B = **0,10 N·m**, mantendo os demais parâmetros padrão, RK4, dt = 0,01 s e duração = 12 s. Clique em **Comparar cargas**.

| Ensaio | Corrente aos 12 s | RPM aos 12 s | Corrente de equilíbrio | RPM de equilíbrio |
|---|---:|---:|---:|---:|
| A · 0,02 N·m | 3,685 A | 1.590 | 3,571 A | 1.610 |
| B · 0,10 N·m | 4,250 A | 1.482 | 4,143 A | 1.501 |

As curvas compartilham a mesma escala. A carga maior reduz a velocidade de equilíbrio e exige mais corrente nesses parâmetros. O resultado aos 12 segundos ainda não é exatamente o equilíbrio. A comparação não modifica a carga do motor da cena principal.

Cada ensaio mantém tensão e carga constantes. Deslocar cada equilíbrio para a origem e eliminar o tempo produz a EDO homogênea no plano de estados. A forma com y/x exige x ≠ 0 e dx/dt ≠ 0; a integração temporal continua válida nas tangentes verticais. A origem de cada curva corresponde ao seu próprio equilíbrio físico.

As melhorias usam React Three Fiber/Drei/Three.js já presentes e a iluminação [Studio Small 03 da Poly Haven](https://polyhaven.com/a/studio_small_03). Não há quatro serviços remotos nem telemetria de um motor real. O motor é um modelo didático próprio e não um ativo baixado de terceiros. Créditos e licença: `frontend/public/ambientes/CREDITOS.md`.


## Duas telas, um experimento

Os botões no topo alternam entre **Motor e energia** e **EDO homogênea**. A troca preserva parâmetros, resultados, pausa e instante selecionado. Os controles de simulação são compartilhados.

### Roteiro para apresentar

1. Na tela Motor e energia, mantenha os parâmetros padrão e clique em **INICIAR**. O eixo gira e os pulsos ilustram a potência convertida Pconv = Kt·i·ω. O painel distingue alimentação, conversão e potência na carga. A névoa é decorativa; não representa aquecimento.
2. Abra **EDO homogênea**. A curva reúne corrente e velocidade do mesmo experimento. Use **PAUSAR** ou a barra **Tempo simulado** para examinar qualquer instante calculado; mover a barra pausa a reprodução.
3. Explore as cinco etapas manualmente ou clique em **Explicação automática**. A explicação avança a cada 9 segundos; esse tempo de apresentação é independente do tempo físico simulado.
4. Em **Nova origem**, os eixos se deslocam até o equilíbrio. Os pontos físicos permanecem no lugar; suas coordenadas passam a ser x = i − ieq e y = ω − ωeq.
5. Em **Eliminar o tempo**, veja o quociente das duas derivadas e a forma F(y/x). A relação geométrica homogênea é obtida do sistema original com entradas constantes, não é uma substituição do integrador temporal.
6. Em **Homogeneidade**, varie **Escala k**. Os pontos P e Q = kP têm a mesma inclinação. O ponto padrão P = (2; −42), com parâmetros padrão, tem inclinação 35,5 (rad/s)/A. Estes são pontos de comparação do campo, não necessariamente pontos da mesma solução temporal.
7. Abra **Escolher outro ponto P** para explorar inclusive x = 0, tangentes verticais e o equilíbrio. O programa informa onde o quociente não está definido. Abra o detalhe da substituição y = vx para relacionar a demonstração ao método analítico.

Abaixo da explicação continuam os gráficos temporais, plano de estados, comparação de cargas, modelo e dados. O desenho 3D e as animações não alteram os cálculos Python. Na vista explodida, o fluxo no eixo fica oculto para não sugerir um motor desmontado em funcionamento.

Testes adicionais do campo didático (Node.js 24):

```powershell
node --test tests/edo.test.ts
```
