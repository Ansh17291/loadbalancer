import http from 'http';

const PORT = 3003;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(` Handled by server on port ${PORT}`);
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
