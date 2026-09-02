// GitHub Pages frontend. Set this to your deployed Cloudflare Worker URL.
const API_BASE = "https://YOUR-WORKER.workers.dev";

const $ = id => document.getElementById(id);
const coupons = $("coupons"), uids = $("uids"), results = $("results");
let rows = [], running = false, controller = null;

function lines(v){return [...new Set(v.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean))]}
function updateCounts(){
  $("couponCount").textContent = `${lines(coupons.value).length}개`;
  $("uidCount").textContent = `${lines(uids.value).length}개`;
  $("total").textContent = lines(coupons.value).length * lines(uids.value).length;
}
coupons.addEventListener("input",updateCounts); uids.addEventListener("input",updateCounts);

async function loadFile(input,target){
  const f=input.files[0]; if(!f)return;
  target.value=(await f.text()).trim(); updateCounts();
}
$("couponFile").onchange=()=>loadFile($("couponFile"),coupons);
$("uidFile").onchange=()=>loadFile($("uidFile"),uids);

function reset(){
  rows=[]; results.innerHTML="";
  ["done","ok","fail"].forEach(id=>$(id).textContent="0");
  $("bar").style.width="0%"; $("json").disabled=true; $("csv").disabled=true;
}
function addRow(r){
  rows.push(r);
  const tr=document.createElement("tr");
  [r.couponIndex,r.uid,r.status,r.message].forEach(x=>{const td=document.createElement("td");td.textContent=x;tr.appendChild(td)});
  results.appendChild(tr);
}
function download(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$("json").onclick=()=>download("results.json",JSON.stringify(rows,null,2),"application/json");
$("csv").onclick=()=>{
  const esc=x=>`"${String(x??"").replaceAll('"','""')}"`;
  download("results.csv",["couponIndex,uid,status,message",...rows.map(r=>[r.couponIndex,r.uid,r.status,r.message].map(esc).join(","))].join("\n"),"text/csv");
};

$("start").onclick=async()=>{
  if(running)return;
  const c=lines(coupons.value), u=lines(uids.value);
  if(!c.length||!u.length){alert("쿠폰 URL과 UID를 모두 입력하세요.");return}
  if(c.length>100||u.length>100){alert("쿠폰과 UID는 각각 최대 100개입니다.");return}
  if(!confirm(`총 ${c.length*u.length}건의 실제 교환 요청을 전송합니다. 계속할까요?`))return;

  reset(); running=true; controller=new AbortController();
  $("start").disabled=true; $("cancel").disabled=false; $("status").textContent="처리 중…";
  try{
    const res=await fetch(`${API_BASE}/api/redeem`,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({coupons:c,uids:u}),signal:controller.signal
    });
    if(!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const reader=res.body.getReader(), dec=new TextDecoder(); let buf="";
    while(true){
      const {value,done}=await reader.read(); if(done)break;
      buf+=dec.decode(value,{stream:true});
      const parts=buf.split("\n"); buf=parts.pop();
      for(const line of parts) if(line.startsWith("data:")){
        const e=JSON.parse(line.slice(5).trim());
        if(e.type==="result"){
          addRow(e); $("done").textContent=rows.length;
          $("ok").textContent=rows.filter(x=>x.status==="SUCCESS").length;
          $("fail").textContent=rows.filter(x=>x.status!=="SUCCESS").length;
          $("bar").style.width=`${(rows.length/(c.length*u.length))*100}%`;
        }
        if(e.type==="status") $("status").textContent=e.message;
        if(e.type==="done") $("status").textContent=e.cancelled?"취소됨":"완료";
      }
    }
    $("json").disabled=rows.length===0; $("csv").disabled=rows.length===0;
  }catch(e){
    $("status").textContent=e.name==="AbortError"?"취소됨":`오류: ${e.message}`;
  }finally{
    running=false; controller=null; $("start").disabled=false; $("cancel").disabled=true;
  }
};
$("cancel").onclick=()=>controller?.abort();
updateCounts();
