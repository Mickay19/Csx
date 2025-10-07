const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Настройка пути к базе данных для Render
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/csx.db'  // На Render используем временную директорию
  : './csx.db';

console.log('🔧 Настройка базы данных:', dbPath);

// Создаем/подключаем базу данных SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключен к SQLite базе данных:', dbPath);
        initDatabase();
    }
});

// Инициализация базы данных
function initDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица сборок
        db.run(`CREATE TABLE IF NOT EXISTS builds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            build_name TEXT NOT NULL,
            weapon_data TEXT,
            settings_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Таблица сравнений
        db.run(`CREATE TABLE IF NOT EXISTS comparisons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            comparison_name TEXT NOT NULL,
            weapon1_id TEXT,
            weapon2_id TEXT,
            parameters TEXT,
            results TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        console.log('✅ Таблицы созданы/проверены');
    });
}

// Функция для парсинга тела запроса
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                if (!body) {
                    resolve(null);
                    return;
                }
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// Функция для проверки авторизации
function authenticateRequest(authHeader) {
    if (!authHeader) {
        return { authenticated: false, error: 'Требуется авторизация' };
    }
    
    const tokenMatch = authHeader.match(/token_(\d+)_/);
    if (!tokenMatch) {
        return { authenticated: false, error: 'Неверный токен' };
    }
    
    const userId = parseInt(tokenMatch[1]);
    return { authenticated: true, userId: userId };
}

const server = http.createServer(async (req, res) => {
    // CORS headers для продакшена
    const allowedOrigins = [
        'https://csx-frontend.onrender.com', // Ваш фронтенд на Render
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Для разработки разрешаем все origins
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`📨 ${req.method} ${req.url}`);

    // Health check
    if (req.url === '/api/health' && req.method === 'GET') {
        db.get('SELECT COUNT(*) as users_count FROM users', (err, usersRow) => {
            db.get('SELECT COUNT(*) as builds_count FROM builds', (err, buildsRow) => {
                db.get('SELECT COUNT(*) as comparisons_count FROM comparisons', (err, compRow) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        status: 'OK', 
                        database: 'SQLite Connected',
                        database_path: dbPath,
                        environment: process.env.NODE_ENV || 'development',
                        users_count: usersRow.users_count,
                        builds_count: buildsRow.builds_count,
                        comparisons_count: compRow.comparisons_count,
                        timestamp: new Date().toISOString()
                    }));
                });
            });
        });
        return;
    }

    // Регистрация
    if (req.url === '/api/auth/register' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            
            if (!body) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Тело запроса пустое' }));
                return;
            }

            const { username, email, password } = body;
            
            if (!username || !email || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Все поля обязательны' }));
                return;
            }

            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 12);

            // Сохраняем пользователя
            db.run(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Пользователь уже существует' }));
                        } else {
                            throw err;
                        }
                    } else {
                        console.log(`✅ Новый пользователь: ${username} (ID: ${this.lastID})`);
                        
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            user: { id: this.lastID, username, email },
                            token: `token_${this.lastID}_${Date.now()}`,
                            message: 'Регистрация успешна!'
                        }));
                    }
                }
            );
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка регистрации' }));
        }
        return;
    }

    // Вход
    if (req.url === '/api/auth/login' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            
            if (!body) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Тело запроса пустое' }));
                return;
            }

            const { username, password } = body;
            
            if (!username || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Имя пользователя и пароль обязательны' }));
                return;
            }

            // Ищем пользователя
            db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                async (err, user) => {
                    if (err) throw err;
                    
                    if (!user) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Пользователь не найден' }));
                        return;
                    }

                    // Проверяем пароль
                    const isPasswordValid = await bcrypt.compare(password, user.password);
                    if (!isPasswordValid) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Неверный пароль' }));
                        return;
                    }

                    console.log(`✅ Успешный вход: ${username} (ID: ${user.id})`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        user: { id: user.id, username: user.username, email: user.email },
                        token: `token_${user.id}_${Date.now()}`,
                        message: 'Вход выполнен успешно!'
                    }));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка входа:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка входа' }));
        }
        return;
    }

    // Сохранение сборки
    if (req.url === '/api/builds/save' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const authHeader = req.headers['authorization'];
            
            const auth = authenticateRequest(authHeader);
            if (!auth.authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: auth.error }));
                return;
            }

            if (!body || !body.build_name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Название сборки обязательно' }));
                return;
            }

            console.log('💾 Сохранение сборки:', body.build_name);

            db.run(
                'INSERT INTO builds (user_id, build_name, weapon_data, settings_data) VALUES (?, ?, ?, ?)',
                [
                    auth.userId,
                    body.build_name,
                    JSON.stringify(body.weapon_data || {}),
                    JSON.stringify(body.settings_data || {})
                ],
                function(err) {
                    if (err) throw err;
                    
                    console.log(`✅ Сохранена сборка: "${body.build_name}" (ID: ${this.lastID})`);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        buildId: this.lastID,
                        message: 'Сборка сохранена успешно!'
                    }));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка сохранения сборки:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сохранения сборки' }));
        }
        return;
    }

    // Получение сборок пользователя
    if (req.url === '/api/builds/user' && req.method === 'GET') {
        try {
            const authHeader = req.headers['authorization'];
            const auth = authenticateRequest(authHeader);
            
            if (!auth.authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: auth.error }));
                return;
            }

            db.all(
                'SELECT * FROM builds WHERE user_id = ? ORDER BY created_at DESC',
                [auth.userId],
                (err, builds) => {
                    if (err) throw err;
                    
                    console.log(`📦 Загружено сборок: ${builds.length} для пользователя ${auth.userId}`);
                    
                    const buildsWithParsedData = builds.map(build => ({
                        ...build,
                        weapon_data: JSON.parse(build.weapon_data),
                        settings_data: JSON.parse(build.settings_data)
                    }));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(buildsWithParsedData));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка загрузки сборок:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка загрузки сборок' }));
        }
        return;
    }

    // Сохранение сравнения
    if (req.url === '/api/comparisons/save' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const authHeader = req.headers['authorization'];
            
            const auth = authenticateRequest(authHeader);
            if (!auth.authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: auth.error }));
                return;
            }

            if (!body) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Тело запроса пустое' }));
                return;
            }

            if (!body.comparison_name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Название сравнения обязательно' }));
                return;
            }

            console.log('💾 Сохранение сравнения:', body.comparison_name);

            db.run(
                'INSERT INTO comparisons (user_id, comparison_name, weapon1_id, weapon2_id, parameters, results) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    auth.userId,
                    body.comparison_name,
                    body.weapon1_id,
                    body.weapon2_id,
                    JSON.stringify(body.parameters || {}),
                    JSON.stringify(body.results || {})
                ],
                function(err) {
                    if (err) throw err;
                    
                    console.log(`✅ Сохранено сравнение: "${body.comparison_name}" (ID: ${this.lastID})`);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        comparisonId: this.lastID,
                        message: 'Сравнение сохранено успешно!'
                    }));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка сохранения сравнения:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сохранения сравнения' }));
        }
        return;
    }

    // Получение сравнений пользователя
    if (req.url === '/api/comparisons/user' && req.method === 'GET') {
        try {
            const authHeader = req.headers['authorization'];
            const auth = authenticateRequest(authHeader);
            
            if (!auth.authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: auth.error }));
                return;
            }

            db.all(
                'SELECT * FROM comparisons WHERE user_id = ? ORDER BY created_at DESC',
                [auth.userId],
                (err, comparisons) => {
                    if (err) throw err;
                    
                    console.log(`📊 Загружено сравнений: ${comparisons.length} для пользователя ${auth.userId}`);
                    
                    const comparisonsWithParsedData = comparisons.map(comp => ({
                        ...comp,
                        parameters: JSON.parse(comp.parameters),
                        results: JSON.parse(comp.results)
                    }));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(comparisonsWithParsedData));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка загрузки сравнений:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка загрузки сравнений' }));
        }
        return;
    }

    // Удаление сборки
    if (req.url.startsWith('/api/builds/') && req.method === 'DELETE') {
        try {
            const authHeader = req.headers['authorization'];
            const auth = authenticateRequest(authHeader);
            
            if (!auth.authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: auth.error }));
                return;
            }

            const buildId = parseInt(req.url.split('/').pop());
            
            // Удаляем только сборки принадлежащие пользователю
            db.run(
                'DELETE FROM builds WHERE id = ? AND user_id = ?',
                [buildId, auth.userId],
                function(err) {
                    if (err) throw err;
                    
                    if (this.changes === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Сборка не найдена или у вас нет прав для ее удаления' }));
                        return;
                    }

                    console.log(`🗑️ Удалена сборка ID: ${buildId} пользователя ${auth.userId}`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Сборка удалена успешно!'
                    }));
                }
            );
        } catch (error) {
            console.error('❌ Ошибка удаления сборки:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка удаления сборки' }));
        }
        return;
    }

    // Получение статистики
    if (req.url === '/api/stats' && req.method === 'GET') {
        try {
            db.get('SELECT COUNT(*) as users_count FROM users', (err, usersRow) => {
                db.get('SELECT COUNT(*) as builds_count FROM builds', (err, buildsRow) => {
                    db.get('SELECT COUNT(*) as comparisons_count FROM comparisons', (err, compRow) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            users_count: usersRow.users_count,
                            builds_count: buildsRow.builds_count,
                            comparisons_count: compRow.comparisons_count,
                            server_uptime: process.uptime()
                        }));
                    });
                });
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка загрузки статистики' }));
        }
        return;
    }

    // Просмотр всех данных (для отладки)
    if (req.url === '/api/debug/data' && req.method === 'GET') {
        db.all('SELECT * FROM users', (err, users) => {
            db.all('SELECT * FROM builds', (err, builds) => {
                db.all('SELECT * FROM comparisons', (err, comparisons) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        users: users,
                        builds: builds,
                        comparisons: comparisons
                    }, null, 2));
                });
            });
        });
        return;
    }

    // 404 - Маршрут не найден
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        error: 'Маршрут не найден',
        available_endpoints: [
            'GET  /api/health',
            'POST /api/auth/register', 
            'POST /api/auth/login',
            'POST /api/builds/save',
            'GET  /api/builds/user',
            'DELETE /api/builds/:id',
            'POST /api/comparisons/save',
            'GET  /api/comparisons/user',
            'GET  /api/stats',
            'GET  /api/debug/data'
        ]
    }));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 CSX Backend Server с SQLite запущен!');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🗄️  База данных: ${dbPath}`);
    console.log(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});