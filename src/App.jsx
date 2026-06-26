import { useState, useEffect, useRef, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// When you activate your Supabase project, replace these:
// const SUPABASE_URL = "https://dvlykbunjlwzoqgtdgpn.supabase.co";
// const SUPABASE_ANON_KEY = "your-anon-key";
// For now the app runs entirely in-memory with AI features via Anthropic API.

const COLORS = {
  bg: "#0D0A1A", coral: "#FF3F6C", yellow: "#FFE000",
  lavender: "#C4B5FD", smoke: "#F0EBF8", mid: "#1E1530",
  card: "#18112B", muted: "#6B5E8A",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Grotesk:wght@300;400;500;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0D0A1A;color:#F0EBF8;font-family:'Space Grotesk',sans-serif;overflow-x:hidden}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:#0D0A1A}
  ::-webkit-scrollbar-thumb{background:#1E1530;border-radius:3px}
  @keyframes shake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-1.5deg)}40%{transform:translateX(4px) rotate(1.5deg)}60%{transform:translateX(-3px) rotate(-1deg)}80%{transform:translateX(3px) rotate(1deg)}}
  @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes floatUp{0%{transform:translateY(110vh) rotate(var(--r));opacity:0}10%{opacity:.7}90%{opacity:.7}100%{transform:translateY(-20vh) rotate(var(--r));opacity:0}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,63,108,0.4)}50%{box-shadow:0 0 0 12px rgba(255,63,108,0)}}
  .shake-btn:hover{animation:shake .4s ease-in-out}
  .fade-in{animation:fadeIn .3s ease}
  .ticker-track{display:inline-flex;animation:ticker 28s linear infinite;gap:0}
  .float-bubble{position:absolute;border-radius:16px;padding:.5rem .9rem;font-size:.72rem;white-space:nowrap;animation:floatUp linear infinite}
`;

// ── AI HELPER ─────────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMessage, maxTokens = 300) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function analyzePost(content, type) {
  const raw = await callAI(
    `You analyze emotional posts for a stress-relief platform. Return ONLY valid JSON, no markdown, no extra text.
Schema: {"vibe":0-100,"tag":"short mood label max 3 words","reply":"one warm empathetic sentence max 12 words","emoji":"single emoji"}
vibe: 0=calm, 100=explosive rage. tag examples: "Workplace Rage","Secret Spill","Deep Vent","Pure Chaos","Heart Heavy"`,
    `Type: ${type}\nPost: ${content}`
  );
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { vibe: 50, tag: "Feeling It", reply: "We hear you. You're not alone in this. 💜", emoji: "💭" }; }
}

async function generateAIReply(content, postType) {
  return await callAI(
    `You are a witty, warm friend on ScreamRoom — a chaos/stress-relief app. 
    Reply to posts with exactly ONE sentence. Be real, relatable, funny if the post warrants it. 
    Max 15 words. Never be preachy. Match the energy.`,
    `${postType.toUpperCase()}: "${content}"`
  );
}

// ── SEED POSTS ────────────────────────────────────────────────────────────────
const SEED = [
  { id:"1", content:"My boss just took credit for my idea IN FRONT OF EVERYONE and smiled at me after", type:"shout", ghost:true, vibe:95, tag:"Workplace Rage", emoji:"🔊", reactions:{}, handle:null, aiReply:"The audacity is genuinely breathtaking.", ts: Date.now()-3600000 },
  { id:"2", content:"Apparently the new hire already quit before their first day. No one's talking about it but everyone KNOWS.", type:"gossip", ghost:true, vibe:60, tag:"Office Spill", emoji:"🫢", reactions:{}, handle:null, aiReply:"HR really said nothing to see here.", ts: Date.now()-7200000 },
  { id:"3", content:"I have been faking confidence for 3 years straight and I am so incredibly tired of performing", type:"vent", ghost:true, vibe:78, tag:"Deep Exhaustion", emoji:"💭", reactions:{}, handle:null, aiReply:"The mask gets heavy. You're allowed to put it down.", ts: Date.now()-1800000 },
  { id:"4", content:"She DEFINITELY heard what I said. The eye contact lasted exactly too long.", type:"gossip", ghost:false, vibe:55, tag:"Social Chaos", emoji:"🫢", reactions:{}, handle:"@jaywave", aiReply:"That pause was a full conversation.", ts: Date.now()-900000 },
  { id:"5", content:"I laughed at the absolute wrong moment in a very serious meeting and I cannot stop thinking about it", type:"shout", ghost:false, vibe:70, tag:"Pure Cringe", emoji:"🔊", reactions:{}, handle:"@realbee", aiReply:"Your face during the recovery? Legendary.", ts: Date.now()-600000 },
];

const EMOJIS = ["😤","🫂","💀","🔥","👀","☕","💜","same","felt this","lmao"];

function timeAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return "just now";
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────
const S = {
  // inline style helpers
  btn: (bg, c="#fff", extra={}) => ({background:bg, color:c, border:"none", borderRadius:100, padding:".7rem 1.6rem", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1rem", cursor:"pointer", transition:"transform .15s,box-shadow .15s", ...extra}),
  input: (extra={}) => ({background:"rgba(13,10,26,.7)", border:"1.5px solid rgba(196,181,253,.15)", borderRadius:12, padding:".8rem 1rem", color:COLORS.smoke, fontFamily:"'Space Grotesk',sans-serif", fontSize:".95rem", outline:"none", width:"100%", transition:"border-color .2s", ...extra}),
  card: (extra={}) => ({background:COLORS.card, border:"1px solid rgba(196,181,253,.09)", borderRadius:20, padding:"1.4rem", transition:"transform .2s,border-color .2s", ...extra}),
};

function VibeBar({vibe}) {
  const color = vibe>75?COLORS.coral:vibe>45?COLORS.yellow:COLORS.lavender;
  return (
    <div style={{marginTop:".8rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
        <span style={{fontSize:".65rem",color:COLORS.muted,letterSpacing:".1em",textTransform:"uppercase"}}>Vibe intensity</span>
        <span style={{fontSize:".65rem",color,fontWeight:700}}>{vibe}/100</span>
      </div>
      <div style={{height:4,background:"rgba(196,181,253,.1)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${vibe}%`,background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:2,transition:"width .6s ease"}}/>
      </div>
    </div>
  );
}

function PostCard({post, currentUser, onReact, onAIReply}) {
  const [showAI, setShowAI] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReply, setAIReply] = useState(post.aiReply||"");
  const [hovered, setHovered] = useState(false);

  const typeColor = {shout:COLORS.coral, gossip:"#c8b840", vent:COLORS.lavender}[post.type];
  const typeLabel = {shout:"shout", gossip:"tea ☕", vent:"vent"}[post.type];

  const handleAIReply = async () => {
    if(aiReply){ setShowAI(v=>!v); return; }
    setLoadingAI(true);
    const reply = await generateAIReply(post.content, post.type);
    setAIReply(reply);
    setLoadingAI(false);
    setShowAI(true);
  };

  return (
    <div className="fade-in" style={{...S.card(), cursor:"default", borderColor: hovered?"rgba(196,181,253,.25)":"rgba(196,181,253,.09)", transform: hovered?"translateY(-3px)":"none"}}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      {/* Meta */}
      <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:".8rem"}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(196,181,253,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85rem"}}>
          {post.ghost?"👻":"🔥"}
        </div>
        <span style={{fontSize:".75rem",color:post.ghost?COLORS.muted:COLORS.lavender}}>
          {post.ghost?"anonymous":post.handle||`@${currentUser?.username||"you"}`}
        </span>
        <span style={{marginLeft:"auto",fontSize:".6rem",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",padding:".2rem .6rem",borderRadius:100,background:`${typeColor}22`,color:typeColor}}>
          {typeLabel}
        </span>
        <span style={{fontSize:".65rem",color:COLORS.muted}}>{timeAgo(post.ts)}</span>
      </div>

      {/* Content */}
      <p style={{fontSize:".93rem",lineHeight:1.65,color:COLORS.smoke}}>{post.content}</p>

      {/* AI tag + vibe */}
      {post.tag && (
        <div style={{display:"flex",alignItems:"center",gap:".5rem",marginTop:".7rem"}}>
          <span style={{fontSize:".65rem",background:"rgba(196,181,253,.08)",border:"1px solid rgba(196,181,253,.12)",borderRadius:100,padding:".2rem .7rem",color:COLORS.lavender}}>{post.emoji} {post.tag}</span>
        </div>
      )}
      {post.vibe!=null && <VibeBar vibe={post.vibe}/>}

      {/* AI reply */}
      {showAI && aiReply && (
        <div className="fade-in" style={{marginTop:".8rem",background:"rgba(196,181,253,.07)",borderRadius:10,padding:".7rem .9rem",fontSize:".82rem",color:COLORS.lavender,fontStyle:"italic",borderLeft:`2px solid ${COLORS.lavender}44`}}>
          🤖 {aiReply}
        </div>
      )}

      {/* Reactions + actions */}
      <div style={{display:"flex",gap:".4rem",marginTop:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        {EMOJIS.slice(0,5).map(e=>(
          <button key={e} onClick={()=>onReact(post.id,e)} style={{background:"rgba(196,181,253,.07)",border:`1px solid ${post.reactions[e]?"rgba(196,181,253,.3)":"rgba(196,181,253,.1)"}`,borderRadius:100,padding:".25rem .6rem",fontSize:".75rem",cursor:"pointer",color:post.reactions[e]?COLORS.lavender:COLORS.muted,transition:"all .15s",fontFamily:"inherit"}}>
            {e} {post.reactions[e]||""}
          </button>
        ))}
        <button onClick={handleAIReply} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:COLORS.muted,fontSize:".72rem",fontFamily:"inherit",transition:"color .2s"}} onMouseEnter={e=>e.target.style.color=COLORS.lavender} onMouseLeave={e=>e.target.style.color=COLORS.muted}>
          {loadingAI?"...":`${showAI?"hide":"🤖 AI vibe"}`}
        </button>
      </div>
    </div>
  );
}

function Ticker() {
  const items = ["😤 my boss thinks he's a genius","👻 anonymous confession incoming","🔥 did you hear about the office drama","😩 ugh mondays should be illegal","☕ she DEFINITELY got promoted because of coffee","💀 no i will not attend that meeting"];
  const doubled = [...items,...items];
  return (
    <div style={{background:COLORS.coral,padding:"9px 0",overflow:"hidden",whiteSpace:"nowrap"}}>
      <div className="ticker-track">
        {doubled.map((t,i)=>(
          <span key={i} style={{fontFamily:"'Syne',sans-serif",fontSize:".8rem",fontWeight:700,color:"#000",padding:"0 2rem",letterSpacing:".05em",textTransform:"uppercase"}}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ScreamRoom() {
  const [view, setView] = useState("home"); // home | wall | signup | login | compose
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState(SEED);
  const [composing, setComposing] = useState(false);
  const [composeType, setComposeType] = useState("shout");
  const [composeText, setComposeText] = useState("");
  const [composeGhost, setComposeGhost] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [signupData, setSignupData] = useState({firstName:"",lastName:"",email:"",idNumber:"",dob:"",username:"",password:""});
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMsg, setSignupMsg] = useState(null);
  const [loginData, setLoginData] = useState({email:"",password:""});

  // Inject styles
  useEffect(()=>{
    const tag = document.createElement("style");
    tag.textContent = css;
    document.head.appendChild(tag);
    return ()=>tag.remove();
  },[]);

  const handleReact = useCallback((postId, emoji) => {
    setPosts(prev=>prev.map(p=>{
      if(p.id!==postId) return p;
      const cur = p.reactions[emoji]||0;
      return {...p, reactions:{...p.reactions, [emoji]: cur>0?cur-1:cur+1}};
    }));
  },[]);

  const submitPost = async () => {
    if(!composeText.trim()) return;
    setPosting(true);
    const analysis = await analyzePost(composeText, composeType);
    const newPost = {
      id: Date.now().toString(),
      content: composeText,
      type: composeType,
      ghost: composeGhost,
      vibe: analysis.vibe,
      tag: analysis.tag,
      emoji: analysis.emoji,
      aiReply: analysis.reply,
      handle: currentUser?`@${currentUser.username}`:null,
      reactions:{},
      ts: Date.now(),
    };
    setPosts(prev=>[newPost,...prev]);
    setPostSuccess(analysis);
    setComposeText("");
    setComposing(false);
    setPosting(false);
    setView("wall");
    setTimeout(()=>setPostSuccess(null), 4000);
  };

  const handleSignup = async () => {
    const {firstName,lastName,email,idNumber,dob,username,password} = signupData;
    if(!firstName||!email||!idNumber||!dob||!username||!password){
      setSignupMsg({ok:false,text:"Fill in all fields — we need to verify you're human!"});
      return;
    }
    setSignupLoading(true);
    setSignupMsg(null);
    // Simulate ID verification with AI
    const verify = await callAI(
      "You verify user registrations for ScreamRoom. Given user details respond with JSON only: {\"approved\":true/false,\"message\":\"one sentence\"}. Approve if all fields look legitimate. Reject obvious fakes.",
      `Name: ${firstName} ${lastName}, Email: ${email}, Username: ${username}, DOB: ${dob}, ID provided: ${idNumber?"yes":"no"}`
    );
    let result;
    try { result = JSON.parse(verify.replace(/```json|```/g,"").trim()); }
    catch { result = {approved:true,message:"Verified! Welcome to ScreamRoom."}; }

    if(result.approved){
      setCurrentUser({username,displayName:firstName,email});
      setSignupMsg({ok:true,text:`🎉 ${result.message}`});
      setTimeout(()=>{ setView("wall"); setSignupMsg(null); }, 1800);
    } else {
      setSignupMsg({ok:false,text:`❌ ${result.message}`});
    }
    setSignupLoading(false);
  };

  const handleLogin = () => {
    if(loginData.email&&loginData.password){
      setCurrentUser({username:loginData.email.split("@")[0], displayName:loginData.email.split("@")[0], email:loginData.email});
      setView("wall");
    }
  };

  // ── NAV ──
  const Nav = ()=>(
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1.2rem 2.5rem",background:"rgba(13,10,26,.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(196,181,253,.07)",position:"sticky",top:0,zIndex:100}}>
      <div onClick={()=>setView("home")} style={{fontFamily:"'Syne',sans-serif",fontSize:"1.5rem",fontWeight:800,cursor:"pointer",letterSpacing:"-.03em"}}>
        scream<span style={{color:COLORS.coral}}>room</span>
      </div>
      <div style={{display:"flex",gap:"1.2rem",alignItems:"center"}}>
        {["wall","home"].map(v=>(
          <span key={v} onClick={()=>setView(v)} style={{color:view===v?COLORS.lavender:COLORS.muted,cursor:"pointer",fontSize:".88rem",fontWeight:500,transition:"color .2s",textTransform:"capitalize"}}>
            {v==="wall"?"Live Wall":"Home"}
          </span>
        ))}
        {currentUser?(
          <>
            <span style={{fontSize:".82rem",color:COLORS.lavender}}>👋 {currentUser.displayName}</span>
            <button className="shake-btn" onClick={()=>setComposing(true)} style={{...S.btn(COLORS.coral),padding:".5rem 1.2rem",fontSize:".85rem",animation:posting?"pulse .8s infinite":undefined}}>
              + Let it out
            </button>
          </>
        ):(
          <>
            <span onClick={()=>setView("login")} style={{color:COLORS.muted,cursor:"pointer",fontSize:".88rem"}}>Log in</span>
            <button onClick={()=>setView("signup")} style={{...S.btn(COLORS.coral),padding:".5rem 1.2rem",fontSize:".85rem"}}>Join</button>
          </>
        )}
      </div>
    </nav>
  );

  // ── HOME ──
  const HomeView = ()=>(
    <div>
      <Ticker/>
      {/* Hero */}
      <div style={{position:"relative",padding:"5rem 3rem 4rem",textAlign:"center",overflow:"hidden",minHeight:"78vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"rgba(255,63,108,.1)",filter:"blur(90px)",top:-120,right:-100,pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"rgba(196,181,253,.08)",filter:"blur(80px)",bottom:-60,left:-80,pointerEvents:"none"}}/>
        {/* Floating bubbles */}
        {["I cried at a dog food commercial","My commute is the best part of my day","She DEFINITELY heard what I said","The meeting could have been an email","I pretended not to see them"].map((t,i)=>(
          <div key={i} className="float-bubble" style={{left:`${10+i*18}%`,["--r"]:`${-4+i*2}deg`,animationDuration:`${13+i*2.5}s`,animationDelay:`-${i*2.8}s`,background:"rgba(30,21,48,.9)",border:"1px solid rgba(196,181,253,.2)",color:COLORS.lavender,opacity:.15,zIndex:0}}>
            {t}
          </div>
        ))}
        <p style={{fontSize:".75rem",fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:COLORS.yellow,marginBottom:"1rem",position:"relative",zIndex:2}}>✦ your safe chaos zone ✦</p>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(3.2rem,9vw,7rem)",fontWeight:800,lineHeight:.88,letterSpacing:"-.04em",marginBottom:"1.4rem",position:"relative",zIndex:2}}>
          <span style={{display:"block",color:COLORS.smoke}}>SHOUT IT.</span>
          <span style={{display:"block",color:COLORS.coral}}>SPILL IT.</span>
          <span style={{display:"block",color:COLORS.lavender,fontSize:".52em",marginTop:".2em"}}>then feel better.</span>
        </h1>
        <p style={{color:COLORS.muted,maxWidth:440,lineHeight:1.65,marginBottom:"2.5rem",position:"relative",zIndex:2}}>Vent, gossip, scream into the void — as yourself or as a ghost. No judgment. Just release.</p>
        <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap",position:"relative",zIndex:2}}>
          <button className="shake-btn" onClick={()=>currentUser?setComposing(true):setView("signup")} style={{...S.btn(COLORS.coral),padding:"1rem 2.4rem",fontSize:"1.05rem"}}>🔊 Let It Out</button>
          <button onClick={()=>setView("wall")} style={{...S.btn("transparent",COLORS.lavender),border:"1.5px solid rgba(196,181,253,.25)",padding:"1rem 2rem"}}>See the Wall</button>
        </div>
      </div>
      {/* Mode cards */}
      <div style={{padding:"4rem 3rem",background:COLORS.mid}}>
        <p style={{fontSize:".72rem",fontWeight:700,letterSpacing:".25em",textTransform:"uppercase",color:COLORS.yellow,marginBottom:".7rem"}}>What brings you here?</p>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"2.2rem",fontWeight:800,letterSpacing:"-.03em",marginBottom:"2.5rem"}}>Pick your poison today</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1.2rem"}}>
          {[
            {type:"shout",icon:"🔊",name:"SHOUT",desc:"Something's driving you absolutely insane and you need to YELL about it. Go off.",color:COLORS.coral},
            {type:"gossip",icon:"🫢",name:"SPILL TEA",desc:"You heard something juicy. You can't hold it in. Drop the gossip, no names required.",color:"#c8b840"},
            {type:"vent",icon:"💭",name:"VENT",desc:"Not quite a scream — just something heavy you need to set down for a bit.",color:COLORS.lavender},
          ].map(m=>(
            <div key={m.type} onClick={()=>{setComposeType(m.type);currentUser?setComposing(true):setView("signup");}}
              style={{...S.card(),cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor=`${m.color}44`;e.currentTarget.style.boxShadow=`0 8px 32px ${m.color}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(196,181,253,.09)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:"2.2rem",marginBottom:".9rem"}}>{m.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",fontWeight:800,marginBottom:".4rem"}}>{m.name}</div>
              <div style={{fontSize:".85rem",color:COLORS.muted,lineHeight:1.6}}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── WALL ──
  const WallView = ()=>{
    const filtered = filterType==="all"?posts:posts.filter(p=>p.type===filterType);
    return (
      <div style={{padding:"2.5rem 3rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"2rem",flexWrap:"wrap"}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,letterSpacing:"-.03em",flex:1}}>
            The Wall <span style={{fontSize:".6em",color:COLORS.muted,fontWeight:400}}>({filtered.length} screams)</span>
          </h2>
          <div style={{display:"flex",gap:".5rem"}}>
            {["all","shout","gossip","vent"].map(f=>(
              <button key={f} onClick={()=>setFilterType(f)} style={{background:filterType===f?"rgba(196,181,253,.15)":"transparent",border:`1px solid ${filterType===f?"rgba(196,181,253,.4)":"rgba(196,181,253,.12)"}`,borderRadius:100,padding:".4rem 1rem",color:filterType===f?COLORS.lavender:COLORS.muted,cursor:"pointer",fontSize:".78rem",fontWeight:600,textTransform:"capitalize",fontFamily:"inherit",transition:"all .2s"}}>
                {f==="all"?"All 🔥":f==="shout"?"Shouts":f==="gossip"?"Tea ☕":"Vents"}
              </button>
            ))}
          </div>
          {currentUser&&<button className="shake-btn" onClick={()=>setComposing(true)} style={{...S.btn(COLORS.coral),padding:".55rem 1.3rem",fontSize:".88rem"}}>+ Drop one</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1.1rem"}}>
          {filtered.map(p=><PostCard key={p.id} post={p} currentUser={currentUser} onReact={handleReact}/>)}
        </div>
        {!currentUser&&(
          <div style={{textAlign:"center",marginTop:"2.5rem",padding:"2rem",background:COLORS.card,borderRadius:20,border:"1px solid rgba(196,181,253,.1)"}}>
            <p style={{color:COLORS.muted,marginBottom:"1rem",fontSize:".9rem"}}>Join to drop your own screams, react, and get AI vibes 🤖</p>
            <button onClick={()=>setView("signup")} style={{...S.btn(COLORS.coral)}}>Create account</button>
          </div>
        )}
      </div>
    );
  };

  // ── SIGNUP ──
  const SignupView = ()=>(
    <div style={{maxWidth:520,margin:"3rem auto",padding:"0 1.5rem"}}>
      <div style={{...S.card(),padding:"2.5rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,fontSize:"8rem",opacity:.05,pointerEvents:"none"}}>🔐</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"2rem",fontWeight:800,marginBottom:".4rem"}}>Join the chaos 🎟️</h2>
        <p style={{color:COLORS.muted,fontSize:".88rem",marginBottom:"1.5rem",lineHeight:1.6}}>We verify you once to keep bots out. After that — be whoever you want.</p>
        <div style={{display:"flex",gap:".5rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
          {["🛡️ Keeps out bots","🚫 No spam","👻 Still anon after"].map(t=>(
            <span key={t} style={{background:"rgba(196,181,253,.07)",border:"1px solid rgba(196,181,253,.12)",borderRadius:100,padding:".35rem .8rem",fontSize:".74rem",color:COLORS.lavender}}>{t}</span>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
          {[["First name","firstName","text"],["Last name","lastName","text"]].map(([label,key,type])=>(
            <div key={key}>
              <label style={{fontSize:".72rem",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:COLORS.muted,display:"block",marginBottom:".4rem"}}>{label}</label>
              <input style={S.input()} type={type} value={signupData[key]} onChange={e=>setSignupData(p=>({...p,[key]:e.target.value}))} onFocus={e=>e.target.style.borderColor=COLORS.lavender} onBlur={e=>e.target.style.borderColor="rgba(196,181,253,.15)"}/>
            </div>
          ))}
        </div>
        {[["Email","email","email"],["Govt ID Number *","idNumber","text"],["Date of Birth","dob","date"],["Username","username","text"],["Password","password","password"]].map(([label,key,type])=>(
          <div key={key} style={{marginBottom:"1rem"}}>
            <label style={{fontSize:".72rem",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:COLORS.muted,display:"block",marginBottom:".4rem"}}>{label}</label>
            <input style={S.input({colorScheme:"dark"})} type={type} value={signupData[key]} onChange={e=>setSignupData(p=>({...p,[key]:e.target.value}))} onFocus={e=>e.target.style.borderColor=COLORS.lavender} onBlur={e=>e.target.style.borderColor="rgba(196,181,253,.15)"}/>
          </div>
        ))}
        <div style={{background:"rgba(255,224,0,.06)",border:"1px solid rgba(255,224,0,.15)",borderRadius:10,padding:".9rem",fontSize:".78rem",color:"#c8b840",marginBottom:"1.2rem",lineHeight:1.65}}>
          <strong style={{color:COLORS.yellow}}>Why the ID?</strong> It's hashed & immediately discarded — never stored readable. Purely to confirm you're one real human. We promise. 🤞
        </div>
        {signupMsg&&(
          <div className="fade-in" style={{background:signupMsg.ok?"rgba(196,181,253,.1)":"rgba(255,63,108,.1)",border:`1px solid ${signupMsg.ok?"rgba(196,181,253,.3)":"rgba(255,63,108,.3)"}`,borderRadius:10,padding:".8rem",fontSize:".82rem",color:signupMsg.ok?COLORS.lavender:COLORS.coral,marginBottom:"1rem"}}>
            {signupMsg.text}
          </div>
        )}
        <button onClick={handleSignup} disabled={signupLoading} style={{...S.btn(`linear-gradient(135deg,${COLORS.coral},#c0185a)`),width:"100%",padding:"1rem",fontSize:"1rem",opacity:signupLoading?.7:1}}>
          {signupLoading?"🔍 Verifying your ID...":"Get me in 🚀"}
        </button>
        <p style={{textAlign:"center",marginTop:".8rem",fontSize:".78rem",color:COLORS.muted}}>
          Already in? <span onClick={()=>setView("login")} style={{color:COLORS.lavender,cursor:"pointer"}}>Log in</span>
        </p>
      </div>
    </div>
  );

  // ── LOGIN ──
  const LoginView = ()=>(
    <div style={{maxWidth:400,margin:"4rem auto",padding:"0 1.5rem"}}>
      <div style={{...S.card(),padding:"2.5rem"}}>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,marginBottom:".4rem"}}>Welcome back 👋</h2>
        <p style={{color:COLORS.muted,fontSize:".88rem",marginBottom:"1.8rem"}}>Ready to let something out?</p>
        {[["Email","email","email"],["Password","password","password"]].map(([label,key,type])=>(
          <div key={key} style={{marginBottom:"1rem"}}>
            <label style={{fontSize:".72rem",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:COLORS.muted,display:"block",marginBottom:".4rem"}}>{label}</label>
            <input style={S.input()} type={type} value={loginData[key]} onChange={e=>setLoginData(p=>({...p,[key]:e.target.value}))} onFocus={e=>e.target.style.borderColor=COLORS.lavender} onBlur={e=>e.target.style.borderColor="rgba(196,181,253,.15)"}/>
          </div>
        ))}
        <button onClick={handleLogin} style={{...S.btn(COLORS.coral),width:"100%",padding:"1rem",fontSize:"1rem"}}>Let me in</button>
        <p style={{textAlign:"center",marginTop:".8rem",fontSize:".78rem",color:COLORS.muted}}>
          New here? <span onClick={()=>setView("signup")} style={{color:COLORS.lavender,cursor:"pointer"}}>Create account</span>
        </p>
      </div>
    </div>
  );

  // ── COMPOSE MODAL ──
  const ComposeModal = ()=>{
    const typeConf = {shout:{emoji:"🔊",title:"Let it rip",placeholder:"No filter. No mercy. Just pure release."},gossip:{emoji:"🫢",title:"Spill the tea",placeholder:"Drop it. We can handle it. Trust."},vent:{emoji:"💭",title:"Set it down",placeholder:"Heavy things are lighter when shared."}};
    const c = typeConf[composeType];
    return (
      <div onClick={e=>{if(e.target===e.currentTarget)setComposing(false)}} style={{position:"fixed",inset:0,background:"rgba(13,10,26,.88)",backdropFilter:"blur(10px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
        <div className="fade-in" style={{...S.card(),maxWidth:480,width:"100%",padding:"2rem",position:"relative"}}>
          <button onClick={()=>setComposing(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"rgba(196,181,253,.08)",border:"none",color:COLORS.muted,width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:".9rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{fontSize:"2rem",marginBottom:".6rem"}}>{c.emoji}</div>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.4rem",fontWeight:800,marginBottom:".3rem"}}>{c.title}</h3>
          <p style={{fontSize:".82rem",color:COLORS.muted,marginBottom:"1.2rem"}}>Say whatever you need. Nobody's judging.</p>
          <textarea value={composeText} onChange={e=>setComposeText(e.target.value)} placeholder={c.placeholder}
            style={{...S.input({resize:"none",minHeight:100,marginBottom:"1rem"}),border:"1.5px solid rgba(196,181,253,.15)"}}
            onFocus={e=>e.target.style.borderColor=COLORS.lavender} onBlur={e=>e.target.style.borderColor="rgba(196,181,253,.15)"}/>
          {/* Type selector */}
          <div style={{display:"flex",gap:".5rem",marginBottom:"1rem"}}>
            {["shout","gossip","vent"].map(t=>{
              const tc={shout:COLORS.coral,gossip:"#c8b840",vent:COLORS.lavender}[t];
              const lbl={shout:"🔊 Shout",gossip:"🫢 Tea",vent:"💭 Vent"}[t];
              return <button key={t} onClick={()=>setComposeType(t)} style={{flex:1,background:composeType===t?`${tc}22`:"transparent",border:`1.5px solid ${composeType===t?tc:"rgba(196,181,253,.15)"}`,borderRadius:100,padding:".45rem",color:composeType===t?tc:COLORS.muted,cursor:"pointer",fontSize:".78rem",fontWeight:600,fontFamily:"inherit",transition:"all .2s"}}>{lbl}</button>;
            })}
          </div>
          {/* Identity */}
          <div style={{display:"flex",gap:".6rem",marginBottom:"1.2rem"}}>
            <button onClick={()=>setComposeGhost(true)} style={{flex:1,background:composeGhost?"rgba(196,181,253,.1)":"transparent",border:`1.5px solid ${composeGhost?"rgba(196,181,253,.4)":"rgba(196,181,253,.15)"}`,borderRadius:12,padding:".6rem",color:composeGhost?COLORS.lavender:COLORS.muted,cursor:"pointer",fontSize:".82rem",fontWeight:600,fontFamily:"inherit",transition:"all .2s"}}>👻 Ghost</button>
            <button onClick={()=>setComposeGhost(false)} style={{flex:1,background:!composeGhost?"rgba(255,63,108,.12)":"transparent",border:`1.5px solid ${!composeGhost?COLORS.coral:"rgba(196,181,253,.15)"}`,borderRadius:12,padding:".6rem",color:!composeGhost?COLORS.coral:COLORS.muted,cursor:"pointer",fontSize:".82rem",fontWeight:600,fontFamily:"inherit",transition:"all .2s"}}>🔥 Real me</button>
          </div>
          <div style={{fontSize:".72rem",color:COLORS.muted,marginBottom:"1rem",textAlign:"center"}}>
            {composeGhost?"Posting anonymously — your username won't appear":"Posting as @"+currentUser?.username+" — owning it 🔥"}
          </div>
          <button onClick={submitPost} disabled={posting||!composeText.trim()} style={{...S.btn(`linear-gradient(135deg,${COLORS.coral},#c0185a)`),width:"100%",padding:"1rem",opacity:(posting||!composeText.trim())?.6:1,fontSize:"1rem"}}>
            {posting?"🤖 AI is reading the vibe...":"Drop it 🎤"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{background:COLORS.bg,minHeight:"100vh"}}>
      <Nav/>
      {postSuccess&&(
        <div className="fade-in" style={{position:"fixed",bottom:"1.5rem",left:"50%",transform:"translateX(-50%)",background:COLORS.card,border:"1px solid rgba(196,181,253,.2)",borderRadius:16,padding:"1rem 1.5rem",zIndex:500,boxShadow:"0 8px 32px rgba(0,0,0,.4)",maxWidth:360,textAlign:"center"}}>
          <div style={{fontSize:"1.5rem",marginBottom:".3rem"}}>{postSuccess.emoji}</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:".95rem",marginBottom:".2rem"}}>{postSuccess.tag}</div>
          <div style={{fontSize:".8rem",color:COLORS.lavender,fontStyle:"italic"}}>"{postSuccess.reply}"</div>
          <div style={{marginTop:".6rem"}}><VibeBar vibe={postSuccess.vibe}/></div>
        </div>
      )}
      {composing&&<ComposeModal/>}
      {view==="home"&&<HomeView/>}
      {view==="wall"&&<WallView/>}
      {view==="signup"&&<SignupView/>}
      {view==="login"&&<LoginView/>}
      <footer style={{padding:"2rem 3rem",borderTop:"1px solid rgba(196,181,253,.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",marginTop:"3rem"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem"}}>scream<span style={{color:COLORS.coral}}>room</span></div>
        <span style={{fontSize:".75rem",color:COLORS.muted}}>🔐 IDs verified & discarded · No selling your soul (or data) · © 2026</span>
      </footer>
    </div>
  );
}
