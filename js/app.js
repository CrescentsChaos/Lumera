// Lumera – data lives in this browser's localStorage (demo; swap for a real backend in production).
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function h(s){let x=5381;for(const c of s)x=(x*33^c.charCodeAt(0))>>>0;return x.toString(36)}
const KEY="lumera_db";
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{users:[
 {id:"u1",role:"admin",name:"System Admin",email:"admin@clinic.com",pw:h("admin123"),ok:true},
 {id:"u2",role:"doctor",name:"Dr. Sarah Khan",email:"doctor@clinic.com",pw:h("doctor123"),ok:true,spec:"General Medicine"}],profiles:{},visits:[]};
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
let me=db.users.find(u=>u.id===sessionStorage.getItem("uid")),tab="profile",authTab="login",sel=null,pred=null,q="";
const uid=()=>"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function toast(t){const e=$("#toast");e.textContent=t;e.className="show";setTimeout(()=>e.className="",2200)}
const FIELDS=[["name","Full name"],["dob","Date of birth","date"],["gender","Gender","sel:Male,Female,Other"],["blood","Blood group","sel:A+,A-,B+,B-,AB+,AB-,O+,O-"],["phone","Phone"],["height","Height (cm)","number"],["weight","Weight (kg)","number"],["address","Address"],["ec","Emergency contact (name & phone)"],["allergies","Allergies (comma separated)","area"],["chronic","Chronic conditions","area"],["meds","Current medications","area"],["surgeries","Past surgeries & hospital stays","area"],["family","Family history","area"],["lifestyle","Smoking, alcohol, exercise","area"]];
function field([k,l,t],v){v=v||"";const id="f_"+k;
 if(t&&t.startsWith("sel:"))return`<label>${l}<select id="${id}"><option value="">Select…</option>${t.slice(4).split(",").map(o=>`<option ${o===v?"selected":""}>${o}</option>`).join("")}</select></label>`;
 if(t==="area")return`<label>${l}<textarea id="${id}">${esc(v)}</textarea></label>`;
 return`<label>${l}<input id="${id}" type="${t||"text"}" value="${esc(v)}"></label>`}
const collect=()=>Object.fromEntries(FIELDS.map(f=>[f[0],$("#f_"+f[0]).value.trim()]));
// ---------- auth ----------
function login(){const e=$("#email").value.trim().toLowerCase(),u=db.users.find(x=>x.email===e&&x.pw===h($("#pw").value));
 if(!u)return toast("Email or password is incorrect.");
 if(!u.ok)return toast("Your doctor account is awaiting admin approval.");
 me=u;sessionStorage.setItem("uid",u.id);tab=u.role==="admin"?"overview":u.role==="doctor"?"patients":"profile";render()}
function register(){const n=$("#rn").value.trim(),e=$("#email").value.trim().toLowerCase(),p=$("#pw").value,r=$("#rr").value;
 if(!n||!e||p.length<6)return toast("Enter a name, email and a password of 6+ characters.");
 if(db.users.some(x=>x.email===e))return toast("That email is already registered.");
 const u={id:uid(),role:r,name:n,email:e,pw:h(p),ok:r==="patient",spec:r==="doctor"?$("#rs").value:undefined};
 db.users.push(u);if(r==="patient")db.profiles[u.id]={name:n};save();
 if(r==="doctor"){authTab="login";toast("Registered. An admin must approve your account.");return render()}
 me=u;sessionStorage.setItem("uid",u.id);tab="profile";render()}
function logout(){sessionStorage.clear();me=null;sel=null;pred=null;render()}
// ---------- views ----------
function authView(){return`<div class="card auth"><h1>Welcome to Lumera</h1><p class="mute">One place for patient records, consultations and clinic administration.</p>
<div class="tabs"><button class="${authTab==="login"?"on":""}" onclick="authTab='login';render()">Log in</button><button class="${authTab==="reg"?"on":""}" onclick="authTab='reg';render()">Create account</button></div>
${authTab==="reg"?`<label>Full name<input id="rn"></label><label>I am a<select id="rr" onchange="$('#sp').style.display=this.value==='doctor'?'block':'none'"><option value="patient">Patient</option><option value="doctor">Doctor (needs admin approval)</option></select></label><div id="sp" style="display:none"><label>Specialty<input id="rs" value="General Medicine"></label></div>`:""}
<label>Email<input id="email" type="email"></label><label>Password<input id="pw" type="password" onkeydown="if(event.key==='Enter')${authTab==="reg"?"register":"login"}()"></label><br>
<button onclick="${authTab==="reg"?"register":"login"}()">${authTab==="reg"?"Create account":"Log in"}</button>
${authTab==="login"?`<p class="mute">Demo: admin@clinic.com / admin123 · doctor@clinic.com / doctor123</p>`:""}</div>`}
const tabs=(list)=>`<div class="tabs">${list.map(([k,l])=>`<button class="${tab===k?"on":""}" onclick="tab='${k}';sel=null;pred=null;render()">${l}</button>`).join("")}</div>`;
function visitCard(v){const d=db.users.find(u=>u.id===v.doc);return`<div class="card"><div class="row"><h3>${esc(v.dx||"Consultation")}</h3><span class="tag">${new Date(v.at).toLocaleDateString()}</span><span class="mute">${esc(d?d.name:"")}</span></div>
${v.sym.length?`<p><b>Symptoms:</b> ${v.sym.map(esc).join(", ")}</p>`:""}${v.rx.length?`<p><b>Prescription:</b></p><ul>${v.rx.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`:""}${v.notes?`<p><b>Notes:</b> ${esc(v.notes)}</p>`:""}</div>`}
function patientView(){const p=db.profiles[me.id]||{};
 if(tab==="history"){const vs=db.visits.filter(v=>v.pt===me.id).sort((a,b)=>b.at-a.at);return tabs(PT)+(vs.length?vs.map(visitCard).join(""):`<div class="card">No visits yet. Your doctor's notes and prescriptions will appear here.</div>`)}
 return tabs(PT)+`<div class="card"><h2>My health profile</h2><p class="mute">Complete details help your doctor give safer advice.</p><div class="grid">${FIELDS.map(f=>field(f,p[f[0]])).join("")}</div><br><button onclick="saveProfile()">Save profile</button></div>`}
function saveProfile(){db.profiles[me.id]=collect();me.name=db.profiles[me.id].name||me.name;save();toast("Profile saved.");render()}
function doctorView(){const T=tabs(DT);
 if(tab==="me")return T+`<div class="card"><h2>${esc(me.name)}</h2><p>${esc(me.spec||"")} · ${esc(me.email)}</p><p class="mute">${db.visits.filter(v=>v.doc===me.id).length} consultations recorded.</p></div>`;
 if(sel)return T+consult();
 const pts=db.users.filter(u=>u.role==="patient"&&u.name.toLowerCase().includes(q.toLowerCase()));
 return T+`<div class="card"><label>Search patients<input value="${esc(q)}" oninput="q=this.value;render();$('input').focus()"></label><br><table><tr><th>Name</th><th>Email</th><th>Allergies</th><th></th></tr>${pts.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc((db.profiles[u.id]||{}).allergies||"—")}</td><td><button class="sm" onclick="sel='${u.id}';pred=null;render()">Open</button></td></tr>`).join("")||`<tr><td colspan="4">No patients found.</td></tr>`}</table></div>`}
function consult(){const p=db.profiles[sel]||{},u=db.users.find(x=>x.id===sel),vs=db.visits.filter(v=>v.pt===sel).sort((a,b)=>b.at-a.at);
 const age=p.dob?Math.floor((Date.now()-new Date(p.dob))/31557600000):"—";
 const row=(l,v)=>`<tr><th>${l}</th><td>${esc(v||"—")}</td></tr>`;
 return`<button class="ghost sm" onclick="sel=null;render()">← All patients</button><br><br><div class="card"><h2>${esc(u.name)}</h2><table>${row("Age / sex",age+" / "+(p.gender||"—"))}${row("Blood group",p.blood)}${row("Allergies",p.allergies)}${row("Chronic conditions",p.chronic)}${row("Current medications",p.meds)}${row("Past surgeries",p.surgeries)}${row("Family history",p.family)}${row("Lifestyle",p.lifestyle)}${row("Phone / emergency",(p.phone||"—")+" / "+(p.ec||"—"))}</table></div>
<div class="card"><h2>Symptom analysis</h2><p class="mute">Select what the patient reports.</p><div class="chips">${SYMPTOMS.map(s=>`<span class="chip" tabindex="0" data-s="${s}" onclick="this.classList.toggle('on')" onkeydown="if(event.key==='Enter')this.click()">${s}</span>`).join("")}</div><button onclick="analyze()">Predict likely conditions</button><div id="out"></div></div>
<div class="card"><h2>Previous visits</h2></div>${vs.map(visitCard).join("")||`<p class="mute">No previous visits.</p>`}`}
function analyze(){const s=$$(".chip.on").map(c=>c.dataset.s);if(!s.length)return toast("Select at least one symptom.");
 const p=db.profiles[sel]||{};pred={s,r:predict(s,p)};
 if(!pred.r.length){$("#out").innerHTML=`<div class="flag warn">No strong match. Consider further examination or tests.</div>`;return}
 const ids=[...new Set(pred.r.slice(0,2).flatMap(x=>x.c.m))];
 $("#out").innerHTML=`<h3>Likely conditions</h3>${pred.r.map(x=>`<div style="margin:.7rem 0"><div class="row"><b>${esc(x.c.n)}</b><span class="mute">${Math.round(x.score*100)}% match</span></div><div class="bar"><i style="width:${x.score*100}%"></i></div><div class="mute">${esc(x.c.note)}</div>${x.flags.map(f=>`<div class="flag bad">${esc(f)}</div>`).join("")}</div>`).join("")}
 <h3>Suggested medicines</h3>${ids.map(id=>{const c=checkMed(id,p);return c.block?`<div class="flag bad"><b>${esc(c.m.n)}</b> – blocked. ${esc(c.block)}</div>`:`<label class="row" style="color:var(--ink)"><input type="checkbox" class="rx" style="width:auto" value="${esc(c.m.n+" — "+c.m.d)}"><span><b>${esc(c.m.n)}</b> <span class="mute">${esc(c.m.d)}</span></span></label>${c.warn.map(w=>`<div class="flag warn">${esc(w)}</div>`).join("")}`}).join("")}
 <h3>Save consultation</h3><label>Diagnosis<input id="dx" value="${esc(pred.r[0].c.n)}"></label><label>Doctor's notes<textarea id="nt"></textarea></label><br><button onclick="saveVisit()">Save consultation</button>
 <p class="mute">Decision support only. The treating doctor remains responsible for all clinical decisions.</p>`}
function saveVisit(){db.visits.push({id:uid(),pt:sel,doc:me.id,at:Date.now(),sym:pred.s,dx:$("#dx").value.trim(),notes:$("#nt").value.trim(),rx:$$(".rx:checked").map(c=>c.value)});save();toast("Consultation saved.");pred=null;render()}
function adminView(){const T=tabs(AT);
 const cnt=r=>db.users.filter(u=>u.role===r).length,pend=db.users.filter(u=>u.role==="doctor"&&!u.ok).length;
 if(tab==="add")return T+`<div class="card"><h2>Add a doctor</h2><div class="grid"><label>Name<input id="an"></label><label>Specialty<input id="as"></label><label>Email<input id="ae" type="email"></label><label>Temporary password<input id="ap"></label></div><br><button onclick="addDoc()">Create doctor account</button></div>`;
 if(tab==="users")return T+`<div class="card"><table><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th></th></tr>${db.users.map(u=>`<tr><td>${esc(u.name)}</td><td><span class="tag">${u.role}</span></td><td>${esc(u.email)}</td><td>${u.ok?"Active":"Pending"}</td><td>${!u.ok?`<button class="sm" onclick="approve('${u.id}')">Approve</button> `:""}${u.role!=="admin"?`<button class="sm danger" onclick="delUser('${u.id}')">Delete</button>`:""}</td></tr>`).join("")}</table></div>`;
 return T+`<div class="grid"><div class="card"><div class="stat">${cnt("patient")}</div>Patients</div><div class="card"><div class="stat">${cnt("doctor")}</div>Doctors</div><div class="card"><div class="stat">${db.visits.length}</div>Consultations</div><div class="card"><div class="stat">${pend}</div>Doctors awaiting approval</div></div>
 <div class="card"><h2>Recent consultations</h2><table><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th></tr>${db.visits.slice(-8).reverse().map(v=>`<tr><td>${new Date(v.at).toLocaleDateString()}</td><td>${esc((db.users.find(u=>u.id===v.pt)||{}).name)}</td><td>${esc((db.users.find(u=>u.id===v.doc)||{}).name)}</td><td>${esc(v.dx)}</td></tr>`).join("")||`<tr><td colspan="4">No consultations yet.</td></tr>`}</table></div>`}
function approve(id){db.users.find(u=>u.id===id).ok=true;save();toast("Doctor approved.");render()}
function delUser(id){if(!confirm("Delete this account and all its records?"))return;db.users=db.users.filter(u=>u.id!==id);delete db.profiles[id];db.visits=db.visits.filter(v=>v.pt!==id&&v.doc!==id);save();toast("Account deleted.");render()}
function addDoc(){const n=$("#an").value.trim(),e=$("#ae").value.trim().toLowerCase(),p=$("#ap").value;
 if(!n||!e||p.length<6)return toast("Enter name, email and a 6+ character password.");
 if(db.users.some(u=>u.email===e))return toast("That email is already registered.");
 db.users.push({id:uid(),role:"doctor",name:n,email:e,pw:h(p),ok:true,spec:$("#as").value.trim()||"General Medicine"});save();toast("Doctor account created.");tab="users";render()}
function render(){
 $("#top").innerHTML=`<span class="brand">Lumera</span>${me?`<span class="row"><span>${esc(me.name)} <span class="tag">${me.role}</span></span><button class="ghost sm" onclick="logout()">Log out</button></span>`:""}`;
 $("#app").innerHTML=!me?authView():me.role==="patient"?patientView():me.role==="doctor"?doctorView():adminView()}
render();
