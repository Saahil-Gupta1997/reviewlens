import type { Aspect, Review, Filters, Stats, ThemeStat, Sentiment, Answer } from './types';
export const METHOD='rules-v2';
export const TAXONOMY=[
 {key:'login',label:'Login & authentication',terms:['login','log in','sign in','sign-in','authentication','password','signing in','sign-in']},
 {key:'performance',label:'Speed & performance',terms:['performance','slow','lag','freeze','freez','loading','load time','speed','sluggish','latency','fast','responsive']},
 {key:'reliability',label:'Crashes & reliability',terms:['crash','bug','error','reliable','reliability','unstable','stability','broken','disconnect']},
 {key:'billing',label:'Checkout & billing',terms:['checkout','billing','payment','charged','charge','invoice','refund']},
 {key:'export',label:'Exports & reporting',terms:['export','download','reports','reporting']},
 {key:'usability',label:'Ease of use',terms:['navigation','navigate','interface','confusing','intuitive','easy to use','usability','user friendly','user-friendly']},
 {key:'support',label:'Customer support',terms:['support','customer service','staff','agent','help desk','helpdesk']},
 {key:'price',label:'Price & value',terms:['price','pricing','expensive','cost','value','subscription','affordable']},
 {key:'battery',label:'Battery & charging',terms:['battery','charging','charger','charge life']},
 {key:'delivery',label:'Delivery & packaging',terms:['delivery','shipping','package','packaging','arrived','courier']},
 {key:'quality',label:'Build quality',terms:['quality','durable','material','flimsy','sturdy','broke','defect']},
 {key:'sound',label:'Sound & noise',terms:['sound','audio','noise','noisy','quiet','speaker','volume']},
 {key:'cleanliness',label:'Cleanliness',terms:['clean','dirty','dust','stain','mold','housekeeping']},
 {key:'food',label:'Food & breakfast',terms:['breakfast','food','buffet','meal','restaurant']},
 {key:'connectivity',label:'Connectivity & sync',terms:['wifi','wi-fi','bluetooth','connection','internet','sync','network']},
];
export function hasTerm(text:string,term:string){return new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[a-z]*(?=$|[^a-z0-9])`,'i').test(text);}
function clauseSentiment(clause:string):Sentiment {
 const x=clause.toLowerCase();
 const negative=/\b(fail\w*|broken|crash\w*|slow\w*|lag\w*|freez\w*|reject\w*|confus\w*|terrible|awful|bad|poor|late|delay\w*|expensive|dirty|noisy|rude|unreliable|unhelpful|flimsy|disappoint\w*|drain\w*|overheat\w*|bug\w*|error\w*|problem\w*|issue\w*|difficult|hard|stopped|useless|disconnect\w*)\b/g;
 const positive=/\b(fast\w*|quick\w*|reliable|simple|smooth\w*|clear|easy|intuitive|excellent|great|good|love|helpful|clean|quiet|affordable|sturdy|durable|perfect|responsive|stable|fine|okay|works|working)\b/g;
 let neg=0,pos=0;
 for(const match of x.matchAll(negative)){const prior=x.slice(Math.max(0,match.index!-32),match.index); if(/(?:no|not|never|without|no longer)\s+(?:\w+\s+){0,2}$/.test(prior))pos++;else neg++;}
 for(const match of x.matchAll(positive)){const prior=x.slice(Math.max(0,match.index!-32),match.index);if(/(?:not|never|isn't|wasn't|aren't|doesn't|don't)\s+(?:\w+\s+){0,2}$/.test(prior))neg++;else pos++;}
 if(/\b(can't|cannot|couldn't|doesn't|won't|don't)\b/.test(x)&&!pos)neg++;
 if(/\btoo (?:long|much|short|little)\b|\bnot (?:work|load|connect|respond|arriv)/.test(x))neg++;
 return neg>0&&neg>=pos?'negative':pos>neg?'positive':'neutral';
}
export function classifyAspects(text:string):Aspect[] {
 const clauses=text.split(/(?:[.!?;\n]+|\bbut\b|\bhowever\b|\balthough\b|\bwhereas\b)/i).map(x=>x.trim()).filter(Boolean), out:Aspect[]=[];
 for(const theme of TAXONOMY){const hits=clauses.filter(c=>theme.terms.some(t=>hasTerm(c.toLowerCase(),t)));if(!hits.length)continue;
  const selected=hits.find(c=>clauseSentiment(c)==='negative')||hits.find(c=>clauseSentiment(c)==='positive')||hits[0];
  out.push({key:theme.key,label:theme.label,sentiment:clauseSentiment(selected),evidence:selected.slice(0,600)});
 }
 return out;
}
export function filterReviews(reviews:Review[],f:Filters):Review[]{return reviews.filter(r=>(!f.product||r.product===f.product)&&(!f.version||r.version===f.version)&&(!f.region||r.region===f.region)&&(!f.source||r.source===f.source)&&(!f.from||!!r.date&&r.date>=f.from)&&(!f.to||!!r.date&&r.date<=f.to)&&(!f.rating||(f.rating==='negative'?r.rating!==null&&r.rating<=2:f.rating==='positive'?r.rating!==null&&r.rating>=4:f.rating==='unrated'?r.rating===null:r.rating===Number(f.rating)))&&(!f.search||r.text.toLowerCase().includes(f.search.toLowerCase())));}
export function stats(reviews:Review[]):Stats {
 const themes=new Map<string,ThemeStat>();
 for(const r of reviews)for(const a of r.aspects){let t=themes.get(a.key);if(!t){t={key:a.key,label:a.label,count:0,negative:0,positive:0,neutral:0,share:0,reviewIds:[]};themes.set(a.key,t);}t.count++;t[a.sentiment]++;t.reviewIds.push(r.id);}
 const rated=reviews.filter(r=>r.rating!==null),negative=rated.filter(r=>r.rating!<=2).length,positive=rated.filter(r=>r.rating!>=4).length;
 return {count:reviews.length,rated:rated.length,average:rated.length?Math.round(rated.reduce((n,r)=>n+r.rating!,0)/rated.length*100)/100:null,negative,positive,unrated:reviews.length-rated.length,coverage:reviews.length?reviews.filter(r=>r.aspects.length).length/reviews.length:0,distribution:[1,2,3,4,5].map(n=>rated.filter(r=>Math.round(r.rating!)===n).length),themes:[...themes.values()].map(t=>({...t,share:reviews.length?t.negative/reviews.length*100:0})).sort((a,b)=>b.negative-a.negative||b.count-a.count||a.label.localeCompare(b.label))};
}
const stop=new Set('what which who why how are is do does did the a an to of in on for from about reviews review customers customer people users user most common main top negative negatives positive positives mention mentions mentioned saying say feedback complaints complaint issues issue problems problem percentage percent share many count tell me summarize summary please product this that and with'.split(' '));
export function queryTokens(q:string){return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>x.length>2&&!stop.has(x));}
export function searchEvidence(reviews:Review[],question:string,limit=8):Review[]{
 const themes=TAXONOMY.filter(t=>t.terms.some(term=>hasTerm(question.toLowerCase(),term))),tokens=queryTokens(question);
 return reviews.map(r=>({r,score:themes.length?r.aspects.filter(a=>themes.some(t=>t.key===a.key)).length*4:tokens.reduce((s,t)=>s+(hasTerm(r.text.toLowerCase(),t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id)).slice(0,limit).map(x=>x.r);
}
export function compare(reviews:Review[],field:'version'|'region'|'product'|'source',left:string,right:string){const l=reviews.filter(r=>r[field]===left),r=reviews.filter(r=>r[field]===right),ls=stats(l),rs=stats(r);return {field,left,right,leftCount:l.length,rightCount:r.length,leftAverage:ls.average,rightAverage:rs.average,delta:ls.average!==null&&rs.average!==null?Math.round((rs.average-ls.average)*100)/100:null,themes:TAXONOMY.map(t=>{const a=ls.themes.find(x=>x.key===t.key)?.share||0,b=rs.themes.find(x=>x.key===t.key)?.share||0;return {label:t.label,left:a,right:b,delta:Math.round((b-a)*10)/10};}).filter(x=>x.left||x.right).sort((a,b)=>b.delta-a.delta)};}
function base(question:string,f:Filters):Answer{return {id:crypto.randomUUID(),question,intent:'Review evidence',status:'supported',summary:'',findings:[],citations:[],count:0,filters:{...f},notes:[],createdAt:new Date().toISOString(),model:'Evidence engine · rules-v2'};}
export function answerQuestion(all:Review[],question:string,filters:Filters={}):Answer {
 const a=base(question,filters),q=question.toLowerCase().trim();
 const clarify=(message:string)=>({...a,status:'clarify' as const,summary:message});
 if(!q||q.length>1000)return clarify('Ask a question of up to 1,000 characters.');
 if(/system prompt|ignore (all |previous )?instructions|api.?key|secret|execute|run code/i.test(q)){a.status='unsupported';a.summary='I can answer questions about review evidence and review statistics.';return a;}
 const comparisonQuestion=/\b(compare|versus|vs|after|before|declin\w*|fall|fell|drop\w*)\b/.test(q);
 for(const field of ['region','product','source','version'] as const){
  const values=[...new Set(all.map(r=>r[field]).filter(Boolean))];
  const matches=values.filter(v=>new RegExp(`(?:^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^a-z0-9])`,'i').test(q));
  if(matches.length===1&&!(field==='version'&&comparisonQuestion)){
   if(a.filters[field]&&a.filters[field]!==matches[0])return clarify(`Your question asks about ${matches[0]}, but the active ${field} filter is ${a.filters[field]}. Clear or change that filter first.`);
   a.filters[field]=matches[0];
  }else if(matches.length>1&&!comparisonQuestion)return clarify(`Choose one ${field}, or ask to compare the two groups.`);
 }
 if(/\b(last|this|next) (week|month|year)|yesterday|today/.test(q))return clarify('Use the date filters to select an exact date range, then ask again without a relative date.');
 const explicitDates=[...q.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(m=>m[0]);
 if(explicitDates.length){if(explicitDates.length!==2)return clarify('Use both a start and end date, or choose dates in the filters.');for(const d of explicitDates)if(!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)return clarify('Use valid dates in YYYY-MM-DD format.');if(explicitDates[0]>explicitDates[1])return clarify('The start date must precede the end date.');if((a.filters.from&&a.filters.from!==explicitDates[0])||(a.filters.to&&a.filters.to!==explicitDates[1]))return clarify('The dates in your question conflict with the active date filters.');a.filters.from=explicitDates[0];a.filters.to=explicitDates[1];}
 const requestedVersions=[...q.matchAll(/(?:version\s*|\bv)(\d+(?:\.\d+)+)/g)].map(m=>m[1]);
 if(requestedVersions.some(v=>!all.some(r=>r.version===v)))return clarify('That version is not present in this dataset. Choose one of the available version filters.');
 const regionRequest=q.match(/\b(eu|na|apac|us|uk|india|europe|germany|france)\b/i);
 if(regionRequest&&!all.some(r=>r.region.toLowerCase()===regionRequest[1]))return clarify(`There are no reviews labelled ${regionRequest[1].toUpperCase()} in this dataset. Select an available region.`);
 const rows=filterReviews(all,a.filters);a.count=rows.length;
 if(!rows.length){a.status='limited';a.summary='No reviews match this scope. Broaden the filters and try again.';return a;}
 const st=stats(rows),themes=TAXONOMY.filter(t=>t.terms.some(term=>hasTerm(q,term)));
 a.notes=['Counts refer to distinct reviews, not unique people. Theme and sentiment labels use English-language rules; inspect evidence for nuance.'];
 if(comparisonQuestion){
  let field:'version'|'region'|'product'|'source'='version',values:string[]=[];
  for(const f of ['version','region','product','source'] as const){const found=[...new Set(rows.map(r=>r[f]).filter(Boolean))].filter(v=>hasTerm(q,v));if(found.length>=2){field=f;values=found.sort((a,b)=>q.indexOf(a.toLowerCase())-q.indexOf(b.toLowerCase()));break;}}
  if(!values.length&&/after|before|declin|fall|drop/.test(q)){
   const pivot=requestedVersions[0]; const vs=[...new Set(rows.map(r=>r.version).filter(Boolean))].sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}));
   if(pivot){const next=vs.find(v=>v.localeCompare(pivot,undefined,{numeric:true})>0);if(next)values=[pivot,next];}
  }
  if(values.length!==2)return clarify('Name two available versions, regions, products, or sources to compare (for example, “Compare version 4.1 vs 4.3”).');
  const c=compare(rows,field,values[0],values[1]);a.intent='Segment comparison';a.comparison=c;
  a.summary=c.delta===null?'One group has no rated reviews, so a rating change cannot be calculated.':`Average rating changed from ${c.leftAverage} to ${c.rightAverage} (${c.delta>0?'+':''}${c.delta} stars), comparing ${c.leftCount} reviews in ${c.left} with ${c.rightCount} in ${c.right}.`;
  a.findings=c.themes.slice(0,4).map(t=>({text:`${t.label}: negative mentions ${t.left.toFixed(1)}% → ${t.right.toFixed(1)}% (${t.delta>0?'+':''}${t.delta} percentage points).`,reviewIds:rows.filter(r=>(r[field]===c.left||r[field]===c.right)&&r.aspects.some(x=>x.label===t.label&&x.sentiment==='negative')).slice(0,3).map(r=>r.id)}));
  a.citations=rows.filter(r=>a.findings.some(f=>f.reviewIds.includes(r.id)));a.notes.push('Review differences are observational. They do not prove that a release caused a change.');return a;
 }
 const numeric=/percentage|percent|\bshare\b|how many|\bcount\b|\baverage\b|\bavg\b/.test(q),positive=/\b(positive|positives|like|love|praise|best|good)\b/.test(q),negative=/\b(negative|negatives|complaints?|issues?|problems?|worst|dislike)\b/.test(q);
 const ratingMatches=[...q.matchAll(/\b(one|two|three|four|five|[1-5])[- ]stars?\b/g)];
 const ratingValues=ratingMatches.map(m=>Number(({one:1,two:2,three:3,four:4,five:5} as Record<string,number>)[m[1]]||m[1]));
 const targetRating=ratingValues[0]||null;
 const excludedRating=ratingMatches.length===1&&/\bnot\s*$/.test(q.slice(0,ratingMatches[0].index));
 const ratingUnion=ratingMatches.length>1&&ratingMatches.slice(1).every((m,i)=>/^\s+or\s+$/.test(q.slice(ratingMatches[i].index!+ratingMatches[i][0].length,m.index)));
 if(targetRating&&(/\b(below|above|under|over|least|most|between|except|excluding|neither|nor)\b/.test(q)||(/\bnot\b|n't\b/.test(q)&&!excludedRating)||(ratingMatches.length>1&&!ratingUnion)))return clarify('Please use one exact rating, “not five-star”, or explicit alternatives such as “three-star or five-star”. Other rating conditions need clarification.');
 if(targetRating&&(excludedRating||ratingUnion)&&(/\baverage\b|\bavg\b|\bof (?:the )?/.test(q)||themes.length))return clarify('Use a simple rating count or percentage for this condition, without an average, theme, or nested denominator.');
 if(numeric){
  if(/unique (people|customers|users)|how many (people|customers|users)/.test(q))return clarify('This dataset identifies reviews, not unique people. Ask for a review count instead.');
  a.intent='Dataset calculation';const pct=/percentage|percent|\bshare\b/.test(q),avg=/\baverage\b|\bavg\b/.test(q);
  if(avg){if(!/rating|stars?/.test(q))return clarify('I can calculate average ratings. Other numerical measures are not supported.');const selected=themes.length?rows.filter(r=>r.aspects.some(x=>themes.some(t=>t.key===x.key))):rows;const ss=stats(selected);a.metric={label:'Average rating'+(themes.length?' · '+themes.map(t=>t.label).join(', '):''),numerator:selected.reduce((n,r)=>n+(r.rating||0),0),denominator:ss.rated,value:ss.average,unit:'average'};a.summary=ss.average===null?'There are no ratings in this scope.':`Average rating is ${ss.average} across ${ss.rated} rated reviews${themes.length?' mentioning '+themes.map(t=>t.label.toLowerCase()).join(' or '):''} (${selected.length-ss.rated} unrated excluded).`;return a;}
  let subset=rows;let label='reviews';
  if(targetRating){subset=subset.filter(r=>r.rating!==null&&(excludedRating?r.rating!==targetRating:ratingValues.includes(r.rating)));label=excludedRating?`rated reviews other than ${targetRating}-star`:`${[...new Set(ratingValues)].map(n=>n+'-star').join(' or ')} reviews`;if(excludedRating)a.notes.push('Unrated reviews are excluded from rating matches; percentages use all reviews in the selected scope.');}
  if(themes.length){subset=subset.filter(r=>r.aspects.some(x=>themes.some(t=>t.key===x.key)&&(!negative||x.sentiment==='negative')&&(!positive||x.sentiment==='positive')));label+=` mentioning ${themes.map(t=>t.label.toLowerCase()).join(' or ')}`;}
  else if(/mention|about/.test(q)){a.status='unsupported';a.summary='I cannot reliably count that topic with the current theme catalogue. Use Explore to search exact review text, or choose a recognised theme.';return a;}
  else if(negative){subset=subset.filter(r=>r.aspects.some(x=>x.sentiment==='negative'));label='reviews with a negative feature mention';}
  else if(positive){subset=subset.filter(r=>r.aspects.some(x=>x.sentiment==='positive'));label='reviews with a positive feature mention';}
  else if(!targetRating&&pct)return clarify('Specify a rating or theme for the percentage, such as “What percentage are two-star?”');
  const amongRating=targetRating&&themes.length&&new RegExp('of (?:the )?(?:one|two|three|four|five|[1-5])[- ]star reviews').test(q);const denominator=amongRating?rows.filter(r=>r.rating===targetRating).length:rows.length,value=pct?(denominator?subset.length/denominator*100:0):subset.length;
  a.metric={label,numerator:subset.length,denominator,value:Math.round(value*10)/10,unit:pct?'percent':'count'};
  a.summary=`${subset.length} of ${denominator} reviews${pct?` (${value.toFixed(1)}%)`:''} ${label==='reviews'?'are in the selected scope.':`are ${label}.`}`;
  a.citations=themes.length?subset.slice(0,6):[];return a;
 }
 const generalWords=new Set('point out there really can you find major recurring themes theme overall overview like love best worst say tell strongest do'.split(' '));
 const remaining=queryTokens(q).filter(t=>!generalWords.has(t)&&!Object.values(a.filters).some(v=>v&&v.toLowerCase().split(/[^a-z0-9]+/).includes(t)));
 const broad=(/most|main|common|top|recurr|summari[sz]e|summary|overview/.test(q)||negative||positive)&&!themes.length&&remaining.length===0;
 if(broad){a.intent=positive?'Positive theme ranking':'Complaint ranking';
  const ranked=[...st.themes].sort((x,y)=>positive?y.positive-x.positive:y.negative-x.negative).filter(t=>(positive?t.positive:t.negative)>0);
  if(!ranked.length){a.status='limited';a.summary=`No ${positive?'positive':'negative'} theme mentions were identified in this scope. This is a rule-based finding, not proof that none exist.`;return a;}
  a.summary=`${ranked[0].label} is the most frequently identified ${positive?'positive theme':'complaint'}: ${positive?ranked[0].positive:ranked[0].negative} of ${rows.length} reviews. ${Math.round(st.coverage*100)}% of reviews match at least one recognised theme.`;
  a.findings=ranked.slice(0,5).map(t=>{const n=positive?t.positive:t.negative;return {text:`${t.label} — ${n} reviews (${(n/rows.length*100).toFixed(1)}%).`,reviewIds:rows.filter(r=>r.aspects.some(x=>x.key===t.key&&x.sentiment===(positive?'positive':'negative'))).slice(0,2).map(r=>r.id)};});
  a.citations=rows.filter(r=>a.findings.some(f=>f.reviewIds.includes(r.id)));a.notes.push('One review can discuss several themes, so theme percentages can total more than 100%.');return a;
 }
 const found=searchEvidence(rows,question,8);a.citations=found;
 if(!found.length){a.status='limited';a.summary='I could not find supporting reviews for this question. Try a specific product feature or broaden your filters.';return a;}
 a.status=found.length<3?'limited':'supported';a.summary=`Found ${found.length} relevant review examples in a scope of ${rows.length} reviews. These examples do not establish how common an opinion is.`;
 a.findings=found.slice(0,5).map(r=>({text:(r.aspects.find(x=>themes.some(t=>t.key===x.key))?.evidence||r.text).slice(0,500),reviewIds:[r.id]}));return a;
}
