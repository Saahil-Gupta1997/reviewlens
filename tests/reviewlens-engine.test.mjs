import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion,classifyAspects,filterReviews,stats,compare} from '../work/intelligence.mjs';
import {parseFile,normalizeImport,guessMapping} from '../work/ingest.mjs';
const texts=[['Checkout works well, but login fails.',2,'EU','1.0'],['Login is fast and reliable.',5,'NA','1.0'],['My password is rejected.',1,'EU','2.0'],['Battery drains too quickly.',2,'NA','2.0'],['No login problems.',null,'EU','2.0']];
const rows=texts.map(([text,rating,region,version],i)=>({id:String(i),text,rating,region,version,product:'Tool',source:'Store',date:'2026-08-01',aspects:classifyAspects(text)}));
test('rating questions preserve negation and explicit alternatives',()=>{
 const fixture=[5,1,5].map((rating,i)=>({...rows[0],id:String(i),rating}));
 for(const [question,expected] of [['How many reviews are five-star?',2],['How many reviews are not five-star?',1],['How many reviews are three-star or five-star?',2],['What percentage are not five-star?',33.3],['What percentage are three-star or five-star?',66.7]]){
  const a=answerQuestion(fixture,question);assert.equal(a.status,'supported',question);assert.equal(a.metric.value,expected,question);
 }
 assert.equal(answerQuestion([...fixture,{...fixture[0],id:'unrated',rating:null}],'How many reviews are not five-star?').metric.value,1);
 assert.equal(answerQuestion(fixture,'How many reviews are not five-star?',{rating:'5'}).metric.value,0);
});
test('ambiguous rating expressions clarify instead of silently calculating',()=>{
 for(const q of ['How many reviews are not three-star or five-star?','How many reviews are three-star and five-star?','How many reviews are below five-star?','How many reviews are at least three-star?','How many reviews are not only five-star?','What is the average rating of not five-star reviews?']){
  const a=answerQuestion(rows,q);assert.equal(a.status,'clarify',q);assert.equal(a.metric,undefined,q);
 }
});
test('prevalence counts all relevant reviews regardless of retrieved example count',()=>{const a=answerQuestion(rows,'What negative do most people point to?');assert.equal(a.count,5);assert.match(a.summary,/2 of 5/);assert.equal(a.intent,'Complaint ranking');});
test('sentiment is separate from star rating and feature polarity',()=>{assert.equal(rows[0].aspects.find(a=>a.key==='billing').sentiment,'positive');assert.equal(rows[0].aspects.find(a=>a.key==='login').sentiment,'negative');assert.equal(rows[4].aspects.find(a=>a.key==='login').sentiment,'positive');});
test('low rated share and average handle unrated records',()=>{assert.equal(answerQuestion(rows,'What percentage are two-star?').metric.value,40);assert.equal(answerQuestion(rows,'What is the average rating?').metric.value,2.5);assert.equal(stats(rows).unrated,1);});
test('scoped topic average uses the matching subset',()=>{const a=answerQuestion(rows,'What is the average rating for login?');assert.equal(a.metric.denominator,3);assert.equal(a.metric.value,2.67);});
test('two explicit comparison groups respect the written direction',()=>{assert.equal(answerQuestion(rows,'Compare version 2.0 vs 1.0').comparison.left,'2.0');assert.equal(answerQuestion(rows,'Compare version 2.0 vs 1.0').comparison.right,'1.0');});
test('unrecognised topic complaint does not return a general ranking',()=>{const a=answerQuestion(rows,'What are complaints about Alexa integration?');assert.notEqual(a.intent,'Complaint ranking');assert.equal(a.citations.length,0);});
test('unknown or conflicting scope requests clarify',()=>{assert.equal(answerQuestion(rows,'What do EU customers say?',{region:'NA'}).status,'clarify');assert.equal(answerQuestion(rows,'What changed last month?').status,'clarify');assert.equal(answerQuestion(rows,'What do UK customers say?').status,'clarify');});
test('explicit date ranges constrain results and invalid dates clarify',()=>{assert.equal(answerQuestion(rows,'How many reviews from 2026-09-01 to 2026-09-30?').count,0);assert.equal(answerQuestion(rows,'How many reviews from 2026-02-30 to 2026-03-10?').status,'clarify');});
test('requests to count people are not passed off as review counts',()=>{assert.equal(answerQuestion(rows,'How many customers mention login?').status,'clarify');});
test('quoted multiline commas and escaped quotes parse correctly',()=>{const p=parseFile('review_text,rating\r\n"A line, with comma\nand a ""quote""",4\r\nGood,5','reviews.csv');assert.equal(p.rows.length,2);assert.equal(p.rows[0].review_text,'A line, with comma\nand a "quote"');});
test('metadata, invalid dates, non-finite ratings, and duplicates are validated',()=>{const p=parseFile('review_id,review_text,rating,review_date\na,Works,5,2026-08-01\na,Works,5,2026-08-01\nb,Oops,NaN,2026-08-01\nc,Oops,2,2026-02-30','r.csv');const r=normalizeImport(p,guessMapping(p.headers));assert.equal(r.reviews.length,1);assert.equal(r.duplicates,1);assert.equal(r.issues.length,2);});
test('invalid CSV headers and oversized row counts are rejected',()=>{assert.throws(()=>parseFile('x,x\na,b','r.csv'));assert.throws(()=>parseFile('review_text\n'+Array(2001).fill('hello').join('\n'),'r.csv'));});
