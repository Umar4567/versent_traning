export default function handler(req, res) {
  res.json({ 
    path: req.url,
    pathname: new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname,
    method: req.method 
  });
}
