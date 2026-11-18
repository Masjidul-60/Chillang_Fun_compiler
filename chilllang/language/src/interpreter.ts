import {N} from './parser';import {MamaError} from './errors';
class Ret{constructor(public v:any){}} class Brk{} class Cont{}
class Env{vars=new Map<string,any>();constructor(public parent:Env|null=null){}
  lookup(n:string):Env|null{return this.vars.has(n)?this:this.parent?.lookup(n)??null}}
export interface Opts{maxSteps?:number;maxDepth?:number;maxOutputChars?:number;maxOutputLines?:number;deadline?:number;input?:(p:string)=>string;out?:string[];timeoutMs?:number}
export const typeOf=(v:any)=>v===null?'nada':typeof v==='number'?'number':typeof v==='string'?'string':typeof v==='boolean'?'bool':Array.isArray(v)?'list':v instanceof Map?'dict':'function';
export function show(v:any,q=false,seen=new Set<object>(),depth=0):string{
  if(depth>100)return '<max depth>';
  switch(typeOf(v)){case 'nada':return 'nada';case 'bool':return v?'yup':'nope';case 'string':return q?JSON.stringify(v):v;
    case 'list':case 'dict':{if(seen.has(v))return '<cycle>';seen.add(v);
      const result=typeOf(v)==='list'?'['+v.map((x:any)=>show(x,true,seen,depth+1)).join(', ')+']'
        :'{'+[...v].map(([k,x]:any)=>`${JSON.stringify(k)}: ${show(x,true,seen,depth+1)}`).join(', ')+'}';
      seen.delete(v);return result}
    case 'number':return String(v);default:return '<kaj>'}}
const truthy=(v:any)=>!(v===null||v===false||v===0||v===''||(Array.isArray(v)&&!v.length)||(v instanceof Map&&!v.size));
const eq=(a:any,b:any,pairs=new WeakMap<object,WeakSet<object>>()):boolean=>{
  if(a===b)return true;
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  let matched=pairs.get(a);if(matched?.has(b))return true;
  if(!matched){matched=new WeakSet<object>();pairs.set(a,matched)}matched.add(b);
  return a.every((x,i)=>eq(x,b[i],pairs));
};
export function run(prog:N,o:Opts={}):string[]{
  const out=o.out??[];let steps=0,depth=0,outputChars=out.reduce((n,s)=>n+s.length,0);const max=o.maxSteps??200000,maxD=o.maxDepth??200;
  const rt=(n:N,m:string,h?:string)=>new MamaError('RuntimeError',m,n.line,n.col,h);
  const tick=(n:N)=>{if(++steps>max)throw rt(n,'Step limit exceeded (possible infinite loop)','Check your loop condition');if(o.deadline&&Date.now()>o.deadline)throw rt(n,'Execution timed out')};
  const ext=(a:any[],n:N,f:(...x:number[])=>number,nm:string)=>{const l=a.length===1&&Array.isArray(a[0])?a[0]:a;if(!l.length||l.some((x:any)=>typeof x!=='number'))throw rt(n,`${nm}() needs one or more numbers`);return f(...l)};
  const B:Record<string,(a:any[],n:N)=>any>={
    say:(a,n)=>{const line=a.map(x=>show(x)).join(' ');if(out.length>=(o.maxOutputLines??10000))throw rt(n,'Output line limit exceeded');if(outputChars+line.length>(o.maxOutputChars??1000000))throw rt(n,'Output size limit exceeded');out.push(line);outputChars+=line.length;return null},
    ask:a=>o.input?o.input(a[0]??''):'',
    size:(a,n)=>{const v=a[0];if(typeof v==='string'||Array.isArray(v))return v.length;if(v instanceof Map)return v.size;throw rt(n,`size() needs string, list or dict, got ${typeOf(v)}`)},
    type:a=>typeOf(a[0]),str:a=>show(a[0]),
    range:(a,n)=>{if(a.some(x=>typeof x!=='number'))throw rt(n,'range() needs numbers');const [s,e,st]=a.length===1?[0,a[0],1]:[a[0],a[1],a[2]??1];
      if(st===0)throw rt(n,'range() step cannot be 0');if(Math.abs((e-s)/st)>100000)throw rt(n,'range() too large');const r:number[]=[];for(let i=s;st>0?i<e:i>e;i+=st)r.push(i);return r},
    number:(a,n)=>{const v=a[0];if(typeof v==='number')return v;if(typeof v==='boolean')return v?1:0;if(typeof v==='string'&&v.trim()!==''&&!isNaN(Number(v)))return Number(v);throw rt(n,`Cannot convert ${show(v,true)} to number`)},
    sum:(a,n)=>{if(!Array.isArray(a[0])||a[0].some((x:any)=>typeof x!=='number'))throw rt(n,'sum() needs a list of numbers');return a[0].reduce((x:number,y:number)=>x+y,0)},
    max:(a,n)=>ext(a,n,Math.max,'max'),min:(a,n)=>ext(a,n,Math.min,'min'),
    append:(a,n)=>{if(!Array.isArray(a[0]))throw rt(n,'append() needs a list first');if(a[0].length>=100000)throw rt(n,'List too large');a[0].push(a[1]);return null},
    keys:(a,n)=>{if(!(a[0] instanceof Map))throw rt(n,'keys() needs a dict');return [...a[0].keys()]},
    upper:(a,n)=>{if(typeof a[0]!=='string')throw rt(n,'upper() needs a string');return a[0].toUpperCase()},
    lower:(a,n)=>{if(typeof a[0]!=='string')throw rt(n,'lower() needs a string');return a[0].toLowerCase()}};
  const g=new Env();for(const k in B)g.vars.set(k,{b:B[k]});
  function binop(n:N,op:string,l:any,r:any):any{
    if(op==='==')return eq(l,r);if(op==='!=')return !eq(l,r);
    const bad=()=>rt(n,`Cannot use '${op}' between ${typeOf(l)} and ${typeOf(r)}`,'Convert with str() or number() first');
    const nn=typeof l==='number'&&typeof r==='number',ss=typeof l==='string'&&typeof r==='string';
    if(op==='+'){if(nn)return l+r;if(ss){if(l.length+r.length>100000)throw rt(n,'String too large');return l+r}if(Array.isArray(l)&&Array.isArray(r)){if(l.length+r.length>100000)throw rt(n,'List too large');return [...l,...r]}throw bad()}
    if(['<','>','<=','>='].includes(op)){if(!nn&&!ss)throw bad();return op==='<'?l<r:op==='>'?l>r:op==='<='?l<=r:l>=r}
    if(!nn)throw bad();
    switch(op){case '-':return l-r;case '*':return l*r;case '/':if(r===0)throw rt(n,'Division by zero');return l/r;case '%':if(r===0)throw rt(n,'Modulo by zero');return l%r}
    throw bad()}
  function idx(n:N,o:any,i:any):any{
    if(Array.isArray(o)||typeof o==='string'){if(typeof i!=='number'||!Number.isInteger(i))throw rt(n,'Index must be an integer');const k=i<0?o.length+i:i;if(k<0||k>=o.length)throw rt(n,`Index ${i} out of range (length ${o.length})`);return o[k]}
    if(o instanceof Map){if(typeof i!=='string'&&typeof i!=='number')throw rt(n,'Dict keys must be string or number');if(!o.has(i))throw rt(n,`Key ${show(i,true)} not found`);return o.get(i)}
    throw rt(n,`Cannot index a ${typeOf(o)}`)}
  function ev(n:N,e:Env):any{tick(n);switch(n.type){
    case 'Literal':return n.value;
    case 'Identifier':{const s=e.lookup(n.name);if(!s)throw rt(n,`Undefined variable '${n.name}'`);return s.vars.get(n.name)}
    case 'ListExpression':return n.items.map((x:N)=>ev(x,e));
    case 'DictionaryExpression':{const m=new Map();for(const [k,v] of n.entries){const kk=ev(k,e);if(typeof kk!=='string'&&typeof kk!=='number')throw rt(k,'Dict keys must be string or number');m.set(kk,ev(v,e))}return m}
    case 'IndexExpression':return idx(n,ev(n.object,e),ev(n.index,e));
    case 'UnaryExpression':{const v=ev(n.arg,e);if(n.op==='not')return !truthy(v);if(typeof v!=='number')throw rt(n,`Cannot negate ${typeOf(v)}`);return -v}
    case 'BinaryExpression':{const l=ev(n.left,e);
      if(n.op==='and')return truthy(l)?ev(n.right,e):l;if(n.op==='or')return truthy(l)?l:ev(n.right,e);
      return binop(n,n.op,l,ev(n.right,e))}
    case 'CallExpression':{const f=ev(n.callee,e);const a=n.args.map((x:N)=>ev(x,e));
      if(f&&f.b)return f.b(a,n);
      if(f&&f.body){if(a.length!==f.params.length)throw rt(n,`${f.name}() expects ${f.params.length} argument(s), got ${a.length}`);
        if(++depth>maxD){depth--;throw rt(n,'Maximum recursion depth exceeded')}
        const ne=new Env(f.closure);f.params.forEach((p:string,i:number)=>ne.vars.set(p,a[i]));
        try{blk(f.body,ne)}catch(x){if(x instanceof Ret)return x.v;throw x}finally{depth--}return null}
      throw rt(n,`A ${typeOf(f)} is not callable`)}}
    throw rt(n,`Unknown expression ${n.type}`)}
  function blk(b:N[],e:Env){for(const s of b)st(s,e)}
  function st(n:N,e:Env):void{tick(n);switch(n.type){
    case 'VariableDeclaration':e.vars.set(n.name,ev(n.value,e));break;
    case 'AssignmentExpression':{const v=ev(n.value,e),t=n.target;
      if(t.type==='Identifier'){const s=e.lookup(t.name);if(!s)throw rt(t,`Undefined variable '${t.name}'`);s.vars.set(t.name,v)}
      else{const o=ev(t.object,e),i=ev(t.index,e);
        if(Array.isArray(o)){idx(t,o,i);o[i<0?o.length+i:i]=v}
        else if(o instanceof Map){if(typeof i!=='string'&&typeof i!=='number')throw rt(t,'Dict keys must be string or number');if(!o.has(i)&&o.size>=100000)throw rt(t,'Dict too large');o.set(i,v)}
        else throw rt(t,`Cannot assign into a ${typeOf(o)}`)}break}
    case 'ExpressionStatement':ev(n.expr,e);break;
    case 'IfStatement':if(truthy(ev(n.test,e)))blk(n.body,new Env(e));else if(n.alt)blk(n.alt,new Env(e));break;
    case 'WhileStatement':while(truthy(ev(n.test,e))){try{blk(n.body,new Env(e))}catch(x){if(x instanceof Brk)break;if(x instanceof Cont)continue;throw x}}break;
    case 'ForStatement':{const it=ev(n.iter,e);const items=Array.isArray(it)?[...it]:typeof it==='string'?[...it]:it instanceof Map?[...it.keys()]:null;
      if(!items)throw rt(n.iter,`Cannot loop over a ${typeOf(it)}`);
      for(const x of items){const ne=new Env(e);ne.vars.set(n.name,x);try{blk(n.body,ne)}catch(s){if(s instanceof Brk)break;if(s instanceof Cont)continue;throw s}}break}
    case 'FunctionDeclaration':e.vars.set(n.name,{name:n.name,params:n.params,body:n.body,closure:e});break;
    case 'ReturnStatement':throw new Ret(n.value?ev(n.value,e):null);
    case 'BreakStatement':throw new Brk();
    case 'ContinueStatement':throw new Cont()}}
  blk(prog.body,new Env(g));return out;
}
