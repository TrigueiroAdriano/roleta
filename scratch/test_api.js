const http = require('http');

// Inicia o app em uma porta de teste (3099)
process.env.PORT = 3099;
const app = require('../src/app');

const server = app.listen(3099, async () => {
  console.log('🧪 Servidor de teste iniciado na porta 3099...');

  try {
    // 1. Teste POST /api/resultado
    console.log('\n1. Testando POST /api/resultado...');
    const postData = JSON.stringify({
      mesa: 'Roleta Brasileira',
      numero: 22,
      cor: 'preto'
    });

    const postRes = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/resultado',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    console.log('Resposta POST:', postRes);

    // 2. Teste GET /api/historico
    console.log('\n2. Testando GET /api/historico?mesa=Roleta_Brasileira...');
    const getRes = await makeRequest({
      hostname: 'localhost',
      port: 3099,
      path: '/api/historico?mesa=Roleta%20Brasileira',
      method: 'GET'
    });

    console.log('Resposta GET:', JSON.stringify(JSON.parse(getRes), null, 2));

    console.log('\n✅ TESTES CONCLUÍDOS COM SUCESSO!');
  } catch (err) {
    console.error('❌ Erro durante os testes:', err);
  } finally {
    server.close(() => process.exit(0));
  }
});

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
