const sqlite3 = require('sqlite3').verbose();
const dbPath = './db/client.db';
const { getHashValue } = require('./helper');

const hashPw = (pw, salt) => {
  return getHashValue(pw + salt);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  db.serialize(() => {
    // Create client table if not exists.
    db.run(`CREATE TABLE IF NOT EXISTS
      client(
        id TEXT PRIMARY KEY NOT NULL,
        hashedPw TEXT,
        nickname TEXT,
        salt TEXT
      )`, (err) => {
      if (err) {
        console.error(err.message);
        return;
      }
      console.log('connection to client DB established');
    });
    // Insert admin account for debugging.
    db.get(
      `SELECT * FROM client WHERE id=?`,
      ['admin'],
      (err, row) => {
        if (err) {
          console.error(err.message);
          return;
        }
        if (row === undefined) {
          db.run(
            `INSERT INTO client VALUES(?, ?, ?, ?)`,
            ['admin', hashPw('admin', 'fewajfa'), 'admin', 'fewajfa'],
            (err) => {
              if (err) {
                console.error(err.message);
                return;
              }
              return;
            }
          )
        }
      }
    );
  });
});

// even if the variable pw means password, it needs to be already hashed.
const signUp = (id, pw, nickname, salt) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO client VALUES(?, ?, ?, ?)`,
      [id, hashPw(pw, salt), nickname, salt],
      (err) => {
        if (err) {
          console.error(err.message);
          reject(err.message);
        }
        resolve(true);
      }
    )
  });
}

// Promise value: undefined, false, true
const signIn = (id, pw) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM client WHERE id=?`,
      [id],
      (err, row) => {
        if (err) {
          console.error(err.message);
          reject(undefined);
        }
        if (row == undefined) {
          console.log('client does not exist with the id');
          reject(false);
          return;
        }
        const salt = row['salt'];
        const hashedPw = hashPw(pw, salt);
        if (hashedPw === row['hashedPw']) {
          resolve(true);
        }
        else {
          // password does not match.
          reject(false);
        }
      }
    );
  });
}

const query = (id) => {
  // Does id exist in client database?
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM client WHERE id=?`,
      [id],
      (err, row) => {
        if (err) {
          console.error(err.message);
          reject(undefined);
        }
        resolve(row);
      }
    );
  });
};

const getAllIds = () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id FROM client`,
      (err, rows) => {
        if (err) {
          console.error(err.message);
          reject(undefined);
        }
        resolve(rows);
      }
    );
  })
};

const deleteClient = (id, pw) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM client WHERE id=?`,
      [id],
      (err, row) => {
        if (err) {
          // This error is due to DBMS error.
          console.error(err.message);
          reject(undefined);
        }
        if (row == undefined) {
          reject('id does not match!');
          return;
        }
        const salt = row['salt'];
        const hashedPw = hashPw(pw, salt);
        if (hashedPw === row['hashedPw']) {
          db.run(
            `DELETE FROM client WHERE id=?`,
            [id],
            (err) => {
              if (err) {
                // DBMS could not delete the client.
                console.error(err.message);
                reject(undefined);
              }
              // Successfully deleted the client.
              resolve(true);
            }
          )
        }
        else {
          // Password does not match.
          reject('Password does not match!');
        }
      }
    );
  });
};

const changePassword = (id, pw, newPw) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM client where id=?`,
      [id],
      (err, row) => {
        if (err) {
          console.error(err.message);
          reject(undefined);
        }
        const salt = row['salt'];
        const hashedPw = hashPw(pw, salt);
        if (hashedPw === row['hashedPw']) {
          // Change password for the client.
          // Do I need to create new salt? I think not.
          // Salt is needed to protect from rainbow table attack,
          // Old salt will not harm...
          db.run(`UPDATE client SET hashedPw=? WHERE id=?`,
            [hashPw(newPw, salt), id],
            (err) => {
              if (err) {
                // Failed to renew password.
                console.error(err.message);
                reject(undefined);
              }
              // Successfully changed password.
              resolve(true);
            });
        }
        else {
          // Password does not match.
          reject('Password does not match!');
        }
      }
    );
  });
};

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

module.exports = { signIn, signUp, query, close, deleteClient, getAllIds, changePassword };