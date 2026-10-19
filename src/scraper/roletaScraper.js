/**
 * ==============================================================================
 * AGENTE DE AUTOMAÇÃO DE NAVEGADOR (PUPPETEER) - MESA ROLETA BRASILEIRA
 * ==============================================================================
 * Este script automatiza o acesso, login, fechamento de pop-ups ("Mude sua senha"),
 * clique no botão "Jogar", captura inicial dos últimos 50 números do histórico
 * e o envio em tempo real dos números sorteados para a API RESTful.
 * ==============================================================================
 */

const puppeteer = require('puppeteer');
const http = require('http');
require('dotenv').config();

// Configurações extraídas do .env
const CASINO_URL = (process.env.CASINO_URL || 'https://cassino.bet.br').trim();
const ROLETA_URL = (process.env.ROLETA_URL || 'https://cassino.bet.br/cassino/jogar/playtech/roleta-brasileira').trim();
const CASINO_USUARIO = (process.env.CASINO_USUARIO || '').trim();
const CASINO_SENHA = (process.env.CASINO_SENHA || '').trim();
const API_ENDPOINT = (process.env.API_ENDPOINT || 'http://localhost:3000/api/resultado').trim();
const IS_HEADLESS = process.env.SCRAPER_HEADLESS === 'true';
const HISTORICO_XPATH = (process.env.HISTORICO_XPATH || '//*[@id="root"]/div/div[3]/div[1]/div/div[1]/div/div/div[2]/div[3]/div/div[2]/div/div/div/div/div/div/div/div/div').trim();


// Função utilitária para registrar logs formatados no console
function logStep(step, message) {
  console.log(`\n🤖 [Agente Roleta - Passo ${step}] ${message}`);
}

// Função utilitária para enviar os resultados sorteados para a API RESTful
async function enviarResultadoParaAPI(mesa, numero, cor) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ mesa, numero, cor });
    const urlObj = new URL(API_ENDPOINT);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✅ [API] Número ${numero} (${cor || 'auto'}) gravado na API com sucesso!`);
          resolve(body);
        } else {
          console.error(`  ⚠️ [API Erro ${res.statusCode}]: ${body}`);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`  ❌ [API Erro de Conexão]: ${err.message}`);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

// Função utilitária para solicitar a limpeza do banco de dados na API
async function limparBancoAPI() {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(API_ENDPOINT.replace(/\/resultado$/, '/historico'));
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname,
        method: 'DELETE'
      };

      const req = http.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('  🧹 [API] Banco de dados zerado com sucesso via requisição DELETE /api/historico!');
        }
        resolve();
      });

      req.on('error', () => resolve());
      req.end();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Execução Principal do Agente de Automação
 */
async function iniciarAgenteAutomacao() {
  console.log('==================================================');
  console.log('🎰 INICIANDO AGENTE DE AUTOMAÇÃO DE NAVEGADOR');
  console.log(`🌐 Alvo: ${CASINO_URL}`);
  console.log(`📌 Mesa: ${ROLETA_URL}`);
  console.log(`🖥️ Modo Headless: ${IS_HEADLESS ? 'Ativado' : 'Desativado (Navegador Visível)'}`);
  console.log('==================================================');

  // 1. Navegação Inicial
  logStep(1, 'Iniciando o navegador Chromium...');
  const browser = await puppeteer.launch({
    headless: IS_HEADLESS,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications',
      '--disable-save-password-bubble',
      '--disable-password-leak-detection',
      '--disable-single-click-autofill',
      '--password-store=basic',
      '--disable-features=PasswordLeakDetection,PasswordManagerRedesign,CredentialsManagementSetter,TouchIdentity'
    ]
  });

  const page = (await browser.pages())[0] || await browser.newPage();

  try {
    logStep(1, `Acessando a URL principal: ${CASINO_URL}`);
    await page.goto(CASINO_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('  ✅ Página principal carregada com sucesso.');

    // Tratamento de Cookies ou Banners Iniciais
    await fecharBannersEPopups(page);

    // 2. Processo de Login (efetua e valida autenticação antes de ir para a mesa)
    logStep(2, 'Iniciando processo de autenticação / login...');
    await realizarLogin(page, CASINO_USUARIO, CASINO_SENHA);

    // Fecha alertas pós-login (ex: senha salva do navegador)
    await fecharBannersEPopups(page);

    // 3. Navegação direta até a Mesa "Roleta Brasileira"
    logStep(3, `Navegando diretamente para a URL da mesa: ${ROLETA_URL}`);
    await page.goto(ROLETA_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('  🎯 Página da "Roleta Brasileira" acessada diretamente!');

    await new Promise(r => setTimeout(r, 2000));
    await fecharBannersEPopups(page);

    // 4. Clicar no botão "▷ Jogar"
    logStep(4, 'Procurando e clicando no botão "▷ Jogar" para carregar a mesa...');
    await clicarBotaoJogar(page);

    // 5. Aguarda o jogo/canvas carregar
    logStep(5, 'Aguardando visibilidade da mesa de jogo / canvas...');
    await aguardarCanvasJogo(page);

    // 6. Captura Inicial dos 50 Últimos Números do Histórico pelo DOM
    logStep(6, 'Capturando os 50 últimos números do histórico da mesa...');
    const ultimoHistoricoEnviado = await capturarHistorico50Numeros(page);

    // 7. Loop de Monitoramento e Sistema Anti-Deslogamento por Inatividade
    logStep(7, 'Iniciando monitoramento contínuo e sistema Anti-Deslogamento (Keep-Alive 24/7)...');
    iniciarSistemaAntiInatividade(page);
    await monitorarResultadosRoleta(page, ultimoHistoricoEnviado);

  } catch (error) {
    console.error(`\n❌ Ocorreu um erro no Agente de Automação: ${error.message}`);
  }
}

/**
 * Função para fechar pop-ups e avisos de cookies (protegendo modais de login)
 */
async function fecharBannersEPopups(page) {
  try {
    const resultadoFechar = await page.evaluate(() => {
      // Se houver um formulário/modal de login visível (com campo de senha), não fecha nenhum modal!
      const temFormLogin = Array.from(document.querySelectorAll('input[type="password"]')).some(input => {
        return input.offsetWidth > 0 || input.offsetHeight > 0 || input.getClientRects().length > 0;
      });

      if (temFormLogin) {
        return null;
      }

      // 1. Procura por botões de aceite ou recusa de cookies
      const todosBotoes = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
      for (const btn of todosBotoes) {
        const txt = (btn.innerText || btn.textContent || '').trim().toLowerCase();
        if (
          txt === 'aceitar todos' ||
          txt === 'aceitar cookies' ||
          txt === 'recusar todos' ||
          txt === 'aceitar' ||
          txt === 'entendido' ||
          txt.includes('aceitar todos')
        ) {
          btn.click();
          return `Clicado no aviso de cookie: "${btn.innerText.trim()}"`;
        }
      }

      // 2. Seletores específicos de banner de cookie
      const seletoresCookies = [
        '#cookie-accept',
        '.cookie-accept',
        'button[id*="cookie"]',
        'button[class*="cookie"]',
        '#onetrust-accept-btn-handler'
      ];

      for (const sel of seletoresCookies) {
        const el = document.querySelector(sel);
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
          el.click();
          return `Clicado em banner de cookie: ${sel}`;
        }
      }

      return null;
    });

    if (resultadoFechar) {
      console.log(`  ℹ️ Aviso/Cookie tratado: ${resultadoFechar}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {
    // Silencioso
  }
}

/**
 * Função utilitária para verificar se o usuário já se encontra autenticado na plataforma
 */
async function verificarSeEstaLogado(page) {
  try {
    return await page.evaluate(() => {
      // 1. Se houver botões "Entrar" ou "Cadastrar" visíveis na tela, o usuário NÃO está autenticado!
      const todosElementos = Array.from(document.querySelectorAll('button, a, div[role="button"], span, input[type="button"]'));
      for (const el of todosElementos) {
        const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
        if ((txt === 'entrar' || txt === 'cadastrar' || txt === 'login') && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
          return false;
        }
      }

      // 2. Elementos característicos de conta autenticada (Depositar, Perfil, Sair, Logout)
      for (const el of todosElementos) {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (
          txt === 'depositar' ||
          txt === 'depósito' ||
          txt === 'minha conta' ||
          txt === 'meu perfil' ||
          txt === 'sair' ||
          txt === 'logout'
        ) {
          return true;
        }
      }

      const seletoresLogadoExplicitos = [
        '[class*="user-profile"]',
        '[class*="user-name"]',
        '[class*="user-avatar"]',
        '[href*="logout"]',
        '[href*="sair"]'
      ];

      for (const sel of seletoresLogadoExplicitos) {
        const el = document.querySelector(sel);
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
          return true;
        }
      }

      return false;
    });
  } catch (e) {
    return false;
  }
}

/**
 * Função para fechar e realizar o login de forma prioritária e garantida antes da roleta
 */
async function realizarLogin(page, usuario, senha) {
  try {
    await fecharBannersEPopups(page);

    // 1. Verificação prévia se já está logado
    if (await verificarSeEstaLogado(page)) {
      console.log('  ✅ Usuário já está autenticado no cassino!');
      return true;
    }

    logStep(2, 'Iniciando processo de login no cassino...');

    // 2. Verificar se os campos de login já estão visíveis na tela
    let camposVisiveis = await page.evaluate(() => {
      const inputsSenha = Array.from(document.querySelectorAll('input[type="password"]'));
      return inputsSenha.some(i => i.offsetWidth > 0 || i.offsetHeight > 0);
    });

    if (!camposVisiveis) {
      console.log('  👉 Procurando botão "Entrar" / "Login" no topo da página...');
      const clicouEntrar = await page.evaluate(() => {
        const elementos = Array.from(document.querySelectorAll('button, a, div[role="button"], span, input[type="button"]'));
        for (const el of elementos) {
          const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
          if (
            txt === 'entrar' ||
            txt === 'login' ||
            txt === 'acessar' ||
            txt === 'iniciar sessão' ||
            txt === 'entrar / cadastrar' ||
            txt === 'fazer login'
          ) {
            el.click();
            return `Botão "${el.innerText.trim() || el.value}" clicado.`;
          }
        }
        return null;
      });

      if (clicouEntrar) {
        console.log(`  🎯 ${clicouEntrar}`);
        // Aguarda 2,5 segundos para que a transição ou modal abra completamente
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    // 3. Procurar os campos visíveis de e-mail/usuário e senha
    const userSelectors = [
      'input[type="email"]',
      'input[name*="email"]',
      'input[name*="user"]',
      'input[name*="login"]',
      'input[id*="user"]',
      'input[id*="login"]',
      'input[id*="email"]',
      'input[placeholder*="Usuário"]',
      'input[placeholder*="E-mail"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="CPF"]',
      'input[placeholder*="login"]',
      'input[type="text"]'
    ];
    const passSelectors = [
      'input[type="password"]',
      'input[name*="pass"]',
      'input[id*="pass"]',
      'input[placeholder*="Senha"]',
      'input[placeholder*="senha"]'
    ];

    let inputUser = null;
    let inputPass = null;

    // Tenta localizar os inputs visíveis por 8 segundos
    for (let attempt = 0; attempt < 16; attempt++) {
      for (const sel of userSelectors) {
        const els = await page.$$(sel);
        for (const el of els) {
          const isVisible = await page.evaluate(node => node.offsetWidth > 0 || node.offsetHeight > 0, el);
          if (isVisible) {
            inputUser = el;
            break;
          }
        }
        if (inputUser) break;
      }

      for (const sel of passSelectors) {
        const els = await page.$$(sel);
        for (const el of els) {
          const isVisible = await page.evaluate(node => node.offsetWidth > 0 || node.offsetHeight > 0, el);
          if (isVisible) {
            inputPass = el;
            break;
          }
        }
        if (inputPass) break;
      }

      if (inputUser && inputPass) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (inputUser && inputPass && usuario && senha && usuario !== 'seu_usuario_aqui') {
      console.log('  ✍️ Preenchendo credenciais de login...');
      await inputUser.click({ clickCount: 3 });
      await inputUser.type(usuario, { delay: 40 });
      await new Promise(r => setTimeout(r, 250));
      await inputPass.click({ clickCount: 3 });
      await inputPass.type(senha, { delay: 40 });
      await new Promise(r => setTimeout(r, 500));

      console.log('  🚀 Enviando formulário de autenticação...');
      const submetido = await page.evaluate(() => {
        const pass = document.querySelector('input[type="password"]');
        if (pass) {
          const container = pass.closest('form, div[class*="modal"], div[class*="login"], div[class*="dialog"], body');
          if (container) {
            const btns = Array.from(container.querySelectorAll('button, input[type="submit"]'));
            for (const b of btns) {
              const txt = (b.innerText || b.value || '').trim().toLowerCase();
              if (
                txt === 'entrar' ||
                txt === 'login' ||
                txt === 'acessar' ||
                txt === 'enviar' ||
                txt === 'iniciar sessão' ||
                b.type === 'submit'
              ) {
                b.click();
                return `Clicado no botão "${b.innerText.trim() || b.value}"`;
              }
            }
          }
        }
        return null;
      });

      if (submetido) {
        console.log(`  ✅ ${submetido}`);
      } else {
        await inputPass.press('Enter');
        console.log('  ✅ Tecla Enter pressionada no campo de senha.');
      }

      console.log('  ⏳ Aguardando confirmação do login...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
    } else {
      if (!usuario || !senha || usuario === 'seu_usuario_aqui') {
        console.log('  ⚠️ Credenciais não configuradas no arquivo .env.');
      } else {
        console.log('  ⚠️ Não foi possível localizar os campos visíveis de login automaticamente.');
      }
    }

    // 4. Verificação final de estado autenticado
    let logado = await verificarSeEstaLogado(page);
    if (logado) {
      console.log('  🎉 Login efetuado e autenticado com sucesso!');
      return true;
    }

    // Caso precise de login manual / captcha com o navegador visível, aguarda o usuário concluir
    console.log('  ⏳ Por favor, conclua o login no navegador se necessário. Aguardando confirmação de autenticação...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      logado = await verificarSeEstaLogado(page);
      if (logado) {
        console.log('  🎉 Login confirmado no navegador! Avançando para a Roleta Brasileira...');
        return true;
      }
    }

    console.log('  ℹ️ Tempo limite de aguardo de login atingido. Prosseguindo para a Roleta Brasileira...');
    return false;
  } catch (err) {
    console.warn(`  ⚠️ Erro no processo de login: ${err.message}`);
    return false;
  }
}

/**
 * Função para clicar especificamente no botão "▷ Jogar" da página do jogo
 */
async function clicarBotaoJogar(page) {
  try {
    await fecharBannersEPopups(page);

    const clicou = await page.evaluate(() => {
      // Procura por botões, links ou div de ação específicos com texto 'Jogar'
      const botoes = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const el of botoes) {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (txt === 'jogar' || txt === '▷ jogar' || txt === 'play' || txt === 'jogar agora') {
          el.click();
          return `Clicado no botão de jogo: "${el.innerText.trim()}"`;
        }
      }

      // Fallback: procura botões dentro de cartões de jogo
      const fallbackBtns = Array.from(document.querySelectorAll('[class*="play"], [class*="jogar"], button'));
      for (const el of fallbackBtns) {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (txt.includes('jogar') && txt.length < 20) {
          el.click();
          return `Clicado via fallback no botão: "${el.innerText.trim()}"`;
        }
      }

      return null;
    });

    if (clicou) {
      console.log(`  🎯 ${clicou}`);
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.log('  ℹ️ Botão "Jogar" não foi localizado ou o jogo já está carregado na tela.');
    }
  } catch (err) {
    console.warn(`  ⚠️ Aviso ao clicar no botão Jogar: ${err.message}`);
  }
}

/**
 * Aguarda visibilidade do canvas / iframe da roleta
 */
async function aguardarCanvasJogo(page) {
  try {
    await page.waitForSelector('canvas, iframe, [class*="roulette"], [class*="game"]', { timeout: 30000 });
    console.log('  ✅ Canvas/Iframe da Roleta Brasileira detectado e visível!');
  } catch (e) {
    console.log('  ℹ️ Tela do jogo pronta.');
  }
}

/**
 * Função utilitária para determinar a cor do número na Roleta
 */
function determinarCorRoleta(numero) {
  const num = parseInt(numero, 10);
  if (isNaN(num) || num < 0 || num > 36) return 'desconhecido';
  if (num === 0) return 'verde';
  const vermelhos = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return vermelhos.includes(num) ? 'vermelho' : 'preto';
}

/**
 * Captura os últimos 50 números diretamente do DOM (sem clicar em nada).
 * Busca os elementos history-item na página e em todos os iframes.
 * Insere na API RESTful do mais antigo para o mais novo.
 */
async function capturarHistorico50Numeros(page) {
  logStep(6, 'Capturando os últimos 50 números diretamente do DOM...');

  const extrairNumerosDoDOM = async (ctx) => {
    try {
      return await ctx.evaluate(() => {
        // Busca todos os elementos de histórico da roleta no DOM
        const seletores = [
          '[class*="history-item--"]',
          '[class*="history-item_enabled"]',
          '[class*="roulette-history"] [class*="history-item"]'
        ];

        let items = [];
        for (const sel of seletores) {
          items = Array.from(document.querySelectorAll(sel));
          if (items.length > 0) break;
        }

        if (items.length === 0) return { nums: [], debug: 'Nenhum history-item encontrado' };

        // Para cada item, extrai o número (pega o texto mais interno)
        const numeros = [];
        const vistos = new Set();

        for (const item of items) {
          // Busca o span de texto mais interno primeiro
          const textoSpan = item.querySelector('[class*="value__text"]');
          const txt = (textoSpan || item).innerText?.trim() || (textoSpan || item).textContent?.trim() || '';

          if (/^\d{1,2}$/.test(txt)) {
            const num = parseInt(txt, 10);
            if (num >= 0 && num <= 36) {
              // Deduplica por posição na tela (evita contar pai + filho como 2 itens)
              const rect = item.getBoundingClientRect();
              const key = `${Math.round(rect.top)}_${Math.round(rect.left)}`;
              if (!vistos.has(key)) {
                vistos.add(key);
                numeros.push(num);
              }
            }
          }
        }

        return {
          nums: numeros.slice(0, 50),
          debug: `${items.length} items encontrados, ${numeros.length} números válidos extraídos`
        };
      });
    } catch (e) {
      return { nums: [], debug: `Erro: ${e.message}` };
    }
  };

  try {
    const maxTentativas = 15;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      console.log(`  ⏳ [Tentativa ${tentativa}/${maxTentativas}] Buscando números no DOM...`);

      // Tenta na página principal
      let resultado = await extrairNumerosDoDOM(page);
      console.log(`  📋 Página principal: ${resultado.debug}`);

      // Se não encontrou, tenta em cada iframe
      if (resultado.nums.length === 0) {
        const frames = page.frames();
        console.log(`  📋 Buscando em ${frames.length} frames...`);

        for (let fi = 0; fi < frames.length; fi++) {
          const resFrame = await extrairNumerosDoDOM(frames[fi]);
          if (resFrame.nums.length > 0) {
            console.log(`  📋 Frame[${fi}]: ${resFrame.debug}`);
            resultado = resFrame;
            break;
          }
        }
      }

      if (resultado.nums.length > 0) {
        // Os items do DOM estão do mais recente (primeiro) ao mais antigo (último)
        // Inverte para enviar do mais antigo ao mais novo
        const numerosOrdenados = resultado.nums.reverse();

        console.log(`  🎉 ${numerosOrdenados.length} números encontrados! Sequência (antigo→novo): ${numerosOrdenados.join(', ')}`);

        // Zera o banco e grava
        await limparBancoAPI();

        const vermelhos = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

        for (let i = 0; i < numerosOrdenados.length; i++) {
          const num = numerosOrdenados[i];
          const cor = num === 0 ? 'verde' : (vermelhos.includes(num) ? 'vermelho' : 'preto');
          console.log(`  📤 [${i + 1}/${numerosOrdenados.length}] Número ${num} (${cor.toUpperCase()})`);
          await enviarResultadoParaAPI('Roleta Brasileira', num, cor);
          await new Promise(r => setTimeout(r, 50));
        }

        console.log(`  ✅ ${numerosOrdenados.length} números gravados na API!`);
        return numerosOrdenados[numerosOrdenados.length - 1]; // Retorna o mais recente
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('  ⚠️ Não encontrou números no DOM após 15 tentativas. Monitoramento em tempo real assumirá.');
    return null;
  } catch (err) {
    console.warn(`  ⚠️ Erro na captura do histórico: ${err.message}`);
    return null;
  }
}

/**
 * Loop contínuo de monitoramento de números sorteados em tempo real
 */
async function monitorarResultadosRoleta(page, ultimoHistoricoEnviado = null) {
  let ultimoNumeroEnviado = ultimoHistoricoEnviado;

  console.log(`  📡 Acompanhando sorteios da Roleta Brasileira em tempo real...${ultimoNumeroEnviado !== null ? ` (Último histórico inserido: ${ultimoNumeroEnviado})` : ''}`);

  setInterval(async () => {
    try {
      const extrairMaisRecente = async (ctx) => {
        return await ctx.evaluate(() => {
          // 1. Procura o primeiro item do topo no container de histórico da Playtech: roulette-history-extended__items
          const elPrimeiroPlaytech = document.querySelector(
            '[class*="roulette-history-extended__items"] > [class*="history-item"]:first-child, ' +
            '[class*="roulette-history-extended__items"] > div:first-child, ' +
            '[class*="history-item_enabled"]:first-child, ' +
            '[class*="history-item--"]:first-child, ' +
            '[data-automation-locator="field.lastHistoryItem"], ' +
            '[class*="history-item-value_last"]'
          );

          if (elPrimeiroPlaytech) {
            const txt = (elPrimeiroPlaytech.innerText || elPrimeiroPlaytech.textContent || '').trim();
            if (txt.length >= 1 && txt.length <= 2) {
              const num = parseInt(txt, 10);
              if (!isNaN(num) && num >= 0 && num <= 36) {
                const cor = (num === 0) ? 'verde' : ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num) ? 'vermelho' : 'preto');
                return { numero: num, cor };
              }
            }
          }

          // 2. Outros seletores de destaque de sorteio
          const seletoresDestaque = [
            '.winning-number',
            '.last-number',
            '.recent-number',
            '[data-role="last-number"]',
            '[data-role="winning-number"]',
            '.roulette-result',
            '[class*="winningNumber"]',
            '[class*="lastNumber"]',
            '[class*="recentNumber"]',
            '[class*="winning"]',
            '[class*="last-result"]'
          ];

          for (const s of seletoresDestaque) {
            const el = document.querySelector(s);
            if (el && el.innerText) {
              const txt = el.innerText.trim();
              if (txt.length <= 2) {
                const num = parseInt(txt, 10);
                if (!isNaN(num) && num >= 0 && num <= 36) {
                  return { numero: num, cor: null };
                }
              }
            }
          }

          return null;
        });
      };

      let itemRecente = await extrairMaisRecente(page);

      if (itemRecente === null) {
        for (const frame of page.frames()) {
          try {
            const res = await extrairMaisRecente(frame);
            if (res !== null) {
              itemRecente = res;
              break;
            }
          } catch (e) {}
        }
      }

      if (itemRecente !== null && itemRecente.numero !== ultimoNumeroEnviado) {
        ultimoNumeroEnviado = itemRecente.numero;
        const cor = itemRecente.cor || determinarCorRoleta(itemRecente.numero);
        console.log(`\n🎉 NOVO NÚMERO SORTEADO DETECTADO: [ ${itemRecente.numero} ] (${cor.toUpperCase()})`);
        await enviarResultadoParaAPI('Roleta Brasileira', itemRecente.numero, cor);
      }
    } catch (err) {
      // Ignora pequenas falhas de polling
    }
  }, 1500);
}

/**
 * Sistema Anti-Deslogamento e Manutenção de Sessão Ativa (Keep-Alive 24/7)
 * Periódicamente simula movimentos de mouse e clica em pop-ups de inatividade
 * para evitar que o cassino encerre a sessão do usuário.
 */
function iniciarSistemaAntiInatividade(page) {
  console.log('  🛡️ [Keep-Alive] Sistema Anti-Deslogamento ativado com sucesso!');

  // Loop a cada 30 segundos
  setInterval(async () => {
    try {
      // 1. Movimento sutil de mouse em coordenadas aleatórias da tela
      const randomX = Math.floor(Math.random() * 300) + 200;
      const randomY = Math.floor(Math.random() * 200) + 200;
      await page.mouse.move(randomX, randomY, { steps: 3 });

      // 2. Eventos sintéticos de atividade de usuário e clique em avisos de inatividade
      const dispararAtividade = async (ctx) => {
        return await ctx.evaluate(() => {
          // Dispara eventos de atividade no documento
          const evtMove = new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 250, clientY: 250 });
          document.dispatchEvent(evtMove);

          // Detecta e clica automaticamente em avisos "Continuar jogando?", "Ainda está aí?"
          const botoes = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
          for (const btn of botoes) {
            const txt = (btn.innerText || btn.textContent || '').trim().toLowerCase();
            if (
              txt === 'continuar' ||
              txt.includes('continuar jogando') ||
              txt.includes('está aí') ||
              txt.includes('está ai') ||
              txt.includes('renovar sessão') ||
              txt.includes('manter conectado') ||
              txt.includes('stay logged in')
            ) {
              btn.click();
              return `Pop-up de inatividade dispensado: "${btn.innerText.trim()}"`;
            }
          }
          return null;
        });
      };

      let clicou = await dispararAtividade(page);
      if (!clicou) {
        for (const frame of page.frames()) {
          try {
            const res = await dispararAtividade(frame);
            if (res) {
              clicou = res;
              break;
            }
          } catch (e) {}
        }
      }

      if (clicou) {
        console.log(`  🎉 [Anti-Inatividade] ${clicou}`);
      }
    } catch (err) {
      // Silencioso
    }
  }, 30000);
}

// Inicia o agente de automação
iniciarAgenteAutomacao();
