import * as fs from "fs";
import * as net from "net";
import * as zlib from "zlib";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    console.log(data.toString());
    const [requestLine, ...headerLines] = data.toString().split("\r\n");
    const [method, path, version] = requestLine.split(" ");

    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else if (path.startsWith("/echo/")) {
      const [_, echoPath] = path.split("/echo/");
      const body = headerLines[headerLines.length - 1];
      let headers = `Content-Type: text/plain\r\n`;
      const encoding = headerLines
        .filter((line) => line.startsWith("Accept-Encoding"))[0]
        ?.split(": ")[1];
      let compressedBody;
      if (encoding && encoding.indexOf("gzip") !== -1) {
        compressedBody = zlib.gzipSync(body);
        headers += `Content-Type: text/plain\r\nContent-Encoding: ${"gzip"}\r\nContent-Length: ${
          compressedBody ? compressedBody.length : echoPath.length
        }\r\n`;
      }
      console.log(headers);

      socket.write(
        `HTTP/1.1 200 OK\r\n${headers}\r\n${
          compressedBody ? compressedBody : echoPath
        }`
      );
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
    } else if (path.startsWith("/files/")) {
      const args = process.argv.slice(2);
      const [___, dir] = args;
      const [_, __, fileName] = path.split("/");
      const filePath = dir + fileName;

      if (method === "POST") {
        const body = headerLines[headerLines.length - 1];
        try {
          fs.writeFileSync(filePath, body);
          socket.write("HTTP/1.1 201 Created\r\n\r\n");
        } catch (e) {
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        }
      }

      try {
        const file = fs.readFileSync(filePath, "utf-8");
        if (file) {
          socket.write(
            `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${file.length}\r\n\r\n${file}`
          );
        } else {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
      } catch (e) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
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
