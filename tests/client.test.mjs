import {test} from 'node:test';
import assert from 'node:assert/strict';
// The room client can run without a theater mounted.
globalThis.window={addEventListener(){}};
const {FrdParty}=await import('../public/lounge.js');
test('sharing a film does not reload the hosts already-loaded player',async()=>{
 let loads=0;const p=new FrdParty({}, {onState(){},onMedia(){loads++},onMuted(){},onPlayback(){},onPose(){}});
 p.uid='host';p.code='ABCDEF';p.state={status:'connected',room:{hostId:'host'}};
 p.request=async()=>({selfId:'host',room:{code:'ABCDEF',hostId:'host',theme:'cinema'},members:[],source:{id:'film'},events:[]});
 p.shareMedia({id:'film'});await p.pending;assert.equal(loads,0);
 p.consume({selfId:'host',room:{code:'ABCDEF',hostId:'host',theme:'cinema'},members:[],source:{id:'other-film'},events:[]});assert.equal(loads,1);
});
