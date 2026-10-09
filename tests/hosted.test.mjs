import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {databaseAdapter,initializeDatabase,hostedRequest} from '../server/hosted.mjs';
test('hosted database, signed sessions, per-tab identity and room creation',async()=>{
 const client=createClient({url:':memory:'});await initializeDatabase(client);await initializeDatabase(client);const DB=databaseAdapter(client),secret='a'.repeat(64);
 const call=(path,headers={},body)=>hostedRequest(new Request('https://lounge.test/api'+path,{method:body?'POST':'GET',headers:{origin:'https://lounge.test','content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined}),DB,secret);
 const first=await call('/session'),id=(await first.json()).id,cookie=first.headers.get('set-cookie').split(';')[0];assert.match(cookie,/frd_session=/);
 assert.equal((await (await call('/session',{cookie,'oai-authenticated-user-id':'spoofed'})).json()).id,id);
 const second=await call('/session',{cookie,'X-Lounge-Player':'12345678-1234-1234-1234-123456789abc'});assert.notEqual((await second.json()).id,id);
 const room=await call('/rooms',{cookie},{title:'Hosted test'});assert.equal(room.status,201);
 const tampered=await call('/session',{cookie:cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a')});assert.notEqual((await tampered.json()).id,id);
 client.close();
});
