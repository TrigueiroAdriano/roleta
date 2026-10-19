# 🎰 API RESTful & Agente de Automação - Histórico de Roleta em Tempo Real

Sistema completo composto por:
1. **API RESTful em Node.js (Express + SQL)** para armazenar e exibir o histórico recente de sorteios.
2. **Agente de Automação de Navegador (Puppeteer)** para realizar o acesso automático, login, navegação até a mesa **"Roleta Brasileira"** e captura contínua dos números sorteados.
3. **Painel Web Interativo** para monitoramento e visualização em tempo real.

---

## 🛠️ Tecnologias Utilizadas

- **Backend / API:** Node.js (v18+), Express.js, CORS, `dotenv`
- **Automação de Navegador:** Puppeteer (Chromium automatizado)
- **Banco de Dados:** SQLite (padrão zero-config) + Suporte nativo a MySQL / PostgreSQL
- **Frontend de Testes:** HTML5, CSS3, JavaScript (Fetch API)

---

## 📁 Estrutura do Projeto

```
roleta/
├── database/
│   └── schema.sql              # Script SQL (MySQL, Postgres e SQLite)
├── public/
│   └── index.html              # Painel visual para testes interativos no navegador
├── src/
│   ├── config/
│   │   └── database.js         # Conexão com banco e instruções de credenciais
│   ├── controllers/
│   │   └── roletaController.js # Lógica dos endpoints (GET /historico, POST /resultado)
│   ├── middlewares/
│   │   └── errorHandler.js     # Middleware de erros (404 e 500)
│   ├── routes/
│   │   └── roletaRoutes.js     # Rotas da API
│   ├── scraper/
│   │   └── roletaScraper.js    # Agente de Automação Puppeteer (Roleta Brasileira)
│   ├── app.js                  # Express App com suporte a CORS e estáticos
│   └── server.js               # Servidor HTTP Principal
├── .env                        # Variáveis de ambiente ativas (Credenciais de banco e login)
├── .env.example                # Modelo de exemplo
├── package.json                # Dependências e scripts npm
└── README.md                   # Documentação oficial
```

---

## ⚙️ Configuração do `.env`

Abra o arquivo [.env](file:///c:/Users/trigu/OneDrive/Desktop/roleta/.env) e preencha as variáveis de acesso da plataforma:

```env
# Porta do servidor da API
PORT=3000

# Banco de Dados (sqlite, mysql ou postgres)
DB_TYPE=sqlite
DB_SQLITE_PATH=./database/roleta.sqlite

# Configurações do Agente de Automação (Cassino / Roleta Brasileira)
CASINO_URL=https://cassino.bet.br
CASINO_USUARIO=trigueiro.r.a@gmail.com
CASINO_SENHA=Bosta123.
SCRAPER_HEADLESS=false
API_ENDPOINT=http://localhost:3000/api/resultado
```

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Servidor da API
```bash
npm run dev
```
O servidor iniciará em `http://localhost:3000`.

### 2. Iniciar o Agente de Automação de Navegador (Scraper)
Em um segundo terminal, execute:
```bash
npm run scraper
```

O bot executará automaticamente as seguintes diretrizes:
1. **Navegação Inicial:** Abre o navegador e acessa `CASINO_URL`.
2. **Processo de Login:** Insere `CASINO_USUARIO` e `CASINO_SENHA` nos campos de autenticação.
3. **Navegação até a Mesa:** Fecha pop-ups/banners e acessa a mesa **"Roleta Brasileira"**.
4. **Captura e Envio:** Aguarda a visibilidade do jogo, detecta cada novo número sorteado e faz um `POST` automático para a API (`http://localhost:3000/api/resultado`).

---

## 📡 Endpoints da API

### `GET /api/historico`
- **URL:** `http://localhost:3000/api/historico?mesa=Roleta_Brasileira`
- **Resposta JSON:**
```json
{
  "sucesso": true,
  "mesa": "Roleta Brasileira",
  "dados": [
    { "numero": 22, "cor": "preto", "horario": "2026-07-23 22:15:00" },
    { "numero": 9, "cor": "vermelho", "horario": "2026-07-23 22:14:00" }
  ]
}
```

### `POST /api/resultado`
- **URL:** `http://localhost:3000/api/resultado`
- **Body JSON:**
```json
{
  "mesa": "Roleta Brasileira",
  "numero": 22,
  "cor": "preto"
}
```
