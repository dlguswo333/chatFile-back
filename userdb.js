const sqlite3 = require('sqlite3').verbose();
const { rejects } = require('assert');
const crypto = require('crypto');

const hashPw = (pw, salt) => {
  return crypto.createHash('sha256').update(pw + salt).digest('hex');
}

class UserDb {
  constructor(path) {
    this.db = new sqlite3.Database(path, (err) => {
      if (err) {
        console.error(err.message);
        return false;
      }
      this.db.run(`
        CREATE TABLE IF NOT EXISTS
        user(
          id TEXT UNIQUE,
          nickname TEXT,
          hashedPw TEXT,
          salt TEXT)`,
        (err) => {
          if (err) {
            console.error(err.message);
            return false;
          }
        })
      console.log('connected to the user data successfully');
      return true;
    });
  }

  // even if the variable pw means password, it needs to be already hashed.
  insert = async (id, pw, nickname, salt) => {
    this.db.serialize(() => {
      this.db.run(
        `INSERT INTO user VALUES(?, ?, ?, ?)`,
        [id, hashPw(pw, salt), nickname, salt],
        (err) => {
          if (err) {
            console.error(err.message);
            return false;
          }
          return true;
        }
      )
    });
  }

  signIn = async (id, pw) => {
    return new Promise((resolve, reject) => {
      this.db.get(
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
  query = (id) => {
    return new Promise((resolve, reject) => {
      this.db.get(
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
    this.db.close((err) => {
      if (err) {
        console.error('error while closing the user db');
        return;
      }
    })
    console.log('closed the user db');
  }
}

module.exports = UserDb;
