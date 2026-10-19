const express = require('express');
const cors = require('cors');
const roletaRoutes = require('./routes/roletaRoutes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

const app = express();

/**
 * ==============================================================================
 * MIDDLEWARES PRINCIPAIS
 * ==============================================================================
 */

// Permite requisições CORS de qualquer origem (Frontend / Painel de exibição)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parser para requisições com corpo no formato JSON
app.use(express.json());

// Parser para requisições URL-encoded
app.use(express.urlencoded({ extended: true }));

// Servir o painel web de demonstração estático
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));


/**
 * ==============================================================================
 * ROTAS DA API
 * ==============================================================================
 */
app.use('/api', roletaRoutes);

// Rota raiz para boas-vindas
app.get('/', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API RESTful de Histórico de Roleta Ativa!',
    endpoints: {
      historico: 'GET /api/historico?mesa=Roleta_Brasileira',
      resultado: 'POST /api/resultado',
      health: 'GET /api/health'
    }
  });
});

/**
 * ==============================================================================
 * MIDDLEWARES DE ERRO
 * ==============================================================================
 */
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
