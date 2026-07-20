import net from "net"

export function isPortInUse(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once("error", (err: NodeJS.ErrnoException) => {
      resolve(err.code === "EADDRINUSE")
    })
    server.once("listening", () => {
      server.close()
      resolve(false)
    })
    server.listen(port, host)
  })
}

export async function assertPortFree(port: number): Promise<void> {
  const inUse = await isPortInUse(port)
  if (inUse) throw new Error(`El puerto ${port} ya está en uso`)
}
