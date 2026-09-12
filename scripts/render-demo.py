"""Render a captioned API walkthrough from captured HTTP responses, never a UI recording.
Requires Pillow; run scripts/capture-demo.mjs first, then this script and ffmpeg.
"""
from pathlib import Path
import json, textwrap
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'docs/demo/captured-workflow.json').read_text())
s=data['steps']; pct=s[2]['response']; ranking=s[3]['response']; scoped=s[4]['response']
source=ranking['citations'][0]
scenes=[
 ('Load the review corpus', '20 fictional reviews accepted',
  [('REQUEST','POST /api/workspace  { action: "demo" }'),('RESPONSE',f'HTTP {s[0]["status"]}  |  accepted: 20'),('CHECK','GET returns 20 persisted reviews.')],
  'The actual production build served these requests locally. Basic analysis; no API key.'),
 ('Calculate with a visible denominator', pct['summary'],
  [('QUESTION',pct['question']),('RESPONSE',f'numerator: {pct["metric"]["numerator"]}   denominator: {pct["metric"]["denominator"]}   value: {pct["metric"]["value"]}%'),('CHECK','Count independently checked against stored review ratings.')],
  'This is a calculation over reviews, not unique customers. No model generated the number.'),
 ('Find the leading rule-labelled complaint','Login & authentication: 8 of 20 reviews',
  [('QUESTION',ranking['question']),('RESPONSE','\n'.join(f['text'] for f in ranking['findings'])),('COVERAGE','90% of reviews match at least one recognised theme.')],
  'Ranking uses the scoped corpus. English theme rules may miss nuance and unfamiliar topics.'),
 ('Trace a citation to its source','Exact text checked against a stored review',
  [('SOURCE',source['text']),('METADATA',f'{source["rating"]} star | {source["region"]} | version {source["version"]}'),('CHECK','Every returned complaint citation exists in the dataset and matches its stored text.')],
  'Source existence is verified. This does not prove every interpretation is correct.'),
 ('Keep evidence inside the requested scope','EU subset: 8 reviews',
  [('QUESTION',scoped['question']),('RESPONSE',scoped['summary']),('CHECK',f'All {len(scoped["citations"])} returned citations have region EU.')],
  'The capture asserts the subset size and checks every returned citation region.'),
 ('Persist the investigation','Calculated answer and complaint finding saved',
  [('REQUEST','GET /api/workspace?dataset=...'),('CHECK','Both answer IDs were found in persisted history.'),('SCOPE','Supported: Basic analysis. On-device retrieval: failed experiment. Live OpenAI quality: unmeasured.')],
  'Functional evidence on fictional data. No customer adoption, business impact or browser UI claim.')
]
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
boldpath='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font=lambda n,b=False:ImageFont.truetype(boldpath if b else fontpath,n)
frames=[]
for i,(title,headline,blocks,note) in enumerate(scenes):
 im=Image.new('RGB',(1280,800),'#0b1324');d=ImageDraw.Draw(im)
 d.text((54,32),'REVIEWLENS',font=font(21,True),fill='#63dacb')
 d.text((250,36),'API walkthrough · captured HTTP responses',font=font(18),fill='#b4c5db')
 d.text((1152,35),f'{i+1} / 6',font=font(18),fill='#b4c5db')
 d.text((54,92),title,font=font(32,True),fill='white')
 y=150
 for line in textwrap.wrap(headline,67):d.text((54,y),line,font=font(25),fill='#63dacb');y+=36
 y=max(y+22,214)
 for label,body in blocks:
  d.text((54,y),label,font=font(15,True),fill='#a4b5ca');y+=26
  for paragraph in body.splitlines():
   for line in textwrap.wrap(paragraph,85):d.text((54,y),line,font=font(22),fill='#ecf3ff');y+=31
  y+=21
 d.line((54,661,1226,661),fill='#304259',width=1)
 y=683
 for line in textwrap.wrap(note,108):d.text((54,y),line,font=font(19),fill='#b4c5db');y+=28
 d.text((54,754),'Captioned replay of recorded API results · Not a browser screen recording',font=font(16),fill='#a4b5ca')
 d.rectangle((0,795,round(1280*(i+1)/6),799),fill='#63dacb')
 out=root/f'work/demo-frames/{i:02}.png';im.save(out);frames.append(im)
frames[0].save(root/'docs/demo/reviewlens-api-walkthrough.gif',save_all=True,append_images=frames[1:],duration=8000,loop=0,optimize=True)
frames[1].save(root/'docs/demo/preview.png')
(root/'work/demo-frames/concat.txt').write_text(''.join(f"file '{i:02}.png'\nduration 8\n" for i in range(6))+"file '05.png'\n")
print('Created six 8-second scenes from captured responses.')
