const db = require('../config/database');

/**
 * Função utilitária para determinar a cor do número na roleta europeia (0 a 36)
 * @param {number} numero - Número sorteado (0 a 36)
 * @returns {string} - "verde", "vermelho" ou "preto"
 */
function calcularCorRoleta(numero) {
  if (numero === 0) return 'verde';

  // Na roleta europeia:
  // Faixas 1-10 e 19-28: Ímpares são vermelhos, Pares são pretos.
  // Faixas 11-18 e 29-36: Ímpares são pretos, Pares são vermelhos.
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
  ];

  return redNumbers.includes(numero) ? 'vermelho' : 'preto';
}

/**
 * Formata data/hora para o padrão YYYY-MM-DD HH:mm:ss
 */
function formatarDataHora(date = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  const ano = date.getFullYear();
  const mes = pad(date.getMonth() + 1);
  const dia = pad(date.getDate());
  const hora = pad(date.getHours());
  const min = pad(date.getMinutes());
  const seg = pad(date.getSeconds());

  return `${ano}-${mes}-${dia} ${hora}:${min}:${seg}`;
}

const roletaController = {
  /**
   * GET /api/historico
   * Retorna os últimos N números sorteados para a mesa informada.
   */
  getHistorico: async (req, res, next) => {
    try {
      const { mesa, limite, formato } = req.query;

      // Define 'Roleta Brasileira' como mesa padrão se o parâmetro não for enviado
      const mesaQuery = (mesa && typeof mesa === 'string' && mesa.trim() !== '')
        ? mesa.trim()
        : 'Roleta Brasileira';

      const limiteNumerico = Math.min(Math.max(parseInt(limite, 10) || 50, 1), 100);

      // Tratamentos para buscar tanto com espaço ("Roleta Brasileira") quanto com underline ("Roleta_Brasileira")
      const mesaComEspaco = mesaQuery.replace(/_/g, ' ');
      const mesaComUnderline = mesaQuery.replace(/ /g, '_');

      // Consulta no banco garantindo SEMPRE os números mais recentes no topo (ORDER BY horario DESC, id DESC)
      const sql = `
        SELECT id, mesa, numero, cor, horario 
        FROM historico_roleta 
        WHERE mesa = ? OR mesa = ? OR mesa = ?
        ORDER BY horario DESC, id DESC 
        LIMIT ?
      `;

      const resultados = await db.all(sql, [mesaQuery, mesaComEspaco, mesaComUnderline, limiteNumerico]);

      // Mapeia e organiza com indicação de posição (#1 é o mais recente, no topo)
      const dadosOrdenados = resultados.map((item, index) => ({
        posicao: index + 1,
        numero: item.numero,
        cor: item.cor,
        horario: item.horario,
        mesa: item.mesa
      }));

      // Se a requisição solicitar formato em linhas / texto puro
      if (formato === 'texto' || formato === 'linha') {
        const textoLinhas = dadosOrdenados
          .map(d => `#${String(d.posicao).padStart(2, '0')} | Número: ${String(d.numero).padStart(2, ' ')} | Cor: ${d.cor.padEnd(8, ' ')} | Horário: ${d.horario}`)
          .join('\n');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(textoLinhas);
      }

      return res.status(200).json({
        sucesso: true,
        ordenacao: "Mais recentes no topo (horario DESC)",
        mesa: mesaQuery,
        total: dadosOrdenados.length,
        dados: dadosOrdenados
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/resultado
   * Recebe e salva um novo número sorteado no banco de dados.
   */
  salvarResultado: async (req, res, next) => {
    try {
      const { mesa, numero, cor } = req.body;

      // Validação de presença da mesa
      if (!mesa || typeof mesa !== 'string' || mesa.trim() === '') {
        return res.status(400).json({
          sucesso: false,
          mensagem: "O campo 'mesa' é obrigatório no corpo da requisição."
        });
      }

      // Validação do número da roleta (deve ser inteiro entre 0 e 36)
      const numeroParsed = Number(numero);
      if (
        numero === undefined ||
        numero === null ||
        isNaN(numeroParsed) ||
        !Number.isInteger(numeroParsed) ||
        numeroParsed < 0 ||
        numeroParsed > 36
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "O campo 'numero' deve ser um número inteiro válido entre 0 e 36."
        });
      }

      // Determina a cor com base estrita nas regras oficiais da roleta europeia
      const corFinal = calcularCorRoleta(numeroParsed);

      const horarioAtual = formatarDataHora();
      const mesaTratada = mesa.trim();

      // Inserção no Banco de Dados
      const sql = `
        INSERT INTO historico_roleta (mesa, numero, cor, horario)
        VALUES (?, ?, ?, ?)
      `;

      const resultado = await db.run(sql, [mesaTratada, numeroParsed, corFinal, horarioAtual]);

      return res.status(201).json({
        sucesso: true,
        mensagem: "Resultado registrado com sucesso!",
        dado: {
          id: resultado.lastID,
          mesa: mesaTratada,
          numero: numeroParsed,
          cor: corFinal,
          horario: horarioAtual
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/historico ou POST /api/limpar
   * Limpa todo o histórico do banco de dados (reseta o banco zerado).
   */
  limparHistorico: async (req, res, next) => {
    try {
      await db.run(`DELETE FROM historico_roleta`);
      await db.run(`DELETE FROM sqlite_sequence WHERE name = 'historico_roleta'`).catch(() => {});

      console.log('🧹 [API] Banco de dados zerado com sucesso!');
      return res.status(200).json({
        sucesso: true,
        mensagem: "Banco de dados zerado com sucesso! Pronto para receber novo histórico."
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = roletaController;
