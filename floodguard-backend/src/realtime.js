import { Server } from 'socket.io';


export function attachRealtime(httpServer, corsOrigin) {
const io = new Server(httpServer, {
cors: { origin: corsOrigin }
});


io.on('connection', (socket) => {
console.log('🔌 client connected', socket.id);
socket.emit('server:ready', { ok: true, ts: Date.now() });
});


return io;
}