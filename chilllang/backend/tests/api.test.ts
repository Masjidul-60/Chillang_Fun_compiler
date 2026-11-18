import {describe,it,expect,beforeAll,afterAll} from 'vitest';import {app} from '../src/server';
let srv:any,base='';
beforeAll(async()=>{await new Promise<void>(r=>{srv=app.listen(0,()=>r())});base='http://127.0.0.1:'+srv.address().port});
afterAll(()=>{srv.close()});
const post=async(p:string,body:any,raw=false)=>{const r=await fetch(base+p,{method:'POST',headers:{'content-type':'application/json'},body:raw?body:JSON.stringify(body)});return {s:r.status,j:await r.json()}};
const P='yo chill\nsay("Hello")\npeace out';
describe('API',()=>{
  it('health',async()=>{const r=await fetch(base+'/api/health');expect((await r.json()).status).toBe('ok')});
  it('execute',async()=>{const r=await post('/api/execute',{code:P});expect(r.j).toMatchObject({success:true,output:['Hello'],errors:[]})});
  it('execute reports language errors with 200',async()=>{const r=await post('/api/execute',{code:'yo chill\nsay(x)\npeace out'});expect(r.s).toBe(200);expect(r.j.errors[0].category).toBe('SemanticError')});
  it('rejects non-string code',async()=>{expect((await post('/api/execute',{code:5})).s).toBe(400)});
  it('rejects malformed JSON',async()=>{expect((await post('/api/execute','{bad',true)).s).toBe(400)});
  it('rejects oversized code',async()=>{expect((await post('/api/execute',{code:'x'.repeat(20001)})).s).toBe(400)});
  it('analyze returns tokens, ast, semantic',async()=>{const r=await post('/api/analyze',{code:P});expect(r.j.tokens.length).toBeGreaterThan(3);expect(r.j.ast.type).toBe('Program');expect(r.j.semantic.passed).toBe(true)});
  it('validate',async()=>{expect((await post('/api/validate',{code:P})).j.valid).toBe(true);expect((await post('/api/validate',{code:'oops'})).j.valid).toBe(false)});
});
