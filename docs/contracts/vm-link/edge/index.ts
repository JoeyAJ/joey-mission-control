// Inactive deployment candidate. Never expose the server's admin credential to VM.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createEdgeHandler} from './handler.mjs';
import {artifact,artifactDigest,policyDigest} from './artifact.generated.mjs';
import {bootstrap} from './bootstrap.generated.mjs';
const projectUrl='https://scmvedfqwlhkyvljymjj.supabase.co';
const enabled=Deno.env.get('MC_VM_LINK_ENABLED')==='true' && Deno.env.get('SUPABASE_URL')===projectUrl;
// Existing Edge-provided server credential only, read at approved runtime, never exported.
const admin=enabled?createClient(projectUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}}):null;
Deno.serve(createEdgeHandler({enabled,artifact,artifactDigest,policyDigest,bootstrap,rpc:async(request)=>{
 if(!admin)throw Error('LINK_DISABLED');const {data,error}=await admin.rpc('mc_vm_link_worker',{request});if(error)throw Error('LINK_REQUEST_DENIED');return data;
}}));
