const express = require('express');
const path = require('path');
const port = process.env.PORT || 3002;
const hostname = 'localhost';
const { Server } = require('socket.io');
const { createServer } = require('node:http');
const app = express();
const server = createServer(app);
const io = new Server(server);
const usuarios = new Map(); 

const multer = require('multer');

const storage = multer.diskStorage({
  destination: './public/subidas/',
  filename: (req, file, cb) => {
    const nombreBase = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const nombreCompleto = nombreBase + extension;
    
    cb(null, nombreCompleto);
  }
});

const upload = multer({ storage });

app.post('/subidas', upload.single('file'), (req, res) => {
    res.sendFile(path.join(__dirname, '../public/subidas', req.file.filename));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

// app.use(express.static(path.join(__dirname, '/subidas')));


io.on('connection', (socket) => {
  socket.on("nombre", (datos) => {
    socket.nombreUsuario = datos.nombre;
    usuarios.set(socket.id, {
      nombre: datos.nombre,
      id: socket.id,
      photoURL: datos.photoURL // Asegurarnos de guardar la URL de la foto
    });
    
    console.log("Se ha conectado = " + datos.nombre);
    io.emit("nombre", { nombre: datos.nombre, id: socket.id });
    io.emit("usuariosConectados", Array.from(usuarios.values()));
    socket.emit("bienvenido", { nombre: datos.nombre, id: socket.id });
  });

  socket.on('escribiendo', (escribiendo) => {
    socket.broadcast.emit('escribiendo', {
      nombre: socket.nombreUsuario,
      escribiendo: escribiendo
    });
  });

  socket.on('mensaje', (datos) => {
    io.emit("mensaje", {
      ...datos,
      id: socket.id
    });
  });

  socket.on('archivo', (datos) => {
    io.emit('archivo', {
      ...datos,
      id: socket.id
    });
  });

  socket.on("imagen", (datos) => {
    io.emit("imagen", datos);
  });

  socket.on('mensajePrivado', (datos) => {
    const destinatario = datos.destinatario;
    // Solo emitir una vez al destinatario
    socket.to(destinatario).emit('mensajePrivado', {
        emisor: socket.id,
        destinatario: destinatario,
        mensaje: datos.mensaje
    });
    // No emitir de vuelta al emisor ya que el cliente ya muestra el mensaje localmente
  });
  

  socket.on('disconnect', () => {
    if (socket.nombreUsuario) {
      usuarios.delete(socket.id); 
      io.emit("seHaDesconectado", socket.nombreUsuario);
      io.emit("usuariosConectados", Array.from(usuarios.values()));
      numUsuarios--;
      console.log("Ahora hay " + numUsuarios + " usuarios conectados.");
    }
  });
});

server.listen(port, () => {
  console.log(`Run server on http://${hostname}:${port}`);
});