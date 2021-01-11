const sqlite3 = require('sqlite3').verbose();
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
      this.db.run(`CREATE TABLE IF NOT EXISTS user(id TEXT UNIQUE, hashedPw TEXT, salt TEXT)`, (err) => {
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
  insert = (id, pw, salt) => {
    this.db.serialize();
    this.db.run(
      `INSERT INTO user VALUES(?, ?, ?)`,
      [id, hashPw(pw, salt), salt],
      (err) => {
        if (err) {
          console.error(err.message);
          return false;
        }
        return true;
      }
    )
  }

  signIn = (id, pw) => {
    this.db.serialize(() => {
      this.db.get(
        `SELECT * FROM user WHERE id=?`,
        [id],
        (err, row) => {
          if (err) {
            console.error(err.message);
            console.log(undefined);
            return undefined;
          }
          if (row === undefined) {
            console.log('user does not exist with the id');
            return false;
          }
          const salt = row['salt'];
          const hashedPw = hashPw(pw, salt);
          if (hashedPw === row['hashedPw']) {
            console.log('good to sign in');
          }
          else {
            console.log('pw does not match');;
          }
        }
      )
    });
  }
  query = (id) => {
    this.db.get(
      `SELECT * FROM user WHERE id=?`,
      [id],
      (err, row) => {
        if (err) {
          console.error(err.message);
          console.log(undefined);
          return undefined;
        }
        console.log(row);
        return row;
      }
    )
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
