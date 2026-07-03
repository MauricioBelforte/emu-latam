const dgram = require('dgram');

console.log("-----------------------------------------");
console.log("INICIANDO PRUEBA SINTETICA DE UDP (FASE 1)");
console.log("-----------------------------------------");

// Prueba 1: Loopback interno (Node a Node, nuevo puerto) para descartar bloqueo a nivel SO o Node.js 
const testServer = dgram.createSocket('udp4');
testServer.on('error', (err) => {
    console.error(`[ERROR TEST 1] El servidor de prueba fallo: ${err.message}`);
    testServer.close();
});

testServer.on('message', (msg, rinfo) => {
    console.log(`✅ [TEST 1 OK] Loopback interno funciona. El sistema operativo permite UDP local. (Recibido: ${msg.toString()})`);
    testServer.close();
});

testServer.bind(55444, '127.0.0.1', () => {
    const client = dgram.createSocket('udp4');
    client.send('Test internally', 55444, '127.0.0.1', (err) => {
        if (err) console.error("❌ [ERROR TEST 1] No se pudo enviar paquete interno:", err);
        client.close();
    });
});

// Prueba 2: Enviar al Relay del usuario (55435)
setTimeout(() => {
    const client2 = dgram.createSocket('udp4');
    console.log("👉 [TEST 2] Enviando paquete UDP de diagnostico (HOLA_RELAY) al puerto 55435 (El Relay que tienes abierto)...");
    
    client2.send('HOLA_RELAY', 55435, '127.0.0.1', (err) => {
        if (err) {
            console.error("❌ [ERROR TEST 2] Falla al enviar al relay:", err);
        } else {
            console.log("✅ [TEST 2 COMPLETADO] Paquete enviado.");
            console.log("⚠️ REVISA LA VENTANA NEGRA DE TU RELAY AHORA MISMO.");
            console.log("Si el Relay (V4) NO dice '[!!!] PAQUETE DETECTADO [!!!]', significa que Windows Firewall esta bloqueando agresivamente el proceso node.exe o el puerto 55435.");
        }
        client2.close();
    });
}, 500);
