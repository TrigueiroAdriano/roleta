const express = require('express');
const router = express.Router();
const roletaController = require('../controllers/roletaController');

/**
 * @route   GET /api/historico
 * @desc    Retorna os últimos N números sorteados da mesa informada
 * @access  Público
 */
router.get('/historico', roletaController.getHistorico);

/**
 * @route   POST /api/resultado
 * @desc    Recebe e armazena um novo resultado de sorteio de roleta
 * @access  Público
 */
router.post('/resultado', roletaController.salvarResultado);

/**
 * @route   DELETE /api/historico
 * @route   POST /api/limpar
 * @desc    Limpa/reseta todo o histórico do banco de dados
 * @access  Público
 */
router.delete('/historico', roletaController.limparHistorico);
router.post('/limpar', roletaController.limparHistorico);

/**
 * @route   GET /api/health
 * @desc    Endpoint de verificação de integridade (Health Check)
 * @access  Público
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    sucesso: true,
    status: 'ONLINE',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
