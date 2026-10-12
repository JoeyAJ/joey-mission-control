import ctypes,os,subprocess,sys,time
libc=ctypes.CDLL(None,use_errno=True)
if libc.prctl(36,1,0,0,0)!=0:raise OSError(ctypes.get_errno(),'QA subreaper unavailable')
child=subprocess.Popen(sys.argv[1:]);result=None;reaped=0
while result is None:
 while True:
  try:pid,status=os.waitpid(-1,os.WNOHANG)
  except ChildProcessError:break
  if pid==0:break
  if pid==child.pid:result=os.waitstatus_to_exitcode(status);child.returncode=result
  else:reaped+=1
 time.sleep(0.05)
until=time.monotonic()+2
while time.monotonic()<until:
 try:pid,status=os.waitpid(-1,os.WNOHANG)
 except ChildProcessError:break
 if pid:reaped+=1
 else:time.sleep(0.05)
print('QA_SUBREAPER owned_exited_children_reaped='+str(reaped)+' child_exit='+str(result),flush=True)
sys.exit(result)
