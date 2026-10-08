"""Real local PTY, synthetic code/approval, mock curl/fetch. No network or VM."""
import errno,json,os,pty,re,select,shutil,subprocess,sys,tempfile,time
from pathlib import Path

f=json.loads(sys.stdin.read());root=Path(f['repo']);bootstrap=Path(f.get('bootstrapPath',root/'docs/contracts/vm-link/deploy/bootstrap-0.1.1.mjs'))
results=[]
with tempfile.TemporaryDirectory(prefix='mc-terminal-pty-',dir='/tmp') as tmp:
 tmp=Path(tmp);fixture=tmp/'fixture.json';fixture.write_text(json.dumps(f));fixture.chmod(0o600)
 preflight_home=tmp/'home';package=preflight_home/'.local/lib/node_modules/@openai/codex';native=package/'vendor/x86_64-unknown-linux-musl/bin/codex'
 native.parent.mkdir(parents=True,mode=0o700);native.write_text('MC_PTY_SYNTHETIC_NATIVE')
 (package/'package.json').write_text(json.dumps({'name':'@openai/codex','version':'0.161.0'}));(package/'bin').mkdir(mode=0o700);(package/'bin/codex.js').write_text('// synthetic, never invoked')
 (preflight_home/'.local/bin').mkdir(mode=0o700);(preflight_home/'.local/bin/codex').symlink_to(package/'bin/codex.js')
 preflight_home.chmod(0o700);(preflight_home/'.local').chmod(0o700);(preflight_home/'.local/lib').chmod(0o700)
 curl=tmp/'curl';curl.write_text('#!/usr/bin/python3\nimport os,sys,shutil\na=sys.argv[1:]\nassert "https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1/bootstrap.mjs" in a\nshutil.copyfile(os.environ["MC_PTY_BOOTSTRAP"],a[a.index("--output")+1])\n');curl.chmod(0o700)
 preload=tmp/'fetch.mjs';preload.write_text("import "+json.dumps((root/'docs/contracts/vm-link/integration/preflight-pty-ports.mjs').as_uri())+";import{readFileSync,appendFileSync}from'node:fs';import{createHash}from'node:crypto';const f=JSON.parse(readFileSync(process.env.MC_PTY_FIXTURE,'utf8'));globalThis.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);appendFileSync(process.env.MC_PTY_RECEIPT,JSON.stringify({audience:url==='https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1',worker:b.workerId===f.workerId,code:b.pairingCode===f.code,hash:createHash('sha256').update(b.pairingCode).digest('hex')===f.hash})+'\\n');return new Response(null,{status:503});};")
 code=f['code'].encode();cases=[('plain-CR',[code+b'\r']),('plain-LF',[code+b'\n']),('blank-then-valid',[b'\r',code+b'\r']),('malformed-then-valid',[b'not-a-code\r',code+b'\r']),('backspace',[code[:-1]+b'Z\x7f'+code[-1:]+b'\r']),('bracketed-paste',[b'\x1b[200~'+code+b'\x1b[201~\r']),('fragmented-bracketed-paste',[b'\x1b[2',b'00~'+code[:17],code[17:]+b'\x1b[20',b'1~',b'\r']),('paste-trailing-newline',[b'\x1b[200~'+code+b'\r\n\x1b[201~',b'\r']),('control-C',[b'\x03']),('extra-command-Enter',[code+b'\r']),('preflight-sudo-denied',[]),('preflight-unsafe-directory',[]),('preflight-partial-installation',[])]
 for name,chunks in cases:
  receipt=tmp/(name+'.jsonl');env=dict(os.environ)
  for k in ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy']:env.pop(k,None)
  env.update(PATH=str(tmp)+os.pathsep+env['PATH'],NODE_OPTIONS='--import '+str(preload),MC_PTY_BOOTSTRAP=str(bootstrap),MC_PTY_FIXTURE=str(fixture),MC_PTY_RECEIPT=str(receipt),MC_PTY_PREFLIGHT_HOME=str(preflight_home),MC_PTY_PREFLIGHT_DENY_SUDO='1' if name=='preflight-sudo-denied' else '0',PS1='MC_TEST_SHELL> ')
  if name=='preflight-unsafe-directory':(preflight_home/'.local').chmod(0o775)
  release=preflight_home/'.local/lib/mc-vm-link/0.1.1'
  if name=='preflight-partial-installation':release.mkdir(parents=True,mode=0o700)
  master,slave=pty.openpty();p=subprocess.Popen(['/bin/bash','--noprofile','--norc','-i'],stdin=slave,stdout=slave,stderr=slave,env=env);os.close(slave)
  transcript=b'';command_sent=False;input_started=False;pending=list(chunks);next_send=0;deadline=time.monotonic()+8;blocked=None
  while time.monotonic()<deadline:
   ready,_,_=select.select([master],[],[],0.02)
   if ready:
    try:part=os.read(master,65536)
    except OSError as e:
     if e.errno==errno.EIO:break
     raise
    if not part:break
    transcript+=part
   found=re.findall(rb'\{"status":"BLOCKED","code":"([A-Z0-9_]+)"\}',transcript)
   if found:
    blocked=found[-1].decode();break
   if not command_sent and b'MC_TEST_SHELL> ' in transcript:
    os.write(master,f['command'].encode()+b'\r'+(b'\r' if name=='extra-command-Enter' else b''));command_sent=True
   if not input_started and f.get('promptToken','MC pairing code (hidden;').encode() in transcript:
    input_started=True;next_send=time.monotonic()+0.05
   if input_started and pending and time.monotonic()>=next_send:
    os.write(master,pending.pop(0));next_send=time.monotonic()+0.09
  p.terminate()
  try:p.wait(timeout=1)
  except subprocess.TimeoutExpired:p.kill();p.wait()
  os.close(master);calls=[json.loads(x) for x in receipt.read_text().splitlines()] if receipt.exists() else []
  preflight_lines=re.findall(rb'\{"schema":"mc\.vm-pilot-preflight\.v1"[^\r\n]*',transcript)
  preflight_result=json.loads(preflight_lines[-1]) if preflight_lines else None
  results.append({'case':name,'commandPastedToInteractiveShell':command_sent,'promptReached':input_started,'preflightPassed':'LOCAL_PREFLIGHT_PASS' in transcript.decode(errors='replace'),'preflightBlockers':preflight_result['blockers'] if preflight_result else [],'blockedCode':blocked,'localFetchCalls':len(calls),'checks':calls,'secretEchoed':code in transcript,'blankReprompt':'Blank Enter does not submit.' in transcript.decode(errors='replace'),'malformedReprompt':'Input not accepted.' in transcript.decode(errors='replace')})
  (preflight_home/'.local').chmod(0o700)
  if name=='preflight-partial-installation':shutil.rmtree(release.parent)
print(json.dumps({'networkCalls':0,'actualOwnerActions':0,'actualVmCommands':0,'nativeHashSyntheticInPty':True,'serviceQueriesSynthetic':True,'cases':results}))
