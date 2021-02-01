# chatFile
**chatFile** has been made and will be made to communicate with your friends or yourself with *ease*.  
**chatFile** aims to help clients to chat via files as well as texts.  

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
    to host http back-end server.
  2. [socket.io](https://socket.io/)  
    to synchronize client's chat and server's chat real-time.
  3. [cors]
    to handle CORS policy.

## Version History
### 0.1.0
  🔲 Add client list
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