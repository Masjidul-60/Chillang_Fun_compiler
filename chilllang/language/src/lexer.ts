import {MamaError} from './errors';
export type T='num'|'str'|'id'|'kw'|'op'|'nl'|'eof';
export interface Tok{type:T;lexeme:string;line:number;col:number;pos:number}
const KW=new Set(['yo','chill','peace','vibe','maybe','then','otherwise','done','keep','while','for','in','gimme','bail','skip','yup','nope','nada','and','or','not']);
// Preprocessor: normalize newlines only. Blocks are closed by 'done', so indentation has no meaning in ChillLang.
export const preprocess=(s:string):string[]=>s.replace(/\r\n?/g,'\n').split('\n');
export function tokenize(src:string):Tok[]{
  const lines=preprocess(src),toks:Tok[]=[];let depth=0,pos=0;
  const push=(type:T,lexeme:string,line:number,col:number)=>toks.push({type,lexeme,line,col,pos:pos+col-1});
  for(let li=0;li<lines.length;li++){
    const L=lines[li],n=li+1;let i=0;
    while(i<L.length){
      const c=L[i],col=i+1;
      if(c===' '||c==='\t'){i++;continue}
      if(c==='~')break;
      if(/\d/.test(c)){let j=i;while(j<L.length&&/[\d.]/.test(L[j]))j++;const x=L.slice(i,j);if(isNaN(Number(x)))throw new MamaError('LexerError',`Invalid number '${x}'`,n,col);push('num',x,n,col);i=j;continue}
      if(/[A-Za-z_]/.test(c)){let j=i;while(j<L.length&&/\w/.test(L[j]))j++;const w=L.slice(i,j);push(KW.has(w)?'kw':'id',w,n,col);i=j;continue}
      if(c==='"'||c==="'"){let j=i+1,s='';
        while(j<L.length&&L[j]!==c){if(L[j]==='\\'&&j+1<L.length){const e=L[++j];s+=e==='n'?'\n':e==='t'?'\t':e}else s+=L[j];j++}
        if(j>=L.length)throw new MamaError('LexerError','Unterminated string',n,col,'Add a closing quote');
        push('str',s,n,col);i=j+1;continue}
      const two=L.slice(i,i+2);
      if(['==','!=','<=','>='].includes(two)){push('op',two,n,col);i+=2;continue}
      if('+-*/%<>=()[]{}:,'.includes(c)){if('([{'.includes(c))depth++;if(')]}'.includes(c))depth=Math.max(0,depth-1);push('op',c,n,col);i++;continue}
      throw new MamaError('LexerError',`Unexpected character '${c}'`,n,col);
    }
    if(depth===0)push('nl','',n,L.length+1);
    pos+=L.length+1;
  }
  push('eof','',lines.length,1);return toks;
}
