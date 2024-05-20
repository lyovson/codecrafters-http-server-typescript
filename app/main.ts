import * as fs from "fs";
import * as net from "net";
import * as zlib from "zlib";

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const [requestLine, ...headerLines] = data.toString().split("\r\n");
    const [method, path, version] = requestLine.split(" ");

    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else if (path.startsWith("/echo/")) {
      const echoPath = path.slice(6);
      const body = headerLines[headerLines.length - 1];
      let headers = `Content-Type: text/plain\r\n`;
      const acceptEncodingHeader = headerLines.find((line) =>
        line.startsWith("Accept-Encoding")
      );
      const encoding = acceptEncodingHeader
        ? acceptEncodingHeader.split(": ")[1]
        : "";
      let compressedBody;

      if (encoding && encoding.includes("gzip")) {
        compressedBody = zlib.gzipSync(body);
        headers += `Content-Encoding: gzip\r\nContent-Length: ${compressedBody.length}\r\n`;
      } else {
        headers += `Content-Length: ${Buffer.byteLength(echoPath)}\r\n`;
      }

      socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n`);
      socket.write(compressedBody || echoPath);
    } else if (path === "/user-agent") {
      const agent =
        headerLines
          .find((line) => line.startsWith("User-Agent"))
          ?.split(": ")[1] || "";

      const headers = `Content-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(
        agent
      )}\r\n`;
      socket.write(`HTTP/1.1 200 OK\r\n${headers}\r\n${agent}`);
    } else if (path.startsWith("/files/")) {
      const args = process.argv.slice(2);
      const dir = args[args.length - 1];
      const fileName = path.slice(7); // Extract the file name from the path
      const filePath = `${dir}/${fileName}`;

      if (method === "POST") {
        const body = headerLines[headerLines.length - 1];
        try {
          fs.writeFileSync(filePath, body);
          socket.write("HTTP/1.1 201 Created\r\n\r\n");
        } catch (e) {
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        }
      } else {
        try {
          const file = fs.readFileSync(filePath, "utf-8");
          if (file) {
            socket.write(
              `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${Buffer.byteLength(
                file
              )}\r\n\r\n${file}`
            );
          } else {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          }
        } catch (e) {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
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
