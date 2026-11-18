import {tokenize} from './lexer';import {parse} from './parser';import {analyze} from './semantic';import {run,Opts} from './interpreter';import {MamaError} from './errors';
export {tokenize,parse,analyze,run,MamaError};
export function execute(code:string,o:Opts={}){
  const t0=Date.now(),errors:any[]=[],output:string[]=[];
  try{const prog=parse(tokenize(code));analyze(prog);run(prog,{...o,out:output,deadline:t0+(o.timeoutMs??3000)})}
  catch(e){if(e instanceof MamaError)errors.push({category:e.category,message:e.message,line:e.line,column:e.col,hint:e.hint,formatted:e.format(code)});
    else errors.push({category:'RuntimeError',message:'Internal engine error',line:0,column:0})}
  return{success:!errors.length,output,errors,executionTime:Date.now()-t0};
}
