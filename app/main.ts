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
    Buffer.from("")
  );

// Handler for the echo path
const handleEcho = (path: string, headerLines: string[]) => {
  const echoPath = path.slice(6);
  const encoding = getHeader(headerLines, "Accept-Encoding");
  const body = Buffer.from(echoPath, "utf-8");
  const compressedBody = encoding.includes("gzip") ? zlib.gzipSync(body) : null;

  const headers = {
    "Content-Type": "text/plain",
    ...(compressedBody
      ? {
          "Content-Encoding": "gzip",
          "Content-Length": compressedBody.length.toString(),
        }
      : { "Content-Length": body.length.toString() }),
  };

  return createResponse(200, headers, compressedBody || body);
};

// Handler for the user-agent path
const handleUserAgent = (headerLines: string[]) => {
  const userAgent = getHeader(headerLines, "User-Agent");
  const body = Buffer.from(userAgent, "utf-8");
  const headers = {
    "Content-Type": "text/plain",
    "Content-Length": body.length.toString(),
  };
  return createResponse(200, headers, body);
};

// Handler for the files path
const handleFiles = (path: string, method: string, headerLines: string[]) => {
  const args = process.argv.slice(2);
  const dir = args[args.length - 1];
  const fileName = path.slice(7);
  const filePath = `${dir}/${fileName}`;

  if (method === "POST") {
    const body = Buffer.from(headerLines[headerLines.length - 1], "utf-8");
    return safeFileOperation(() => {
      fs.writeFileSync(filePath, body);
      return createResponse(
        201,
        { "Content-Type": "text/plain", "Content-Length": "0" },
        Buffer.from("")
      );
    }, 500);
  }

  return safeFileOperation(() => {
    const file = fs.readFileSync(filePath);
    const headers = {
      "Content-Type": "application/octet-stream",
      "Content-Length": file.length.toString(),
    };
    return createResponse(200, headers, file);
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
      Buffer.from("")
    );
  }
};

// Helper function to create an HTTP response
const createResponse = (
  statusCode: number,
  headers: Record<string, string>,
  body: Buffer
) => {
  const headerString = `HTTP/1.1 ${statusCode} ${getStatusMessage(
    statusCode
  )}\r\n${createHeaders(headers)}\r\n\r\n`;
  return Buffer.concat([Buffer.from(headerString, "utf-8"), body]);
};

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
          Buffer.from("")
        );

  socket.write(response);
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
