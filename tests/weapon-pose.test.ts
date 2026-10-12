import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3,Quaternion} from 'three';
import {character,pose} from '../apps/client/src/characters';

test('barrels follow aim through shoulder, wrist and torso rotations',()=>{
 for(const kind of ['marksman','evoker'] as const){
  const rig=character(kind);rig.rotation.y=.9;
  for(const pitch of [-.8,0,.8])for(const action of ['idle','dodge','arc']){
   pose(rig,{pitch,action,actionEnd:1},1,false,true);rig.updateMatrixWorld(true);
   const expected=new Vector3(0,Math.sin(pitch),-Math.cos(pitch)).applyQuaternion(rig.quaternion);
   for(const side of [-1,1]){
    const weapon=rig.getObjectByName('gear_weapon'+side);if(!weapon)continue;
    const actual=new Vector3(0,0,-1).applyQuaternion(weapon.getWorldQuaternion(new Quaternion()));
    assert.ok(actual.distanceTo(expected)<1e-6,`${kind} ${action} ${pitch}`);
   }
  }
 }
});
test('swords use an upright guard and attack-relative sweep, and reduced motion resets spin',()=>{
 const rig=character('blademaster');
 const blade=()=>new Vector3(0,1,0).applyQuaternion(rig.getObjectByName('gear_weapon1')!.getWorldQuaternion(new Quaternion()));
 pose(rig,{pitch:0,action:'idle',actionEnd:0},1,false,false);
 assert.ok(blade().y>.8);
 pose(rig,{pitch:0,action:'primary',actionEnd:1.24},1,false,false);const start=blade();
 pose(rig,{pitch:0,action:'primary',actionEnd:1.24},1.2,false,false);
 assert.ok(start.angleTo(blade())>.5);
 pose(rig,{pitch:0,action:'whirlwind',actionEnd:2.65},2.3,false,false);
 pose(rig,{pitch:0,action:'idle',actionEnd:0},3,false,true);
 assert.equal(rig.getObjectByName('spine')!.rotation.y,0);
});
