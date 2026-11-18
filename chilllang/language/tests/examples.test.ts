import {describe,it,expect} from 'vitest';import {execute} from '../src/index';import {EXAMPLES} from '../../frontend/src/examples';
describe('documented examples',()=>{for(const e of EXAMPLES)it(e.title,()=>{expect(execute(e.code).success).toBe(!e.fails)})});
