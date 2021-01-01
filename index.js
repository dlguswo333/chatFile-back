var app = require('express')();
var http = require('http').createServer(app);
var cors = require('cors');
var fs = require('fs');

app.use(cors());

const server_port = 8000;
const client_port = 3000

var messageList = [];

var io = require('socket.io')(http, {
  cors: {
    origin: `http://localhost:${client_port}`,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// app.get('/', (req, res) => {
//   res.send('<h1>Hello world</h1>');
// });

const handleMessage = (message) => {
  message.date = Date.now();
  message.key = message.userName + message.date;
  messageList.push(message);
}

io.on('connection', (socket) => {
  console.log('a client connected:socket id:' + socket.id);
  socket.emit('full message list', messageList);
  socket.on('chat message', (message) => {
    console.log('message: ' + message);
    handleMessage(message);
    io.emit('chat message', message);
  })
});

io.on('disconnection', (socket) => {
  console.log('a user disconnected:socket id:' + socket.id);
});

http.listen(server_port, () => {
  console.log(`listening on port num:${server_port}`);
});
