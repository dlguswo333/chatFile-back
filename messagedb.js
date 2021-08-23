const sqlite3 = require('sqlite3').verbose();
const dbPath = './db/message.db';

/**
 * @typedef {TextMessage|FileMessage} Message
 * @typedef {{id: string, type: 'text', key:string, date: number, value:string}} TextMessage
 * @typedef {{id: string, type: 'file', key:string, date: number, fileName:string, fileSize:number}} FileMessage
 */

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  // Create message table if not exists.
  db.run(`CREATE TABLE IF NOT EXISTS
    message(
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      key TEXT PRIMARY KEY NOT NULL,
      date INTEGER NOT NULL,
      value TEXT,
      fileName TEXT,
      fileSize INTEGER
    )
  `, (err) => {
    if (err) {
      console.error(err.message);
      return;
    }
    db.run(`CREATE INDEX IF NOT EXISTS date_index ON message(date)`, (err) => {
      if (err) {
        console.error(err.message);
        return;
      }
    })
    console.log('connection to message DB established');
  });
})

/**
 * 
 * @param {Message} message 
 * @returns 
 */
const insertMessage = (message) => {
  if (!db) {
    // Set timeout for later.
    setTimeout(() => {
      addMessage(message);
    }, 100);
    return;
  }
  if (message.type === 'text') {
    db.run(`
      INSERT INTO message (id, type, key, date, value) VALUES(?, ?, ?, ?, ?)`,
      [message.id, 'text', message.key, message.date, message.value],
      (err) => {
        if (err) {
          console.error(`Inserting into message DB failed: ${err.message}`);
          return;
        }
      }
    )
  }
  if (message.type === 'file') {
    db.run(`
      INSERT INTO message (id, type, key, date, fileName, fileSize) VALUES(?, ?, ?, ?, ?, ?)`,
      [message.id, 'file', message.key, message.date, message.fileName, message.fileSize],
      (err) => {
        if (err) {
          console.error(`Inserting into message DB failed: ${err.message}`);
          return;
        }
      }
    )
  }
}

/**
 * @param {number} date
 * @returns {Promise<Message[]>}
 */
const getMessageBelowDate = (date) => {
  return new Promise((resolve, reject) => {
    if (date < 0) {
      db.all(`SELECT * FROM message`, (err, rows) => {
        if (err) {
          console.error(`selecting all messages from DB failed: ${err.message}`);
          reject(undefined);
        }
        resolve(rows);
      });
    }
    else {
      db.all(`SELECT * FROM message WHERE date < ?`, [date], (err, rows) => {
        if (err) {
          console.error(`selecting all messages from DB failed: ${err.message}`);
          reject(undefined);
        }
        resolve(rows);
      });
    }
  });
}

/**
 * @param {string} key
 * @returns {Promise<Message>}
 */
const getMessageByKey = (key) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM message WHERE key=?`,
      [key],
      (err, row) => {
        if (err) {
          console.error(`selecting all messages from DB failed: ${err.message}`);
          reject(undefined);
        }
        resolve(row);
      })
  });
}

/**
 * @returns {Promise.<void, Error>}
 */
const close = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('error while closing the client db');
        reject(err);
        return;
      }
    })
    resolve(true);
  })
};


module.exports = { insertMessage, getMessageBelowDate, getMessageByKey, close };