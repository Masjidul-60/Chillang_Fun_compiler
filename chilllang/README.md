# ChillLang

A small programming language and browser playground.

## Run it

```sh
npm run setup
npm start        # API at http://localhost:3001
npm run dev      # playground at http://localhost:5173
```

Run `npm test` for the language and API checks, or `npm run build` to build the playground.

Programs begin with `yo chill` and finish with `peace out`. Blocks close with `done`.

```chill
yo chill
vibe name = "Sharmi"
say("Hello, " + name)
peace out
```

ChillLang includes a lexer, parser, semantic checks, and a bounded interpreter. Execution limits include a 3-second timeout, 200,000 steps, 200 call levels, 100,000-item collections and strings, and 1 MB / 10,000 lines of output.
