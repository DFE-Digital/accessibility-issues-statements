const session = require('express-session');
const sql = require('mssql');

// Debug session configuration
console.log('Session Configuration:');
console.log('Database:', process.env.DB_NAME);
console.log('Server:', process.env.DB_SERVER);

// Create SQL Server configuration
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a connection pool
const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server for sessions');
    return pool;
  })
  .catch(err => {
    console.error('SQL Server connection error:', err);
    throw err;
  });

// Custom session store
class MSSQLSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('sid', sql.VarChar, sid)
        .query('SELECT sess FROM sessions WHERE sid = @sid AND expired > GETDATE()');
      
      if (result.recordset.length === 0) {
        return callback(null, null);
      }
      
      callback(null, JSON.parse(result.recordset[0].sess));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      const pool = await poolPromise;
      await pool.request()
        .input('sid', sql.VarChar, sid)
        .input('sess', sql.NVarChar, JSON.stringify(sess))
        .input('expired', sql.DateTime, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
        .query(`
          MERGE INTO sessions AS target
          USING (SELECT @sid AS sid) AS source
          ON target.sid = source.sid
          WHEN MATCHED THEN
            UPDATE SET sess = @sess, expired = @expired
          WHEN NOT MATCHED THEN
            INSERT (sid, sess, expired) VALUES (@sid, @sess, @expired);
        `);
      
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const pool = await poolPromise;
      await pool.request()
        .input('sid', sql.VarChar, sid)
        .query('DELETE FROM sessions WHERE sid = @sid');
      
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'accessibility.sid',
  store: new MSSQLSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    sameSite: 'lax'
  }
};

module.exports = session(sessionConfig); 