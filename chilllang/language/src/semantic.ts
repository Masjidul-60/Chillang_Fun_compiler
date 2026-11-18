import {N} from './parser';import {MamaError} from './errors';
export const BUILTINS:Record<string,[number,number]>={say:[0,99],ask:[0,1],size:[1,1],type:[1,1],range:[1,3],str:[1,1],number:[1,1],sum:[1,1],max:[1,99],min:[1,99],append:[2,2],keys:[1,1],upper:[1,1],lower:[1,1]};
export function analyze(prog:N):void{
  const sc:Map<string,number>[]=[new Map()];let fn=0,loop=0;
  const err=(n:N,m:string,h?:string)=>new MamaError('SemanticError',m,n.line,n.col,h);
  const find=(s:string)=>{for(let i=sc.length-1;i>=0;i--)if(sc[i].has(s))return sc[i].get(s);return undefined};
  const decl=(n:N,nm:string,ar=-1)=>{if(sc[sc.length-1].has(nm))throw err(n,`'${nm}' is already declared in this scope`,'Use plain assignment (no vibe) to change it');sc[sc.length-1].set(nm,ar)};
  const scope=(f:()=>void)=>{sc.push(new Map());try{f()}finally{sc.pop()}};
  const blk=(b:N[])=>scope(()=>b.forEach(st));
  function ex(n:N):void{switch(n.type){
    case 'Identifier':if(find(n.name)===undefined&&!Object.hasOwn(BUILTINS,n.name))throw err(n,`Undefined variable '${n.name}'`,`Declare it first: vibe ${n.name} = ...`);break;
    case 'BinaryExpression':ex(n.left);ex(n.right);break;
    case 'UnaryExpression':ex(n.arg);break;
    case 'IndexExpression':ex(n.object);ex(n.index);break;
    case 'ListExpression':n.items.forEach(ex);break;
    case 'DictionaryExpression':n.entries.forEach(([k,v]:N[])=>{ex(k);ex(v)});break;
    case 'CallExpression':{ex(n.callee);n.args.forEach(ex);
      if(n.callee.type==='Identifier'){const nm=n.callee.name,a=n.args.length,ar=find(nm);
        if(ar!==undefined){if(ar>=0&&ar!==a)throw err(n,`${nm}() expects ${ar} argument(s), got ${a}`)}
        else{const b=BUILTINS[nm];if(a<b[0]||a>b[1])throw err(n,`${nm}() takes ${b[0]} to ${b[1]} arguments, got ${a}`)}}
      break}}}
  function st(n:N):void{switch(n.type){
    case 'VariableDeclaration':ex(n.value);decl(n,n.name);break;
    case 'AssignmentExpression':ex(n.value);ex(n.target);break;
    case 'ExpressionStatement':ex(n.expr);break;
    case 'IfStatement':ex(n.test);blk(n.body);if(n.alt)blk(n.alt);break;
    case 'WhileStatement':ex(n.test);loop++;blk(n.body);loop--;break;
    case 'ForStatement':ex(n.iter);scope(()=>{decl(n,n.name);loop++;n.body.forEach(st);loop--});break;
    case 'FunctionDeclaration':{decl(n,n.name,n.params.length);const sl=loop;loop=0;fn++;
      scope(()=>{n.params.forEach((q:string)=>decl(n,q));n.body.forEach(st)});fn--;loop=sl;break}
    case 'ReturnStatement':if(!fn)throw err(n,"'gimme' used outside a function");if(n.value)ex(n.value);break;
    case 'BreakStatement':if(!loop)throw err(n,"'bail' used outside a loop");break;
    case 'ContinueStatement':if(!loop)throw err(n,"'skip' used outside a loop");break}}
  prog.body.forEach(st);
}
