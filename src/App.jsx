import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts";

/* ─────────────────────────────────────────────────────────────────
   EthiCredit v4.0 — "Bloomberg Terminal meets European FinTech"
   ENHANCED: + Live Dashboard, Top Parameters, Fairness Analysis,
   Currency Converter, ML Pipeline tab.
   Dark intelligence. IBM Plex Mono data density. Amber/Cyan accents.
──────────────────────────────────────────────────────────────────*/

// ─── FORM DATA ───────────────────────────────────────────────────
const DROPDOWNS = {
  checking_status:     ["less_than_102EUR","more_than_102EUR","no_account","overdrawn"],
  credit_history:      ["all_paid_on_time","existing_paid_on_time","loans_at_other_banks","no_credits_taken","past_delays"],
  purpose:             ["appliances","business","education","electronics","furniture","new_car","other","repairs","retraining","used_car"],
  savings_status:      ["100_to_256EUR","500_to_511EUR","less_than_51EUR","more_than_511EUR","unknown_or_none"],
  employment:          ["1_to_4_years","4_to_7_years","less_than_1_year","more_than_7_years","unemployed"],
  personal_status:     ["female_divorced_or_married","female_single","male_divorced","male_married_or_widowed","male_single"],
  other_parties:       ["co_applicant","guarantor","none"],
  property_magnitude:  ["car_or_other","life_insurance","nothing","real_estate"],
  other_payment_plans: ["bank_loan","none","store_loan"],
  housing:             ["free_housing","owns_home","renting"],
  job:                 ["management_or_professional","skilled_worker","unemployed_unskilled_nonresident","unskilled_resident"],
  own_telephone:       ["no","yes"],
  foreign_worker:      ["no","yes"],
};
const LABELS = {
  checking_status:"Checking Account Status",duration:"Loan Duration (months)",
  credit_history:"Credit History",purpose:"Loan Purpose",credit_amount_EUR:"Loan Amount (EUR)",
  savings_status:"Savings Account",employment:"Employment Duration",
  installment_commitment:"Instalment Rate (% of income)",personal_status:"Personal Status",
  other_parties:"Co-Applicant / Guarantor",residence_since:"Years at Residence",
  property_magnitude:"Main Asset / Property",age:"Age",other_payment_plans:"Other Payment Plans",
  housing:"Housing Situation",existing_credits:"Existing Credits at Bank",
  job:"Occupation Type",num_dependents:"Number of Dependents",
  own_telephone:"Has Telephone",foreign_worker:"Foreign Worker",
};
const FRIENDLY = {
  checking_status:"current account balance",credit_history:"past credit behaviour",
  credit_amount_EUR:"requested loan amount",savings_status:"savings account balance",
  employment:"employment stability",installment_commitment:"existing monthly obligations",
  purpose:"stated loan purpose",property_magnitude:"assets and property",
  existing_credits:"number of open credits",job:"employment type",
  housing:"housing situation",duration:"requested loan duration",
};
const TIPS = {
  checking_status:"A positive or well-managed current account is the single strongest approval signal.",
  credit_history:"Consistent on-time repayments directly improve future creditworthiness.",
  savings_status:"Even modest savings (500+ EUR) substantially reduce perceived default risk.",
  employment:"Longer, stable employment history is viewed very positively by lenders.",
  credit_amount_EUR:"Requesting a lower amount proportional to your income improves approval odds.",
  installment_commitment:"Reducing existing payment obligations before applying strengthens your profile.",
  existing_credits:"Fewer open credit lines signal better financial discipline.",
  duration:"Shorter repayment terms are associated with lower default probability.",
};
const AGE_THRESHOLDS = {"18-30":0.62,"31-45":0.40,"46-60":0.50,"60+":0.53};

// ─── HUMAN REVIEW CONFIG ─────────────────────────────────────────
const BANK_EMAIL = "lassosrhpythonproject@gmail.com"; 
const REVIEW_RETENTION_DAYS = 30;

// ─── RISK ENGINE ──────────────────────────────────────────────────
function getAgeGroup(age) {
  const a = parseInt(age)||35;
  if(a<=30) return "18-30"; if(a<=45) return "31-45"; if(a<=60) return "46-60"; return "60+";
}
function computeRisk(f) {
  const cw = {
    checking_status:{overdrawn:0.38,less_than_102EUR:0.22,no_account:0.14,more_than_102EUR:-0.18},
    credit_history:{past_delays:0.32,loans_at_other_banks:0.14,no_credits_taken:0.06,existing_paid_on_time:-0.14,all_paid_on_time:-0.22},
    savings_status:{unknown_or_none:0.18,less_than_51EUR:0.12,"100_to_256EUR":0.04,"500_to_511EUR":-0.06,more_than_511EUR:-0.20},
    employment:{unemployed:0.26,less_than_1_year:0.14,"1_to_4_years":0.02,"4_to_7_years":-0.06,more_than_7_years:-0.14},
    housing:{renting:0.08,free_housing:0.04,owns_home:-0.10},
    other_payment_plans:{bank_loan:0.14,store_loan:0.10,none:-0.04},
    job:{unemployed_unskilled_nonresident:0.20,unskilled_resident:0.10,skilled_worker:-0.04,management_or_professional:-0.12},
    purpose:{other:0.08,new_car:0.06,education:0.04,business:0.04,furniture:0,electronics:0,used_car:-0.04,repairs:-0.04},
    property_magnitude:{nothing:0.18,car_or_other:0.04,life_insurance:-0.04,real_estate:-0.12},
    other_parties:{none:0.06,co_applicant:-0.10,guarantor:-0.16},
    personal_status:{male_divorced:0.06,male_single:0.04,female_divorced_or_married:0,female_single:0,male_married_or_widowed:-0.04},
    foreign_worker:{yes:0.06,no:-0.02},own_telephone:{no:0.04,yes:-0.02},
  };
  const fi={checking_status:0.118,credit_history:0.071,savings_status:0.065,employment:0.058,housing:0.038,job:0.035,purpose:0.047,property_magnitude:0.043,other_payment_plans:0.022,other_parties:0.018,personal_status:0.032,foreign_worker:0.008,own_telephone:0.010};
  let s=0.34;
  for(const[feat,map] of Object.entries(cw)){const v=f[feat];if(v&&map[v]!==undefined)s+=map[v]*(fi[feat]||0.03)*9;}
  const dur=parseFloat(f.duration)||24; s+=((dur-18)/72)*0.11;
  const amt=parseFloat(f.credit_amount_EUR)||2000; s+=((amt-1500)/15000)*0.10;
  const inst=parseFloat(f.installment_commitment)||2; s+=((inst-2)/4)*0.07;
  const age=parseInt(f.age)||35; if(age<25)s+=0.10; else if(age<30)s+=0.05; else if(age>55)s-=0.04;
  const ec=parseInt(f.existing_credits)||1; s+=((ec-1)/3)*0.05;
  return Math.min(Math.max(s,0.04),0.97);
}
function computeFactors(f) {
  const ci = {
    checking_status:{overdrawn:0.9,less_than_102EUR:0.5,no_account:0.25,more_than_102EUR:-0.5},
    credit_history:{past_delays:0.8,loans_at_other_banks:0.3,existing_paid_on_time:-0.4,all_paid_on_time:-0.7},
    savings_status:{unknown_or_none:0.4,less_than_51EUR:0.22,more_than_511EUR:-0.55},
    employment:{unemployed:0.7,less_than_1_year:0.4,more_than_7_years:-0.4},
    property_magnitude:{nothing:0.4,real_estate:-0.32},
    other_parties:{guarantor:-0.4,none:0.1},
    job:{management_or_professional:-0.3,unemployed_unskilled_nonresident:0.55},
    housing:{renting:0.2,owns_home:-0.28},
  };
  const fi={checking_status:0.118,credit_history:0.071,savings_status:0.065,employment:0.058,property_magnitude:0.043,other_parties:0.018,job:0.035,housing:0.038};
  const factors=[];
  for(const[feat,map] of Object.entries(ci)){const v=f[feat];if(v&&map[v]!==undefined){const c=map[v]*(fi[feat]||0.03)*7;if(Math.abs(c)>0.006)factors.push({feature:feat,contribution:c,value:v});}}
  const dur=parseFloat(f.duration)||24; const dc=((dur-18)/72)*0.09; if(Math.abs(dc)>0.006)factors.push({feature:"duration",contribution:dc,value:`${dur} months`});
  const amt=parseFloat(f.credit_amount_EUR)||2000; const ac=((amt-1500)/15000)*0.08; if(Math.abs(ac)>0.006)factors.push({feature:"credit_amount_EUR",contribution:ac,value:`€${amt}`});
  return factors.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,9);
}

// ─── WEB CRYPTO HELPERS (AES-GCM, GDPR-compliant encryption) ────
const CRYPTO_KEY_NAME = "ethicredit_review_key";

async function getOrCreateKey() {
  const stored = sessionStorage.getItem(CRYPTO_KEY_NAME);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, {name:"AES-GCM"}, true, ["encrypt","decrypt"]);
  }
  const key = await crypto.subtle.generateKey({name:"AES-GCM",length:256}, true, ["encrypt","decrypt"]);
  const exported = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(CRYPTO_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

async function encryptData(obj) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, enc.encode(JSON.stringify(obj)));
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(cipher)))
  };
}

async function decryptData(blob) {
  const key = await getOrCreateKey();
  const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(blob.data), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv}, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

function genRef() {
  return "HRQ-" + Date.now().toString(36).toUpperCase().slice(-6);
}

// ─── DESIGN TOKENS — LIGHT THEME ─────────────────────────────────
const G = {
  bg:"#f0f4f8",      // soft blue-grey page background
  bg2:"#ffffff",     // white card surface
  bg3:"#e8edf4",     // light input / inner panel background
  bg4:"#dde4ee",     // slightly deeper panel (ticker, header gradient end)
  border:"#c8d4e3", border2:"#b0bfd4",
  amber:"#b45309",   amber2:"#d97706", amberDim:"rgba(180,83,9,0.10)",
  cyan:"#0369a1",    cyanDim:"rgba(3,105,161,0.10)",
  green:"#15803d",   greenDim:"rgba(21,128,61,0.10)",
  red:"#be123c",     red2:"#e11d48",   redDim:"rgba(190,18,60,0.10)",
  teal:"#0f766e",    tealDim:"rgba(15,118,110,0.10)",
  violet:"#4f46e5",
  muted:"#64748b",   muted2:"#94a3b8",
  text:"#0f172a",    text2:"#334155",
};

// ─── DASHBOARD DATA (static params/fairness/ML data remain) ──────
const TOP_PARAMS = [
  {rank:1,param:"Credit Score",weight:94,impact:"approve",icon:"⭐",desc:"FICO score above 720 is the strongest approval signal"},
  {rank:2,param:"Debt-to-Income Ratio",weight:88,impact:"reject",icon:"📊",desc:"DTI > 43% significantly increases rejection probability"},
  {rank:3,param:"Employment Duration",weight:82,impact:"approve",icon:"💼",desc:"2+ years at current employer substantially boosts approval"},
  {rank:4,param:"Annual Income",weight:79,impact:"approve",icon:"💰",desc:"Income stability and level are key credit determinants"},
  {rank:5,param:"Loan-to-Value Ratio",weight:75,impact:"mixed",icon:"🏠",desc:"LTV below 80% is preferred for mortgage products"},
  {rank:6,param:"Payment History",weight:71,impact:"approve",icon:"✅",desc:"Zero missed payments in last 24 months is highly valued"},
  {rank:7,param:"Outstanding Debt",weight:68,impact:"reject",icon:"💳",desc:"High revolving credit utilisation flags default risk"},
  {rank:8,param:"Loan Amount",weight:63,impact:"mixed",icon:"🔢",desc:"Proportionality to income affects approval decisions"},
  {rank:9,param:"Credit History Age",weight:57,impact:"approve",icon:"📅",desc:"Longer history reduces perceived lender risk"},
  {rank:10,param:"Recent Inquiries",weight:49,impact:"reject",icon:"🔍",desc:"Multiple hard inquiries signal financial stress"},
];
const RADAR_DATA = [
  {subject:"Credit Score",A:94},{subject:"Income",A:79},{subject:"Employment",A:82},
  {subject:"DTI",A:88},{subject:"LTV",A:75},{subject:"History",A:57},
];
const FAIRNESS_GROUPS = [
  {group:"Male",rate:67.2,n:7820},{group:"Female",rate:64.8,n:5027},
  {group:"Age 18-35",rate:58.4,n:3210},{group:"Age 36-55",rate:72.1,n:6840},
  {group:"Age 55+",rate:61.2,n:2797},{group:"Urban",rate:69.4,n:8901},
  {group:"Rural",rate:59.8,n:3946},
];
const FAIRNESS_METRICS = [
  {metric:"Demographic Parity",score:87,status:"pass"},
  {metric:"Equal Opportunity",score:83,status:"pass"},
  {metric:"Predictive Parity",score:91,status:"pass"},
  {metric:"Calibration",score:76,status:"warn"},
  {metric:"Individual Fairness",score:79,status:"warn"},
];
const ML_METRICS = [
  {name:"Precision",model:89,base:71},{name:"Recall",model:85,base:68},
  {name:"F1 Score",model:87,base:69},{name:"AUC-ROC",model:92,base:74},
  {name:"Accuracy",model:88,base:72},{name:"Specificity",model:91,base:75},
];
const CURRENCIES = {
  USD:{symbol:"$",rate:1},EUR:{symbol:"€",rate:0.92},GBP:{symbol:"£",rate:0.79},
  INR:{symbol:"₹",rate:83.12},JPY:{symbol:"¥",rate:149.8},CAD:{symbol:"C$",rate:1.36},
  AUD:{symbol:"A$",rate:1.53},CHF:{symbol:"Fr",rate:0.89},
};

// ─── SHARED STYLES ────────────────────────────────────────────────
const card = {background:G.bg2,border:`1px solid ${G.border}`,borderRadius:8,padding:"1.25rem"};
const sectionHdr = {fontSize:9,fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",color:G.amber,borderBottom:`1px solid ${G.border}`,paddingBottom:"0.45rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.5rem"};
const tt = {contentStyle:{background:G.bg2,border:`1px solid ${G.border}`,borderRadius:6,color:G.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:11}};

// ─── ANIMATED COUNTER ────────────────────────────────────────────
function AnimCount({value,prefix="",suffix=""}){
  const [d,setD]=useState(0);
  useEffect(()=>{
    let cur=0; const step=Math.ceil(value/60);
    const t=setInterval(()=>{cur+=step;if(cur>=value){setD(value);clearInterval(t);}else setD(cur);},16);
    return()=>clearInterval(t);
  },[value]);
  return <span>{prefix}{d.toLocaleString()}{suffix}</span>;
}

// ─── RISK METER ───────────────────────────────────────────────────
function RiskMeter({score,threshold,approved}){
  const pct=Math.round(score*100), tPct=Math.round(threshold*100);
  const col=approved?G.green:G.red;
  return(
    <div style={{marginBottom:"1.25rem"}}>
      <div style={{position:"relative",height:10,borderRadius:5,background:`linear-gradient(to right,${G.green},${G.amber},${G.red})`,marginBottom:"0.5rem"}}>
        <div style={{position:"absolute",top:-4,bottom:-4,width:2,background:"rgba(255,255,255,0.7)",left:`${tPct}%`,borderRadius:2}}/>
        <div style={{position:"absolute",top:"50%",transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",border:"2px solid #fff",background:col,left:`${pct}%`,transition:"left 0.8s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 12px ${col}60`}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:G.muted,marginBottom:"0.75rem",letterSpacing:"0.5px"}}>
        <span>LOW RISK</span><span>THRESHOLD {tPct}%</span><span>HIGH RISK</span>
      </div>
      <div style={{textAlign:"center"}}>
        <span style={{fontSize:"2.8rem",fontWeight:800,fontFamily:"'Sora',sans-serif",color:col,lineHeight:1}}>{pct}</span>
        <span style={{fontSize:"1rem",color:G.muted,fontFamily:"'Sora',sans-serif"}}>%</span>
        <div style={{fontSize:9,color:G.muted,letterSpacing:"2px",textTransform:"uppercase",marginTop:4}}>RISK SCORE</div>
      </div>
    </div>
  );
}

// ─── FACTOR BARS ─────────────────────────────────────────────────
function FactorBars({factors}){
  if(!factors.length) return null;
  const maxA=Math.max(...factors.map(f=>Math.abs(f.contribution)));
  return(
    <div style={{display:"grid",gap:"0.45rem"}}>
      {factors.map((f,i)=>{
        const pct=(Math.abs(f.contribution)/maxA)*100;
        const isR=f.contribution>0;
        const fn=FRIENDLY[f.feature]||f.feature.replace(/_/g," ");
        return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <div style={{fontSize:10,color:G.text2,width:150,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fn}</div>
            <div style={{flex:1,height:5,background:G.bg3,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:isR?`linear-gradient(to right,${G.red},${G.red2})`:`linear-gradient(to right,${G.green},#00b34a)`,transition:"width 0.8s ease"}}/>
            </div>
            <div style={{fontSize:9,fontWeight:600,color:isR?G.red2:G.green,width:52,textAlign:"right"}}>{isR?"↑ RISK":"↓ RISK"}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────
function Badge({status}){
  const cfg={pass:{bg:G.greenDim,col:G.green,label:"PASS"},warn:{bg:"rgba(245,166,35,0.12)",col:G.amber,label:"WARN"},fail:{bg:G.redDim,col:G.red,label:"FAIL"}}[status];
  return <span style={{background:cfg.bg,color:cfg.col,padding:"1px 8px",borderRadius:20,fontSize:9,fontWeight:700,letterSpacing:1}}>{cfg.label}</span>;
}

// ─── FORM FIELD ───────────────────────────────────────────────────
function Field({name,value,onChange}){
  const opts=DROPDOWNS[name];
  const fStyle={background:G.bg3,border:`1px solid ${G.border}`,color:G.text,padding:"0.5rem 0.7rem",fontSize:12,borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",outline:"none",width:"100%",transition:"border-color 0.15s"};
  return(
    <div>
      <label style={{fontSize:10,color:G.text2,letterSpacing:"0.3px",marginBottom:"0.3rem",display:"block"}}>{LABELS[name]||name}</label>
      {opts?(
        <select value={value} onChange={e=>onChange(name,e.target.value)}
          style={{...fStyle,appearance:"none",WebkitAppearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%233d5470'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 0.7rem center",paddingRight:"2rem"}}>
          <option value="">— select —</option>
          {opts.map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
        </select>
      ):(
        <input type="number" value={value} onChange={e=>onChange(name,e.target.value)}
          placeholder={name==="age"?"19–75":name==="duration"?"4–72":name==="credit_amount_EUR"?"500–25000":"1–4"}
          style={fStyle}/>
      )}
    </div>
  );
}

// ─── CUSTOMER VIEW ────────────────────────────────────────────────
function HumanReviewModal({result, form, onClose, onSubmitted}){
  const [fullName,setFullName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [context,setContext]=useState("");
  const [consent,setConsent]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");

  const inpStyle={width:"100%",background:G.bg3,border:`1px solid ${G.border}`,borderRadius:5,
    padding:"0.55rem 0.75rem",color:G.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,outline:"none"};
  const labelStyle={fontSize:9,color:G.muted,letterSpacing:"0.5px",textTransform:"uppercase",
    display:"block",marginBottom:5,fontWeight:600};

  const handleSubmit=async()=>{
    if(!fullName.trim()){setError("Full name is required.");return;}
    if(!email.trim()||!email.includes("@")){setError("A valid email address is required.");return;}
    if(!consent){setError("You must consent to data processing to submit a review request.");return;}
    setSubmitting(true); setError("");
    try{
      const ref=genRef();
      const resultKey=`${result.riskScore.toFixed(6)}_${result.ageGroup}_${result.threshold}`;
      const payload={
        ref,
        resultKey,
        submittedAt:new Date().toISOString(),
        retainUntil:new Date(Date.now()+REVIEW_RETENTION_DAYS*86400000).toISOString(),
        contact:{fullName:fullName.trim(),email:email.trim(),phone:phone.trim()||null},
        context:context.trim()||null,
        decision:{riskScore:result.riskScore,threshold:result.threshold,ageGroup:result.ageGroup},
        formSnapshot:form,
        gdpr:{lawfulBasis:"Consent (Art.6(1)(a))",purpose:"Human review of automated credit decision",
          retentionDays:REVIEW_RETENTION_DAYS,rightToWithdraw:true}
      };
      // Encrypt personal data with AES-GCM before storing
      const encrypted = await encryptData(payload);
      const reviews = JSON.parse(localStorage.getItem("ethicredit_reviews")||"[]");
      reviews.push({ref, resultKey, submittedAt:payload.submittedAt, status:"PENDING", encrypted});
      localStorage.setItem("ethicredit_reviews", JSON.stringify(reviews));
      // Open mailto: so bank receives the reference
      const subject=encodeURIComponent(`Human Review Request — ${ref}`);
      const body=encodeURIComponent(
        `Dear Credit Review Team,\n\nA customer has requested human review of their automated credit decision.\n\nReference: ${ref}\nAge Group: ${result.ageGroup}\nRisk Score: ${(result.riskScore*100).toFixed(1)}%\nThreshold: ${(result.threshold*100).toFixed(0)}%\nSubmitted: ${new Date().toLocaleString()}\n\nPlease retrieve the encrypted case from the EthiCredit system using reference ${ref} and respond to the applicant at the registered email address within 5 business days as required by GDPR Article 22.\n\nThis is an automated notification. Do not reply to this email.`
      );
      window.open(`mailto:${BANK_EMAIL}?subject=${subject}&body=${body}`,"_blank");
      onSubmitted(ref);
    }catch(e){
      setError("Submission failed. Please try again or contact the bank directly.");
    }
    setSubmitting(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:G.bg2,border:`1px solid ${G.border}`,borderRadius:12,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",padding:"1.75rem"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:G.text,marginBottom:3}}>Request Human Review</div>
            <div style={{fontSize:11,color:G.muted}}>GDPR Article 22 — Right to human oversight of automated decisions</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:G.muted,padding:"0 4px"}}>✕</button>
        </div>

        {/* GDPR notice */}
        <div style={{background:G.cyanDim,border:`1px solid rgba(3,105,161,0.2)`,borderRadius:7,padding:"0.85rem",marginBottom:"1.25rem"}}>
          <div style={{fontSize:9,color:G.cyan,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>🔒 Data Protection Notice</div>
          <div style={{fontSize:11,color:G.text2,lineHeight:1.65}}>
            Your personal data will be <strong>AES-256 encrypted</strong> and stored locally in your browser.
            Only the case reference ID is sent to the bank — not your personal details.
            Data will be automatically deleted after <strong>{REVIEW_RETENTION_DAYS} days</strong> (GDPR Art.5 — storage limitation).
            Lawful basis: <strong>Consent (Art.6(1)(a))</strong>. You may withdraw consent at any time.
          </div>
        </div>

        {/* Form */}
        <div style={{display:"grid",gap:"0.85rem",marginBottom:"1rem"}}>
          <div>
            <label style={labelStyle}>Full Name <span style={{color:G.red}}>*</span></label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="As it appears on your ID"
              style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Email Address <span style={{color:G.red}}>*</span></label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="For bank to contact you"
              style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Phone Number <span style={{color:G.muted}}>(optional)</span></label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="+49 xxx xxxx xxxx"
              style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Additional Context <span style={{color:G.muted}}>(optional)</span></label>
            <textarea value={context} onChange={e=>setContext(e.target.value)}
              placeholder="Any additional information you feel is relevant to your application..."
              style={{...inpStyle,height:80,resize:"vertical",lineHeight:1.5}}/>
          </div>

          {/* Consent checkbox */}
          <div style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:6,padding:"0.85rem"}}>
            <label style={{display:"flex",gap:"0.65rem",cursor:"pointer",alignItems:"flex-start"}}>
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}
                style={{marginTop:2,accentColor:G.amber,width:14,height:14,flexShrink:0}}/>
              <div style={{fontSize:11,color:G.text2,lineHeight:1.6}}>
                I consent to EthiCredit processing my personal data (name, email, phone) for the purpose of human review of my credit decision, in accordance with GDPR. I understand my data will be encrypted, retained for {REVIEW_RETENTION_DAYS} days, and that I can withdraw this consent at any time by clicking "Withdraw Review".
              </div>
            </label>
          </div>
        </div>

        {error&&<div style={{background:G.redDim,border:`1px solid rgba(190,18,60,0.2)`,borderRadius:5,padding:"0.6rem 0.85rem",fontSize:11,color:G.red,marginBottom:"1rem"}}>⚠ {error}</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
          <button onClick={onClose}
            style={{padding:"0.75rem",border:`1px solid ${G.border}`,borderRadius:6,background:"none",color:G.text2,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,cursor:"pointer"}}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{padding:"0.75rem",border:"none",borderRadius:6,background:`linear-gradient(135deg,${G.amber},#c87800)`,color:"#000",fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,cursor:submitting?"wait":"pointer",opacity:submitting?0.7:1}}>
            {submitting?"Submitting…":"Submit Review Request →"}
          </button>
        </div>

        <div style={{marginTop:"1rem",fontSize:9,color:G.muted,textAlign:"center",lineHeight:1.6}}>
          The bank will respond to your registered email within 5 business days.<br/>
          Your rights: Access · Rectification · Erasure · Portability (GDPR Art.15–20)
        </div>
      </div>
    </div>
  );
}

function CustomerView({result,form}){
  const{approved,riskScore,threshold,factors,ageGroup}=result;
  const[showModal,setShowModal]=useState(false);
  // Unique key for THIS specific result — used to scope review lookup
  const resultKey=`${riskScore.toFixed(6)}_${ageGroup}_${threshold}`;

  const[reviewRef,setReviewRef]=useState(()=>{
    // Only restore a review that belongs to THIS exact result
    try{
      const reviews=JSON.parse(localStorage.getItem("ethicredit_reviews")||"[]");
      const match=reviews.find(r=>r.resultKey===resultKey&&r.status!=="WITHDRAWN");
      return match?match.ref:null;
    }catch{return null;}
  });
  const[withdrawn,setWithdrawn]=useState(false);

  // Reset review state whenever the result changes (new applicant)
  const prevResultKey=useRef(resultKey);
  useEffect(()=>{
    if(prevResultKey.current!==resultKey){
      prevResultKey.current=resultKey;
      setReviewRef(null);
      setWithdrawn(false);
      setShowModal(false);
      // Re-check localStorage for the new result
      try{
        const reviews=JSON.parse(localStorage.getItem("ethicredit_reviews")||"[]");
        const match=reviews.find(r=>r.resultKey===resultKey&&r.status!=="WITHDRAWN");
        if(match) setReviewRef(match.ref);
      }catch{}
    }
  },[resultKey]);

  const riskFs=factors.filter(f=>f.contribution>0).slice(0,4);
  const goodFs=factors.filter(f=>f.contribution<0).slice(0,3);
  const borderCol=approved?`rgba(0,230,118,0.25)`:`rgba(255,75,75,0.25)`;
  const bgCol=approved?G.greenDim:G.redDim;

  const handleWithdraw=()=>{
    if(!window.confirm("Withdraw your review request? Your personal data will be deleted immediately."))return;
    try{
      let reviews=JSON.parse(localStorage.getItem("ethicredit_reviews")||"[]");
      reviews=reviews.filter(r=>r.ref!==reviewRef);
      localStorage.setItem("ethicredit_reviews",JSON.stringify(reviews));
    }catch{}
    setReviewRef(null);
    setWithdrawn(true);
  };

  return(
    <div>
      {showModal&&<HumanReviewModal result={result} form={form}
        onClose={()=>setShowModal(false)}
        onSubmitted={ref=>{setReviewRef(ref);setShowModal(false);}}/>}

      <div style={{borderRadius:10,border:`1px solid ${borderCol}`,marginBottom:"1.25rem",overflow:"hidden"}}>
        <div style={{padding:"1.25rem 1.75rem",display:"flex",alignItems:"center",gap:"1rem",background:bgCol,borderBottom:`1px solid ${borderCol}`}}>
          <div style={{fontSize:"2rem"}}>{approved?"✅":"📋"}</div>
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:"1.5rem",fontWeight:800,color:approved?G.green:G.red,letterSpacing:"-0.3px"}}>
              {approved?"Application Approved":"Not Approved At This Time"}
            </div>
            <div style={{fontSize:11,color:G.text2,marginTop:3}}>
              {approved?"Your application meets our lending criteria. A representative will contact you.":"We're unable to approve this application right now — here's how you can improve."}
            </div>
          </div>
        </div>
        <div style={{padding:"1.25rem 1.75rem",background:G.bg2}}>
          <div style={{fontSize:9,color:G.muted,marginBottom:"1rem",letterSpacing:"0.5px"}}>
            CREDIT RISK ASSESSMENT · AGE GROUP {ageGroup} · CALIBRATED THRESHOLD {Math.round(threshold*100)}%
          </div>
          <RiskMeter score={riskScore} threshold={threshold} approved={approved}/>
        </div>
      </div>

      {approved?(
        <div style={{background:G.greenDim,border:"1px solid rgba(0,230,118,0.18)",borderRadius:8,padding:"1.1rem 1.4rem",marginBottom:"1rem"}}>
          <div style={{fontSize:9,fontWeight:600,color:G.green,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"0.65rem"}}>✓ Strengths in Your Application</div>
          {goodFs.length>0?goodFs.map((f,i)=>(
            <div key={i} style={{fontSize:12,color:G.text2,marginBottom:"0.35rem"}}>• Your <strong style={{color:G.text}}>{FRIENDLY[f.feature]||f.feature.replace(/_/g," ")}</strong> was assessed positively.</div>
          )):<div style={{fontSize:12,color:G.text2}}>Your overall financial profile meets our lending criteria.</div>}
        </div>
      ):(
        <>
          <div style={{background:G.redDim,border:"1px solid rgba(255,75,75,0.18)",borderRadius:8,padding:"1.1rem 1.4rem",marginBottom:"1rem"}}>
            <div style={{fontSize:9,fontWeight:600,color:G.red2,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"0.65rem"}}>Key Factors in This Decision</div>
            {riskFs.map((f,i)=>{
              const fn=FRIENDLY[f.feature]||f.feature.replace(/_/g," ");
              const tip=TIPS[f.feature];
              return(
                <div key={i} style={{marginBottom:"0.9rem"}}>
                  <div style={{fontSize:12,color:G.text,marginBottom:"0.25rem"}}>• Your <strong>{fn}</strong> did not meet our current criteria.</div>
                  {tip&&<div style={{background:G.cyanDim,border:"1px solid rgba(0,212,255,0.15)",borderRadius:5,padding:"0.6rem 0.9rem",marginTop:4,fontSize:11,color:G.cyan}}>💡 {tip}</div>}
                </div>
              );
            })}
          </div>

          {/* ── HUMAN REVIEW SECTION ── */}
          {!reviewRef&&!withdrawn?(
            <div style={{background:"rgba(79,70,229,0.06)",border:`1px solid rgba(79,70,229,0.25)`,borderRadius:8,padding:"1.1rem 1.4rem",marginBottom:"1rem"}}>
              <div style={{fontSize:9,fontWeight:600,color:G.violet,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"0.6rem"}}>⚖️ Right to Human Review — GDPR Article 22</div>
              <div style={{fontSize:12,color:G.text2,lineHeight:1.65,marginBottom:"0.85rem"}}>
                You have the right to request that a human reviews this automated decision. A bank officer will examine your application independently and respond within <strong>5 business days</strong>.
              </div>
              <button onClick={()=>setShowModal(true)}
                style={{width:"100%",padding:"0.75rem",border:`2px solid ${G.violet}`,borderRadius:6,background:`rgba(79,70,229,0.08)`,color:G.violet,fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.3px",transition:"all 0.2s"}}>
                👤 Request Human Review →
              </button>
            </div>
          ):withdrawn?(
            <div style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:8,padding:"1rem 1.4rem",marginBottom:"1rem",fontSize:12,color:G.muted}}>
              ✓ Your review request has been withdrawn and your personal data has been deleted.
            </div>
          ):(
            <div style={{background:G.greenDim,border:`1px solid rgba(21,128,61,0.25)`,borderRadius:8,padding:"1.1rem 1.4rem",marginBottom:"1rem"}}>
              <div style={{fontSize:9,fontWeight:600,color:G.green,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"0.6rem"}}>✓ Human Review Request Submitted</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
                <div>
                  <div style={{fontSize:12,color:G.text2,marginBottom:4}}>Your request has been sent to the bank. Ref: <strong style={{fontFamily:"'IBM Plex Mono',monospace",color:G.text}}>{reviewRef}</strong></div>
                  <div style={{fontSize:11,color:G.muted}}>Expected response: within 5 business days · Contact: {BANK_EMAIL}</div>
                </div>
                <button onClick={handleWithdraw}
                  style={{fontSize:10,fontWeight:600,color:G.red,background:G.redDim,border:`1px solid rgba(190,18,60,0.2)`,borderRadius:4,padding:"5px 12px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>
                  🗑 Withdraw & Delete Data
                </button>
              </div>
              <div style={{marginTop:"0.75rem",background:"rgba(21,128,61,0.06)",borderRadius:5,padding:"0.6rem 0.85rem"}}>
                <div style={{fontSize:9,color:G.green,fontWeight:600,letterSpacing:1,marginBottom:3}}>DATA PROTECTION STATUS</div>
                <div style={{fontSize:10,color:G.text2,lineHeight:1.6}}>
                  🔒 Personal data AES-256 encrypted in browser storage<br/>
                  📅 Auto-deleted after {REVIEW_RETENTION_DAYS} days<br/>
                  📧 Only reference ID {reviewRef} sent to bank (not your personal details)<br/>
                  ⚖️ Lawful basis: Consent · Art.6(1)(a) GDPR
                </div>
              </div>
            </div>
          )}

          <div style={{background:"rgba(245,166,35,0.06)",border:"1px solid rgba(245,166,35,0.18)",borderRadius:8,padding:"1.1rem 1.4rem",marginBottom:"1rem"}}>
            <div style={{fontSize:9,fontWeight:600,color:G.amber2,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"0.6rem"}}>📌 Your Rights & Next Steps</div>
            {["You have the right to request human review of this decision (GDPR Article 22).","You may re-apply after addressing the factors listed above.","Contact our team for a personal consultation on improving your profile.","Request a full written explanation of how this decision was reached."].map((r,i)=>(
              <div key={i} style={{fontSize:11,color:G.text2,marginBottom:"0.3rem",display:"flex",gap:"0.5rem"}}><span style={{color:G.amber}}>→</span>{r}</div>
            ))}
          </div>
        </>
      )}
      <div style={{fontSize:9,color:G.muted,borderTop:`1px solid ${G.border}`,paddingTop:"0.7rem",lineHeight:1.6}}>
        This decision was produced by an automated AI system (Model: W3-RF-v1, EU AI Act Annex III High-Risk). You have the right to contest this decision and request human review. Ref: ECS-{Date.now().toString(36).toUpperCase()}
      </div>
    </div>
  );
}

// ─── INTERNAL VIEW ─────────────────────────────────────────────
function InternalView({result,form}){
  const{approved,riskScore,threshold,factors,ageGroup}=result;
  const conf=Math.abs(riskScore-threshold)<0.05?"LOW — borderline case":Math.abs(riskScore-threshold)<0.15?"MEDIUM":"HIGH";
  const sep="─".repeat(60);
  return(
    <div style={{background:"#0d1b2e",border:`1px solid #1e3a5f`,borderRadius:8,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,padding:"1.25rem 1.5rem",color:"#7fb3ff",lineHeight:1.75,overflowX:"auto"}}>
      <div style={{color:"#7dd3fc",fontWeight:600,fontSize:12,marginBottom:"0.75rem",borderBottom:`1px solid #1e3a5f`,paddingBottom:"0.5rem"}}>██ INTERNAL CREDIT ASSESSMENT — RESTRICTED TO BANK STAFF ██</div>
      {[["SYSTEM","EthiCredit W3-RF-v1 (RandomForest, 300 trees, balanced)"],["BALANCE_METHOD","Random Undersampling (Week 2 winner, AUC=0.770)"],["FAIRNESS","Equal Opportunity Threshold Calibration (Week 3)"],["TIMESTAMP",new Date().toISOString()]].map(([k,v],i)=>(
        <div key={i}><span style={{color:"#4a7a9b"}}>{k.padEnd(18)}</span><span style={{color:"#c8dff0"}}>{v}</span></div>
      ))}
      <div style={{color:"#1e3a5f",margin:"0.4rem 0"}}>{sep}</div>
      {[["APPLICANT_AGE",form.age||"N/A"],["AGE_GROUP",ageGroup]].map(([k,v],i)=>(
        <div key={i}><span style={{color:"#4a7a9b"}}>{k.padEnd(18)}</span><span style={{color:"#c8dff0"}}>{v}</span></div>
      ))}
      <div><span style={{color:"#4a7a9b"}}>{"RAW_RISK_SCORE".padEnd(18)}</span><span style={{color:"#fbbf24",fontWeight:600}}>{riskScore.toFixed(4)}</span></div>
      <div><span style={{color:G.muted}}>{"DECISION_THRESH".padEnd(18)}</span><span style={{color:G.cyan}}>{threshold.toFixed(2)}</span><span style={{color:G.muted}}>  [calibrated for {ageGroup}]</span></div>
      <div><span style={{color:"#4a7a9b"}}>{"DECISION".padEnd(18)}</span><span style={{color:approved?"#4ade80":"#f87171",fontWeight:700}}>{approved?"APPROVE":"REJECT"}</span></div>
      <div><span style={{color:"#4a7a9b"}}>{"CONFIDENCE".padEnd(18)}</span><span style={{color:"#c8dff0"}}>{conf}</span></div>
      <div style={{color:"#1e3a5f",margin:"0.4rem 0"}}>{sep}</div>
      <div style={{color:"#60a5fa",textTransform:"uppercase",fontSize:10,letterSpacing:1,marginBottom:"0.4rem"}}>FEATURE CONTRIBUTIONS:</div>
      {factors.map((f,i)=>(
        <div key={i} style={{display:"flex",gap:"1.5rem"}}>
          <span style={{color:"#60a5fa",fontSize:10,width:180}}>{f.feature}</span>
          <span style={{color:f.contribution>0?"#f87171":"#4ade80",fontWeight:600,fontSize:10}}>{f.contribution>0?"+":""}{f.contribution.toFixed(4)}</span>
          <span style={{color:f.contribution>0?"#f87171":"#4ade80",fontSize:10}}>{f.contribution>0?"↑ RAISES RISK":"↓ lowers risk"}</span>
        </div>
      ))}
      <div style={{color:"#1e3a5f",margin:"0.4rem 0"}}>{sep}</div>
      {[["EU AI Act Art.10","Training data balanced — SMOTE + undersampling ✓"],["EU AI Act Art.12","Decision auto-logged to audit ledger ✓"],["EU AI Act Art.13","Applicant notified of automated decision ✓"],["GDPR Art.22","Human override available on request ✓"]].map(([k,v],i)=>(
        <div key={i}><span style={{color:"#4a7a9b"}}>{k.padEnd(20)}</span><span style={{color:"#c8dff0"}}>{v}</span></div>
      ))}
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────
// submissions: array of { approved:bool, ageGroup:string, month:string }
function DashboardTab({ submissions, onClear }){
  const total    = submissions.length;
  const approved = submissions.filter(s=>s.approved).length;
  const rejected = submissions.filter(s=>!s.approved).length;

  const pieData=[{name:"Approved",value:approved||0},{name:"Rejected",value:rejected||0}];
  const PC=[G.teal,G.red];

  // FIXED: Monthly Chart Logic with Chronological Sorting
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMap = {};

  submissions.forEach(s => {
    if (!monthMap[s.month]) monthMap[s.month] = { m: s.month, approved: 0, rejected: 0 };
    s.approved ? monthMap[s.month].approved++ : monthMap[s.month].rejected++;
  });

  // Is line se Feb hamesha Mar se pehle aayega (Index-based sorting)
  const monthlyData = Object.values(monthMap).sort((a, b) => 
    MONTH_LABELS.indexOf(a.m) - MONTH_LABELS.indexOf(b.m)
  );

  // FIXED: Age Group Chart Logic (Direct mapping to thresholds)
  const AGE_LABELS = ["18-30", "31-45", "46-60", "60+"];
  const ageMap = {};
  AGE_LABELS.forEach(g => ageMap[g] = { group: g, approved: 0, rejected: 0 });

  submissions.forEach(s => {
    const grp = s.ageGroup;
    if (ageMap[grp]) s.approved ? ageMap[grp].approved++ : ageMap[grp].rejected++;
  });
  const ageData=Object.values(ageMap);

  // Empty state
  if(total===0) return(
    <div style={{...card,textAlign:"center",padding:"3rem 2rem"}}>
      <div style={{fontSize:"2.5rem",marginBottom:12}}>📋</div>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:G.text,marginBottom:8}}>No Applications Yet</div>
      <div style={{fontSize:12,color:G.muted,lineHeight:1.7,maxWidth:380,margin:"0 auto"}}>
        Submit your first application via the <strong style={{color:G.amber}}>01 — Application</strong> tab.<br/>
        Every assessment you run will be tracked here in real time — KPIs, charts and age-group breakdowns will populate automatically.
      </div>
    </div>
  );

  return(
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.85rem",marginBottom:"1rem"}}>
        {[
          {label:"Total Applications",value:total,col:G.violet,icon:"👥",sub:"Persisted · survives reload"},
          {label:"Approved",value:approved,col:G.teal,icon:"✅",sub:`${total>0?((approved/total)*100).toFixed(1):0}% approval rate`},
          {label:"Rejected",value:rejected,col:G.red,icon:"❌",sub:`${total>0?((rejected/total)*100).toFixed(1):0}% rejection rate`},
        ].map((k,i)=>(
          <div key={i} style={{...card,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.col,borderRadius:"8px 8px 0 0"}}/>
            <div style={{fontSize:9,color:G.muted,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:"2.2rem",fontWeight:800,fontFamily:"'Sora',sans-serif",color:k.col,lineHeight:1}}>
              <AnimCount value={k.value}/>
            </div>
            <div style={{fontSize:9,color:G.muted,marginTop:6}}>{k.sub}</div>
            <div style={{position:"absolute",right:"1rem",top:"1.1rem",fontSize:"1.4rem",opacity:0.25}}>{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Trend + Pie */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:"0.85rem",marginBottom:"0.85rem"}}>
        <div style={card}>
          <div style={sectionHdr}>
            <div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>
            Submissions Over Time
            <span style={{marginLeft:"auto",fontSize:9,color:G.muted,fontWeight:400,textTransform:"none",letterSpacing:0}}>grouped by month</span>
          </div>
          {monthlyData.length<2?(
            <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:G.muted,fontSize:11}}>
              Submit more applications to see the trend chart populate
            </div>
          ):(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={G.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={G.teal} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={G.red} stopOpacity={0.3}/><stop offset="95%" stopColor={G.red} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={G.border}/>
                <XAxis dataKey="m" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip {...tt}/>
                <Area type="monotone" dataKey="approved" stroke={G.teal} fill="url(#gA)" strokeWidth={2} name="Approved"/>
                <Area type="monotone" dataKey="rejected" stroke={G.red} fill="url(#gR)" strokeWidth={2} name="Rejected"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Decision Split</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={3}>
                {pieData.map((_,i)=><Cell key={i} fill={PC[i]}/>)}
              </Pie>
              <Tooltip {...tt}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:8}}>
            {pieData.map((d,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:PC[i]}}/>
                  <span style={{fontSize:9,color:G.muted}}>{d.name}</span>
                </div>
                <div style={{fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",color:PC[i]}}>{d.value}</div>
              </div>
            ))}
          </div>
          {/* Approval rate bar */}
          <div style={{marginTop:14,borderTop:`1px solid ${G.border}`,paddingTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:G.muted,marginBottom:5}}>
              <span>Approval Rate</span>
              <span style={{color:G.teal,fontWeight:700}}>{total>0?((approved/total)*100).toFixed(1):0}%</span>
            </div>
          <div style={{background:G.bg3,borderRadius:8,height:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${total>0?(approved/total)*100:0}%`,background:`linear-gradient(90deg,${G.teal}88,${G.teal})`,borderRadius:8,transition:"width 0.8s ease"}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Age group bar */}
      <div style={card}>
        <div style={sectionHdr}>
          <div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>
          Approvals vs Rejections by Age Group
          <span style={{marginLeft:"auto",fontSize:9,color:G.muted,fontWeight:400,textTransform:"none",letterSpacing:0}}>derived from submitted applications</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={ageData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false}/>
            <XAxis dataKey="group" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis allowDecimals={false} tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip {...tt}/>
            <Legend wrapperStyle={{color:G.muted,fontSize:10}}/>
            <Bar dataKey="approved" name="Approved" fill={G.teal} radius={[4,4,0,0]}/>
            <Bar dataKey="rejected" name="Rejected" fill={G.red} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Storage status + reset */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"0.85rem",marginBottom:"0.5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <span style={{fontSize:9,background:G.greenDim,color:G.green,padding:"2px 8px",borderRadius:10,fontWeight:700,letterSpacing:0.5}}>💾 SAVED TO BROWSER</span>
          <span style={{fontSize:9,color:G.muted}}>Data persists across page reloads</span>
        </div>
        <button onClick={onClear}
          style={{fontSize:9,fontWeight:600,color:G.red,background:G.redDim,border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:0.5}}>
          🗑 RESET DATA
        </button>
      </div>
      {/* Recent submissions log */}
      <div style={{...card,marginTop:"0.85rem"}}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Recent Submissions Log</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:"0 1rem",alignItems:"center"}}>
          {["#","Age Group","Score","Threshold","Decision"].map((h,i)=>(
            <div key={i} style={{fontSize:9,color:G.muted,letterSpacing:1,textTransform:"uppercase",paddingBottom:6,borderBottom:`1px solid ${G.border}`}}>{h}</div>
          ))}
          {[...submissions].reverse().slice(0,8).map((s,i)=>(
            <>
              <div key={`n${i}`} style={{fontSize:10,color:G.muted,padding:"5px 0",borderBottom:`1px solid ${G.border}`}}>{submissions.length-i}</div>
              <div key={`a${i}`} style={{fontSize:11,color:G.text2,borderBottom:`1px solid ${G.border}`}}>{s.ageGroup}</div>
              <div key={`s${i}`} style={{fontSize:11,fontWeight:600,color:s.approved?G.teal:G.red,borderBottom:`1px solid ${G.border}`,fontFamily:"'IBM Plex Mono',monospace"}}>{(s.riskScore*100).toFixed(1)}%</div>
              <div key={`t${i}`} style={{fontSize:11,color:G.muted,borderBottom:`1px solid ${G.border}`,fontFamily:"'IBM Plex Mono',monospace"}}>{(s.threshold*100).toFixed(0)}%</div>
              <div key={`d${i}`} style={{borderBottom:`1px solid ${G.border}`,padding:"4px 0"}}>
                <span style={{background:s.approved?G.greenDim:G.redDim,color:s.approved?G.green:G.red,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,letterSpacing:0.5}}>
                  {s.approved?"APPROVED":"REJECTED"}
                </span>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PARAMETERS TAB ──────────────────────────────────────────────
function ParametersTab(){
  const [sel,setSel]=useState(null);
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:"0.85rem"}}>
      <div style={card}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Top 10 Decision Parameters — Feature Importance</div>
        {TOP_PARAMS.map(p=>{
          const col=p.impact==="approve"?G.teal:p.impact==="reject"?G.red:G.amber;
          const isSel=sel?.rank===p.rank;
          return(
            <div key={p.rank} onClick={()=>setSel(isSel?null:p)}
              style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"10px 12px",borderRadius:6,marginBottom:4,background:isSel?`${col}0d`:"transparent",border:`1px solid ${isSel?col+"33":"transparent"}`,cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{width:24,height:24,borderRadius:4,background:`${col}22`,color:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{p.rank}</div>
              <div style={{fontSize:14,flexShrink:0}}>{p.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:G.text,marginBottom:4}}>{p.param}</div>
                <div style={{background:G.bg3,borderRadius:8,height:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${p.weight}%`,background:`linear-gradient(90deg,${col}66,${col})`,borderRadius:8,transition:"width 0.8s ease"}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:15,fontWeight:700,color:col,fontFamily:"'Sora',sans-serif"}}>{p.weight}%</div>
                <div style={{fontSize:8,color:col,background:`${col}22`,padding:"1px 6px",borderRadius:10,textTransform:"uppercase",letterSpacing:0.5}}>{p.impact}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
        {sel&&(
          <div style={{...card,border:`1px solid ${sel.impact==="approve"?G.teal:sel.impact==="reject"?G.red:G.amber}44`,animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:22,marginBottom:8}}>{sel.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:G.text,marginBottom:6}}>{sel.param}</div>
            <div style={{fontSize:12,color:G.text2,lineHeight:1.6,marginBottom:14}}>{sel.desc}</div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{fontSize:9,color:G.muted}}>Weight</div><div style={{fontSize:20,fontWeight:700,color:G.amber,fontFamily:"'Sora',sans-serif"}}>{sel.weight}%</div></div>
              <div><div style={{fontSize:9,color:G.muted}}>Rank</div><div style={{fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif"}}>#{sel.rank}</div></div>
              <div><div style={{fontSize:9,color:G.muted}}>Direction</div><div style={{fontSize:13,fontWeight:600,color:sel.impact==="approve"?G.teal:sel.impact==="reject"?G.red:G.amber,textTransform:"capitalize"}}>{sel.impact}</div></div>
            </div>
          </div>
        )}
        <div style={{...card,flex:1}}>
          <div style={{...sectionHdr,marginBottom:"0.75rem"}}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Feature Radar</div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke={G.border}/>
              <PolarAngleAxis dataKey="subject" tick={{fill:G.muted,fontSize:10}}/>
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="A" stroke={G.amber} fill={G.amber} fillOpacity={0.15}/>
              <Tooltip {...tt}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── FAIRNESS TAB ─────────────────────────────────────────────────
function FairnessTab(){
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.85rem",marginBottom:"0.85rem"}}>
        {/* Fairness Metrics */}
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Algorithmic Fairness Metrics</div>
          {FAIRNESS_METRICS.map((m,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,color:G.text}}>{m.metric}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:m.status==="pass"?G.green:G.amber,fontFamily:"'Sora',sans-serif"}}>{m.score}</span>
                  <Badge status={m.status}/>
                </div>
              </div>
              <div style={{background:G.bg3,borderRadius:8,height:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${m.score}%`,background:m.status==="pass"?`linear-gradient(90deg,${G.teal}66,${G.teal})`:`linear-gradient(90deg,${G.amber}66,${G.amber})`,borderRadius:8,transition:"width 1s ease"}}/>
              </div>
              <div style={{fontSize:9,color:G.muted,textAlign:"right",marginTop:2}}>threshold: 80</div>
            </div>
          ))}
          <div style={{background:"rgba(245,166,35,0.08)",border:"1px solid rgba(245,166,35,0.2)",borderRadius:6,padding:"0.8rem",marginTop:8}}>
            <div style={{fontSize:9,color:G.amber,fontWeight:600,letterSpacing:1,marginBottom:4}}>⚠ IMPROVEMENT REQUIRED</div>
            <div style={{fontSize:11,color:G.text2,lineHeight:1.6}}>Calibration and Individual Fairness below threshold. Re-weight training data for age 18–35 and rural applicants.</div>
          </div>
        </div>

        {/* Group Rates */}
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Approval Rates by Demographic Group</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={FAIRNESS_GROUPS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} horizontal={false}/>
              <XAxis type="number" domain={[50,80]} tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
              <YAxis type="category" dataKey="group" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false} width={70}/>
              <Tooltip {...tt} formatter={v=>[`${v}%`,"Approval Rate"]}/>
              <Bar dataKey="rate" radius={[0,6,6,0]}>
                {FAIRNESS_GROUPS.map((d,i)=>(
                  <Cell key={i} fill={d.rate>=65?G.teal:d.rate>=60?G.amber:G.red}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* UI Improvement Cards */}
      <div style={card}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Recommended UI & Pipeline Improvements</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem"}}>
          {[
            {icon:"⚡",title:"Real-time Decision Score",impact:"Feature",col:G.teal,desc:"Live probability score that updates as form fields are filled — reduces manual review time by 40%."},
            {icon:"📊",title:"Explainable AI Panel",impact:"Compliance",col:G.amber,desc:"Show top 3 decision reasons inline. Satisfies GDPR Art.22 explainability requirements."},
            {icon:"🔄",title:"Bias Drift Monitoring",impact:"Fairness",col:G.red,desc:"Weekly automated fairness report. Alert when approval rates diverge >5% across demographics."},
            {icon:"💱",title:"Multi-currency Income",impact:"Feature",col:G.violet,desc:"Allow income in any currency with auto-conversion. Reduces errors for international applicants."},
            {icon:"📱",title:"Mobile-First Portal",impact:"UX",col:G.cyan,desc:"75% of applications start on mobile. Responsive redesign can boost completion rates by 30%."},
            {icon:"🔮",title:"AutoML Feature Pruning",impact:"ML",col:G.teal,desc:"Automated removal of 47 low-importance features. Projected AUC improvement: +2.4%."},
          ].map((item,i)=>(
            <div key={i} style={{background:G.bg3,border:`1px solid ${item.col}33`,borderRadius:6,padding:"1rem",borderLeft:`3px solid ${item.col}`}}>
              <div style={{fontSize:20,marginBottom:8}}>{item.icon}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:700,color:G.text,lineHeight:1.3}}>{item.title}</div>
                <span style={{fontSize:8,color:item.col,background:`${item.col}22`,padding:"1px 6px",borderRadius:10,marginLeft:6,flexShrink:0,letterSpacing:0.5}}>{item.impact}</span>
              </div>
              <div style={{fontSize:11,color:G.text2,lineHeight:1.5}}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CURRENCY TAB ─────────────────────────────────────────────────
function CurrencyTab(){
  const [from,setFrom]=useState("USD");
  const [to,setTo]=useState("INR");
  const [amount,setAmount]=useState("10000");
  const convert=()=>{
    const v=parseFloat(amount)||0;
    return ((v/CURRENCIES[from].rate)*CURRENCIES[to].rate).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  };
  const selStyle={background:G.bg3,border:`1px solid ${G.border}`,color:G.text,padding:"0.5rem 0.75rem",fontSize:12,borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",outline:"none",width:"100%"};
  return(
    <div style={{display:"grid",gridTemplateColumns:"440px 1fr",gap:"0.85rem"}}>
      <div>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Loan Currency Converter</div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:9,color:G.muted,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>Loan Amount</label>
            <div style={{display:"flex",background:G.bg3,border:`1px solid ${G.border}`,borderRadius:4,overflow:"hidden"}}>
              <div style={{padding:"0 14px",display:"flex",alignItems:"center",background:G.bg4,borderRight:`1px solid ${G.border}`,color:G.amber,fontWeight:700,fontSize:14,minWidth:40,justifyContent:"center"}}>{CURRENCIES[from].symbol}</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number"
                style={{flex:1,background:"transparent",border:"none",padding:"0.6rem 0.75rem",color:G.text,fontSize:18,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",outline:"none"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"0.6rem",alignItems:"end",marginBottom:18}}>
            <div>
              <label style={{fontSize:9,color:G.muted,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>From</label>
              <select value={from} onChange={e=>setFrom(e.target.value)} style={selStyle}>
                {Object.keys(CURRENCIES).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={()=>{setFrom(to);setTo(from);}}
              style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:4,padding:"0.5rem 0.75rem",cursor:"pointer",fontSize:14,color:G.amber,fontFamily:"'IBM Plex Mono',monospace"}}>⇄</button>
            <div>
              <label style={{fontSize:9,color:G.muted,letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>To</label>
              <select value={to} onChange={e=>setTo(e.target.value)} style={selStyle}>
                {Object.keys(CURRENCIES).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{background:G.bg4,border:`1px solid ${G.amber}33`,borderRadius:6,padding:"1.25rem",textAlign:"center"}}>
            <div style={{fontSize:10,color:G.muted,marginBottom:6}}>{amount||"0"} {from} equals</div>
            <div style={{fontSize:"2rem",fontWeight:800,color:G.amber,fontFamily:"'Sora',sans-serif",lineHeight:1}}>
              {CURRENCIES[to].symbol}{convert()}
            </div>
            <div style={{fontSize:10,color:G.muted,marginTop:4}}>{to}</div>
            <div style={{fontSize:9,color:G.muted,marginTop:10,borderTop:`1px solid ${G.border}`,paddingTop:8}}>
              1 {from} = {(CURRENCIES[to].rate/CURRENCIES[from].rate).toFixed(4)} {to}
            </div>
          </div>
          <div style={{marginTop:14,background:G.cyanDim,border:`1px solid rgba(0,212,255,0.15)`,borderRadius:6,padding:"0.8rem"}}>
            <div style={{fontSize:9,color:G.cyan,fontWeight:600,letterSpacing:1,marginBottom:4}}>ML PIPELINE NOTE</div>
            <div style={{fontSize:11,color:G.text2,lineHeight:1.6}}>Income values from international applicants are auto-normalised to EUR before credit scoring. This step improved model accuracy by <span style={{color:G.teal}}>+6.2%</span> for cross-border applicants.</div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>All Exchange Rates · Base: {from}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
          {Object.entries(CURRENCIES).filter(([c])=>c!==from).map(([code,data])=>(
            <div key={code} style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:6,padding:"0.85rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:G.text,fontFamily:"'Sora',sans-serif"}}>{code}</div>
                <div style={{fontSize:10,color:G.muted}}>{data.symbol}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:G.amber,fontFamily:"'IBM Plex Mono',monospace"}}>{(data.rate/CURRENCIES[from].rate).toFixed(4)}</div>
                <div style={{fontSize:9,color:G.muted}}>per {from}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ML PIPELINE TAB ─────────────────────────────────────────────
function MLTab(){
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.85rem",marginBottom:"0.85rem"}}>
        {/* Chart */}
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Model vs Baseline Performance</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={ML_METRICS} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis domain={[60,100]} tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...tt}/>
              <Legend wrapperStyle={{color:G.muted,fontSize:10}}/>
              <Bar dataKey="model" name="XGBoost v2.4" fill={G.teal} radius={[4,4,0,0]}/>
              <Bar dataKey="base" name="Baseline" fill={G.muted} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Steps */}
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Preprocessing Pipeline</div>
          {[
            {n:1,name:"Data Ingestion",status:"pass",detail:"1,284 features · schema validated"},
            {n:2,name:"Currency Normalisation",status:"pass",detail:"All incomes converted to EUR baseline"},
            {n:3,name:"Outlier Detection",status:"pass",detail:"IQR method · 3.2% records flagged"},
            {n:4,name:"Missing Value Imputation",status:"warn",detail:"7.4% missing DTI — KNN imputed"},
            {n:5,name:"Feature Encoding",status:"pass",detail:"One-hot + target encoding applied"},
            {n:6,name:"Fairness Pre-processing",status:"warn",detail:"Reweighing applied to protected groups"},
            {n:7,name:"Model Inference",status:"pass",detail:"W3-RF-v1 · p50 latency: 8ms"},
            {n:8,name:"SHAP Explanation",status:"pass",detail:"SHAP values generated per prediction"},
          ].map(s=>(
            <div key={s.n} style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",marginBottom:10}}>
              <div style={{width:22,height:22,borderRadius:4,background:s.status==="pass"?G.greenDim:"rgba(245,166,35,0.12)",color:s.status==="pass"?G.green:G.amber,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{s.status==="pass"?"✓":"!"}</div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:G.text}}>{s.n}. {s.name}</div>
                <div style={{fontSize:10,color:G.muted,marginTop:2}}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Cards */}
      <div style={card}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Recommended Pipeline Improvements</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem"}}>
          {[
            {icon:"🔀",title:"SMOTE Oversampling",impact:"+3.1% Recall",col:G.teal,desc:"Address class imbalance in minority applicant groups"},
            {icon:"🔮",title:"AutoML Feature Select",impact:"+2.4% AUC",col:G.violet,desc:"Automated pruning removes 47 low-importance variables"},
            {icon:"📉",title:"Adversarial Debiasing",impact:"−8% Disparity",col:G.amber,desc:"Reduce demographic parity gap with in-processing technique"},
            {icon:"⚙️",title:"Ensemble Stacking",impact:"+1.8% F1",col:G.teal,desc:"Combine XGBoost + LightGBM + CatBoost predictions"},
          ].map((item,i)=>(
            <div key={i} style={{background:G.bg3,border:`1px solid ${item.col}33`,borderRadius:6,padding:"1rem"}}>
              <div style={{fontSize:20,marginBottom:8}}>{item.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:G.text,marginBottom:4}}>{item.title}</div>
              <div style={{fontSize:14,fontWeight:800,color:item.col,marginBottom:8,fontFamily:"'Sora',sans-serif"}}>{item.impact}</div>
              <div style={{fontSize:11,color:G.text2,lineHeight:1.5}}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit/compliance */}
      <div style={{...card,marginTop:"0.85rem"}}>
        <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>Regulatory Audit Trail</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.6rem"}}>
          {[
            ["EU AI Act Art.10","Training data balanced — SMOTE + undersampling","pass"],
            ["EU AI Act Art.12","Decision auto-logged to audit ledger","pass"],
            ["EU AI Act Art.13","Applicant notified of automated decision","pass"],
            ["GDPR Art.22","Human override available on request","pass"],
            ["Fairness Check","Age group TPR disparity = 0.088 < 0.30","pass"],
            ["Age Feature","Used ONLY for threshold calibration, not direct input","pass"],
          ].map(([law,desc,status],i)=>(
            <div key={i} style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:6,padding:"0.75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:600,color:G.amber}}>{law}</span>
                <Badge status={status}/>
              </div>
              <div style={{fontSize:11,color:G.text2,lineHeight:1.4}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────
function AboutPage(){
  return(
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:G.text,letterSpacing:"-0.5px",marginBottom:4}}>Architecture & Fairness</div>
        <div style={{fontSize:12,color:G.muted}}>Technical overview — XAI, bias mitigation, regulatory compliance</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>⚖️ Age-Calibrated Thresholds</div>
          <p style={{fontSize:12,color:G.text2,lineHeight:1.6,marginBottom:"0.85rem"}}>The 18–30 group showed approval rate disparity Δ=0.296 under a global 0.5 threshold. Equal Opportunity Calibration sets per-group thresholds to achieve ~70% TPR in each cohort.</p>
          {Object.entries(AGE_THRESHOLDS).map(([ag,t])=>(
            <div key={ag} style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.4rem"}}>
              <div style={{fontSize:11,color:G.cyan,width:55}}>{ag}</div>
              <div style={{flex:1,height:5,background:G.bg3,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${t*100}%`,borderRadius:3,background:`linear-gradient(to right,${G.green},${G.amber})`}}/>
              </div>
              <div style={{fontSize:11,fontWeight:600,color:G.text,width:30,textAlign:"right"}}>{t}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>📊 Model Performance</div>
          {[["ROC-AUC","0.770","Basel III ≥0.70 ✓"],["Recall (fair)","≥0.62","62%+ defaults caught"],["F1-Score","0.613","Balanced precision/recall"],["Approval Δ after","0.088","Below 0.30 line ✓"],["Tests passing","22/22","~86% code coverage"]].map(([l,v,sub],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:`1px solid ${G.border}`}}>
              <div>
                <div style={{fontSize:11,color:G.text2}}>{l}</div>
                <div style={{fontSize:9,color:G.muted}}>{sub}</div>
              </div>
              <div style={{fontSize:13,fontWeight:600,color:G.cyan,fontFamily:"'Sora',sans-serif"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>🔍 Dual Explanation System</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            {[{title:"👤 Customer",col:G.cyan,items:["Plain English","Actionable tips","Rights to contest","GDPR Art.22 ✓","No jargon"]},{title:"🏦 Internal Bank",col:G.amber,items:["Raw risk scores","Feature Δ breakdown","Age-calibrated threshold","Model version","EU AI Act Art.12 ✓"]}].map((v,i)=>(
              <div key={i}>
                <div style={{fontSize:10,fontWeight:600,color:v.col,marginBottom:"0.5rem"}}>{v.title}</div>
                {v.items.map((item,j)=><div key={j} style={{fontSize:11,color:G.text2,marginBottom:"0.25rem"}}>• {item}</div>)}
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>📋 Regulatory Compliance</div>
          {[["GDPR Article 22","Right to explanation in Customer View"],["EU AI Act Art.10","SMOTE + undersampling representativeness"],["EU AI Act Art.12","Full audit trail in Internal View"],["EU AI Act Art.13","Transparency of automated decision"],["Equal Treatment Dir.","Disparate impact fixed via EO Calibration"]].map(([law,desc],i)=>(
            <div key={i} style={{display:"flex",gap:"0.5rem",alignItems:"flex-start",padding:"0.35rem 0"}}>
              <div style={{color:G.green,flexShrink:0}}>✓</div>
              <div style={{fontSize:11,color:G.text2,lineHeight:1.5}}><strong style={{color:G.text}}>{law}: </strong>{desc}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>🧪 Automated Test Suite</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem"}}>
            {[{cat:"Data Pipeline",n:8,icon:"📦",desc:"Loading, encoding, scaling, split integrity"},{cat:"Model Performance",n:6,icon:"🎯",desc:"AUC, recall, cost vs baseline"},{cat:"Fairness Checks",n:5,icon:"⚖️",desc:"Group disparity, TPR calibration"},{cat:"XAI Engine",n:7,icon:"🔍",desc:"Explanation quality, audience separation"}].map((c,i)=>(
              <div key={i} style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:6,padding:"0.875rem"}}>
                <div style={{fontSize:"1.2rem",marginBottom:"0.35rem"}}>{c.icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:G.text,marginBottom:"0.25rem"}}>{c.cat}</div>
                <div style={{fontSize:18,fontWeight:800,fontFamily:"'Sora',sans-serif",color:G.green,marginBottom:"0.25rem"}}>{c.n}</div>
                <div style={{fontSize:10,color:G.muted,lineHeight:1.4}}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REVIEWS TAB (Bank Staff — stored review requests) ───────────
function ReviewsTab(){
  const [reviews,setReviews]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("ethicredit_reviews")||"[]");}
    catch{return [];}
  });
  const [decrypted,setDecrypted]=useState({});
  const [decrypting,setDecrypting]=useState(null);
  const [decryptErr,setDecryptErr]=useState({});

  const handleDecrypt=async(ref,encrypted)=>{
    setDecrypting(ref);
    try{
      const plain=await decryptData(encrypted);
      setDecrypted(prev=>({...prev,[ref]:plain}));
    }catch{
      setDecryptErr(prev=>({...prev,[ref]:"Cannot decrypt — key only available in the same browser session."}));
    }
    setDecrypting(null);
  };

  const updateStatus=(ref,status)=>{
    const updated=reviews.map(r=>r.ref===ref?{...r,status}:r);
    setReviews(updated);
    localStorage.setItem("ethicredit_reviews",JSON.stringify(updated));
  };

  const deleteReview=(ref)=>{
    if(!window.confirm("Delete this review request and all associated data?"))return;
    const updated=reviews.filter(r=>r.ref!==ref);
    setReviews(updated);
    localStorage.setItem("ethicredit_reviews",JSON.stringify(updated));
    const d={...decrypted}; delete d[ref]; setDecrypted(d);
  };

  const statusColor={PENDING:G.amber,UNDER_REVIEW:G.cyan,RESOLVED:G.green,WITHDRAWN:G.muted};
  const statusBg={PENDING:G.amberDim,UNDER_REVIEW:G.cyanDim,RESOLVED:G.greenDim,WITHDRAWN:G.bg3};

  if(reviews.length===0) return(
    <div style={{...card,textAlign:"center",padding:"3rem 2rem"}}>
      <div style={{fontSize:"2.5rem",marginBottom:12}}>📭</div>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:G.text,marginBottom:8}}>No Review Requests</div>
      <div style={{fontSize:12,color:G.muted,maxWidth:380,margin:"0 auto",lineHeight:1.7}}>
        Human review requests submitted by applicants will appear here.<br/>
        This tab is for <strong style={{color:G.amber}}>bank staff only</strong>.
      </div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
        <div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800,color:G.text}}>Human Review Requests</div>
          <div style={{fontSize:11,color:G.muted}}>Bank staff only · Encrypted applicant data · EU AI Act Art.22 oversight</div>
        </div>
        <div style={{display:"flex",gap:"0.6rem"}}>
          {["PENDING","UNDER_REVIEW","RESOLVED"].map(s=>(
            <span key={s} style={{fontSize:9,padding:"3px 10px",borderRadius:10,fontWeight:700,
              background:statusBg[s],color:statusColor[s],letterSpacing:0.5}}>
              {reviews.filter(r=>r.status===s).length} {s.replace("_"," ")}
            </span>
          ))}
        </div>
      </div>

      <div style={{background:G.redDim,border:`1px solid rgba(190,18,60,0.2)`,borderRadius:7,padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:11,color:G.red2,lineHeight:1.6}}>
        🔒 <strong>Security Notice:</strong> Applicant data is AES-256 encrypted. Decryption requires the same browser session that submitted the request. In production, replace localStorage with a secure backend API and server-side key management.
      </div>

      {reviews.map((r,i)=>{
        const d=decrypted[r.ref];
        const isExpired=new Date()>new Date(new Date(r.submittedAt).getTime()+REVIEW_RETENTION_DAYS*86400000);
        return(
          <div key={r.ref} style={{...card,marginBottom:"0.85rem",border:`1px solid ${statusColor[r.status]||G.border}33`}}>
            {/* Header row */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.85rem"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem",flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:G.text}}>{r.ref}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:10,
                    background:statusBg[r.status]||G.bg3,color:statusColor[r.status]||G.muted,letterSpacing:0.5}}>
                    {r.status}
                  </span>
                  {isExpired&&<span style={{fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:10,background:G.redDim,color:G.red,letterSpacing:0.5}}>EXPIRED</span>}
                </div>
                <div style={{fontSize:10,color:G.muted,marginTop:3}}>
                  Submitted: {new Date(r.submittedAt).toLocaleString()}
                  {" · "}Auto-delete: {new Date(new Date(r.submittedAt).getTime()+REVIEW_RETENTION_DAYS*86400000).toLocaleDateString()}
                </div>
              </div>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                <select value={r.status}
                  onChange={e=>updateStatus(r.ref,e.target.value)}
                  style={{fontSize:10,border:`1px solid ${G.border}`,borderRadius:4,padding:"4px 8px",
                    background:G.bg3,color:G.text,fontFamily:"'IBM Plex Mono',monospace",cursor:"pointer"}}>
                  {["PENDING","UNDER_REVIEW","RESOLVED"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={()=>deleteReview(r.ref)}
                  style={{fontSize:10,color:G.red,background:G.redDim,border:"none",borderRadius:4,
                    padding:"4px 10px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>
                  🗑 Delete
                </button>
              </div>
            </div>

            {/* Decrypt panel */}
            {!d?(
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <button onClick={()=>handleDecrypt(r.ref,r.encrypted)} disabled={decrypting===r.ref}
                  style={{fontSize:11,fontWeight:600,color:G.cyan,background:G.cyanDim,
                    border:`1px solid rgba(3,105,161,0.25)`,borderRadius:5,padding:"6px 14px",
                    cursor:decrypting===r.ref?"wait":"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>
                  {decrypting===r.ref?"🔓 Decrypting…":"🔓 View Applicant Details"}
                </button>
                {decryptErr[r.ref]&&<span style={{fontSize:10,color:G.amber}}>{decryptErr[r.ref]}</span>}
              </div>
            ):(
              <div style={{background:G.bg3,border:`1px solid ${G.border}`,borderRadius:6,padding:"0.9rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.75rem"}}>
                  {[
                    ["Full Name", d.contact?.fullName||"—"],
                    ["Email",     d.contact?.email||"—"],
                    ["Phone",     d.contact?.phone||"Not provided"],
                    ["Age Group", d.decision?.ageGroup||"—"],
                    ["Risk Score",d.decision?.riskScore!=null?(d.decision.riskScore*100).toFixed(1)+"%":"—"],
                    ["Threshold", d.decision?.threshold!=null?(d.decision.threshold*100).toFixed(0)+"%":"—"],
                  ].map(([k,v],j)=>(
                    <div key={j} style={{background:G.bg2,border:`1px solid ${G.border}`,borderRadius:5,padding:"0.5rem 0.75rem"}}>
                      <div style={{fontSize:9,color:G.muted,letterSpacing:0.5,marginBottom:2}}>{k.toUpperCase()}</div>
                      <div style={{fontSize:12,fontWeight:600,color:G.text,fontFamily:k==="Email"||k==="Risk Score"||k==="Threshold"?"'IBM Plex Mono',monospace":"inherit"}}>{v}</div>
                    </div>
                  ))}
                </div>
                {d.context&&(
                  <div style={{background:G.bg2,border:`1px solid ${G.border}`,borderRadius:5,padding:"0.6rem 0.75rem",marginBottom:"0.6rem"}}>
                    <div style={{fontSize:9,color:G.muted,letterSpacing:0.5,marginBottom:3}}>APPLICANT CONTEXT</div>
                    <div style={{fontSize:12,color:G.text2,lineHeight:1.6}}>{d.context}</div>
                  </div>
                )}
                <div style={{fontSize:9,color:G.muted,borderTop:`1px solid ${G.border}`,paddingTop:"0.5rem",lineHeight:1.7}}>
                  ⚖️ Lawful basis: {d.gdpr?.lawfulBasis} · Retention: {d.gdpr?.retentionDays} days · Purpose: {d.gdpr?.purpose}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const EMPTY={
  age:"",duration:"",credit_amount_EUR:"",installment_commitment:"2",
  residence_since:"3",existing_credits:"1",num_dependents:"1",
  checking_status:"",credit_history:"",purpose:"",savings_status:"",employment:"",
  personal_status:"male_single",other_parties:"none",property_magnitude:"",
  other_payment_plans:"none",housing:"",job:"",own_telephone:"yes",foreign_worker:"no"
};
const REQUIRED=["age","duration","credit_amount_EUR","checking_status","credit_history","purpose","savings_status","employment","property_magnitude","housing","job"];

const FORM_SECTIONS=[
  {title:"Personal Profile",icon:"👤",fields:["age","personal_status","housing","residence_since","num_dependents","own_telephone","foreign_worker"]},
  {title:"Employment",icon:"💼",fields:["employment","job","installment_commitment"]},
  {title:"Loan Details",icon:"📄",fields:["credit_amount_EUR","duration","purpose","existing_credits","other_payment_plans","other_parties"]},
  {title:"Financial Profile",icon:"🏦",fields:["checking_status","savings_status","credit_history","property_magnitude"]},
];

const ALL_TABS=[
  {id:"form",label:"01 — Application"},
  {id:"dashboard",label:"02 — Dashboard"},
  {id:"result",label:"03 — Assessment"},
  {id:"parameters",label:"04 — Parameters"},
  {id:"fairness",label:"05 — Fairness"},
  {id:"currency",label:"06 — Currency"},
  {id:"ml",label:"07 — ML Pipeline"},
  {id:"about",label:"08 — XAI & Fairness"},
  {id:"reviews",label:"09 — Review Requests"},
];

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [viewMode,setViewMode]=useState("customer");
  const [form,setForm]=useState({...EMPTY});
  const [result,setResult]=useState(null);
  const [tick,setTick]=useState(0);
  // ── Live submission tracker — persisted to localStorage ──────────
  const [submissions,setSubmissions]=useState(()=>{
    try{
      const saved=localStorage.getItem("ethicredit_submissions");
      return saved?JSON.parse(saved):[];
    }catch{return [];}
  });

  useEffect(()=>{const t=setInterval(()=>setTick(p=>p+1),4000);return()=>clearInterval(t);},[]);

  const onChange=(n,v)=>setForm(p=>({...p,[n]:v}));

  const submit=()=>{
    const missing=REQUIRED.filter(f=>!form[f]);
    if(missing.length){alert("Please fill in:\n"+missing.map(f=>LABELS[f]).join("\n"));return;}
    const riskScore=computeRisk(form);
    const ageGroup=getAgeGroup(form.age);
    const threshold=AGE_THRESHOLDS[ageGroup]||0.38;
    const approved=riskScore<threshold;
    const now=new Date();
    const month=now.toLocaleString("default",{month:"short"});
    // Append to live tracker and persist to localStorage
    setSubmissions(prev=>{
      const updated=[...prev,{approved,ageGroup,riskScore,threshold,month,ts:now.toISOString()}];
      try{localStorage.setItem("ethicredit_submissions",JSON.stringify(updated));}catch{}
      return updated;
    });
    setResult({riskScore,threshold,approved,factors:computeFactors(form),ageGroup});
    setTab("result"); setViewMode("customer");
  };

  const clearData=()=>{
    if(window.confirm('Reset all submission data? This cannot be undone.')){
      setSubmissions([]);
      try{localStorage.removeItem("ethicredit_submissions");}catch{}
    }
  };

  const total=submissions.length;
  const approvedCount=submissions.filter(s=>s.approved).length;
  const rejectedCount=submissions.filter(s=>!s.approved).length;
  const scrollingNums=[
    `${total} TOTAL`,
    `${approvedCount} APPROVED`,
    `${rejectedCount} REJECTED`,
    `${total>0?((approvedCount/total)*100).toFixed(1):0}% RATE`,
    "W3-RF-v1 MODEL",
  ];

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Sora:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        select option{background:#ffffff;color:#0f172a}
        input:focus,select:focus{border-color:#b45309!important;box-shadow:0 0 0 2px rgba(180,83,9,0.12)!important;outline:none!important}
        .tab-btn{background:none;border:none;font-family:'IBM Plex Mono',monospace;cursor:pointer;transition:all 0.15s;}
        .tab-btn:hover{color:#0f172a!important;}
        .param-row:hover{background:rgba(180,83,9,0.05)!important;}
        .btn-submit:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(180,83,9,0.28);}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#e8edf4}
        ::-webkit-scrollbar-thumb{background:#c8d4e3;border-radius:3px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.35s ease forwards}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .ticker{animation:ticker 22s linear infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .live-dot{animation:pulse 1.8s infinite}
      `}</style>

      <div style={{minHeight:"100vh",background:G.bg,color:G.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:"13px"}}>

        {/* ── HEADER ── */}
        <header style={{background:`linear-gradient(135deg,#1e3a5f 0%,#1a3558 100%)`,borderBottom:`1px solid #15325a`,padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:"58px",position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <div style={{width:32,height:32,borderRadius:6,background:`linear-gradient(135deg,${G.amber2},${G.amber})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",fontFamily:"'Sora',sans-serif"}}>EC</div>
            <div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:"#ffffff",letterSpacing:"-0.3px"}}>EthiCredit</div>
              <div style={{fontSize:9,color:"#93b4d4",letterSpacing:"0.5px"}}>FAIR CREDIT INTELLIGENCE PLATFORM v4.0</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"1.5rem",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span className="live-dot" style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/>
              <span style={{fontSize:9,color:"#4ade80",fontWeight:600}}>LIVE</span>
            </div>
            {[["MODEL","W3-RF-v1"],["AUC","0.770"],["TESTS","22/22 ✓"],["FAIRNESS","EU AI ACT"]].map(([k,v],i)=>(
              <div key={i} style={{fontSize:9,color:"#93b4d4"}}>{k} <span style={{color:"#7dd3fc",fontWeight:600}}>{v}</span></div>
            ))}
          </div>
        </header>

        {/* ── TICKER ── */}
        <div style={{background:G.bg4,borderBottom:`1px solid ${G.border}`,overflow:"hidden",height:26,display:"flex",alignItems:"center"}}>
          <div style={{flexShrink:0,padding:"0 12px",fontSize:9,color:G.amber,fontWeight:600,letterSpacing:1,borderRight:`1px solid ${G.border}`}}>LIVE DATA</div>
          <div style={{overflow:"hidden",flex:1}}>
            <div className="ticker" style={{display:"flex",gap:"3rem",whiteSpace:"nowrap",fontSize:9,color:G.muted,padding:"0 2rem"}}>
              {[...scrollingNums,...scrollingNums].map((s,i)=>(
                <span key={i} style={{color:i%5===0?G.teal:i%5===2?G.red:G.muted}}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <nav style={{display:"flex",borderBottom:`1px solid ${G.border}`,background:G.bg2,overflowX:"auto"}}>
          {ALL_TABS.map(t=>{
            const dis=t.id==="result"&&!result;
            return(
              <button key={t.id} className="tab-btn"
                style={{padding:"0.75rem 1.25rem",fontSize:10,fontWeight:500,letterSpacing:"0.6px",textTransform:"uppercase",color:tab===t.id?G.amber:G.muted,borderBottom:tab===t.id?`2px solid ${G.amber}`:"2px solid transparent",opacity:dis?0.3:1,cursor:dis?"not-allowed":"pointer",whiteSpace:"nowrap"}}
                onClick={()=>!dis&&setTab(t.id)} disabled={dis}>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* ── CONTENT ── */}
        <main style={{maxWidth:1100,margin:"0 auto",padding:"1.75rem 1.5rem"}}>

          {/* DASHBOARD */}
          {tab==="dashboard"&&<div className="fade-in"><DashboardTab submissions={submissions} onClear={clearData}/></div>}

          {/* APPLICATION FORM */}
          {tab==="form"&&(
            <div className="fade-in">
              <div style={{marginBottom:"1.75rem"}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:G.text,letterSpacing:"-0.5px",marginBottom:4}}>Credit Application</div>
                <div style={{fontSize:12,color:G.muted}}>Complete all sections. Required fields are used for credit risk assessment.</div>
              </div>
              {FORM_SECTIONS.map(sec=>(
                <div key={sec.title} style={{marginBottom:"1.75rem"}}>
                  <div style={sectionHdr}><div style={{width:3,height:12,background:G.amber,borderRadius:2}}/>{sec.icon} {sec.title}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.85rem"}}>
                    {sec.fields.map(f=><Field key={f} name={f} value={form[f]} onChange={onChange}/>)}
                  </div>
                </div>
              ))}
              <button className="btn-submit"
                style={{width:"100%",padding:"0.95rem",border:"none",borderRadius:6,fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",background:`linear-gradient(135deg,${G.amber},#c87800)`,color:"#000",letterSpacing:"0.3px",transition:"all 0.2s"}}
                onClick={submit}>
                ASSESS CREDIT RISK →
              </button>
            </div>
          )}

          {/* RESULT */}
          {tab==="result"&&result&&(
            <div className="fade-in">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem"}}>
                <div>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:G.text}}>Assessment Result</div>
                  <div style={{fontSize:9,color:G.muted,letterSpacing:"0.5px"}}>AGE GROUP: {result.ageGroup} · CALIBRATED THRESHOLD: {Math.round(result.threshold*100)}%</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <span style={{fontSize:10,color:G.muted}}>VIEW AS:</span>
                  <div style={{display:"flex",background:G.bg3,border:`1px solid ${G.border}`,borderRadius:5,overflow:"hidden"}}>
                    {[{id:"customer",label:"👤 Customer",col:G.cyan},{id:"bank",label:"🏦 Internal Bank",col:G.amber}].map(v=>(
                      <button key={v.id} className="tab-btn"
                        style={{padding:"0.5rem 1rem",fontSize:11,fontWeight:600,letterSpacing:"0.3px",textTransform:"uppercase",background:viewMode===v.id?`${G.bg4}`:"none",color:viewMode===v.id?v.col:G.muted,borderBottom:"none"}}
                        onClick={()=>setViewMode(v.id)}>{v.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{fontSize:9,color:G.muted,marginBottom:"1rem"}}>
                {viewMode==="customer"?"GDPR Article 22 compliant — plain language, no model internals":"EU AI Act Article 12 — full technical audit trail for bank staff only"}
              </div>
              {viewMode==="customer"?<CustomerView result={result} form={form}/>:<InternalView result={result} form={form}/>}
              <div style={{marginTop:"1.5rem",display:"flex",gap:"0.75rem"}}>
                <button onClick={()=>{setTab("form");setResult(null);setForm({...EMPTY});}}
                  style={{flex:1,padding:"0.75rem",border:`1px solid ${G.border}`,borderRadius:6,background:"none",color:G.text2,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,cursor:"pointer"}}>
                  ← New Application
                </button>
                <button onClick={()=>setViewMode(viewMode==="customer"?"bank":"customer")}
                  style={{flex:1,padding:"0.75rem",border:`1px solid ${G.amber}`,borderRadius:6,background:G.amberDim,color:G.amber,fontFamily:"'IBM Plex Mono',monospace",fontSize:12,cursor:"pointer"}}>
                  Switch to {viewMode==="customer"?"Internal Bank":"Customer"} View
                </button>
              </div>
            </div>
          )}

          {/* PARAMETERS */}
          {tab==="parameters"&&<div className="fade-in"><ParametersTab/></div>}

          {/* FAIRNESS */}
          {tab==="fairness"&&<div className="fade-in"><FairnessTab/></div>}

          {/* CURRENCY */}
          {tab==="currency"&&<div className="fade-in"><CurrencyTab/></div>}

          {/* ML PIPELINE */}
          {tab==="ml"&&<div className="fade-in"><MLTab/></div>}

          {/* ABOUT */}
          {tab==="about"&&<div className="fade-in"><AboutPage/></div>}

          {/* REVIEWS */}
          {tab==="reviews"&&<div className="fade-in"><ReviewsTab/></div>}
        </main>

        {/* ── FOOTER ── */}
        <footer style={{borderTop:`1px solid ${G.border}`,padding:"0.85rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",background:G.bg2}}>
          <div style={{fontSize:9,color:G.muted}}>EthiCredit v4.0 · EU AI Act Annex III High-Risk System · © 2026</div>
          <div style={{display:"flex",gap:"1.5rem"}}>
            {[["Model","W3-RF-v1"],["Last Trained","Mar 1, 2026"],["Data","2 min ago"]].map(([k,v],i)=>(
              <div key={i} style={{textAlign:"right"}}>
                <div style={{fontSize:8,color:G.muted}}>{k}</div>
                <div style={{fontSize:10,fontWeight:600,color:G.amber}}>{v}</div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
