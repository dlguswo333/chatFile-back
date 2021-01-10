const app = require('express')();
const upload = require('express-fileupload');
const path = require('path');
const upload_path = './files/';
const http = require('http').createServer(app);
const cors = require('cors');
const fs = require('fs');
const data = require('./data.js').data;
const crypto = require('crypto');

app.use(cors());
app.use(upload());

var messageList = [];

var io = require('socket.io')(http, {
  cors: {
    origin: `http://localhost:${data.front_port}`,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// new client connected.
io.on(data.back_connect, (socket) => {
  console.log('a client connected:socket id:' + socket.id);
  socket.emit(data.full_message_list, messageList);
  socket.on(data.new_message, (message) => {
    console.log(data.new_message);
    handleMessage(message, 'text');
    messageList.push(message);
    io.emit(data.new_message, message);
  })
  // a client disconnected.
  socket.on(data.back_disconnect, (socket) => {
    console.log('a user disconnected:socket id:' + socket.id);
  });
});

const handleMessage = (message, type) => {
  message['type'] = type;
  message['date'] = Date.now();
  message['key'] = crypto.createHash('sha256').update(message.userName + message.date).digest('hex');
}

// start the server. listen to the port.
http.listen(data.back_port, () => {
  console.log(`listening on port num:${data.back_port}`);
});

// handle file upload.
app.post('/files', (req, res) => {
  console.log('file upload detected');
  let file = req.files.file;
  if (file.size > data.max_file_size) {
    console.log('reject upload: too big file size');
    res.sendStatus(500);
    return;
  }

  message = {
    'userName': req.body.userName,
    'fileName': file.name,
    'fileSize': file.size
  };
  handleMessage(message, 'file');

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

// handle file download.
app.get(`/files/:key`, (req, res) => {
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
