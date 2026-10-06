import http from 'node:http';
import {createApp} from '../../src/server.mjs';
import {productionResponse} from '../../api/index.mjs';
const localHandler=createApp({});
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/')){const result=productionResponse(req.method,new URL('https://fixture/api/index?route='+u.pathname.slice(5)));res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result.body));return;}return localHandler(req,res);}catch{res.writeHead(404);res.end('Not found');}}).listen(4353,'127.0.0.1');
