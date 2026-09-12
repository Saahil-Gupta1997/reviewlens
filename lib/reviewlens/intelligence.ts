import type { Aspect, Review, Filters, Stats, ThemeStat, Sentiment, Answer } from './types';
export const METHOD='rules-v2';
export const TAXONOMY=[
 {key:'login',label:'Login & authentication',terms:['login','log in','sign in','sign-in','authentication','password','signing in','sign-in']},
 {key:'performance',label:'Speed & performance',terms:['performance','slow','lag','freeze','freez','loading','load time','speed','sluggish','latency','fast','responsive']},
 {key:'reliability',label:'Crashes & reliability',terms:['crash','bug','error','reliable','reliability','unstable','stability','broken','disconnect']},
 {key:'billing',label:'Checkout & billing',terms:['checkout','billing','payment','charged','charge','invoice','refund']},
 {key:'export',label:'Exports & reporting',terms:['export','exports','download','report','reporting']},
 {key:'usability',label:'Ease of use',terms:['navigation','navigate','interface','confusing','intuitive','easy to use','usability','user friendly','user-friendly']},
 {key:'support',label:'Customer support',terms:['support','customer service','staff','agent','help desk','helpdesk']},
 {key:'price',label:'Price & value',terms:['price','pricing','expensive','cost','value','subscription','affordable']},
 {key:'battery',label:'Battery & charging',terms:['battery','charging','charger','charge life']},
 {key:'delivery',label:'Delivery & packaging',terms:['delivery','shipping','package','packaging','arrived','courier']},
 {key:'quality',label:'Build quality',terms:['quality','durable','material','flimsy','sturdy','broke','defect']},
 {key:'sound',label:'Sound & noise',terms:['sound','audio','noise','noisy','quiet','speaker','volume']},
 {key:'cleanliness',label:'Cleanliness',terms:['dirty','dust','stain','mold','housekeeping']},
 {key:'food',label:'Food & breakfast',terms:['breakfast','food','buffet','meal','restaurant']},
 {key:'connectivity',label:'Connectivity & sync',terms:['wifi','wi-fi','bluetooth','connection','internet','sync','network']},
];
export function hasTerm(text:string,term:string){return new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^a-z0-9])`,'i').test(text);}
function clauseSentiment(clause:string):Sentiment {
 const x=clause.toLowerCase().replace(/[’‘]/g,"'");
 const negative=/\b(fail\w*|broken|crash\w*|slow\w*|lag\w*|freez\w*|reject\w*|confus\w*|terrible|awful|bad|poor|late|delay\w*|expensive|dirty|noisy|rude|unreliable|unhelpful|flimsy|disappoint\w*|drain\w*|overheat\w*|bug\w*|error\w*|problem\w*|issue\w*|difficult|hard|stopped|useless|disconnect\w*)\b/g;
 const positive=/\b(fast\w*|quick\w*|reliable|simple|smooth\w*|clear|easy|intuitive|excellent|great|good|love|helpful|clean|quiet|affordable|sturdy|durable|perfect|responsive|stable|fine|okay|works|working)\b/g;
 let neg=0,pos=0;
 for(const match of x.matchAll(negative)){const prior=x.slice(Math.max(0,match.index!-32),match.index); if(/(?:no|not|never|without|no longer|isn't|is not|wasn't|was not|aren't|are not|doesn't|does not|don't|do not|didn't|did not|won't|will not|can't|cannot|couldn't|could not)\s+(?:\w+\s+){0,2}$/.test(prior))pos++;else neg++;}
 for(const match of x.matchAll(positive)){const prior=x.slice(Math.max(0,match.index!-32),match.index);if(/(?:no longer|not|never|isn't|is not|wasn't|was not|aren't|are not|doesn't|does not|don't|do not|didn't|did not|won't|will not|can't|cannot|couldn't|could not)\s+(?:\w+\s+){0,2}$/.test(prior))neg++;else pos++;}
 if(/\b(can't|cannot|couldn't|won't)\b/.test(x)&&!pos)neg++;
 if(/\b(?:doesn't|does not|don't|do not|didn't|did not|isn't|is not|aren't|are not)\s+(?:\w+\s+){0,2}(?:work|working|load|connect|respond|arrive)\b/.test(x))neg++;
 if(/\btoo (?:long|much|short|little|high|expensive)\b|\bnot (?:work|load|connect|respond|arriv)/.test(x))neg++;
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
export function filterReviews(reviews:Review[],f:Filters):Review[]{return reviews.filter(r=>(!f.product||r.product===f.product)&&(!f.version||r.version===f.version)&&(!f.region||r.region===f.region)&&(!f.source||r.source===f.source)&&(!f.from||!!r.date&&r.date>=f.from)&&(!f.to||!!r.date&&r.date<=f.to)&&(!f.rating||(f.rating==='negative'?r.rating!==null&&r.rating<=2:f.rating==='positive'?r.rating!==null&&r.rating>=4:f.rating==='unrated'?r.rating===null:r.rating!==null&&Math.round(r.rating)===Number(f.rating)))&&(!f.search||r.text.toLowerCase().includes(f.search.toLowerCase())));}
export function stats(reviews:Review[]):Stats {
 const themes=new Map<string,ThemeStat>();
 for(const r of reviews)for(const a of r.aspects){let t=themes.get(a.key);if(!t){t={key:a.key,label:a.label,count:0,negative:0,positive:0,neutral:0,share:0,reviewIds:[]};themes.set(a.key,t);}t.count++;t[a.sentiment]++;t.reviewIds.push(r.id);}
 const rated=reviews.filter(r=>r.rating!==null),negative=rated.filter(r=>r.rating!<=2).length,positive=rated.filter(r=>r.rating!>=4).length;
 return {count:reviews.length,rated:rated.length,average:rated.length?Math.round(rated.reduce((n,r)=>n+r.rating!,0)/rated.length*100)/100:null,negative,positive,unrated:reviews.length-rated.length,coverage:reviews.length?reviews.filter(r=>r.aspects.length).length/reviews.length:0,distribution:[1,2,3,4,5].map(n=>rated.filter(r=>Math.round(r.rating!)===n).length),themes:[...themes.values()].map(t=>({...t,share:reviews.length?t.negative/reviews.length*100:0})).sort((a,b)=>b.negative-a.negative||b.count-a.count||a.label.localeCompare(b.label))};
}
const stop=new Set('what which who why how are is do does did the a an to of in on for from about reviews review customers customer people users user most common main top negative negatives positive positives mention mentions mentioned saying say feedback complaints complaint issues issue problems problem percentage percent share many count tell me summarize summary please product this that and with'.split(' '));
export function queryTokens(q:string){return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>x.length>2&&!stop.has(x));}
export function searchEvidence(reviews:Review[],question:string,limit=8):Review[]{
 const themes=TAXONOMY.filter(t=>t.terms.some(term=>hasTerm(question.toLowerCase(),term))),tokens=queryTokens(question),complaints=/\b(complain\w*|negative|dislike|worst|problems?|issues?)\b/i.test(question);
 return reviews.map(r=>({r,score:themes.length?r.aspects.filter(a=>themes.some(t=>t.key===a.key)&&(!complaints||a.sentiment==='negative')).length*4:tokens.reduce((s,t)=>s+(hasTerm(r.text.toLowerCase(),t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id)).slice(0,limit).map(x=>x.r);
}
export function compare(reviews:Review[],field:'version'|'region'|'product'|'source',left:string,right:string){const l=reviews.filter(r=>r[field]===left),r=reviews.filter(r=>r[field]===right),ls=stats(l),rs=stats(r);return {field,left,right,leftCount:l.length,rightCount:r.length,leftAverage:ls.average,rightAverage:rs.average,delta:ls.average!==null&&rs.average!==null?Math.round((rs.average-ls.average)*100)/100:null,themes:TAXONOMY.map(t=>{const a=ls.themes.find(x=>x.key===t.key)?.share||0,b=rs.themes.find(x=>x.key===t.key)?.share||0;return {label:t.label,left:a,right:b,delta:Math.round((b-a)*10)/10};}).filter(x=>x.left||x.right).sort((a,b)=>b.delta-a.delta)};}
function base(question:string,f:Filters):Answer{return {id:crypto.randomUUID(),question,intent:'Review evidence',status:'supported',summary:'',findings:[],citations:[],count:0,filters:{...f},notes:[],createdAt:new Date().toISOString(),model:'Evidence engine · rules-v2'};}
export function answerQuestion(all:Review[],question:string,filters:Filters={}):Answer {
 const a=base(question,filters),q=question.toLowerCase().trim();
 const clarify=(message:string)=>({...a,status:'clarify' as const,summary:message});
 if(!q||q.length>1000)return clarify('Ask a question of up to 1,000 characters.');
 if(/system prompt|ignore (all |previous )?instructions|reveal (?:the )?(?:instructions|api.?key|secret)|show (?:the )?api.?key|run (?:this )?code/i.test(q)){a.status='unsupported';a.summary='I can answer questions about review evidence and review statistics.';return a;}
 const comparisonQuestion=/\b(compare|versus|vs|declin\w*|fall|fell|drop(?:ping|ped|s)?|change|changed)\b/.test(q);
 for(const field of ['region','product','source','version'] as const){
  const values=[...new Set(all.map(r=>r[field]).filter(Boolean))];
  const matches=values.filter(v=>{if(v.length<2)return false;const escaped=v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),pattern=`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`;if(field==='region'&&v.length<=2&&!['EU','NA'].includes(v.toUpperCase())&&!new RegExp(`\\b(?:in|from|region)\\s+${escaped}\\b`,'i').test(q))return false;return new RegExp(pattern,'i').test(q)&&!(field==='version'&&/^\d+(?:\.\d+)?$/.test(v)&&new RegExp(`${v.replace('.','\\.')}[- ]star`,'i').test(q));});
  if(matches.length===1&&!(field==='version'&&comparisonQuestion)){
   if(a.filters[field]&&a.filters[field]!==matches[0])return clarify(`Your question asks about ${matches[0]}, but the active ${field} filter is ${a.filters[field]}. Clear or change that filter first.`);
   a.filters[field]=matches[0];
  }else if(matches.length>1&&!comparisonQuestion)return clarify(`Choose one ${field}, or ask to compare the two groups.`);
 }
 if(/\b(last|this|next) (week|month|year)|yesterday|today/.test(q))return clarify('Use the date filters to select an exact date range, then ask again without a relative date.');
 const explicitDates=[...q.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(m=>m[0]);
 if(explicitDates.length){if(explicitDates.length!==2)return clarify('Use both a start and end date, or choose dates in the filters.');for(const d of explicitDates)if(!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)return clarify('Use valid dates in YYYY-MM-DD format.');if(explicitDates[0]>explicitDates[1])return clarify('The start date must precede the end date.');if((a.filters.from&&a.filters.from!==explicitDates[0])||(a.filters.to&&a.filters.to!==explicitDates[1]))return clarify('The dates in your question conflict with the active date filters.');a.filters.from=explicitDates[0];a.filters.to=explicitDates[1];}
 const requestedVersions=[...q.matchAll(/(?:version\s*|\bv\s*)(\d+(?:\.\d+)+)/g)].map(m=>m[1]);
 if(requestedVersions.some(v=>!all.some(r=>r.version===v)))return clarify('That version is not present in this dataset. Choose one of the available version filters.');
 const comparesVersions=comparisonQuestion&&[...q.matchAll(/\b\d+(?:\.\d+)+\b/g)].length>=2;
 if(requestedVersions.length===1&&!comparesVersions){if(a.filters.version&&a.filters.version!==requestedVersions[0])return clarify('The version in your question conflicts with the active version filter.');a.filters.version=requestedVersions[0];}
 const regionAliases:Record<string,string>={europe:'EU',eu:'EU',northamerica:'NA',na:'NA',apac:'APAC',us:'US',uk:'UK',india:'IN',germany:'DE',france:'FR'};
 const regionRequest=q.match(/\b(europe|eu|north america|na|apac|india|germany|france)\b/i)||q.match(/\b(?:in|from|region)\s+(us|uk)\b/i)||q.match(/\b(us|uk)\s+(?:customers?|reviews?|users?)\b/i);
 const comparedRegions=[...new Set(all.map(r=>r.region).filter(Boolean))].filter(v=>hasTerm(q,v));
 if(regionRequest&&!(comparisonQuestion&&comparedRegions.length>=2)){const wanted=regionAliases[regionRequest[1].replace(/\s/g,'').toLowerCase()]||regionRequest[1].toUpperCase();if(all.some(r=>r.region.toUpperCase()===wanted)){if(a.filters.region&&a.filters.region!==wanted)return clarify(`Your question conflicts with the active region filter.`);a.filters.region=wanted;}else return clarify(`There are no reviews labelled ${wanted} in this dataset. Select an available region.`);}
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
 const numeric=/percentage|percent|proportion|\bshare\b|how many|\bcount\b|\baverage\b|\bavg\b/.test(q),positive=/\b(positive|positives|like|love|praise|best|good)\b/.test(q),negative=/\b(negative|negatives|complain\w*|issues?|problems?|worst|dislike)\b/.test(q);
 const sentimentNegated=positive&&/\b(?:not|non)[ -]?positive\b/.test(q)||negative&&/\b(?:not|non)[ -]?negative\b/.test(q);
 const topicNegated=themes.length>0&&/\b(?:not|aren't|are not|isn't|is not)\s+(?:reviews?\s+)?(?:about|mentioning|that mention)\b/.test(q);
 const themePositions=themes.map(t=>Math.min(...t.terms.map(term=>q.indexOf(term)).filter(n=>n>=0))).sort((x,y)=>x-y);
 const themeAnd=themes.length>1&&themePositions.slice(1).every((position,i)=>/\band\b/.test(q.slice(themePositions[i],position)));
 if(/\b\d+\.\d+[- ]stars?\b/.test(q))return clarify('Half-star rating conditions are not supported; use an integer rating from 1 to 5.');
 const ratingMatches=[...q.matchAll(/\b(one|two|three|four|five|[1-5])(?:[- ]stars?|\s+stars?|\s+rating|\s+reviews?)\b/g),...q.matchAll(/\brated\s+(one|two|three|four|five|[1-5])\b/g)].sort((a,b)=>(a.index||0)-(b.index||0));
 const ratingValues=ratingMatches.map(m=>Number(({one:1,two:2,three:3,four:4,five:5} as Record<string,number>)[m[1]]||m[1]));
 const targetRating=ratingValues[0]||null;
 const excludedRating=ratingMatches.length===1&&/\bnot\s*$/.test(q.slice(0,ratingMatches[0].index));
 const ratingUnion=ratingMatches.length>1&&ratingMatches.slice(1).every((m,i)=>/^\s+or\s+$/.test(q.slice(ratingMatches[i].index!+ratingMatches[i][0].length,m.index)));
 if(targetRating&&(/\b(below|above|under|over|least|most|between|except|excluding|neither|nor)\b/.test(q)||(/\bnot\b|n't\b/.test(q)&&!excludedRating)||(ratingMatches.length>1&&!ratingUnion)))return clarify('Please use one exact rating, “not five-star”, or explicit alternatives such as “three-star or five-star”. Other rating conditions need clarification.');
 if(targetRating&&(excludedRating||ratingUnion)&&(/\baverage\b|\bavg\b|\bof (?:the )?/.test(q)||themes.length))return clarify('Use a simple rating count or percentage for this condition, without an average, theme, or nested denominator.');
 if(numeric){
  if(/unique (people|customers|users)|how many (people|customers|users)/.test(q))return clarify('This dataset identifies reviews, not unique people. Ask for a review count instead.');
  if(/\bbad reviews?\b/.test(q)&&!themes.length&&!targetRating)return clarify('“Bad” is ambiguous. Ask for one- or two-star reviews, or reviews with a negative feature mention.');
  a.intent='Dataset calculation';const pct=/percentage|percent|proportion|\bshare\b/.test(q),avg=/\baverage\b|\bavg\b/.test(q);
  if(avg){if(!/rating|score|stars?/.test(q))return clarify('I can calculate average ratings. Other numerical measures are not supported.');let selected=themes.length?rows.filter(r=>r.aspects.some(x=>themes.some(t=>t.key===x.key))):rows;if(targetRating)selected=selected.filter(r=>r.rating===targetRating);const ss=stats(selected);a.metric={label:'Average rating'+(targetRating?` · ${targetRating}-star reviews`:themes.length?' · '+themes.map(t=>t.label).join(', '):''),numerator:selected.reduce((n,r)=>n+(r.rating||0),0),denominator:ss.rated,value:ss.average,unit:'average'};a.summary=ss.average===null?'There are no ratings in this scope.':`Average rating is ${ss.average} across ${ss.rated} rated reviews${targetRating?` matching ${targetRating}-star`:themes.length?' mentioning '+themes.map(t=>t.label.toLowerCase()).join(' or '):''} (${selected.length-ss.rated} unrated excluded).`;return a;}
  const themeMatches=(r:Review)=>themeAnd?themes.every(t=>r.aspects.some(x=>x.key===t.key)):r.aspects.some(x=>themes.some(t=>t.key===x.key));
  const sentimentMatches=(r:Review)=>r.aspects.some(x=>themes.some(t=>t.key===x.key)&&(!negative&&!positive||(negative&&(sentimentNegated?x.sentiment!=='negative':x.sentiment==='negative'))||(positive&&(sentimentNegated?x.sentiment!=='positive':x.sentiment==='positive'))));
  let denominatorRows=rows,subset=rows;let label='reviews';
  if(themes.length&&pct&&targetRating&&!/\bof (?:the )?(?:one|two|three|four|five|[1-5])[- ]star reviews\b/.test(q))denominatorRows=rows.filter(themeMatches);
  else if(themes.length&&pct&&(negative||positive))denominatorRows=rows.filter(themeMatches);
  if(targetRating){subset=subset.filter(r=>r.rating!==null&&(excludedRating?r.rating!==targetRating:ratingValues.includes(r.rating)));label=excludedRating?`rated reviews other than ${targetRating}-star`:`${[...new Set(ratingValues)].map(n=>n+'-star').join(' or ')} reviews`;if(excludedRating)a.notes.push('Unrated reviews are excluded from rating matches; percentages use all reviews in the selected scope.');}
  if(themes.length){subset=subset.filter(r=>topicNegated?!themeMatches(r):(negative||positive)?sentimentMatches(r):themeMatches(r));label+=topicNegated?` not about ${themes.map(t=>t.label.toLowerCase()).join(themeAnd?' and ':' or ')}`:` mentioning ${themes.map(t=>t.label.toLowerCase()).join(themeAnd?' and ':' or ')}`;}
  else if(/mention|about/.test(q)){a.status='unsupported';a.summary='I cannot reliably count that topic with the current theme catalogue. Use Explore to search exact review text, or choose a recognised theme.';return a;}
  else if(negative){if(/\bnegative reviews?\b/.test(q)){subset=subset.filter(r=>r.rating!==null&&r.rating<=2);label='low-rated reviews (1–2 stars)';a.notes.push('Here, “negative reviews” means ratings of one or two stars.');}else{subset=subset.filter(r=>r.aspects.some(x=>x.sentiment==='negative'));label='reviews with a negative feature mention';}}
  else if(positive){subset=subset.filter(r=>r.aspects.some(x=>x.sentiment==='positive'));label='reviews with a positive feature mention';}
  else if(!targetRating&&pct)return clarify('Specify a rating or theme for the percentage, such as “What percentage are two-star?”');
  const amongRating=targetRating&&themes.length&&new RegExp('of (?:the )?(?:one|two|three|four|five|[1-5])[- ]star reviews').test(q);const denominator=amongRating?rows.filter(r=>r.rating===targetRating).length:denominatorRows.length,value=pct?(denominator?subset.length/denominator*100:0):subset.length;
  a.metric={label,numerator:subset.length,denominator,value:Math.round(value*10)/10,unit:pct?'percent':'count'};
  a.summary=`${subset.length} of ${denominator} reviews${pct?` (${value.toFixed(1)}%)`:''} ${label==='reviews'?'are in the selected scope.':`are ${label}.`}`;
  a.citations=themes.length?subset.slice(0,6):[];return a;
 }
 const generalWords=new Set('point out there really can you find major recurring themes theme overall overview like love best worst biggest dislike say tell strongest do'.split(' '));
 const remaining=queryTokens(q).filter(t=>!generalWords.has(t)&&!Object.values(a.filters).some(v=>v&&v.toLowerCase().split(/[^a-z0-9]+/).includes(t)));
 const broad=(/most|main|common|top|recurr|summari[sz]e|summary|overview|biggest|dislike/.test(q)||negative||positive)&&!themes.length&&remaining.length===0;
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
