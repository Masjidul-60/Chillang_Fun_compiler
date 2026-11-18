export type Cat='PreprocessorError'|'LexerError'|'ParserError'|'SemanticError'|'RuntimeError';
export class MamaError extends Error{
  constructor(public category:Cat,msg:string,public line:number,public col:number,public hint?:string){super(msg)}
  format(src:string){const l=src.split(/\r?\n/)[this.line-1]??'';
    return `ChillLang ${this.category}:\nLine ${this.line}, Column ${this.col}\n${this.message}\n  ${l}\n  ${' '.repeat(Math.max(0,this.col-1))}^`+(this.hint?`\nHint: ${this.hint}`:'')}
}
