const app = require('express')();
const upload = require('express-fileupload');
const session = require('express-session');
const clientDb = require('./clientdb');
const path = require('path');
const upload_path = './files/';
const db_path = './db';
const http = require('http').createServer(app);
const cors = require('cors');
const fs = require('fs');
const data = require('./data.json');
const crypto = require('crypto');
const sessionStore = require('session-file-store')(session);
const { validateIdLen, validatePwLen } = require('./helper');

const getSalt = () => {
  return crypto.randomBytes(10).toString('hex');
};

// Create folder for files and databases if not exist.
if (!fs.existsSync(upload_path)) {
  fs.mkdirSync(upload_path, { recursive: true });
}
if (!fs.existsSync(db_path)) {
  fs.mkdirSync(db_path, { recursive: true });
}

app.use(cors({
  origin: `http://localhost:${data.front_port}`,
  credentials: true
}));

// Attach express fileupload.
app.use(upload({
  limits: { fileSize: data.max_file_size },
  limitHandler: (req, res, next) => {
    console.error('file size bigger than the limit');
    return res.sendStatus(403);
  }
}));

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
  // 21.02.02. session-file-store looks like having a issue printing
  // no such file or directory continually.
  // Until then, set log function not to print at all.
  store: new sessionStore({ ttl: data.max_age, logFn: (log) => { } })
});

// link session with socket io.
app.use(sessionWare);

var messageList = [];
var clientList = new Map();

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
  console.log(`${id} connected.`);
  // Add user to the map.
  // If we do not delete the key from map,
  // it will be much easier when the app has rooms.
  clientList.set(id, 1 + (clientList.has(id) ? clientList.get(id) : 0));
  io.emit(data.client_connect, { id, value: clientList.get(id) });
  socket.emit(data.full_client_list, Array.from(clientList));
  socket.emit(data.full_message_list, messageList);

  // A client sent a new message.
  socket.on(data.new_message, (message) => {
    handleMessage(message, 'text', id);
    messageList.push(message);
    io.emit(data.new_message, message);
  });

  // a client disconnected.
  socket.on(data.back_disconnect, (socket) => {
    console.log(`${id} disconnected`);
    // The client could have deleted his/her own account. Check it.
    if (clientList.has(id)) {
      clientList.set(id, clientList.get(id) - 1);
      io.emit(data.client_disconnect, { id, value: clientList.get(id) });
    }
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



// Handle file upload.
app.post('/files', (req, res) => {
  const key = req.session.key;
  const id = req.session.clientId;
  if (key === undefined) {
    // Block this upload.
    console.error('unauthorized access to file upload path');
    return res.sendStatus(403);
  }
  console.log('file upload detected');

  if (!req.files || !req.files.file) {
    // File does not exist.
    console.error('could not find file in request');
    return res.sendStatus(400);
  }
  let file = req.files.file;

  message = {
    'fileName': file.name,
    'fileSize': file.size
  };
  handleMessage(message, 'file', id);

  fs.writeFile(upload_path + message.key + path.extname(file.name), file.data, (err) => {
    if (err) {
      console.log('error upload file');
      res.sendStatus(500);
      return;
    }

    // Successful file upload.
    // Now emit the file as a chat message.
    console.log('file uploaded');
    messageList.push(message);
    io.emit(data.new_message, message);
    return res.sendStatus(200);
  });
});

// handle sign in.
app.post(`/signIn`, (req, res) => {
  if (req.session.key !== undefined) {
    // this client is already signed in!
    // But okay. Let this client pass.
    // return res.sendStatus(200);
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
    if (!(validateIdLen(id) && validatePwLen(pw))) {
      // id or pw does not satisfy the requirements.
      return res.sendStatus(401);
    }
    clientDb.signIn(id, pw).then((value) => {
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
      // Oops, something is wrong...
      return res.sendStatus(500);
    }
    const id = idColonPw.split(':')[0];
    const pw = idColonPw.split(':')[1];

    if (validateIdLen(pw)) {
      // id does not satisfy the requirements.
      return res.status(401).send(`ID does not meet the requirements.`);
    }
    if (validatePwLen(pw)) {
      // pw does not satisfy the requirements.
      return res.status(401).send(`ID does not meet the requirements.`);
    }

    clientDb.signUp(id, pw, id, getSalt()).then((value) => {
      console.log(`new account created with the id:${id}`);
      return res.sendStatus(200);
    }).catch((value) => {
      console.log('sign up failed');
      return res.status(401).send((value.includes('UNIQUE') ? 'ID already exists!' : 'Sign up failed. Please try again later.'));
    });
  }
});

// Handle sign out.
app.post(`/signOut`, (req, res) => {
  res.cookie('signedIn', false, {
    httpOnly: false,
    maxAge: 0,
    secure: false
  });
  req.session.destroy((err) => {
    if (err) {
      // Error occured, nothing can be done here.
      console.error(`Error while destroying session`);
    }
    return res.sendStatus(200);
  });
});

// Handle request for user id.
// So there is no need to store user's id as a cookie on client side.
app.post(`/getMyId`, (req, res) => {
  if (req.session.key === undefined) {
    // Block this request. 
    return res.sendStatus(403);
  }
  const id = req.session.clientId;
  if (id === undefined) {
    // Key exists, but id does not.
    // Something is really wrong...
    console.error(`this client with key ${req.session.key} does not have id!`);
    return res.sendStatus(500);
  }
  return res.status(200).send(id);
});

app.post('/deleteAccount', (req, res) => {
  if (req.session.key === undefined) {
    // Block this request.
    return res.sendStatus(403);
  }
  const id = req.session.clientId;
  if (id === undefined) {
    // Key exists, but id does not.
    // Something is really wrong...
    // Therefore block this request.
    console.error(`this client with key ${req.session.key} doest not have id!`);
    return res.sendStatus(500);
  }
  const pw = req.body.password;
  if (pw === undefined) {
    // Block this request.
    return res.sendStatus(403);
  }
  clientDb.deleteClient(id, pw).then((value) => {
    // Succesfully deleted client.
    // Delete the id from the client list and emit.
    console.log(`Client ${id} deleted his/her own account`);
    clientList.delete(id);
    console.log(clientList);
    io.emit(data.full_client_list, Array.from(clientList));
    // Now make the client sign out.
    res.cookie('signedIn', false, {
      httpOnly: false,
      maxAge: 0,
      secure: false
    });
    req.session.destroy((err) => {
      if (err) {
        // Error occured, nothing can be done here.
        console.error(`Error while destroying session`);
      }
      return res.sendStatus(200);
    });
  }).catch((value) => {
    // TODO React to different errors.
    // I can improve this if I create an interface table.
    return res.status(401).send(value);
  });
});

// Handle change password.
app.post(`/changePassword`, (req, res) => {
  if (req.session.key === undefined) {
    // Block this request.
    return res.sendStatus(403);
  }
  const id = req.session.clientId;
  if (id === undefined) {
    // Key exists, but id does not.
    // Something is really wrong...
    // Therefore block this request.
    console.error(`this client with key ${req.session.key} doest not have id!`);
    return res.sendStatus(500);
  }
  const pw = req.body.password;
  const newPw = req.body.newPassword;
  if (pw === undefined || newPw === undefined) {
    // Bad request.
    console.error(`${id} wanted to change password but did not send pw or new pw.`);
    return res.sendStatus(403);
  }
  clientDb.changePassword(id, pw, newPw).then((value) => {
    if (value === true) {
      // Changed password successfully.
      return res.status(200).send(`Password has been changed successfully!`);
    }
    else {
      // This cannot be reached...
      return res.sendStatus(500);
    }
  }).catch((value) => {
    if (value === undefined) {
      // Unknown db error.
      return res.status(500).send(`Unknown server error. Please try again.`);
    }
    return res.status(403).send(value);
  });
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
  // Could not find the file with the key.
  console.log('could not find the file');
  return res.sendStatus(404);
});

// Start the server. listen to the port.
http.listen(data.back_port, () => {
  console.log(`listening on port num:${data.back_port}`);
});
