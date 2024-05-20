import * as net from "net";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const [requestLine, ...headerLines] = data.toString().split("\r\n");
    const [method, path, version] = requestLine.split(" ");
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else if (path.startsWith("/echo/")) {
      const [_, echoPath] = path.split("/echo/");
      const headers = `Content-Type: text/plain\r\nContent-Length: ${echoPath.length}\r\n`;
      socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n${echoPath}`);
    } else if (path === "/user-agent") {
      const agent = headerLines
        .map((line) => line.split(": "))
        .filter((line) => line[0] === "User-Agent")
        .flat()[1];
      const headers = `Content-Type: text/plain\r\nContent-Length: ${agent.length}\r\n`;
      socket.write(`HTTP/1.1 200 OK\r\n\${headers}r\n${agent}`);
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }

    socket.end();
  });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
