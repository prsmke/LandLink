(()=>{
 const c=window.LANDLINK_CONFIG||{};
 const ready=!!(c.SUPABASE_URL?.startsWith('https://')&&!c.SUPABASE_URL.includes('YOUR_PROJECT')&&c.SUPABASE_ANON_KEY&&!c.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE'));
 window.llReady=ready;
 window.sb=ready?supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY):null;
 window.llEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.llMoney=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(Number(n)||0);
 window.llRequireConfig=()=>{if(!window.llReady){alert('Connect Supabase first. Open assets/config.js and add your Project URL and anon public key. See README.md.');return false;}return true;};
 window.llUser=async()=>{if(!llRequireConfig())return null;const {data:{user}}=await sb.auth.getUser();return user;};
 window.llProfile=async()=>{const u=await llUser();if(!u)return null;const {data,error}=await sb.from('profiles').select('*').eq('id',u.id).single();if(error)throw error;return data;};
 window.llGuard=async({admin=false,approved=true}={})=>{
  try{
   const u=await llUser();if(!u){location.href='login.html';return null;}
   const p=await llProfile();
   if(admin&&p.role!=='admin'){alert('Administrator access required.');location.href='dashboard.html';return null;}
   if(approved&&p.account_status!=='approved'&&p.role!=='admin'){
    document.body.innerHTML=`<main style="max-width:600px;margin:12vh auto;padding:30px;font:16px Arial"><h1>Account ${llEscape(p.account_status)}</h1><p>Your account must be approved by the LandLink administrator before you can use the member dashboard.</p><button id="pending-logout">Log out</button></main>`;
    document.querySelector('#pending-logout').onclick=async()=>{await sb.auth.signOut();location.href='login.html';};return null;
   }
   return {user:u,profile:p};
  }catch(e){alert(e.message);return null;}
 };
 window.llLogout=async()=>{if(sb)await sb.auth.signOut();location.href='index.html';};
})();
