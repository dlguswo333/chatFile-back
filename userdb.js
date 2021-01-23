const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = './db/user.db';
const hashPw = (pw, salt) => {
  return crypto.createHash('sha256').update(pw + salt).digest('hex');
}

const db = new sqlite3.Database(path, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS
      user(
        id TEXT UNIQUE,
        hashedPw TEXT,
        nickname TEXT,
        salt TEXT
      )`, (err) => {
      if (err) {
        console.error(err.message);
        return;
      }
    });
    db.get(
      `SELECT * FROM user WHERE id=?`,
      ['admin'],
      (err, row) => {
        if (err) {
          console.error(err.message);
          return;
        }
        if (row === undefined) {
          db.run(
            `INSERT INTO user VALUES(?, ?, ?, ?)`,
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
      `INSERT INTO user VALUES(?, ?, ?, ?)`,
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

const signIn = async (id, pw) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM user WHERE id=?`,
      [id],
      (err, row) => {
        if (err) {
          console.error(err.message);
          reject(undefined);
        }
        if (row == undefined) {
          console.log('user does not exist with the id');
          reject(false);
          return;
        }
        const salt = row['salt'];
        const hashedPw = hashPw(pw, salt);
        if (hashedPw === row['hashedPw']) {
          resolve(true);
        }
        else {
          reject(false);
        }
      }
    );
  });
}

const query = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM user WHERE id=?`,
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
}

close = () => {
  db.close((err) => {
    if (err) {
      console.error('error while closing the user db');
      return;
    }
  })
  console.log('closed the user db');
}

module.exports = { signIn, signUp, query, close };