import * as fs from "fs";
import * as net from "net";
import * as zlib from "zlib";

// Helper function to parse HTTP request
const parseHttpRequest = (data: Buffer) => {
  const [requestLine, ...headerLines] = data.toString().split("\r\n");
  const [method, path, version] = requestLine.split(" ");
  return { method, path, version, headerLines };
};

// Helper function to get a specific header
const getHeader = (headerLines: string[], headerName: string) =>
  headerLines
    .find((line) =>
      line.toLowerCase().startsWith(`${headerName.toLowerCase()}:`)
    )
    ?.split(": ")[1] || "";

// Helper function to create HTTP headers
const createHeaders = (headers: Record<string, string>) =>
  Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n");

// Handler for the root path
const handleRoot = () =>
  createResponse(
    200,
    { "Content-Type": "text/plain", "Content-Length": "0" },
    ""
  );

// Handler for the echo path
const handleEcho = (path: string, headerLines: string[]) => {
  const echoPath = path.slice(6);
  const body = headerLines[headerLines.length - 1];
  const encoding = getHeader(headerLines, "Accept-Encoding");
  const compressedBody = encoding.includes("gzip")
    ? zlib.gzipSync(echoPath)
    : null;

  const headers = {
    "Content-Type": "text/plain",
    "Content-Encoding": compressedBody ? "gzip" : undefined,
    "Content-Length": compressedBody
      ? compressedBody.length.toString()
      : Buffer.byteLength(echoPath).toString(),
  };

  return createResponse(200, headers, compressedBody || Buffer.from(echoPath));
};

// Handler for the user-agent path
const handleUserAgent = (headerLines: string[]) => {
  const userAgent = getHeader(headerLines, "User-Agent");
  const headers = {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(userAgent).toString(),
  };
  return createResponse(200, headers, Buffer.from(userAgent));
};

// Handler for the files path
const handleFiles = (path: string, method: string, headerLines: string[]) => {
  const args = process.argv.slice(2);
  const dir = args[args.length - 1];
  const fileName = path.slice(7);
  const filePath = `${dir}/${fileName}`;

  if (method === "POST") {
    const body = headerLines[headerLines.length - 1];
    return safeFileOperation(() => {
      fs.writeFileSync(filePath, body);
      return createResponse(
        201,
        { "Content-Type": "text/plain", "Content-Length": "0" },
        ""
      );
    }, 500);
  }

  return safeFileOperation(() => {
    const file = fs.readFileSync(filePath, "utf-8");
    const headers = {
      "Content-Type": "application/octet-stream",
      "Content-Length": Buffer.byteLength(file).toString(),
    };
    return createResponse(200, headers, Buffer.from(file));
  }, 404);
};

// Helper function to safely perform file operations and handle errors
const safeFileOperation = (operation: () => string, errorCode: number) => {
  try {
    return operation();
  } catch {
    return createResponse(
      errorCode,
      { "Content-Type": "text/plain", "Content-Length": "0" },
      ""
    );
  }
};

// Helper function to create an HTTP response
const createResponse = (
  statusCode: number,
  headers: Record<string, string>,
  body: string | Buffer
) =>
  `HTTP/1.1 ${statusCode} ${getStatusMessage(statusCode)}\r\n${createHeaders(
    headers
  )}\r\n\r\n` + body.toString();

// Helper function to get status message
const getStatusMessage = (statusCode: number) => {
  const statusMessages: Record<number, string> = {
    200: "OK",
    201: "Created",
    404: "Not Found",
    500: "Internal Server Error",
  };
  return statusMessages[statusCode] || "Unknown Status";
};

// Main request handler
const requestHandler = (socket: net.Socket) => (data: Buffer) => {
  const { method, path, headerLines } = parseHttpRequest(data);

  const response =
    path === "/"
      ? handleRoot()
      : path.startsWith("/echo/")
      ? handleEcho(path, headerLines)
      : path === "/user-agent"
      ? handleUserAgent(headerLines)
      : path.startsWith("/files/")
      ? handleFiles(path, method, headerLines)
      : createResponse(
          404,
          { "Content-Type": "text/plain", "Content-Length": "0" },
          ""
        );

  socket.write(response, "binary");
  socket.end();
};

// Server setup
const server = net.createServer((socket) => {
  socket.on("data", requestHandler(socket));
});

// Debugging log
console.log("Logs from your program will appear here!");

// Start server
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
