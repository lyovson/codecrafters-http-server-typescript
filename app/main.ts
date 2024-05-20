import * as net from "net";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString().split("\r\n")[0].split(" ")[1];
    socket.write(
      request === "/"
        ? "HTTP/1.1 200 OK\r\n\r\n"
        : "HTTP/1.1 400 Not Found\r\n\r\n"
    );
    socket.end();
  });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
