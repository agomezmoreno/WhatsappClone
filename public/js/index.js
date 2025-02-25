        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
        import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
        import { firebaseConfig } from'./firebase.js'; 

        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        let miNombre = '';
        let miId = ''; 
        let chatPrivadoActual = null;
        const chatsPrivados = new Map();
        
        window.onload = () => {
            const socket = io();
            const btnEnviar = document.getElementById('enviar');
            const mensajeInput = document.getElementById('mensaje');
            const mensajesContainer = document.createElement('ul');
            const btnEnviarImagen = document.getElementById('file-upload');
            const loginBtn = document.getElementById('login');
            const chatContainer = document.querySelector('.chat-container');
            const btnLogout = document.getElementById('btnLogout');
            
            document.querySelector('.mensajes').appendChild(mensajesContainer);
            
            loginBtn.addEventListener('click', login);
            
            function login() {
                signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    miNombre = user.displayName || user.email;
                    document.querySelector('.chat-container').style.display = 'block';
                    document.querySelector('.login-container').style.display = 'none';

                    // Reconectar el socket si está desconectado
                    if (!socket.connected) {
                        socket.connect();
                    }

                    // Mostrar la foto de perfil inmediatamente después del login
                    const profileAvatar = document.getElementById('profile-avatar');
                    
                    const img = document.createElement('img');
                    img.src = user.photoURL;
                    img.width = 50;
                    img.style.borderRadius = '50%';
                    profileAvatar.appendChild(img);

                    // Emitir el evento de conexión al socket con un objeto que incluya la foto
                    socket.emit('nombre', {
                        nombre: miNombre,
                        id: socket.id,
                        photoURL: user.photoURL
                    });
                    miId = socket.id;
                }).catch((error) => {
                    console.error("Error en login:", error);
                });
            }

            function cerrarSesion() {
                signOut(auth)
                    .then(() => {
                        // Limpiar el estado
                        miNombre = '';
                        miId = '';
                        chatPrivadoActual = null;
                        
                        // Limpiar la interfaz
                        document.querySelector('.chat-container').style.display = 'none';
                        document.querySelector('.login-container').style.display = 'block';
                        
                        // Limpiar el contenedor de avatar
                        const profileAvatar = document.getElementById('profile-avatar');
                        profileAvatar.innerHTML = '';
                        
                        // Desconectar el socket si es necesario
                        socket.disconnect();
                    })
                    .catch((error) => {
                        console.error("Error al cerrar sesión:", error);
                    });
            }

            const enviarMensaje = () => {
                socket.emit('mensaje', {
                    nombre: miNombre,
                    mensaje: mensajeInput.value
                });
                mensajeInput.value = '';
            };
                    
            btnEnviarImagen.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);
                
                fetch('/subidas', {
                    method: 'POST',
                    body: formData 
                })
                .then(() => {
                    if (file.type.startsWith('image/')) {
                        // Si es una imagen
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.width = 200;
                        
                        socket.emit('archivo', {
                            nombre: miNombre,
                            url: img.src,
                            tipo: 'imagen',
                            nombreArchivo: file.name
                        });
                    } else {
                        // Si es otro tipo de archivo
                        socket.emit('archivo', {
                            nombre: miNombre,
                            tipo: 'archivo',
                            nombreArchivo: file.name,
                            extension: file.name.split('.').pop()
                        });
                    }
                })
                .catch(error => console.error('Error:', error));
            });


            socket.on('archivo', (datos) => {
                const li = document.createElement('li');
                if (datos.id === miId) {
                    li.classList.add('enviado');
                }

                const nombreDiv = document.createElement('div');
                nombreDiv.className = 'mensaje-nombre';
                nombreDiv.textContent = datos.nombre;
                li.appendChild(nombreDiv);

                if (datos.tipo === 'imagen') {
                    const img = document.createElement('img');
                    img.src = datos.url;
                    img.className = 'mensaje-imagen';
                    li.appendChild(img);
                } else {
                    const link = document.createElement('a');
                    link.href = `/subidas/${datos.nombreArchivo}`;
                    link.className = 'mensaje-archivo';
                    link.download = datos.nombreArchivo;
                    
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-file';
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'mensaje-archivo-info';
                    
                    const nombreArchivo = document.createElement('span');
                    nombreArchivo.className = 'mensaje-archivo-nombre';
                    nombreArchivo.textContent = datos.nombreArchivo;
                    
                    const extension = document.createElement('span');
                    extension.className = 'mensaje-archivo-extension';
                    extension.textContent = datos.extension.toUpperCase();
                    
                    infoDiv.appendChild(nombreArchivo);
                    infoDiv.appendChild(extension);
                    
                    link.appendChild(icon);
                    link.appendChild(infoDiv);
                    li.appendChild(link);
                }

                mensajesContainer.appendChild(li);
                mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
            });

            socket.on("usuariosConectados", (usuarios) => {                
                const usuariosUl = document.getElementById('usuariosConectados');
                usuariosUl.innerHTML = '';
            
                usuarios.forEach(usuario => {
                    const li = document.createElement('li');
                    const userChatItem = document.createElement('div');
                    userChatItem.className = 'user-chat-item';
            
                    const avatar = document.createElement('img');
                    avatar.src = usuario.photoURL || 'img/avatar.png';
                    avatar.className = 'user-avatar';
            
                    const nombre = document.createElement('span');
                    nombre.textContent = usuario.nombre;
            
                    userChatItem.appendChild(avatar);
                    userChatItem.appendChild(nombre);
                    li.appendChild(userChatItem);
                    li.dataset.userId = usuario.id;
                    usuariosUl.appendChild(li);
                    li.addEventListener('click', () => iniciarChatPrivado(usuario));
                });
            });
            
            // Función para manejar chats privados
            function iniciarChatPrivado(usuario) {
                chatPrivadoActual = usuario.id;
                
                // Crear o mostrar ventana de chat
                let chatWindow = document.getElementById(`chat-${usuario.id}`);
                if (!chatWindow) {
                    chatWindow = document.createElement('div');
                    chatWindow.id = `chat-${usuario.id}`;
                    chatWindow.className = 'chat-privado';
                    
                    chatWindow.innerHTML = `
                        <div class="chat-privado-header">
                            <img src="${usuario.photoURL || 'img/default-avatar.png'}" class="chat-privado-avatar">
                            <span>${usuario.nombre}</span>
                            <button class="cerrar-chat" onclick="this.parentElement.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="chat-privado-mensajes"></div>
                        <div class="chat-privado-input">
                            <input type="text" placeholder="Escribe un mensaje">
                            <button>
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    `;
                    
                    document.body.appendChild(chatWindow);
                    
                    const input = chatWindow.querySelector('input');
                    const btnEnviar = chatWindow.querySelector('button');
                    
                    btnEnviar.addEventListener('click', () => enviarMensajePrivado(input, usuario.id));
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            enviarMensajePrivado(input, usuario.id);
                        }
                    });
                }
            }

            function enviarMensajePrivado(input, destinatarioId) {
                if (input.value.trim()) {
                    const mensaje = {
                        destinatario: destinatarioId,
                        mensaje: input.value,
                        emisor: miId 
                    };
                    
                    socket.emit('mensajePrivado', mensaje);
                    
                    mostrarMensajePrivado({
                        emisor: miId,
                        mensaje: input.value,
                        destinatario: destinatarioId
                    });
                    
                    input.value = '';
                }
            }

            function mostrarMensajePrivado(datos) {
                const chatId = datos.emisor === miId ? datos.destinatario : datos.emisor;
                const chatWindow = document.getElementById(`chat-${chatId}`);
                if (chatWindow) {
                    const mensajesDiv = chatWindow.querySelector('.chat-privado-mensajes');
                    const mensaje = document.createElement('div');
                    mensaje.className = `mensaje-privado ${datos.emisor === miId ? 'enviado' : 'recibido'}`;
                    mensaje.textContent = datos.mensaje;
                    mensajesDiv.appendChild(mensaje);
                    mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
                }
            }

            // Añadir el listener para mensajes privados
            socket.on('mensajePrivado', (datos) => {
                // Si es un mensaje entrante
                if (datos.emisor !== miId) {
                    // Buscar al usuario en la lista de usuarios conectados
                    const usuariosConectados = Array.from(document.getElementById('usuariosConectados').children);
                    const usuarioEmisor = usuariosConectados.find(li => li.dataset.userId === datos.emisor);
                    
                    if (usuarioEmisor) {
                        const usuario = {
                            id: datos.emisor,
                            nombre: usuarioEmisor.querySelector('span').textContent,
                            photoURL: usuarioEmisor.querySelector('img').src
                        };
                        // Crear ventana si no existe
                        let chatWindow = document.getElementById(`chat-${datos.emisor}`);
                        if (!chatWindow) {
                            iniciarChatPrivado(usuario);
                        }
                    }
                }

                // Mostrar el mensaje en la ventana correspondiente
                mostrarMensajePrivado(datos);
            });

            socket.on("bienvenido", (datos) => {
                const profileAvatar = document.getElementById('profile-avatar');
                miId = datos.id; // Guardar mi ID
                
                // mostrar imagen
                const img = document.createElement('img');
                img.src = auth.currentUser.photoURL;
                img.width = 50;
                img.style.borderRadius = '50%'; 
                profileAvatar.appendChild(img);

                // botón para cerrar sesión
                const cerrarSesionBtn = document.createElement('button');
                cerrarSesionBtn.textContent = 'Cerrar sesión';
                cerrarSesionBtn.addEventListener('click', cerrarSesion);
                profileAvatar.appendChild(cerrarSesionBtn);
            });

            btnEnviar.addEventListener('click', enviarMensaje);
            mensajeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    enviarMensaje();
                }
            });

            btnLogout.addEventListener('click', cerrarSesion);

            socket.on("nombre", (datos) => {
                if (datos && datos.nombre) {
                    const li = document.createElement('li');
                    li.classList.add('sistema');
                    li.innerHTML = `
                        <i class="fas fa-user-plus"></i>
                        <span>${datos.nombre}</span> se unió al grupo
                    `;
                    mensajesContainer.appendChild(li);
                    mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
                }
            });

            socket.on('mensaje', (datos) => {
                const li = document.createElement('li');
                if (datos.id === miId) {
                    li.classList.add('enviado');
                }
                
                const nombreDiv = document.createElement('div');
                nombreDiv.className = 'mensaje-nombre';
                nombreDiv.textContent = datos.nombre;
                
                const contenidoDiv = document.createElement('div');
                contenidoDiv.className = 'mensaje-contenido';
                contenidoDiv.textContent = datos.mensaje;
                
                li.appendChild(nombreDiv);
                li.appendChild(contenidoDiv);
                mensajesContainer.appendChild(li);
                mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
            });

            let timeoutId;
            mensajeInput.addEventListener('input', () => {
                socket.emit('escribiendo', true);
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                timeoutId = setTimeout(() => {
                    socket.emit('escribiendo', false);
                }, 1000);
            });

            const escribiendoLi = document.createElement('p');
            mensajesContainer.appendChild(escribiendoLi);
            socket.on('escribiendo', (datos) => {
                escribiendoLi.textContent = datos.escribiendo ? 
                    `${datos.nombre} está escribiendo...` : '';
            });
        }


        