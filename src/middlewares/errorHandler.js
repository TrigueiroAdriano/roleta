/**
 * Middleware para tratar rotas não encontradas (404)
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota não encontrada: [${req.method}] ${req.originalUrl}`
  });
}

/**
 * Middleware global para captura e tratamento centralizado de erros (500)
 */
function globalErrorHandler(err, req, res, next) {
  console.error('❌ Erro interno do servidor:', err);

  const statusCode = err.status || err.statusCode || 500;
  
  res.status(statusCode).json({
    sucesso: false,
    mensagem: err.message || 'Ocorreu um erro interno no servidor ao processar a requisição.',
    detalhes: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
