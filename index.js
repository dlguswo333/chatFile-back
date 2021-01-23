const app = require('express')();
const upload = require('express-fileupload');
const session = require('express-session');
const userDb = require('./userdb');
const path = require('path');
const upload_path = './files/';
const http = require('http').createServer(app);
const cors = require('cors');
const fs = require('fs');
const data = require('./data.js').data;
const crypto = require('crypto');
const axios = require('axios');

const getSalt = () => {
  return crypto.randomBytes(10).toString('hex');
}

app.use(cors({
  origin: `http://localhost:${data.front_port}`,
  credentials: true
}));
app.use(upload());
var sessionWare = session({
  // NOTE: change this secret value!!!
  secret: '2j23jjf&#@dlfdkkc*%',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: data.max_age,
    secure: false
  },
});

// link session with socket io.
app.use(sessionWare);

var messageList = [];

/*

socket io part start

*/
var io = require('socket.io')(http, {
  cors: {
    origin: `http://localhost:${data.front_port}`,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// link express session with socket io.
io.use((socket, next) => {
  sessionWare(socket.request, {}, next);
});

// new client connected.
io.on(data.back_connect, (socket) => {
  const key = socket.request.session.key;
  if (key === undefined) {
    // block the client.
    socket.disconnect();
    return;
  }
  const id = socket.request.session.clientId;
  console.log('a client connected with key:' + key);

  socket.emit(data.full_message_list, messageList);

  // a client sent a new message.
  socket.on(data.new_message, (message) => {
    console.log(data.new_message);
    handleMessage(message, 'text', id);
    messageList.push(message);
    io.emit(data.new_message, message);
  })

  // a client disconnected.
  socket.on(data.back_disconnect, (socket) => {
    console.log('a user disconnected');
    // signedKeyMap.delete(key);
  });
});

const handleMessage = (message, type, id) => {
  message['id'] = id;
  message['type'] = type;
  message['date'] = Date.now();
  message['key'] = crypto.createHash('sha256').update(message.userName + getSalt() + message.date).digest('hex');
}

/*

  socket io part end

*/



// handle file upload.
app.post('/files', (req, res) => {
  const key = req.session.key;
  const id = req.session.clientId;
  if (key === undefined) {
    // block this upload.
    return res.sendStatus(403);
  }
  console.log('file upload detected');

  let file = req.files.file;
  if (file.size > data.max_file_size) {
    console.log('reject upload: too big file size');
    return res.sendStatus(500);
  }

  message = {
    'fileName': file.name,
    'fileSize': file.size
  };
  handleMessage(message, 'file', id);

  fs.writeFile(upload_path + message.key + path.extname(file.name), file.data, (err) => {
    if (err) {
      console.log('error upload file');
      res.sendStatus(500);
      throw err;
    }

    // successful file upload.
    // now emit the file as a chat message.
    console.log('uploaded file saved');
    messageList.push(message);
    io.emit(data.new_message, message);
    res.sendStatus(200);
  });
});

// handle sign in.
app.post(`/signIn`, (req, res) => {
  if (req.session.key !== undefined) {
    // this user is already signed in!
    res.sendStatus(200);
    return;
  }
  const basic = 'Basic '
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith(basic)) {
    const idColonPw = new Buffer.from(authHeader.split(basic)[1], 'base64').toString();
    if (idColonPw.split(':').length != 2) {
      // oops, something is wrong...
      res.sendStatus(500);
    }
    const id = idColonPw.split(':')[0];
    const pw = idColonPw.split(':')[1];
    if (data.validate_id(id) == false || data.validate_pw(pw) == false) {
      // id or pw does not satisfy the requirements.
      res.sendStatus(401);
      return;
    }
    userDb.signIn(id, pw).then((value) => {
      console.log('sign in result:', value);
      if (value === true) {
        // sign in succeeded.
        req.session.key = crypto.createHash('sha256').update(req.sessionID + getSalt()).digest('hex');
        req.session.clientId = id;
        res.cookie('signedIn', true, {
          httpOnly: false,
          maxAge: data.max_age,
          secure: false
        });
        res.cookie('myId', id, {
          httpOnly: false,
          maxAge: data.max_age,
          secure: false
        });
        res.sendStatus(200);
      }
    }).catch((value) => {
      if (value === false) {
        // id or pw does not match.
        res.sendStatus(401);
      }
      else if (value === undefined) {
        // unknown error such as db error.
        res.sendStatus(500);
      }
    });
  }
});

// handle sign up.
app.post(`/signUp`, (req, res) => {
  const basic = 'Basic '
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith(basic)) {
    const idColonPw = new Buffer.from(authHeader.split(basic)[1], 'base64').toString();
    if (idColonPw.split(':').length != 2) {
      // oops, something is wrong...
      return res.sendStatus(500);
    }
    const id = idColonPw.split(':')[0];
    const pw = idColonPw.split(':')[1];
    if (data.validate_id(id) == false || data.validate_pw(pw) == false) {
      // id or pw does not satisfy the requirements.
      return res.sendStatus(401);
    }

    userDb.signUp(id, pw, id, getSalt()).then((value) => {
      console.log('sign up succeeded');
      return res.sendStatus(200);
    }).catch((value) => {
      console.log('sign up failed');
      return res.status(401).send((value.includes('UNIQUE') ? 'ID already exists!' : 'Sign up failed. Please try again later.'));
    });
  }
});

// handle sign out.
app.post(`/signOut`, (req, res) => {
  req.session.destroy();
  res.cookie('signedIn', false, {
    httpOnly: false,
    maxAge: 0,
    secure: false
  });
  res.cookie('myId', '', {
    httpOnly: false,
    maxAge: 0,
    secure: false
  });
  res.sendStatus(200);
});

// handle file download.
app.get(`/files/:key`, (req, res) => {
  if (req.session.key === undefined) {
    // block this request.
    return res.sendStatus(403);
  }
  console.log('file download request');
  for (message of messageList) {
    if (req.params.key === message.key) {
      var filePath = upload_path + req.params.key + path.extname(message['fileName']);
      var fileName = message['fileName'];
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.log(filePath, fileName);
          console.log('error while handling file download');
          return res.sendStatus(500);
        }
      });
      return;
    }
  }
  // could not find the file with the key.
  console.log('could not find the file');
  return res.sendStatus(404);
});

// start the server. listen to the port.
http.listen(data.back_port, () => {
  console.log(`listening on port num:${data.back_port}`);
});
