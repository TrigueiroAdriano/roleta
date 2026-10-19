/**
 * ==============================================================================
 * CONFIGURAÇÃO E CONEXÃO COM O BANCO DE DADOS
 * ==============================================================================
 * Onde configurar as credenciais do banco:
 * 1. Abra o arquivo `.env` na raiz do projeto.
 * 2. Defina `DB_TYPE=sqlite` para desenvolvimento rápido local, ou `DB_TYPE=mysql` / `DB_TYPE=postgres`.
 * 3. Para MySQL / PostgreSQL, preencha as variáveis:
 *    - DB_HOST (ex: localhost ou ip do servidor)
 *    - DB_PORT (ex: 3306 para MySQL, 5432 para Postgres)
 *    - DB_USER (ex: root)
 *    - DB_PASS (sua senha do banco)
 *    - DB_NAME (ex: roleta_db)
 * ==============================================================================
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';
let dbInstance = null;

// Garante que o diretório 'database' existe caso seja SQLite
const dbPath = path.resolve(process.env.DB_SQLITE_PATH || './database/roleta.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Inicialização e Conexão SQLite (Padrão)
 */
function initSqlite() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Erro ao conectar ao banco SQLite:', err.message);
    } else {
      console.log(`✅ Conectado ao banco SQLite com sucesso: [${dbPath}]`);
    }
  });

  // Cria a tabela se não existir e zera o banco ao inicializar a API
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS historico_roleta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mesa TEXT NOT NULL,
        numero INTEGER NOT NULL CHECK (numero BETWEEN 0 AND 36),
        cor TEXT NOT NULL,
        horario DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_mesa_horario ON historico_roleta(mesa, horario DESC)
    `);

    // Zera o banco de dados ao abrir/iniciar a API
    db.run(`DELETE FROM historico_roleta`, (err) => {
      if (!err) {
        console.log('🧹 [Banco] Histórico zerado com sucesso na inicialização da API!');
      }
    });
    db.run(`DELETE FROM sqlite_sequence WHERE name = 'historico_roleta'`, () => {});
  });

  return db;
}

/* 
 * ==============================================================================
 * EXEMPLO DE ADAPTAÇÃO PARA MYSQL OU POSTGRESQL:
 * ==============================================================================
 * 
 * Se for utilizar MySQL:
 * 1. Instale a biblioteca: npm install mysql2
 * 2. Substitua este trecho por:
 * 
 * const mysql = require('mysql2/promise');
 * const pool = mysql.createPool({
 *   host: process.env.DB_HOST,
 *   port: process.env.DB_PORT || 3306,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASS,
 *   database: process.env.DB_NAME,
 *   waitForConnections: true,
 *   connectionLimit: 10
 * });
 * 
 * Se for utilizar PostgreSQL:
 * 1. Instale a biblioteca: npm install pg
 * 2. Substitua este trecho por:
 * 
 * const { Pool } = require('pg');
 * const pool = new Pool({
 *   host: process.env.DB_HOST,
 *   port: process.env.DB_PORT || 5432,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASS,
 *   database: process.env.DB_NAME,
 * });
 * ==============================================================================
 */

dbInstance = initSqlite();

/**
 * Encapsuladores utilitários com Promises para facilitar o uso do async/await
 */
const db = {
  /**
   * Executa consultas do tipo SELECT que retornam múltiplos registros
   */
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbInstance.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  /**
   * Executa comandos INSERT, UPDATE ou DELETE
   */
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbInstance.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  /**
   * Executa consulta SELECT para retornar apenas um registro
   */
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbInstance.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
};

module.exports = db;
