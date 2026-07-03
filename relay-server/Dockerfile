# Dockerfile para Servidor Relay Emu Latam (V2)
# Basado en netplay_mitm_server de RetroArch

FROM debian:bullseye-slim as builder

# Instalar dependencias de compilación
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 1. Clonar y compilar netplay_mitm_server
RUN git clone --depth 1 https://github.com/libretro/RetroArch.git
WORKDIR /build/RetroArch/network/netplay
RUN gcc -O3 netplay_mitm_server.c -o netplay_mitm_server -lpthread

# 2. Descargar agente de playit.gg
WORKDIR /build
RUN curl -Lo playit https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-amd64 && \
    chmod +x playit

# Imagen final ligera
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/RetroArch/network/netplay/netplay_mitm_server .
COPY --from=builder /build/playit .
COPY start_relay.sh .

RUN chmod +x start_relay.sh

# El puerto por defecto para MITM es 55435 (UDP)
EXPOSE 55435/udp

# Ejecutar el script de inicio
ENTRYPOINT ["./start_relay.sh"]
