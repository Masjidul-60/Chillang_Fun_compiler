export interface Ex{id:string;title:string;code:string;fails?:boolean}
const w=(b:string)=>`yo chill\n${b.trim()}\npeace out\n`;
export const EXAMPLES:Ex[]=[
{id:'hello',title:'Yo World',code:w(`~ declare with vibe, print with say
vibe name = "Zisa"
vibe mood = 100
say("Yo, stay chill!")
say(name, mood)`)},
{id:'cond',title:'Maybe / Otherwise',code:w(`vibe temp = 31
maybe temp > 35 then
    say("Too hot bro")
otherwise maybe temp > 20 then
    say("Perfect weather")
otherwise
    say("Bring a hoodie")
done
say(temp > 20 and not (temp == 25))`)},
{id:'loops',title:'Loops',code:w(`vibe i = 0
keep going while i < 5
    i = i + 1
    maybe i == 2 then
        skip
    done
    maybe i == 4 then
        bail
    done
    say(i)
done
for each x in range(3)
    say("lap", x)
done`)},
{id:'funcs',title:'Functions',code:w(`chill fact(n)
    maybe n <= 1 then
        gimme 1
    done
    gimme n * fact(n - 1)
done
chill fib(n)
    maybe n < 2 then
        gimme n
    done
    gimme fib(n - 1) + fib(n - 2)
done
say(fact(5))
say(fib(10))`)},
{id:'collections',title:'Lists & Dicts',code:w(`vibe nums = [4, 8, 15]
append(nums, 16)
nums[0] = 3
say(nums, size(nums), sum(nums), max(nums), min(nums))
vibe person = {"name": "Rafi", "age": 21}
person["city"] = "Dhaka"
say(person)
say(keys(person))`)},
{id:'strings',title:'Strings & Types',code:w(`vibe s = "chill" + " " + "bro"
say(upper(s), lower("ABC"), size(s), s[0])
say("age: " + str(21))
say(number("40") + 2)
say(type(s), type(1), type([1]), type(nada))`)},
{id:'error',title:'Error demo (fails)',fails:true,code:w(`say(ghost)`)},
];
