const session = require('express-session');
const { db } = require('../db');

// Debug session configuration
console.log('Session Configuration:');
console.log('Database:', process.env.DB_NAME);
console.log('Server:', process.env.DB_SERVER);

// Custom session store
class KnexSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const result = await db('sessions')
        .where('sid', sid)
        .where('expired', '>', db.fn.now())
        .first();
      
      if (!result) {
        return callback(null, null);
      }
      
      callback(null, JSON.parse(result.sess));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      await db.raw(`
        MERGE INTO sessions AS target
        USING (SELECT ? AS sid) AS source
        ON target.sid = source.sid
        WHEN MATCHED THEN
          UPDATE SET sess = ?, expired = ?, updated_at = ?
        WHEN NOT MATCHED THEN
          INSERT (sid, sess, expired, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?);
      `, [
        sid,
        JSON.stringify(sess),
        expires,
        new Date(),
        sid,
        JSON.stringify(sess),
        expires,
        new Date(),
        new Date()
      ]);
      
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await db('sessions')
        .where('sid', sid)
        .del();
      
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
  store: new KnexSessionStore(),
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