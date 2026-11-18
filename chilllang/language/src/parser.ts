import {Tok} from './lexer';import {MamaError} from './errors';
export type N={type:string;line:number;col:number;[k:string]:any};
export function parse(toks:Tok[]):N{
  let p=0;const pk=()=>toks[p],nx=()=>toks[p++];
  const err=(m:string,h?:string)=>new MamaError('ParserError',m,pk().line,pk().col,h);
  const at=(t:Tok,m:string,h?:string)=>new MamaError('ParserError',m,t.line,t.col,h);
  const isOp=(l:string)=>pk().type==='op'&&pk().lexeme===l;
  const isKw=(l:string)=>pk().type==='kw'&&pk().lexeme===l;
  const eatOp=(l:string,m?:string)=>{if(!isOp(l))throw err(m??`Expected '${l}'`);return nx()};
  const eatKw=(l:string)=>{if(!isKw(l))throw err(`Expected '${l}'`);return nx()};
  const eatWord=(w:string)=>{if(!((pk().type==='id'||pk().type==='kw')&&pk().lexeme===w))throw err(`Expected '${w}'`);return nx()};
  const nls=()=>{while(pk().type==='nl')p++};
  const node=(type:string,t:Tok,x:any={}):N=>({type,line:t.line,col:t.col,...x});
  const end=()=>{if(['nl','eof'].includes(pk().type))return;throw err('Unexpected token after statement','Put one statement per line')};
  const name=(what:string)=>{const t=nx();if(t.type!=='id'){p--;throw err(`Expected ${what}`)}return t.lexeme};
  const stops=()=>pk().type==='eof'||isKw('done')||isKw('otherwise')||isKw('peace');
  const HINT="Every maybe / keep going / for each / chill block ends with 'done'";
  function stmts():N[]{const o:N[]=[];nls();while(!stops()){o.push(stmt());nls()}return o}
  function closed(what:string,t:Tok):N[]{
    if(pk().type!=='nl')throw err(`Expected a new line after the ${what} header`);
    const s=stmts();if(!isKw('done'))throw at(t,`Missing 'done' to close this ${what}`,HINT);nx();return s}
  function ifs():N{const t=nx();const c=expr();
    if(!isKw('then'))throw err("Expected 'then' after the maybe condition");nx();
    if(pk().type!=='nl')throw err("Expected a new line after 'then'");
    const body=stmts();let alt:N[]|null=null;
    if(isKw('otherwise')){nx();
      if(isKw('maybe'))alt=[ifs()];
      else{if(pk().type!=='nl')throw err("Expected a new line after 'otherwise'");alt=stmts();if(!isKw('done'))throw at(t,"Missing 'done' to close this maybe block",HINT);nx()}}
    else{if(!isKw('done'))throw at(t,"Missing 'done' to close this maybe block",HINT);nx()}
    return node('IfStatement',t,{test:c,body,alt})}
  function stmt():N{
    const t=pk();
    if(t.type==='kw')switch(t.lexeme){
      case 'vibe':{nx();const id=name('variable name after vibe');eatOp('=','Expected "=" in declaration');const v=expr();end();return node('VariableDeclaration',t,{name:id,value:v})}
      case 'maybe':return ifs();
      case 'keep':{nx();eatWord('going');eatKw('while');const c=expr();return node('WhileStatement',t,{test:c,body:closed('loop',t)})}
      case 'for':{nx();eatWord('each');const id=name('loop variable');eatKw('in');const it=expr();return node('ForStatement',t,{name:id,iter:it,body:closed('loop',t)})}
      case 'chill':{nx();const id=name('function name');eatOp('(');const ps:string[]=[];
        while(!isOp(')')){ps.push(name('parameter name'));if(!isOp(')'))eatOp(',')}eatOp(')');
        return node('FunctionDeclaration',t,{name:id,params:ps,body:closed('function',t)})}
      case 'gimme':{nx();const v=pk().type==='nl'?null:expr();end();return node('ReturnStatement',t,{value:v})}
      case 'bail':nx();end();return node('BreakStatement',t);
      case 'skip':nx();end();return node('ContinueStatement',t);
    }
    const e=expr();
    if(isOp('=')){if(e.type!=='Identifier'&&e.type!=='IndexExpression')throw new MamaError('ParserError','Invalid assignment target',e.line,e.col,'Assign to a variable or list/dict element');
      nx();const v=expr();end();return node('AssignmentExpression',t,{target:e,value:v})}
    end();return node('ExpressionStatement',t,{expr:e})}
  const lvl=(next:()=>N,ops:string[])=>()=>{let l=next();while(pk().type==='op'&&ops.includes(pk().lexeme)){const o=nx();l=node('BinaryExpression',o,{op:o.lexeme,left:l,right:next()})}return l};
  const mul=lvl(unary,['*','/','%']),add=lvl(mul,['+','-']),cmp=lvl(add,['==','!=','<','<=','>','>=']);
  function expr():N{let l=andE();while(isKw('or')){const o=nx();l=node('BinaryExpression',o,{op:'or',left:l,right:andE()})}return l}
  function andE():N{let l=notE();while(isKw('and')){const o=nx();l=node('BinaryExpression',o,{op:'and',left:l,right:notE()})}return l}
  function notE():N{if(isKw('not')){const o=nx();return node('UnaryExpression',o,{op:'not',arg:notE()})}return cmp()}
  function unary():N{if(isOp('-')){const o=nx();return node('UnaryExpression',o,{op:'-',arg:unary()})}return postfix()}
  function postfix():N{let e=primary();
    for(;;){
      if(isOp('(')){const t=nx();const args:N[]=[];while(!isOp(')')){args.push(expr());if(!isOp(')'))eatOp(',',"Expected ',' or ')' in call")}nx();e=node('CallExpression',t,{callee:e,args})}
      else if(isOp('[')){const t=nx();const i=expr();eatOp(']');e=node('IndexExpression',t,{object:e,index:i})}
      else return e}}
  function primary():N{const t=nx();
    if(t.type==='num')return node('Literal',t,{value:Number(t.lexeme)});
    if(t.type==='str')return node('Literal',t,{value:t.lexeme});
    if(t.type==='id')return node('Identifier',t,{name:t.lexeme});
    if(t.type==='kw'&&['yup','nope','nada'].includes(t.lexeme))return node('Literal',t,{value:t.lexeme==='yup'?true:t.lexeme==='nope'?false:null});
    if(t.type==='op'&&t.lexeme==='('){const e=expr();eatOp(')');return e}
    if(t.type==='op'&&t.lexeme==='['){const items:N[]=[];while(!isOp(']')){items.push(expr());if(!isOp(']'))eatOp(',',"Expected ',' or ']' in list")}nx();return node('ListExpression',t,{items})}
    if(t.type==='op'&&t.lexeme==='{'){const entries:N[][]=[];while(!isOp('}')){const k=expr();eatOp(':',"Expected ':' after dictionary key");entries.push([k,expr()]);if(!isOp('}'))eatOp(',',"Expected ',' or '}' in dictionary")}nx();return node('DictionaryExpression',t,{entries})}
    p--;throw err(`Unexpected '${t.lexeme||t.type}' in expression`)}
  nls();
  if(!(isKw('yo')&&toks[p+1]?.lexeme==='chill'))throw err("Program must start with 'yo chill'");
  nx();nx();const body=stmts();
  if(isKw('done')||isKw('otherwise'))throw err(`Unexpected '${pk().lexeme}' with no open block`);
  if(!isKw('peace'))throw err("Program must end with 'peace out'");
  nx();eatWord('out');nls();if(pk().type!=='eof')throw err("Unexpected code after 'peace out'");
  return {type:'Program',line:1,col:1,body};
}
