// Local route preparation only; no production import or automatic email/reset.
const words={
 'zh-TW':{title:'找回 MC App 密碼',pending:'密碼復原尚未啟用。',link_required:'請使用有效的密碼復原連結。中斷後需重新取得連結。',checking:'正在確認身分。',invalid_link:'連結已失效，請重新取得連結。',denied:'目前身分無法完成這項操作。',session_unconfirmed:'目前連線或身分尚未確認。',mfa_required:'請先用驗證器確認身分。',ready:'請設定新的 MC App 密碼。',updated_reauthenticate:'密碼已更新，請回登入頁重新登入。',update_unconfirmed:'密碼更新結果未確認，請先確認登入結果。',session_changed:'身分已變更，請重新開始。',closed:'復原流程已關閉。',email:'Email',request:'寄送復原信',request_completed:'復原請求已完成，請查看你的信箱。',password:'新 MC App 密碼',confirm:'再次輸入新密碼',save:'更新密碼',code:'驗證器的六位數代碼',verify:'確認驗證器',failed:'操作尚未確認，請重新檢查。'},
 en:{title:'Recover MC app password',pending:'Password recovery is not enabled.',link_required:'Use a valid recovery link. After interruption, request a new link.',checking:'Checking your identity.',invalid_link:'The link is invalid. Request a new link.',denied:'This identity cannot complete the action.',session_unconfirmed:'The connection or session could not be confirmed.',mfa_required:'Confirm your identity with your authenticator first.',ready:'Set a new MC app password.',updated_reauthenticate:'Password updated. Return to sign-in.',update_unconfirmed:'The update is unconfirmed. Check sign-in before retrying.',session_changed:'The session changed. Start again.',closed:'Recovery is closed.',email:'Email',request:'Send recovery email',request_completed:'Request completed. Check your inbox.',password:'New MC app password',confirm:'Confirm new password',save:'Update password',code:'Six-digit authenticator code',verify:'Verify authenticator',failed:'The action could not be confirmed.'},
 ko:{title:'MC 앱 비밀번호 찾기',pending:'비밀번호 복구가 비활성 상태입니다.',link_required:'유효한 복구 링크를 사용하세요. 중단 후 새 링크를 요청하세요.',checking:'본인 확인 중입니다.',invalid_link:'유효하지 않은 링크입니다. 새 링크를 요청하세요.',denied:'현재 계정으로 진행할 수 없습니다.',session_unconfirmed:'연결 또는 계정을 확인하지 못했습니다.',mfa_required:'먼저 인증 앱으로 본인 확인을 하세요.',ready:'새 MC 앱 비밀번호를 설정하세요.',updated_reauthenticate:'비밀번호가 변경되었습니다. 다시 로그인하세요.',update_unconfirmed:'변경 결과를 확인하지 못했습니다. 먼저 로그인을 확인하세요.',session_changed:'세션이 변경되었습니다. 다시 시작하세요.',closed:'복구가 종료되었습니다.',email:'Email',request:'복구 이메일 보내기',request_completed:'요청이 완료되었습니다. 이메일을 확인하세요.',password:'새 MC 앱 비밀번호',confirm:'새 비밀번호 확인',save:'비밀번호 변경',code:'인증 앱의 6자리 코드',verify:'인증 앱 확인',failed:'작업을 확인하지 못했습니다.'}
};
export function mountPasswordRecovery({doc=document,port,locale='zh-TW'}={}){
 const w=words[locale]||words['zh-TW'],root=doc.createElement('section'),status=doc.createElement('p');root.className='password-recovery';
 const title=doc.createElement('h1');title.textContent=w.title;status.setAttribute('role','status');root.append(title,status);
 if(port?.configured!==true){status.textContent=w.pending;root.dispose=()=>{};return root;}
 let disposed=false,busy=false;
 const input=(type,copy,autocomplete)=>{const label=doc.createElement('label'),node=doc.createElement('input');label.textContent=copy;node.type=type;node.autocomplete=autocomplete;node.required=true;label.append(node);return {label,node};};
 const email=input('email',w.email,'username'),password=input('password',w.password,'new-password'),confirm=input('password',w.confirm,'new-password'),code=input('password',w.code,'one-time-code');code.node.inputMode='numeric';code.node.maxLength=6;
 const requestForm=doc.createElement('form'),passwordForm=doc.createElement('form'),mfaForm=doc.createElement('form');
 const button=text=>{const b=doc.createElement('button');b.type='submit';b.textContent=text;return b;},request=button(w.request),save=button(w.save),verify=button(w.verify);
 requestForm.append(email.label,request);passwordForm.append(password.label,confirm.label,save);mfaForm.append(code.label,verify);root.append(requestForm,mfaForm,passwordForm);
 const clear=()=>{password.node.value='';confirm.node.value='';code.node.value='';};
 function render(view){if(disposed)return;status.textContent=w[view.status]||w.failed;const ready=view.status==='ready',mfa=view.status==='mfa_required';
  password.node.disabled=confirm.node.disabled=save.disabled=busy||!ready||!port.capabilities.changePassword;code.node.disabled=verify.disabled=busy||!mfa;
  request.disabled=busy||!port.capabilities.requestEmail;passwordForm.hidden=!ready;mfaForm.hidden=!mfa;if(!ready)clear();
 }
 async function perform(action){if(busy||disposed)return;busy=true;render(port.view());try{const view=await action();if(!disposed)render(view);}catch{if(!disposed){clear();render(port.view());status.textContent=w.failed;}}finally{busy=false;if(!disposed)render(port.view());}}
 requestForm.addEventListener('submit',event=>{event.preventDefault();void perform(()=>port.requestEmail({email:email.node.value,explicit:true}));});
 passwordForm.addEventListener('submit',event=>{event.preventDefault();const values={password:password.node.value,confirmation:confirm.node.value,explicit:true};clear();void perform(async()=>{try{return await port.changePassword(values);}finally{values.password='';values.confirmation='';}});});
 mfaForm.addEventListener('submit',event=>{event.preventDefault();const value=code.node.value;code.node.value='';void perform(()=>port.verifyAuthenticator({code:value,explicit:true}));});
 const unsubscribe=port.subscribe(view=>{clear();render(view);if(view.status==='checking')void port.inspect().then(render);});
 root.dispose=()=>{if(disposed)return;disposed=true;clear();email.node.value='';unsubscribe();port.dispose();};
 render(port.view());void port.inspect().then(render);return root;
}
