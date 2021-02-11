# chatFile
![logo192.png](/img/logo192.png)
<br>

![front_1.png](/img/front_1.png)
<br>

**chatFile** has been made and will be made to communicate with your friends or yourself with *ease*.  
**chatFile** aims to help chat with files as well as texts.  
<br>

**chatFile** has the following features:
<br>
* Chat with texts.
* Share files.
* Authorization e.g. sign up, sign in, and sign out.
* Store user ids and passwords. Passwords are stored being encrypted.
* Remember client sessions.
* Show connected client list.
* Show toast messages.
<br>

The repository you are seeing is the back-end side repository.  

You can find the back-end side Github repository at [here](https://github.com/dlguswo333/chatFile_front).  

# How to Install chatFile
  1. Download the front-end and back-end repositories.
  2. Go to the directory of the back-end and start it by typing:
  ```bash
  npm start
  ```
  3. Likewise, go to the directory of the front-end and start it by typing:
  ```bash
  npm start
  ```
  or build into production and serve them on any web service framwork you like. one example is ``serve`` in npm. 
  4. The front-end will communicate automatically if any client accesses the web page.

# chatFile (Back-end side)
**chatFile** back-end side will communicate with the front-side web to receive, process, and send clients' chats.
## Dependencies
**chatFile** front-end side is powered with the following dependencies:
  1. [Express](https://expressjs.com/)
    <br>
    to host http back-end server.
  2. [socket.io](https://socket.io/)
    <br>
    to synchronize client's chat and server's chat real-time.
  3. [Express-session](https://www.npmjs.com/package/express-session)
    <br>
    to remember signed in clients' sessions.
  4. [sqlite3](https://github.com/mapbox/node-sqlite3)
    <br>
    to store clients' information.
<br>

... and many other gerat modules!

## Version History
### 0.1.0
  ✅ Add client list
  <br>
  ✅ Add SQLite database to store user informations
  <br>
  ✅ Add sign up feature
  <br>
  ✅ Add sign in feature
  <br>
  ✅ Add chat with file feature
  <br>
  ✅ Add chat with text feature
<br>

**chatFile** logos were generated from https://favicon.io/.
<br>

## How chatFile back-end has been implemented

### Express http Server
Thanks to javascript's asynchronous functions, ``Express`` is a web server framework
which is IO intensive specialized, and one example of such IO intensive servers is a chat app.
<br>

**chatFile** consists of two apps:back-end server, and front-end server.<br>
As the names state, this back-end server stores clients' information, messages, uploaded files,<br>
and reacts to the front-end side. The front-end requests with appropriate data at the appropriate router(path).<br>
```js
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
      return res.sendStatus(200);
    }
    res.sendStatus(200);
  });
});
```
Let's look at this example. The server's ``/signOut`` endpoint(path) answers to the POST request.<br>
If a request comes in, the server will set ``signedIn`` cookie's lifetime to zero
(which is going to be deleted instantly), and then destroys the client's session.
<br>

### Chat with Messages
**chatFile** uses ``socket.io`` to synchronize across clients real-time.<br>
``socket.io`` is an event-based websocket module, so the server detects every event that occurs real-time,
and does the job done.<br>
If a client connects, the server sends all the messages, and waits for the client to send or receive.<br>
Every message should have its own contents and contexts, such as date, message type, sender's id and so on.<br>
Therefore when the server receives a message from a client, at that time, the message is mere contents.<br>
It is the server's job to attach date, sender's id, and such contexts.<br>
If the message has been processed successfully, the message is appended at the end of the message list,
and then broadcasted.<br>
Currently, **chatFile** stores messages in volatile memory, so the messages will vanish if the app closes.<br>
<br>

### Chat with Files
**chatFile** also provides clients with the file share feature.<br>
files are viewed and shared in a shape of a message,
but actually files are not delivered with ``socket.io``.
They come with asynchronous request module ``axios``.<br>
If a client uploads a file, the front-end bundles the file in a form data,
and send the form data to the corresponding path for file upload.<br>
Thanks to ``axios``'s extensive feature support, **chatFile** could present the client 
with the upload completion process percentage with ``onUploadProgress`` callback easily.
<br>

### Client authentication
**chatFile** authenticate clients with ``Express-session``.<br>
``Express-session`` is a middleware that creates a session of each client connected.<br>
Every client has a unique session id and ``Express-session`` uses those ids to identify client sessions.<br>
Also, a session can have user-defined objects or varialbes within itself.<br>
It is a useful feature of ``Express-session`` since when a request comes in,<br>
the server can reference the request's unique objects without any complicated codes.<br>
Also, it is useful to authorize only to clients who signed in.<br>
```js
clientDb.signIn(id, pw).then((value) => {
      console.log('sign in result:', value);
      if (value === true) {
        // sign in succeeded.
        req.session.key = generateKey();
        req.session.clientId = id;
        res.cookie('signedIn', true, {
          httpOnly: false,
          maxAge: data.max_age,
          secure: false
        });
        res.sendStatus(200);
      }
```
The above code snippet illustrates how sign in works in **chatFile**.<br>
``clientDb`` is a module for dealing with client information databse.<br>
If ``clientDb.signIn()`` returns true for the given id and pw,
the session will have ``key`` and ``clientId``.<br>
That is how client authentication works in **chatFile**.
If the request session does not have a valid key, the server will reject the request.
```js
app.post('/files', (req, res) => {
  const key = req.session.key;
  const id = req.session.clientId;
  if (key === undefined) {
    // block this upload.
    return res.sendStatus(403);
  }
```
Like this.
<br>

Since the session object is stored only in back-end side, client cannot see or
modify the session, so the session-based client authentication is as safe as
the server machine.
<br>

**chatFile** also uses ``session-file-store`` module to store client sessions on disk drive.<br>
This way the server will keep the session data across the server app restarts.
<br>

### Client DataBase
