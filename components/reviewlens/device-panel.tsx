'use client';
import { useEffect, useRef, useState } from 'react';
import { DeviceSearch } from '@/lib/reviewlens/device-client';
import type { Dataset, Review } from '@/lib/reviewlens/types';
import { Progress } from '@/components/ui/progress';
import { Layers, Loader2 } from 'lucide-react';
export function useDeviceIndex(dataset: Dataset | null) {
  const client = useRef(new DeviceSearch());
  const [indexed,setIndexed] = useState(0), [working,setWorking] = useState(false);
  const [message,setMessage] = useState(''), [error,setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    let active=true;
    const activeClient=client.current;
    activeClient.cancel();setIndexed(0);setWorking(false);setMessage('');setError('');
    if (dataset) activeClient.run('status',dataset.id,dataset.reviews || []).then(r=>{
      if(active&&version===generation.current)setIndexed(r.indexed);
    }).catch(e=>{if(active&&version===generation.current&&e.name!=='AbortError')setError(e.message);});
    return ()=>{active=false;activeClient.cancel();};
  },[dataset]);
  async function build() {
    if(!dataset)return;
    client.current.cancel(); const version=++generation.current;
    setWorking(true);setError('');setMessage('Preparing on-device search…');
    try {
      const r=await client.current.run('index',dataset.id,dataset.reviews||[],p=>{
        if(version!==generation.current)return;setMessage(p.message);if(p.indexed!==undefined)setIndexed(p.indexed);
      });
      if(version===generation.current){setIndexed(r.indexed);setMessage('Ready. Choose On-device semantic search in Ask.');}
    } catch(e) {if(version===generation.current&&(e as Error).name!=='AbortError')setError((e as Error).message);}
    finally {if(version===generation.current)setWorking(false);}
  }
  function pause(){generation.current++;client.current.cancel();setWorking(false);setMessage('Paused. Resume to reuse completed reviews.');}
  async function clear(id=dataset?.id) {
    if(!id)return;pause();setError('');
    try {await client.current.run('clear',id,[]);setIndexed(0);setMessage('Device index cleared. Saved server reviews are unchanged.');}
    catch(e){setError((e as Error).message);throw e;}
  }
  async function search(question:string,scope:Review[],signal:AbortSignal) {
    if(!dataset)throw Error('Select a dataset.');
    const abort=()=>client.current.cancel();signal.addEventListener('abort',abort,{once:true});
    try {const r=await client.current.run('search',dataset.id,dataset.reviews||[],p=>setMessage(p.message),question,scope.map(r=>r.id));return r.hits;}
    finally{signal.removeEventListener('abort',abort);}
  }
  return {indexed,working,message,error,build,pause,clear,search};
}
export function DevicePanel({device,count,disabled=false}:{device:ReturnType<typeof useDeviceIndex>;count:number;disabled?:boolean}) {
  return <section className="panel device-panel">
    <div className="panel-title"><div><p className="eyebrow">NO API KEY REQUIRED</p><h2>On-device semantic search</h2></div><Layers size={24}/></div>
    <p>Find reviews by meaning using a small open-source model on this device. Results contain source passages; this mode does not generate AI summaries.</p>
    <p className="footnote">First use downloads the model from Hugging Face and runtime files from jsDelivr. Download time and indexing speed depend on your connection and device. There are no per-request API charges.</p>
    <div className="scope"><strong>{device.indexed} / {count} reviews indexed on this device</strong></div>
    <Progress value={count?device.indexed/count*100:0}/>
    <p role="status" aria-live="polite" className="small">{device.message}</p>
    {device.error&&<div role="alert" className="notice error">{device.error} You can select Basic analysis in Ask.</div>}
    <div className="button-row">
      <button className="btn primary" disabled={disabled||device.working||device.indexed===count} onClick={device.build}>{device.working?<Loader2 size={16} className="spin"/>:<Layers size={16}/>} {device.working?'Preparing…':device.indexed===count?'Ready on this device':device.indexed?'Resume on-device indexing':'Download model & build index'}</button>
      {device.working&&<button className="btn secondary" onClick={device.pause}>Pause</button>}
      {!device.working&&device.indexed>0&&<button className="btn secondary" disabled={disabled} onClick={()=>device.clear().catch(()=>{})}>Clear device index</button>}
    </div>
    <p className="footnote">Vectors and cached passages stay in this browser. Your original reviews and saved answers remain on the ReviewLens server. Clearing browser data removes local progress. This mode does not send review text to OpenAI.</p>
  </section>;
}
