"""Export tracked source without runtime data, private archives or Site identity."""
import json
import pathlib
import subprocess
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
destination = pathlib.Path(sys.argv[1]).resolve()
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in paths:
        if not name or name == 'docs/original-reviewlens-source.zip':
            continue
        source = root / name
        if name == '.openai/hosting.json':
            config = json.loads(source.read_text())
            config.pop('project_id', None)
            archive.writestr('reviewlens/' + name, json.dumps(config, indent=2) + '\n')
        else:
            archive.write(source, 'reviewlens/' + name)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert 'reviewlens/docs/original-reviewlens-source.zip' not in archive.namelist()
    assert 'project_id' not in json.loads(archive.read('reviewlens/.openai/hosting.json'))
print(destination)
