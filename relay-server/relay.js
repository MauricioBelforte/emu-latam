const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const RELAY_PORT = 55435;
const EMULATOR_PORT = 55434;

console.log("\n[SISTEMA] Iniciando RADAR DE DIAGNÓSTICO...");

server.on('error', (err) => {
    console.error(`[ERROR CRÍTICO] No se pudo abrir el puerto: ${err.message}`);
    process.exit(1);
});

server.on('message', (msg, rinfo) => {
    // ESTO DEBE APARECER SI ALGO LLEGA
    console.log(`\n[!!!] PAQUETE DETECTADO [!!!]`);
    console.log(`ORIGEN: ${rinfo.address}:${rinfo.port}`);
    console.log(`TAMAÑO: ${msg.length} bytes`);
    
    // Lógica de puente simple
    if (rinfo.port === EMULATOR_PORT) {
        console.log("-> Viene del HOST LOCAL");
    } else {
        console.log("-> Viene de AFUERA (Client/Internet)");
        // Intentar mandar al host local para despertar al emulador
        server.send(msg, EMULATOR_PORT, '127.0.0.1', (err) => {
            if (err) console.error("Error al redirigir al host:", err);
            else console.log("=> Redirigido con éxito al puerto 55434");
        });
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log("==================================================");
    console.log("      EMU-LATAM: RADAR DE DIAGNÓSTICO (V4)       ");
    console.log("==================================================");
    console.log(`1. ESCUCHANDO EN: 0.0.0.0:${address.port}`);
    console.log(`2. REDIRIGIENDO A: 127.0.0.1:${EMULATOR_PORT}`);
    console.log("--------------------------------------------------");
    console.log("SI NO VES NADA AL ABRIR EL JUEGO:");
    console.log("- Revisa que el Firewall de Windows no bloquee UDP");
    console.log("- Revisa que la ROM kof98 carge realmente");
    console.log("==================================================\n");
});

// Forzamos el bind a todas las interfaces
server.bind(RELAY_PORT, '0.0.0.0');
