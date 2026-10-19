-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DO BANCO DE DADOS (historico_roleta)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCRIPT PARA MYSQL
-- ------------------------------------------------------------------------------
/*
CREATE DATABASE IF NOT EXISTS roleta_db;
USE roleta_db;

CREATE TABLE IF NOT EXISTS historico_roleta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa VARCHAR(100) NOT NULL,
    numero INT NOT NULL CHECK (numero BETWEEN 0 AND 36),
    cor VARCHAR(20) NOT NULL,
    horario DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_mesa_horario ON historico_roleta(mesa, horario DESC);
*/

-- ------------------------------------------------------------------------------
-- 2. SCRIPT PARA POSTGRESQL
-- ------------------------------------------------------------------------------
/*
CREATE TABLE IF NOT EXISTS historico_roleta (
    id SERIAL PRIMARY KEY,
    mesa VARCHAR(100) NOT NULL,
    numero INT NOT NULL CHECK (numero BETWEEN 0 AND 36),
    cor VARCHAR(20) NOT NULL,
    horario TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mesa_horario ON historico_roleta(mesa, horario DESC);
*/

-- ------------------------------------------------------------------------------
-- 3. SCRIPT PARA SQLITE (Usado por padrão pela API localmente)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_roleta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa TEXT NOT NULL,
    numero INTEGER NOT NULL CHECK (numero BETWEEN 0 AND 36),
    cor TEXT NOT NULL,
    horario DATETIME DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_mesa_horario ON historico_roleta(mesa, horario DESC);

-- Dados Iniciais de Teste (Exemplo)
INSERT INTO historico_roleta (mesa, numero, cor, horario) VALUES 
('Roleta Brasileira', 22, 'preto', '2026-07-23 22:15:00'),
('Roleta Brasileira', 9, 'vermelho', '2026-07-23 22:14:00'),
('Roleta Brasileira', 0, 'verde', '2026-07-23 22:13:00');
