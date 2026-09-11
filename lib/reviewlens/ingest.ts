import type { Mapping, ParsedFile, Review, ImportIssue } from "./types";
import { classifyAspects } from "./intelligence";
export const LIMITS = { bytes: 2 * 1024 * 1024, rows: 2000, text: 6000, datasets: 20 };
export function parseFile(content: string, filename: string): ParsedFile {
  if(new TextEncoder().encode(content).length>LIMITS.bytes) throw Error("Choose a file smaller than 2 MB.");
  content=content.replace(/^\uFEFF/,""); const issues: ImportIssue[]=[];
  if(filename.toLowerCase().endsWith(".json")) {
    let value; try { value=JSON.parse(content); } catch { throw Error("This JSON file is not valid. Check brackets and quotation marks."); }
    const list=Array.isArray(value)?value:value?.reviews;
    if(!Array.isArray(list)||!list.length||list.some(x=>!x||typeof x!=="object"||Array.isArray(x))) throw Error("Use a JSON array of review objects, or an object containing a reviews array.");
    if(list.length>LIMITS.rows) throw Error("A dataset can contain up to 2,000 reviews.");
    const headers=[...new Set<string>(list.flatMap(x=>Object.keys(x)))];
    return {headers,rows:list.map(x=>Object.fromEntries(headers.map(k=>[k,x[k]==null?"":String(x[k])]))),issues};
  }
  if(!filename.toLowerCase().endsWith(".csv")) throw Error("Choose a CSV or JSON file.");
  const matrix:string[][]=[]; let row:string[]=[],cell="",quoted=false,afterQuote=false;
  for(let i=0;i<content.length;i++) {
    const c=content[i];
    if(quoted){if(c==='"'){if(content[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell.trim()||afterQuote)throw Error("Unexpected quotation mark in CSV. Quote the entire field and double internal quotes.");quoted=true;continue;}
    if(c===","){row.push(cell);cell="";afterQuote=false;continue;}
    if(c==="\n"||c==="\r"){if(c==="\r"&&content[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))matrix.push(row);row=[];cell="";afterQuote=false;continue;}
    if(afterQuote&&c.trim())throw Error("Unexpected text after a quoted CSV field."); cell+=c;
  }
  if(quoted)throw Error("A quoted CSV field is unfinished.");
  row.push(cell);if(row.some(x=>x.trim()))matrix.push(row);
  if(matrix.length<2)throw Error("Include a header and at least one review row.");
  const headers=matrix.shift()!.map(x=>x.trim());
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error("Every column needs a unique, non-empty header.");
  if(matrix.length>LIMITS.rows)throw Error("A dataset can contain up to 2,000 reviews.");
  const rows:Record<string,string>[]=[];
  matrix.forEach((r,i)=>{if(r.length!==headers.length){issues.push({row:i+2,message:`Expected ${headers.length} columns, found ${r.length}. Put quotation marks around text containing commas.`});return;} rows.push(Object.fromEntries(headers.map((h,j)=>[h,r[j]])));});
  return {headers,rows,issues};
}
export function guessMapping(headers:string[]):Mapping {
  const aliases:Record<keyof Mapping,string[]>={text:["review_text","text","comment","content","review","body"],rating:["rating","stars","score"],date:["review_date","date","created_at"],product:["product","product_name","item"],version:["product_version","version"],region:["region","country","location"],source:["source","platform","channel"],id:["review_id","id"]};
  return Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,headers.find(h=>v.includes(h.toLowerCase()))||""])) as Mapping;
}
export function normalizeImport(parsed:ParsedFile,mapping:Mapping):{reviews:Review[];issues:ImportIssue[];duplicates:number} {
  if(!mapping||typeof mapping.text!=='string'||!parsed.headers.includes(mapping.text))throw Error("Map the column containing review text.");
  const issues=[...parsed.issues],reviews:Review[]=[],seen=new Set<string>();let duplicates=0;
  parsed.rows.forEach((r,i)=>{
    const get=(k:keyof Mapping)=>(r[mapping[k]]||"").trim(); const text=get("text");
    if(!text||text.length>LIMITS.text){issues.push({row:i+2,message:!text?"Review text is missing.":"Review exceeds 6,000 characters."});return;}
    const raw=get("rating"),rating=raw?Number(raw):null;
    if(rating!==null&&(!Number.isFinite(rating)||rating<1||rating>5)){issues.push({row:i+2,message:"Rating must be a number between 1 and 5, or empty."});return;}
    const date=get("date").slice(0,10);
    if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)){issues.push({row:i+2,message:"Date must be a valid YYYY-MM-DD date."});return;}
    const normalized=text.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
    const key=get("id")?`${get("source")}|${get("product")}|${get("id")}`:[normalized,rating,date,get("source"),get("product"),get("version"),get("region")].join("|");
    if(seen.has(key)){duplicates++;return;}seen.add(key);
    reviews.push({id:crypto.randomUUID(),text,rating,date,product:get("product"),version:get("version"),region:get("region"),source:get("source"),aspects:classifyAspects(text)});
  });
  return {reviews,issues,duplicates};
}
