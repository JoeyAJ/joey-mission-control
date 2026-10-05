export const securityHeaders={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};

export function safeId(raw){let id;try{id=decodeURIComponent(raw);}catch{throw Object.assign(new Error('Bad identifier'),{status:400});}if(!/^[A-Za-z0-9_-]+$/.test(id))throw Object.assign(new Error('Bad identifier'),{status:400});return id;}
export async function readJson(req,limit=65536){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Object.assign(new Error('JSON content type required'),{status:415});let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Body too large'),{status:413});chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('JSON object required'),{status:400});return body;}

export function createRouter(deps){return async(req,res,url)=>{
  const method=req.method,pathname=url.pathname;
  if(method==='GET'&&pathname==='/api/health')return{status:200,body:{ok:true,loopback:true}};
  if(method==='GET'&&pathname==='/api/state')return{status:200,body:await deps.getState()};
  if(method==='GET'&&pathname==='/api/workspaces')return{status:200,body:await deps.getWorkspaces()};
  if(method==='GET'&&pathname==='/api/handoffs')return{status:200,body:await deps.getHandoffs()};
  let match;
  if(method==='GET'&&(match=pathname.match(/^\/api\/projects\/(.+)$/))){const project=await deps.getProject(safeId(match[1]));if(!project)throw Object.assign(new Error('Project not found'),{status:404});return{status:200,body:project};}
  if(method==='POST'&&pathname==='/api/inbox')return{status:201,body:await deps.createInbox(await readJson(req))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/inbox\/([^/]+)\/interpret$/)))return{status:200,body:await deps.interpretInbox(safeId(match[1]))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/inbox\/([^/]+)\/confirm$/)))return{status:200,body:await deps.confirmInbox(safeId(match[1]),await readJson(req))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/workspaces\/([^/]+)\/recheck$/)))return{status:200,body:await deps.recheck(safeId(match[1]))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/projects\/([^/]+)\/continue$/))){const body=await readJson(req);return{status:200,body:await deps.continueProject(safeId(match[1]),body.expectedContext||{})};}
  if(method==='POST'&&pathname==='/api/sessions')return{status:201,body:await deps.createSession(await readJson(req))};
  if(method==='PATCH'&&(match=pathname.match(/^\/api\/sessions\/([^/]+)$/)))return{status:200,body:await deps.updateSession(safeId(match[1]),await readJson(req))};
  return null;
};}
