import express from 'express';
import {execute,tokenize,parse,analyze,MamaError} from '../../language/src/index';
const MAX=20000;
export const app=express();
app.disable('x-powered-by');app.use(express.json({limit:'100kb'}));
const fail=(res:any,m:string)=>res.status(400).json({success:false,errors:[{category:'RequestError',message:m}]});
const code=(q:any,r:any):string|null=>{const c=q.body?.code;
  if(typeof c!=='string'){fail(r,'"code" must be a string');return null}
  if(c.length>MAX){fail(r,`"code" must be at most ${MAX} characters`);return null}return c};
const errOf=(c:string,e:unknown)=>e instanceof MamaError?{category:e.category,message:e.message,line:e.line,column:e.col,hint:e.hint,formatted:e.format(c)}:{category:'RuntimeError',message:'Internal engine error',line:0,column:0};
app.get('/api/health',(_q,r)=>r.json({status:'ok',engine:'ChillLang 0.1.0'}));
app.post('/api/execute',(q,r)=>{const c=code(q,r);if(c!==null)r.json(execute(c))});
app.post('/api/validate',(q,r)=>{const c=code(q,r);if(c===null)return;
  try{analyze(parse(tokenize(c)));r.json({valid:true,errors:[]})}catch(e){r.json({valid:false,errors:[errOf(c,e)]})}});
app.post('/api/analyze',(q,r)=>{const c=code(q,r);if(c===null)return;
  const out:any={tokens:[],ast:null,semantic:{passed:false},errors:[]};
  try{const t=tokenize(c);out.tokens=t;const a=parse(t);out.ast=a;analyze(a);out.semantic.passed=true}catch(e){out.errors.push(errOf(c,e))}
  r.json(out)});
app.use((_e:any,_q:any,r:any,_n:any)=>fail(r,'Malformed request'));
if(!process.env.VITEST)app.listen(Number(process.env.PORT)||3001,()=>console.log('ChillLang API on :'+(process.env.PORT||3001)));
