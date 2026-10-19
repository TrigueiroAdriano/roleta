require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Servidor rodando com sucesso!`);
  console.log(`📡 URL Base: http://localhost:${PORT}`);
  console.log(`📌 Histórico: http://localhost:${PORT}/api/historico?mesa=Roleta_Brasileira`);
  console.log(`==================================================`);
});

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
  console.log('\n⏳ Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor finalizado com sucesso.');
    process.exit(0);
  });
});
