import {useRef,useState} from 'react';
import Editor from '@monaco-editor/react';
import {EXAMPLES} from './examples';

const api=async(path:string,code:string,signal:AbortSignal)=>{
  const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal});
  if(!response.ok)throw new Error(`Request failed (${response.status})`);
  return response.json();
};

export default function App(){
  const [example,setExample]=useState(EXAMPLES[0]);
  const [code,setCode]=useState(EXAMPLES[0].code);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<'output'|'errors'>('output');
  const [page,setPage]=useState<'playground'|'docs'>('playground');
  const controller=useRef<AbortController|null>(null);
  const editor=useRef<any>(null);
  const monaco=useRef<any>(null);

  const run=async()=>{
    const request=new AbortController();controller.current=request;setBusy(true);
    try{
      const response=await api('execute',code,request.signal);setResult(response);
      const model=editor.current?.getModel();
      if(model&&monaco.current){
        monaco.current.editor.setModelMarkers(model,'chilllang',response.errors.filter((e:any)=>e.line>0).map((e:any)=>({
          severity:monaco.current.MarkerSeverity.Error,message:e.message,startLineNumber:e.line,startColumn:e.column,
          endLineNumber:e.line,endColumn:e.column+1
        })));
      }
      setTab(response.errors.length?'errors':'output');
    }catch(error:any){
      if(error.name==='AbortError')setResult({success:false,output:[],errors:[{category:'Stopped',message:'Execution stopped.'}]});
      else setResult({success:false,output:[],errors:[{category:'Connection',message:'Could not reach the ChillLang server. Start it with npm start.'}]});
      setTab('errors');
    }finally{setBusy(false)}
  };

  const choose=(item:typeof example)=>{setExample(item);setCode(item.code);setResult(null);setTab('output');};
  const format=()=>{
    let depth=0;
    setCode(code.replace(/\r\n?/g,'\n').split('\n').map(line=>{
      const value=line.trim();if(!value)return '';
      const word=value.split(/\s+/)[0];
      if(word==='done'||word==='otherwise')depth=Math.max(0,depth-1);
      const formatted='    '.repeat(depth)+value;
      if(['maybe','keep','for','otherwise'].includes(word)||(word==='chill'&&value!=='yo chill'))depth++;
      return formatted;
    }).join('\n').replace(/\n*$/,'\n'));
  };

  const keywordGroups=[
    {title:'Program',words:'yo · chill · peace · out'},
    {title:'Variables & values',words:'vibe · yup · nope · nada'},
    {title:'Conditions & loops',words:'maybe · then · otherwise · done · keep going · while · for each · in'},
    {title:'Functions & flow',words:'chill · gimme · bail · skip'},
    {title:'Logic',words:'and · or · not'}
  ];
  const builtins=['say','ask','size','type','range','str','number','sum','max','min','append','keys','upper','lower'];

  return <div className="studio">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="ChillLang home"><span className="brand-mark">c.</span><span>chill<span>lang</span></span></a>
      <div className="top-note"><span className="status-dot"/>A little space to write and run code</div>
      <nav className="top-nav" aria-label="Main navigation"><button className={page==='playground'?'current':''} onClick={()=>setPage('playground')}>Playground</button><button className={page==='docs'?'current':''} onClick={()=>setPage('docs')}>Documentation</button></nav>
      <div className="author">Made by <strong>Sharmi</strong></div>
    </header>

    {page==='playground'?<div className="workspace" id="top">
      <aside className="sidebar">
        <div className="side-label">YOUR SPACE</div>
        <div className="project-card"><span className="file-icon">✳</span><span><strong>My first program</strong><small>main.chill</small></span><span className="more">···</span></div>
        <div className="side-label examples-label">TRY A STARTER</div>
        <div className="example-list">{EXAMPLES.filter(item=>!item.fails).map(item=><button key={item.id} className={'example-link'+(item.id===example.id?' selected':'')} onClick={()=>choose(item)}><span className="example-dot"/>{item.title}</button>)}</div>
        <div className="sidebar-bottom"><div className="language-pill"><span>✳</span> ChillLang <small>0.1</small></div><p>Small steps make<br/>good things.</p></div>
      </aside>

      <main className="main-area">
        <div className="welcome-row"><div><div className="eyebrow">YOUR PLAYGROUND</div><h1>Make something <em>good.</em></h1><p>Write a little code. See what it can do.</p></div><div className="run-hint">Press <kbd>Run</kbd> when you’re ready</div></div>
        <section className="editor-card">
          <div className="editor-toolbar"><div className="tab-file"><span className="file-icon">✳</span>main.chill<span className="unsaved-dot"/></div><div className="toolbar-actions"><button className="quiet-button" onClick={format}>Tidy code</button><button className="quiet-button" onClick={()=>{setCode(example.code);setResult(null)}}>Reset</button>{busy&&<button className="quiet-button" onClick={()=>controller.current?.abort()}>Stop</button>}<button className="run-button" onClick={run} disabled={busy}><span>{busy?'◌':'▶'}</span>{busy?'Running':'Run code'}</button></div></div>
          <div className="editor-frame"><Editor language="chilllang" theme="chill-light" value={code} onChange={value=>setCode(value??'')} beforeMount={(m:any)=>{
            m.languages.register({id:'chilllang'});
            m.languages.setMonarchTokensProvider('chilllang',{keywords:['yo','chill','peace','out','vibe','maybe','then','otherwise','done','keep','going','while','for','each','in','gimme','bail','skip','yup','nope','nada','and','or','not'],builtins:['say','ask','size','type','range','str','number','sum','max','min','append','keys','upper','lower'],tokenizer:{root:[[/~.*/,'comment'],[/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/,'string'],[/\d+(\.\d+)?/,'number'],[/[a-zA-Z_]\w*/,{cases:{'@keywords':'keyword','@builtins':'type','@default':'identifier'}}]]}});
            m.languages.setLanguageConfiguration('chilllang',{comments:{lineComment:'~'},brackets:[['(',')'],['[',']'],['{','}']],onEnterRules:[{beforeText:/^\s*(maybe\b.*\bthen|otherwise\b.*|keep\b.*|for\b.*|chill\s+\w+\(.*\))\s*$/,action:{indentAction:m.languages.IndentAction.Indent}}]});
            m.editor.defineTheme('chill-light',{base:'vs',inherit:true,rules:[{token:'keyword',foreground:'7c55d9',fontStyle:'bold'},{token:'type',foreground:'118875'},{token:'string',foreground:'c05e4b'},{token:'comment',foreground:'9b9a9c',fontStyle:'italic'}],colors:{'editor.background':'#fffefa','editorLineNumber.foreground':'#c2c0bc','editorLineNumber.activeForeground':'#716e68','editorCursor.foreground':'#7857d2','editor.selectionBackground':'#e9e1ff','editor.lineHighlightBackground':'#faf8f2'}});
          }} onMount={(instance,m)=>{editor.current=instance;monaco.current=m}} options={{minimap:{enabled:false},fontSize:16,lineNumbers:'on',renderLineHighlight:'line',tabSize:4,insertSpaces:true,automaticLayout:true,fontFamily:'JetBrains Mono, Menlo, monospace',padding:{top:22,bottom:22},scrollBeyondLastLine:false}}/></div>
          <div className="console"><div className="console-tabs"><button className={tab==='output'?'active':''} onClick={()=>setTab('output')}>Output</button><button className={tab==='errors'?'active':''} onClick={()=>setTab('errors')}>Errors{result?.errors?.length>0&&<span className="error-count">{result.errors.length}</span>}</button><span className="console-spacer"/>{result&&<span className="run-time">{result.executionTime} ms</span>}</div><div className="console-body">{!result?<div className="empty-console"><span className="empty-icon">↳</span><span>Your result will show up here.</span></div>:tab==='output'?<pre>{result.output.join('\n')||'(no output yet)'}</pre>:result.errors.length?<div className="error-list">{result.errors.map((error:any,index:number)=><div className="error-item" key={index}><strong>{error.category}</strong><span>{error.formatted||error.message}</span>{error.hint&&<small>Hint: {error.hint}</small>}</div>)}</div>:<div className="success-message"><span>✓</span> No errors. Nice work.</div>}</div></div>
        </section>
        <footer className="page-footer"><span>Take your time. You’re learning.</span><span>Made with care by <strong>Sharmi</strong></span></footer>
      </main>
    </div>:<main className="docs-page">
      <div className="docs-heading"><div><div className="eyebrow">THE LANGUAGE, MADE SIMPLE</div><h1>A little guide to <em>ChillLang.</em></h1><p>Learn the keywords, write your first program, and see how the pieces fit together.</p></div><button className="run-button docs-back" onClick={()=>setPage('playground')}>Back to playground</button></div>
      <section className="docs-card docs-intro"><div><span className="docs-number">01</span><h2>Start here</h2><p>Every program opens with <code>yo chill</code> and closes with <code>peace out</code>. They mark the program boundaries; they do not print. Only <code>say()</code> writes to the output. Put one statement on each line. Use <code>~</code> to add a comment.</p></div><div className="docs-example"><pre>{`yo chill\nvibe name = "Sharmi"\nsay("Hello, " + name)\npeace out`}</pre><small>OUTPUT</small><pre className="docs-output">Hello, Sharmi</pre></div></section>
      <div className="docs-grid">
        <section className="docs-card"><span className="docs-number">02</span><h2>Your keywords</h2><p>These are ChillLang’s own words for declaring values, making decisions, looping, and writing functions.</p><div className="keyword-groups">{keywordGroups.map(group=><div className="keyword-row" key={group.title}><strong>{group.title}</strong><code>{group.words}</code></div>)}</div></section>
        <section className="docs-card"><span className="docs-number">03</span><h2>Built-in helpers</h2><p>Use these ready-made functions to print, convert, measure, and work with values.</p><div className="builtin-list">{builtins.map(name=><code key={name}>{name}</code>)}</div></section>
        <section className="docs-card"><span className="docs-number">04</span><h2>Decisions & loops</h2><p>Blocks finish with <code>done</code>. Indentation helps you read code, but the closing keyword defines each block.</p><pre>{`maybe score >= 10 then\n    say("You did it!")\notherwise\n    say("Try once more")\ndone`}</pre><pre>{`for each item in ["tea", "cake"]\n    say(item)\ndone`}</pre></section>
        <section className="docs-card"><span className="docs-number">05</span><h2>Values & rules</h2><p>ChillLang has numbers, text, booleans, <code>nada</code>, lists, dictionaries, and functions. Lists start at index <code>0</code>; negative indexes count from the end.</p><p>Names must be declared with <code>vibe</code> before use. Variables inside a block stay in that block. Types are checked while the program runs.</p><p>Use <code>and</code>, <code>or</code>, and <code>not</code> for logic. Math follows familiar precedence: parentheses, multiplication, then addition.</p></section>
      </div>
      <footer className="docs-footer">A good place to start is one small idea. <button onClick={()=>{choose(EXAMPLES[0]);setPage('playground')}}>Try the hello example →</button><span>Made by <strong>Sharmi</strong></span></footer>
    </main>}
  </div>;
}
