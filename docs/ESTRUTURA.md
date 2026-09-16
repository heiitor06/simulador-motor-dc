# Mapa do projeto

Organização simples por responsabilidade, adequada a um trabalho acadêmico.
O conteúdo dos códigos existentes foi preservado. Os arquivos de teste foram movidos sem editar seu conteúdo.

```text
simulador-motor-dc/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Motor3D.tsx          # Motor, câmera, iluminação e animação
│   │   │   └── Graficos.tsx         # Gráficos temporais e plano de estados
│   │   ├── App.tsx                 # Tela principal e controles
│   │   ├── main.tsx                # Inicialização do React
│   │   ├── api.ts                  # Comunicação com o servidor Python
│   │   ├── types.ts                # Tipos dos parâmetros e resultados
│   │   ├── styles.css              # Estilos gerais
│   │   └── holografico.css         # Visual holográfico e flutuação
│   ├── public/                    # Imagens utilizadas pelo site
│   ├── index.html                 # Página de entrada
│   ├── package.json               # Dependências e comandos do frontend
│   ├── package-lock.json          # Versões das dependências
│   ├── vite.config.ts             # Configuração de desenvolvimento
│   └── tsconfig*.json             # Configurações do TypeScript
├── tests/
│   ├── test_motor_dc.py            # Modelo físico e métodos numéricos
│   ├── test_servidor_web.py        # Integração do servidor
│   └── test_interface.py           # Interface desktop
├── docs/
│   ├── ESTRUTURA.md                # Este mapa
│   ├── guias/                     # PDF de estudo e apresentação
│   └── referencias/               # Capturas de versões anteriores
├── motor_dc.py                    # Equações, validações e equilíbrio
├── metodos_numericos.py            # Euler, RK4 e série de estados
├── servidor_web.py                # API local e arquivos do site
├── interface.py                   # Interface desktop anterior
├── main.py                        # Entrada da versão desktop
├── executar.cmd                   # Inicialização da versão web no Windows
├── executar_desktop.cmd           # Inicialização da versão desktop
├── requirements.txt               # Dependências Python
├── .gitignore                     # Arquivos locais excluídos do Git
└── README.md                      # Visão geral, instalação e testes
```

## Fluxo da aplicação

1. `App.tsx` coleta os parâmetros do usuário.
2. `api.ts` envia os parâmetros ao `servidor_web.py`.
3. `metodos_numericos.py` integra as equações definidas em `motor_dc.py`.
4. O servidor devolve os pontos calculados e o equilíbrio.
5. `Graficos.tsx` e `Motor3D.tsx` apresentam os resultados.

## Por que os arquivos Python permanecem na raiz?

Os imports existentes utilizam essa localização. O servidor procura `frontend/dist`
ao lado do próprio arquivo, e os inicializadores procuram os arquivos Python na raiz.
Transferir essas partes para `backend/`, `desktop/` ou `scripts/` exigiria editar
imports e caminhos. A organização atual respeita a exigência de não alterar os códigos.

O frontend já possui a separação principal entre código, componentes, imagens e
configurações. Mover seus arquivos internos também exigiria alterar imports.

## Execução e testes

Os dois arquivos `executar*.cmd` continuam nos mesmos lugares e funcionam da mesma forma.
Execute os testes a partir da raiz do projeto, com o ambiente Python preparado:

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Não execute os testes individualmente de dentro de `tests/`; use a descoberta acima
para manter a raiz do projeto no caminho de importação.

## Arquivos locais gerados

`.venv/`, `frontend/node_modules/`, `frontend/dist/`, `__pycache__/` e
`.matplotlib-cache/` são ambientes, dependências, compilações ou caches.
Permanecem nas localizações esperadas pelo programa e não precisam ser enviados ao GitHub.
As capturas `preview-*.png` continuam excluídas pelo `.gitignore`, inclusive em `docs/referencias/`.

Os projetos antigos na pasta superior e a pasta sincronizada `sources/` não fazem
parte desta reorganização e foram preservados.
