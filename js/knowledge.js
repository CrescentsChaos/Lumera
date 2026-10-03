// Rule-based clinical decision SUPPORT knowledge base (educational demo, not medical advice).
const SYMPTOMS=["fever","cough","sore throat","runny nose","sneezing","itchy eyes","headache","nausea","vomiting","diarrhea","abdominal pain","fatigue","body ache","shortness of breath","wheezing","chest pain","rash","frequent urination","excessive thirst","dizziness","blurred vision","loss of taste/smell","light sensitivity"];
const MEDS={
 para:{n:"Paracetamol 500 mg",d:"1–2 tabs every 6 h, max 4 g/day",k:["paracetamol","acetaminophen"],avoid:["liver"]},
 ibu:{n:"Ibuprofen 400 mg",d:"1 tab every 8 h after food, max 3/day",k:["ibuprofen","nsaid","aspirin"],avoid:["ulcer","kidney","hypertension","asthma","heart"]},
 cet:{n:"Cetirizine 10 mg",d:"1 tab once daily at night",k:["cetirizine","antihistamine"],avoid:[]},
 ors:{n:"Oral rehydration salts",d:"1 sachet in 1 L water, sip through the day",k:["ors"],avoid:[]},
 ond:{n:"Ondansetron 4 mg",d:"1 tab every 8 h as needed",k:["ondansetron"],avoid:["qt","arrhythmia"]},
 sal:{n:"Salbutamol inhaler 100 mcg",d:"1–2 puffs as needed, up to every 4–6 h",k:["salbutamol","albuterol"],avoid:["arrhythmia"]},
 amx:{n:"Amoxicillin 500 mg",d:"1 cap every 8 h for 5–7 days",k:["amoxicillin","penicillin"],avoid:[]},
 nit:{n:"Nitrofurantoin 100 mg",d:"1 cap every 12 h for 5 days",k:["nitrofurantoin"],avoid:["kidney"]},
 sum:{n:"Sumatriptan 50 mg",d:"1 tab at onset, may repeat after 2 h (max 200 mg/day)",k:["sumatriptan","triptan"],avoid:["hypertension","heart","stroke"]},
 aml:{n:"Amlodipine 5 mg",d:"1 tab once daily (start only after confirmed readings)",k:["amlodipine"],avoid:[]},
 met:{n:"Metformin 500 mg",d:"1 tab with meals (start only after lab confirmation)",k:["metformin"],avoid:["kidney","liver"]}
};
const CONDITIONS=[
 {n:"Common cold",s:{"runny nose":3,"sneezing":3,"sore throat":2,"cough":2,"fatigue":1,"headache":1,"fever":1},m:["para","cet"],note:"Usually viral; rest, fluids, symptom relief."},
 {n:"Influenza",s:{"fever":3,"body ache":3,"fatigue":2,"cough":2,"headache":2,"sore throat":1},m:["para","ibu"],note:"Consider antivirals if within 48 h and high risk."},
 {n:"COVID-19–like illness",s:{"fever":2,"cough":2,"loss of taste/smell":4,"fatigue":2,"shortness of breath":2,"body ache":1},m:["para"],note:"Recommend a test and isolation per local guidance.",red:"shortness of breath"},
 {n:"Allergic rhinitis",s:{"sneezing":3,"itchy eyes":3,"runny nose":3,"rash":1},m:["cet"],note:"Identify triggers; intranasal steroid if persistent."},
 {n:"Gastroenteritis",s:{"diarrhea":3,"vomiting":3,"nausea":2,"abdominal pain":2,"fever":1},m:["ors","ond","para"],note:"Hydration first; watch for dehydration."},
 {n:"Migraine",s:{"headache":4,"nausea":2,"light sensitivity":3,"vomiting":1,"dizziness":1},m:["para","sum","ibu"],note:"Track triggers; consider prophylaxis if frequent."},
 {n:"Hypertension (possible)",s:{"headache":2,"dizziness":2,"blurred vision":2,"chest pain":2},m:["aml"],note:"Confirm with repeated BP readings before treatment.",risk:["hypertension","blood pressure"],red:"chest pain"},
 {n:"Type 2 diabetes (possible)",s:{"frequent urination":3,"excessive thirst":3,"fatigue":2,"blurred vision":2},m:["met"],note:"Confirm with fasting glucose / HbA1c.",risk:["diabetes"]},
 {n:"Asthma flare",s:{"wheezing":4,"shortness of breath":3,"cough":2,"chest pain":1},m:["sal"],note:"Check inhaler technique and trigger exposure.",risk:["asthma"],red:"shortness of breath"},
 {n:"Pneumonia (possible)",s:{"fever":3,"cough":3,"shortness of breath":3,"chest pain":2,"fatigue":1},m:["amx","para"],note:"Chest X-ray and vitals recommended.",red:"shortness of breath"},
 {n:"Urinary tract infection",s:{"frequent urination":4,"abdominal pain":2,"fever":1,"nausea":1},m:["nit","para"],note:"Urinalysis / culture advised.",}
];
function predict(sel,p){
 const sn=Math.sqrt(sel.length)||1,bmi=p&&p.height&&p.weight?p.weight/Math.pow(p.height/100,2):0;
 const hist=((p&&(p.chronic+" "+p.family))||"").toLowerCase();
 return CONDITIONS.map(c=>{let dot=0,tot=0;for(const k in c.s){tot+=c.s[k]*c.s[k];if(sel.includes(k))dot+=c.s[k]}
  let sc=dot/(Math.sqrt(tot)*sn*1.6);
  if(c.risk&&c.risk.some(r=>hist.includes(r)))sc*=1.2;
  if(c.n.startsWith("Type 2")&&bmi>=27)sc*=1.1;
  const flags=[];if(c.red&&sel.includes(c.red))flags.push("Red flag: "+c.red+" – assess urgently.");
  return{c,score:Math.min(sc,.97),flags}}).filter(r=>r.score>.12).sort((a,b)=>b.score-a.score).slice(0,4);
}
function checkMed(id,p){
 const m=MEDS[id],txt=s=>(s||"").toLowerCase(),al=txt(p.allergies),cur=txt(p.meds),ch=txt(p.chronic);
 if(m.k.some(k=>al.includes(k)))return{m,id,block:"Patient reports allergy: "+m.n};
 const w=[];if(m.k.some(k=>cur.includes(k)))w.push("Already taking a similar drug – duplicate risk.");
 m.avoid.filter(a=>ch.includes(a)).forEach(a=>w.push("Caution: history of "+a+"."));
 const age=p.dob?Math.floor((Date.now()-new Date(p.dob))/31557600000):null;
 if(age!==null&&age>=65&&id==="ibu")w.push("Age 65+: higher GI/renal risk.");
 if(age!==null&&age<12)w.push("Paediatric patient: use weight-based dosing.");
 return{m,id,warn:w};
}

const PT=[["profile","My profile"],["history","Visit history"],["appts","Appointments"],["vitals","Vitals"]];
const DT=[["patients","Patients"],["appts","Appointments"],["me","My account"]];
const AT=[["overview","Overview"],["users","Users"],["add","Add doctor"],["audit","Audit & backup"]];
const VM=[["sys","Systolic BP","mmHg"],["dia","Diastolic BP","mmHg"],["hr","Heart rate","bpm"],["temp","Temperature","°C"],["spo2","SpO₂","%"],["glu","Blood glucose","mg/dL"],["wt","Weight","kg"]];
const RANGE={sys:[90,139],dia:[60,89],hr:[50,100],temp:[35.5,37.9],spo2:[94,100],glu:[70,125]};
const INTER=[["warfarin","ibuprofen","Major: bleeding risk (NSAID + anticoagulant)"],["aspirin","ibuprofen","Ibuprofen can blunt aspirin's cardiac protection and add bleeding risk"],["warfarin","amoxicillin","May raise INR – monitor"],["warfarin","paracetamol","Regular high-dose paracetamol can raise INR"],["lisinopril","ibuprofen","Reduced BP control and kidney risk"],["losartan","ibuprofen","Reduced BP control and kidney risk"],["sertraline","sumatriptan","Major: serotonin syndrome risk"],["fluoxetine","sumatriptan","Major: serotonin syndrome risk"],["sertraline","ondansetron","Serotonin / QT-prolongation risk"]];
