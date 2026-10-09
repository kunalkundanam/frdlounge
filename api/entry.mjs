import {createClient} from '@libsql/client/web';
import {databaseAdapter,initializeDatabase,hostedRequest} from '../server/hosted.mjs';
let database;
async function getDatabase(){
 if(!database){database=(async()=>{const client=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});await initializeDatabase(client);return databaseAdapter(client)})();database.catch(()=>{database=null})}return database;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN||!process.env.SESSION_SECRET){res.statusCode=503;res.end(JSON.stringify({error:'The hosted database is not configured yet.'}));return}
 try{
  const url=new URL(req.url,'https://'+req.headers.host),route=url.searchParams.get('route');
  if(route){url.pathname='/api/'+route;url.searchParams.delete('route')}
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
  let body;if(!['GET','HEAD'].includes(req.method)){if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000){res.statusCode=413;res.end();return}chunks.push(chunk)}body=Buffer.concat(chunks)}if(Buffer.byteLength(body)>16000){res.statusCode=413;res.end();return}}
  const response=await hostedRequest(new Request(url,{method:req.method,headers,body}),await getDatabase(),process.env.SESSION_SECRET);
  res.statusCode=response.status;for(const [key,value]of response.headers)res.setHeader(key,value);res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=503;res.end(JSON.stringify({error:'The room service is unavailable. Please try again.'}))}
}
