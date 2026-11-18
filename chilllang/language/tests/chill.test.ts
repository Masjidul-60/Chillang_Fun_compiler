import {describe,it,expect} from 'vitest';import {execute,tokenize,parse} from '../src/index';
const P=(b:string)=>'yo chill\n'+b+'\npeace out\n';
const out=(b:string)=>{const r=execute(P(b));if(!r.success)throw new Error(r.errors[0].formatted);return r.output};
const bad=(b:string)=>execute(P(b)).errors[0];
const first=(b:string)=>parse(tokenize(P(b))).body[0];
describe('lexer',()=>{
  it('keywords, comments, positions',()=>{const t=tokenize('yup ~ ignored\n  x');expect(t[0].type).toBe('kw');const x=t.find(k=>k.lexeme==='x')!;expect([x.line,x.col]).toEqual([2,3])});
  it('newlines inside brackets are ignored',()=>{expect(tokenize('[1,\n2]').filter(t=>t.type==='nl').length).toBe(1)});
  it('keeps # and ~ safe inside strings',()=>{expect(tokenize('"a ~ b"')[0].lexeme).toBe('a ~ b')});
  it('invalid tokens',()=>{expect(()=>tokenize('@')).toThrow(/Unexpected/);expect(()=>tokenize('"x')).toThrow(/Unterminated/)});
});
describe('parser',()=>{
  it('precedence',()=>{const v=first('vibe x = 1 + 2 * 3').value;expect([v.op,v.right.op]).toEqual(['+','*'])});
  it('else-if chain shares one done',()=>{const n=first('maybe yup then\n  say(1)\notherwise maybe nope then\n  say(2)\notherwise\n  say(3)\ndone');expect(n.alt[0].type).toBe('IfStatement');expect(n.alt[0].alt).not.toBeNull()});
  it('unclosed block',()=>{expect(bad('keep going while yup\n  say(1)').message).toMatch(/Missing 'done'/)});
  it('missing then',()=>{expect(bad('maybe yup\n say(1)\ndone').message).toMatch(/Expected 'then'/)});
  it('stray done',()=>{expect(bad('done').message).toMatch(/no open block/)});
  it('program markers',()=>{expect(()=>parse(tokenize('say(1)'))).toThrow(/yo chill/);expect(()=>parse(tokenize('yo chill\nsay(1)'))).toThrow(/peace out/)});
});
describe('semantic',()=>{
  it('undefined / duplicate',()=>{expect(bad('say(x)').message).toMatch(/Undefined/);expect(bad('vibe a = 1\nvibe a = 2').message).toMatch(/already declared/)});
  it('scope does not leak',()=>{expect(bad('maybe yup then\n  vibe z = 1\ndone\nsay(z)').category).toBe('SemanticError')});
  it('gimme / bail / skip placement',()=>{expect(bad('gimme 1').message).toMatch(/gimme/);expect(bad('bail').message).toMatch(/bail/);expect(bad('skip').message).toMatch(/skip/)});
  it('argument count',()=>{expect(bad('chill f(a)\n gimme a\ndone\nf()').message).toMatch(/expects 1/)});
});
describe('runtime',()=>{
  it('arithmetic and strings',()=>{expect(out('say(2 + 3 * 4)\nsay("a" + "b")')).toEqual(['14','ab'])});
  it('loops with bail/skip',()=>{expect(out('vibe i = 0\nkeep going while i < 9\n i = i + 1\n maybe i == 2 then\n  skip\n done\n maybe i == 4 then\n  bail\n done\n say(i)\ndone')).toEqual(['1','3'])});
  it('recursion',()=>{expect(out('chill f(n)\n maybe n <= 1 then\n  gimme 1\n done\n gimme n * f(n - 1)\ndone\nsay(f(5))')).toEqual(['120'])});
  it('lists and dicts',()=>{expect(out('vibe l = [1]\nappend(l, 2)\nvibe d = {"a": 1}\nd["b"] = 2\nsay(l, size(d), keys(d))')).toEqual(['[1, 2] 2 ["a", "b"]'])});
  it('strict types and limits',()=>{expect(bad('say("a" + 1)').category).toBe('RuntimeError');expect(bad('keep going while yup\n vibe q = 1\ndone').message).toMatch(/Step limit/)});
  it('error keeps earlier output',()=>{const r=execute(P('say("hi")\nsay(1 / 0)'));expect(r.output).toEqual(['hi']);expect(r.errors[0].formatted).toContain('RuntimeError')});
  it('handles cyclic lists and dictionaries when printing or comparing',()=>{
    expect(out('vibe a = []\nappend(a, a)\nsay(a)\nvibe b = []\nappend(b, b)\nsay(a == b)')).toEqual(['[<cycle>]','yup']);
    expect(out('vibe d = {}\nd["self"] = d\nsay(d)')).toEqual(['{"self": <cycle>}']);
  });
  it('limits output lines and size',()=>{
    expect(execute(P('say("a")\nsay("b")'),{maxOutputLines:1}).errors[0].message).toMatch(/Output line limit/);
    expect(execute(P('say("abc")'),{maxOutputChars:2}).errors[0].message).toMatch(/Output size limit/);
  });
  it('limits string growth',()=>{
    expect(bad('vibe s = "x"\n'+Array(17).fill('s = s + s').join('\n')).message).toMatch(/String too large/);
  });
});
