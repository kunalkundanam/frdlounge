import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {handleApi} from './api.mjs';

export function databaseAdapter(client){return{prepare(sql){let args=[];return{bind(...values){args=values;return this},async first(){return (await client.execute({sql,args})).rows[0]||null},async run(){return{meta:{changes:(await client.execute({sql,args})).rowsAffected}}},async all(){return{results:(await client.execute({sql,args})).rows}}}}}}
export async function initializeDatabase(client){await client.batch([
 'CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, state TEXT NOT NULL, version INTEGER DEFAULT 0 NOT NULL, expires_at INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS rooms_owner_expiry ON rooms(owner,expires_at)'
],'write')}
export async function hostedRequest(request,DB,secret){
 if(!secret||secret.length<32)return Response.json({error:'The server session secret is not configured.'},{status:503});
 const sign=value=>createHmac('sha256',secret).update(value).digest('hex');
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)frd_session=([a-f0-9]{64}\.[a-f0-9]{64})(?:;|$)/)?.[1];
 let session=token?.split('.')[0];
 if(!token||!timingSafeEqual(Buffer.from(token.split('.')[1],'hex'),Buffer.from(sign(session),'hex')))session=null;
 let cookie;if(!session){session=randomBytes(32).toString('hex');cookie=`frd_session=${session}.${sign(session)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`}
 const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
 headers.set('oai-authenticated-user-id','guest:'+session);
 const response=await handleApi(new Request(request,{headers}),{DB});
 const result=new Response(response.body,{status:response.status,headers:response.headers});result.headers.set('Cache-Control','no-store');if(cookie)result.headers.set('Set-Cookie',cookie);return result;
}
