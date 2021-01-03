var app = require('express')();
var http = require('http').createServer(app);
var cors = require('cors');
var fs = require('fs');
const data = require('./data.js').data;


app.use(cors());


var messageList = [];

var io = require('socket.io')(http, {
  cors: {
    origin: `http://localhost:${data.front_port}`,
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

io.on(data.back_connect, (socket) => {
  console.log('a client connected:socket id:' + socket.id);
  socket.emit(data.full_message_list, messageList);
  socket.on(data.new_message, (message) => {
    console.log(data.new_message + message);
    handleMessage(message);
    io.emit(data.new_message, message);
  })
});

io.on(data.disconnection, (socket) => {
  console.log('a user disconnected:socket id:' + socket.id);
});

http.listen(data.back_port, () => {
  console.log(`listening on port num:${data.back_port}`);
});
