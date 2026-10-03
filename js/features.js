// Advanced modules: appointments, vitals + trend charts, triage, interaction checks, audit log, backup, analytics.
db.appts=db.appts||[];db.vitals=db.vitals||[];db.audit=db.audit||[];
let vm="sys",lastView=null;
const nm=id=>(db.users.find(u=>u.id===id)||{}).name||"?";
function log(a){db.audit.push({at:Date.now(),u:me?me.name:"-",r:me?me.role:"-",a});if(db.audit.length>500)db.audit.shift();save()}
const wrap=(n,f)=>{const o=window[n];window[n]=function(...a){const r=o.apply(this,a);f(...a);return r}};
wrap("login",()=>{if(me)log("Logged in")});wrap("saveProfile",()=>log("Updated own profile"));
wrap("saveVisit",()=>log("Saved consultation for "+nm(sel)));wrap("approve",id=>log("Approved doctor "+nm(id)));wrap("addDoc",()=>log("Created a doctor account"));
const _d=delUser;delUser=function(id){const u=db.users.find(x=>x.id===id);_d(id);if(u&&!db.users.some(x=>x.id===id))log("Deleted "+u.role+" "+u.name)};
const _r=render;render=function(){if(me&&me.role==="doctor"&&sel&&sel!==lastView){lastView=sel;log("Viewed record: "+nm(sel))}if(!sel)lastView=null;_r();if(me&&me.role==="patient"&&tab==="appts")refreshSlots()};
// ----- vitals -----
const lastVital=pt=>{const v=db.vitals.filter(x=>x.pt===pt).sort((a,b)=>b.at-a.at);const o={};v.forEach(r=>VM.forEach(m=>{if(o[m[0]]==null&&r[m[0]]!=null)o[m[0]]=r[m[0]]}));return o};
const abn=v=>VM.filter(m=>RANGE[m[0]]&&v[m[0]]!=null&&(v[m[0]]<RANGE[m[0]][0]||v[m[0]]>RANGE[m[0]][1])).map(m=>m[1]+" "+v[m[0]]+m[2]);
function chart(vs,M){const k=M[0],pts=vs.filter(v=>v[k]!=null);if(pts.length<2)return`<p class="mute">Log at least two ${M[1]} readings to see a trend.</p>`;
 const r=RANGE[k],vals=pts.map(v=>v[k]),lo=Math.min(...vals,...(r?[r[0]]:[])),hi=Math.max(...vals,...(r?[r[1]]:[])),sp=(hi-lo)||1,X=i=>40+i*(540/(pts.length-1)),Y=y=>170-(y-lo)/sp*140;
 const band=r?`<rect x="40" y="${Y(r[1])}" width="540" height="${Y(r[0])-Y(r[1])}" fill="var(--acc2)"/>`:"";
 return`<svg viewBox="0 0 600 200" style="width:100%" role="img" aria-label="${M[1]} trend">${band}<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="${pts.map((v,i)=>X(i)+","+Y(v[k])).join(" ")}"/>${pts.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v[k])}" r="4" fill="${r&&(v[k]<r[0]||v[k]>r[1])?"var(--bad)":"var(--acc)"}"><title>${v[k]} ${M[2]} – ${new Date(v.at).toLocaleDateString()}</title></circle>`).join("")}<text x="2" y="${Y(hi)+4}">${hi}</text><text x="2" y="${Y(lo)+4}">${lo}</text><text x="40" y="195">${new Date(pts[0].at).toLocaleDateString()}</text><text x="580" y="195" text-anchor="end">${new Date(pts[pts.length-1].at).toLocaleDateString()}</text></svg>${r?`<p class="mute">Shaded band = normal range (${r[0]}–${r[1]} ${M[2]}).</p>`:""}`}
function vitalsView(pt,edit){const vs=db.vitals.filter(v=>v.pt===pt).sort((a,b)=>a.at-b.at),M=VM.find(m=>m[0]===vm);
 const form=edit?`<div class="card"><h2>Log today's vitals</h2><p class="mute">Fill in what you measured; leave the rest empty.</p><div class="grid">${VM.map(m=>`<label>${m[1]} (${m[2]})<input id="v_${m[0]}" type="number" step="any"></label>`).join("")}</div><br><button onclick="logVital()">Save reading</button></div>`:"";
 return form+`<div class="card"><div class="row"><h2 style="margin:0">Trends</h2><select style="width:auto" onchange="vm=this.value;render()">${VM.map(m=>`<option value="${m[0]}" ${m[0]===vm?"selected":""}>${m[1]}</option>`).join("")}</select></div>${chart(vs,M)}</div>
 <div class="card"><h3>Recent readings</h3><table><tr><th>Date</th>${VM.map(m=>`<th>${m[1]}</th>`).join("")}</tr>${vs.slice(-8).reverse().map(v=>`<tr><td>${new Date(v.at).toLocaleDateString()}</td>${VM.map(m=>{const x=v[m[0]],r=RANGE[m[0]],bad=r&&x!=null&&(x<r[0]||x>r[1]);return`<td class="${bad?"bad-t":""}">${x??"—"}</td>`}).join("")}</tr>`).join("")||`<tr><td colspan="8">No readings yet.</td></tr>`}</table></div>`}
function logVital(){const v={id:uid(),pt:me.id,at:Date.now()};let n=0;VM.forEach(m=>{const x=$("#v_"+m[0]).value;if(x!==""){v[m[0]]=+x;n++}});if(!n)return toast("Enter at least one measurement.");
 db.vitals.push(v);save();const a=abn(v);toast(a.length?"Saved. Outside normal range: "+a.join(", "):"Reading saved.");render()}
const vitalsCard=pt=>{const l=lastVital(pt),a=abn(l);return`<div class="card"><h2>Vitals</h2>${a.length?`<div class="flag warn">Latest values outside normal range: ${esc(a.join(", "))}</div>`:""}${vitalsView(pt,false)}</div>`};
const _c=consult;consult=function(){return _c().replace('<div class="card"><h2>Symptom analysis',vitalsCard(sel)+'<div class="card"><h2>Symptom analysis')};
// ----- prediction: vitals-aware + triage -----
const _p=predict;predict=function(s,p){const v=lastVital(sel);s=[...s];
 if(v.temp>=38&&!s.includes("fever"))s.push("fever");if(v.spo2<94&&!s.includes("shortness of breath"))s.push("shortness of breath");
 const r=_p(s,p);r.forEach(x=>{if(/Hypertension/.test(x.c.n)&&(v.sys>=140||v.dia>=90)||/Type 2/.test(x.c.n)&&v.glu>=126)x.score=Math.min(.97,x.score*1.4+.1)});return r.sort((a,b)=>b.score-a.score)};
function triage(s,r,pt){const v=lastVital(pt),why=[];let pts=0;
 if(s.includes("chest pain")&&s.includes("shortness of breath")){pts+=3;why.push("chest pain with breathlessness")}
 if(v.spo2<92){pts+=3;why.push("SpO₂ "+v.spo2+"%")}else if(v.spo2<94){pts++;why.push("SpO₂ "+v.spo2+"%")}
 if(v.sys>=180||v.dia>=120){pts+=3;why.push("severely high BP")}else if(v.sys>=160){pts++;why.push("high BP")}
 if(v.temp>=39.5){pts+=2;why.push("temp "+v.temp+"°C")}if(v.hr>130||v.hr<40){pts+=2;why.push("HR "+v.hr)}
 r.forEach(x=>{if(x.flags.length){pts++;why.push(x.c.n+" red flag")}});if(s.length>=6)pts++;
 const L=pts>=3?["Emergency – immediate assessment","bad"]:pts>=1?["Urgent review today","warn"]:["Routine care","ok"];
 return`<div class="flag ${L[1]}"><b>Triage: ${L[0]}</b>${why.length?" – "+esc([...new Set(why)].join("; ")):""}</div>`}
const _an=analyze;analyze=function(){_an();if(pred)$("#out").insertAdjacentHTML("afterbegin",triage(pred.s,pred.r,sel))};
// ----- drug interactions -----
const _cm=checkMed;checkMed=function(id,p){const r=_cm(id,p);if(r.block)return r;const cur=(p.meds||"").toLowerCase();
 INTER.forEach(([a,b,t])=>[[a,b],[b,a]].forEach(([x,y])=>{if(MEDS[id].k.includes(x)&&cur.includes(y))r.warn.push(t+" (with "+y+")")}));
 if(id==="para"&&/alcohol|drink/i.test(p.lifestyle||""))r.warn.push("Alcohol use: keep paracetamol well below the maximum dose.");return r};
// ----- prescriptions -----
const _vc=visitCard;visitCard=function(v){return _vc(v).replace(/<\/div>$/,(v.rx.length?`<button class="ghost sm" onclick="printRx('${v.id}')">Print prescription</button>`:"")+"</div>")};
function printRx(id){const v=db.visits.find(x=>x.id===id),p=db.profiles[v.pt]||{},w=open("","_blank");
 w.document.write(`<title>Prescription</title><body style="font:15px Georgia,serif;max-width:640px;margin:2rem auto"><h1>Lumera Clinic</h1><hr><p><b>Patient:</b> ${esc(nm(v.pt))} &nbsp; <b>DOB:</b> ${esc(p.dob||"—")} &nbsp; <b>Allergies:</b> ${esc(p.allergies||"none recorded")}</p><p><b>Date:</b> ${new Date(v.at).toLocaleDateString()} &nbsp; <b>Diagnosis:</b> ${esc(v.dx)}</p><h3>℞</h3><ol>${v.rx.map(r=>`<li>${esc(r)}</li>`).join("")}</ol><p>${esc(v.notes||"")}</p><br><br><p>______________________<br>${esc(nm(v.doc))}</p>`);w.document.close();w.print()}
// ----- appointments -----
const SLOTS=[];for(let h=9;h<17;h++)["00","30"].forEach(m=>SLOTS.push(String(h).padStart(2,"0")+":"+m));
const ST={pending:"Awaiting confirmation",confirmed:"Confirmed",declined:"Declined",completed:"Completed",cancelled:"Cancelled"};
const when=a=>new Date(a.date+"T"+a.time).toLocaleString([],{dateStyle:"medium",timeStyle:"short"});
function refreshSlots(){const d=$("#a_doc"),dt=$("#a_date");if(!d||!dt)return;const now=new Date(),taken=db.appts.filter(a=>a.doc===d.value&&a.date===dt.value&&["pending","confirmed"].includes(a.status)).map(a=>a.time);
 const free=SLOTS.filter(t=>!taken.includes(t)&&new Date(dt.value+"T"+t)>now);$("#a_time").innerHTML=free.map(t=>`<option>${t}</option>`).join("")||"<option value=''>No free slots</option>"}
function apptPatient(){const docs=db.users.filter(u=>u.role==="doctor"&&u.ok),today=new Date().toLocaleDateString("en-CA"),mine=db.appts.filter(a=>a.pt===me.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 return`<div class="card"><h2>Book an appointment</h2><div class="grid"><label>Doctor<select id="a_doc" onchange="refreshSlots()">${docs.map(d=>`<option value="${d.id}">${esc(d.name)} – ${esc(d.spec||"")}</option>`).join("")}</select></label><label>Date<input id="a_date" type="date" min="${today}" value="${today}" onchange="refreshSlots()"></label><label>Time<select id="a_time"></select></label></div><label>Reason for visit<textarea id="a_reason"></textarea></label><br><button onclick="bookAppt()">Book appointment</button></div>
 <div class="card"><h2>My appointments</h2><table><tr><th>When</th><th>Doctor</th><th>Status</th><th></th></tr>${mine.map(a=>`<tr><td>${when(a)}<div class="mute">${esc(a.reason)}</div></td><td>${esc(nm(a.doc))}</td><td><span class="tag">${ST[a.status]}</span></td><td>${["pending","confirmed"].includes(a.status)?`<button class="sm danger" onclick="setAppt('${a.id}','cancelled')">Cancel</button>`:""}</td></tr>`).join("")||`<tr><td colspan="4">No appointments yet. Book one above.</td></tr>`}</table></div>`}
function bookAppt(){const doc=$("#a_doc").value,date=$("#a_date").value,time=$("#a_time").value,reason=$("#a_reason").value.trim();
 if(!doc||!time||!reason)return toast("Choose a doctor and time, and describe the reason.");
 if(db.appts.some(a=>a.doc===doc&&a.date===date&&a.time===time&&["pending","confirmed"].includes(a.status)))return toast("That slot was just taken. Pick another time.");
 db.appts.push({id:uid(),pt:me.id,doc,date,time,reason,status:"pending"});log("Booked appointment with "+nm(doc));save();toast("Appointment requested.");render()}
function setAppt(id,s){const a=db.appts.find(x=>x.id===id);a.status=s;log(s[0].toUpperCase()+s.slice(1)+" appointment for "+nm(a.pt));save();toast("Appointment "+s+".");render()}
function apptDoctor(){const l=db.appts.filter(a=>a.doc===me.id).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return`<div class="card"><h2>Appointment queue</h2><table><tr><th>When</th><th>Patient</th><th>Status</th><th></th></tr>${l.map(a=>`<tr><td>${when(a)}<div class="mute">${esc(a.reason)}</div></td><td>${esc(nm(a.pt))}</td><td><span class="tag">${ST[a.status]}</span></td><td>${a.status==="pending"?`<button class="sm" onclick="setAppt('${a.id}','confirmed')">Confirm</button> <button class="sm danger" onclick="setAppt('${a.id}','declined')">Decline</button> `:""}${a.status==="confirmed"?`<button class="sm" onclick="setAppt('${a.id}','completed')">Complete</button> `:""}<button class="sm ghost" onclick="tab='patients';sel='${a.pt}';pred=null;render()">Open record</button></td></tr>`).join("")||`<tr><td colspan="4">No appointments yet.</td></tr>`}</table></div>`}
// ----- patient summary, doctor/admin wrappers -----
const _pv=patientView;patientView=function(){if(tab==="appts")return tabs(PT)+apptPatient();if(tab==="vitals")return tabs(PT)+vitalsView(me.id,true);let h=_pv();if(tab==="profile"){
 const p=db.profiles[me.id]||{},done=FIELDS.filter(f=>p[f[0]]).length,pc=Math.round(done/FIELDS.length*100),b=p.height&&p.weight?p.weight/Math.pow(p.height/100,2):0,cat=b?b<18.5?"Underweight":b<25?"Healthy":b<30?"Overweight":"Obese":"Add height and weight",
 nx=db.appts.filter(a=>a.pt===me.id&&a.status==="confirmed"&&new Date(a.date+"T"+a.time)>new Date()).sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time))[0];
 const sm=`<div class="grid"><div class="card"><div class="stat">${pc}%</div>Profile complete<div class="bar"><i style="width:${pc}%"></i></div></div><div class="card"><div class="stat">${b?b.toFixed(1):"—"}</div>BMI · ${cat}</div><div class="card"><div class="stat" style="font-size:1.2rem">${nx?when(nx):"None"}</div>Next confirmed appointment</div></div>`;
 h=h.split('<div class="card"><h2>My health profile').join(sm+'<div class="card"><h2>My health profile')}
 return h};
const _dv=doctorView;doctorView=function(){return tab==="appts"&&!sel?tabs(DT)+apptDoctor():_dv()};
function auditView(){return`<div class="card"><h2>Backup & restore</h2><p class="mute">Export all data as JSON, or restore a previous export.</p><div class="row"><button onclick="exportDB()">Export backup</button><label class="row" style="margin:0"><input type="file" accept=".json" style="width:auto" onchange="importDB(this.files[0])"></label><button class="danger" onclick="resetDB()">Reset demo data</button></div></div>
 <div class="card"><h2>Audit log</h2><table><tr><th>Time</th><th>User</th><th>Action</th></tr>${db.audit.slice(-60).reverse().map(a=>`<tr><td>${new Date(a.at).toLocaleString()}</td><td>${esc(a.u)} <span class="tag">${a.r}</span></td><td>${esc(a.a)}</td></tr>`).join("")||`<tr><td colspan="3">No activity yet.</td></tr>`}</table></div>`}
function exportDB(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="lumera-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();log("Exported backup")}
function importDB(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.users)||!d.users.some(u=>u.role==="admin"))throw 0;d.appts=d.appts||[];d.vitals=d.vitals||[];d.audit=d.audit||[];db=d;save();me=db.users.find(u=>u.id===me.id)||null;toast("Backup restored.");render()}catch(e){toast("That file is not a valid Lumera backup.")}};r.readAsText(f)}
function resetDB(){if(!confirm("Erase ALL data and restore the demo accounts?"))return;localStorage.removeItem(KEY);sessionStorage.clear();location.reload()}
const _av=adminView;adminView=function(){if(tab==="audit")return tabs(AT)+auditView();let h=_av();if(tab==="overview"){const c={};db.visits.forEach(v=>c[v.dx]=(c[v.dx]||0)+1);const t=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5),mx=t.length?t[0][1]:1,ap=db.appts.filter(a=>a.status==="pending").length;
 h+=`<div class="card"><h2>Top diagnoses</h2>${t.map(([d,n])=>`<div class="row" style="margin:.4rem 0"><span style="width:200px">${esc(d)}</span><div class="bar" style="flex:1"><i style="width:${n/mx*100}%"></i></div><b>${n}</b></div>`).join("")||`<p class="mute">Diagnoses will appear after consultations are saved.</p>`}<p class="mute">${ap} appointment request${ap===1?"":"s"} pending across all doctors.</p></div>`}return h};
render();
