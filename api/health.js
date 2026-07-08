export default function handler(req, res) {
  res.status(200).json({ status: 'OK', service: 'Text Generation API', timestamp: new Date().toISOString() });
}
