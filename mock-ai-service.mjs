/** Intevoris assessment fixture. No packages, API keys or external calls. */
import http from 'node:http';
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const seen = new Map(); // Per saved enquiry ID; reset when this process restarts.
const categories = message => {
  const clean = message.replace(/\[(?:FAIL|INVALID)_ONCE\]/g, '').toLowerCase();
  if (/\b(invoice|billing|payment|refund|charged)\b/.test(clean)) return 'Billing';
  if (/\b(login|broken|error|support|bug|password)\b/.test(clean)) return 'Support';
  if (/\b(pricing|price|buy|purchase|quote|sales|demo)\b/.test(clean)) return 'Sales';
  return 'Other';
};
function send(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req,res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && path === '/health') return send(res,200,{status:'ok'});
  if (path !== '/categorize') return send(res,404,{error:'Not found'});
  if (req.method !== 'POST') {res.setHeader('Allow','POST'); return send(res,405,{error:'Use POST'});}
  if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return send(res,415,{error:'Use application/json'});
  try {
    let raw = ''; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 65536) {send(res,413,{error:'Request too large'}); return;}
      raw += chunk.toString('utf8');
    }
    let body;
    try {body=JSON.parse(raw);} catch {return send(res,400,{error:'Invalid JSON'});}
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        typeof body.enquiryId !== 'string' || !body.enquiryId.trim() || body.enquiryId.length > 200 ||
        typeof body.message !== 'string' || !body.message.trim() || body.message.length > 10000)
      return send(res,400,{error:'Provide nonblank enquiryId (max 200) and message (max 10000) strings'});
    const {enquiryId,message} = body;
    const first = !seen.has(enquiryId);
    seen.set(enquiryId,true);
    if (first && message.includes('[FAIL_ONCE]')) return send(res,503,{error:'Simulated temporary failure. Retry with the same enquiryId.'});
    if (first && message.includes('[INVALID_ONCE]')) return send(res,200,{category:'Unexpected'});
    return send(res,200,{category:categories(message)});
  } catch { if (!res.headersSent) send(res,500,{error:'Mock service request failed'}); }
});
server.on('error', error => {console.error(`Cannot start mock service: ${error.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Mock AI: http://127.0.0.1:${port}/categorize (POST); keep this terminal open.`));
