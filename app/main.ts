import * as fs from "fs";
import * as net from "net";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    console.log(data.toString());
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
        .filter((line) => line.startsWith("User-Agent"))[0]
        .split(": ")[1];
      console.log(
        headerLines
          .filter((line) => line.startsWith("User-Agent"))[0]
          .split(": ")[1]
      );
      const headers = `Content-Type: text/plain\r\nContent-Length: ${agent.length}\r\n`;
      socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n${agent}`);
    } else if (path.startsWith("/file/")) {
      const [_, fileName] = path.split("/file/");
      const [__, dir] = process.argv.slice(2);
      const filePath = `${dir}${fileName}`;
      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const headers = `Content-Type: application/octet-stream\r\nContent-Length: ${fileContent.length}\r\n`;
        socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n${fileContent}`);
      } catch (err) {
        socket.write(`HTTP/1.1 404 Not Found\r\n\r\n`);
      }
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
