import { useEffect, useMemo, useState } from 'react';
import { Shuffle, Users, X } from 'lucide-react';

type Status = 'present' | 'excused' | 'unexcused' | 'injured';
type Player = { id:string; name:string; activeFrom:string; activeTo:string };
type Training = { id:string; date:string; note:string; attendance:Record<string,Status> };
type Squad = { id:string; name:string; players:Player[]; trainings:Training[] };
type AppData = { teams:Squad[]; selectedTeamId:string };
type Setup = { teamCount:2|3; assignments:Record<string,number> };
type Saved = Record<string,{1:Setup;2:Setup}>;

const emptySetup=():Setup=>({teamCount:3,assignments:{}});
const fmt=(d:string)=>new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00'));

export default function TeamsBuilder(){
  const [open,setOpen]=useState(false);
  const [data,setData]=useState<AppData|null>(null);
  const [trainingId,setTrainingId]=useState('');
  const [form,setForm]=useState<1|2>(1);
  const [saved,setSaved]=useState<Saved>(()=>{try{return JSON.parse(localStorage.getItem('trainingsbeteiligung-teams-v1')||'{}')}catch{return {}}});

  useEffect(()=>{if(!open)return;try{const d=JSON.parse(localStorage.getItem('trainingsbeteiligung-v1')||'null') as AppData|null;setData(d);const squad=d?.teams.find(t=>t.id===d.selectedTeamId);const latest=[...(squad?.trainings||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];setTrainingId(x=>squad?.trainings.some(t=>t.id===x)?x:(latest?.id||''));}catch{setData(null)}},[open]);
  useEffect(()=>localStorage.setItem('trainingsbeteiligung-teams-v1',JSON.stringify(saved)),[saved]);

  const squad=data?.teams.find(t=>t.id===data.selectedTeamId);
  const trainings=useMemo(()=>[...(squad?.trainings||[])].sort((a,b)=>b.date.localeCompare(a.date)),[squad]);
  const training=trainings.find(t=>t.id===trainingId);
  const present=useMemo(()=>training&&squad?squad.players.filter(p=>(training.attendance[p.id]??'present')==='present').sort((a,b)=>a.name.localeCompare(b.name)):[],[training,squad]);
  const key=squad&&training?`${squad.id}:${training.id}`:'';
  const setup=(key?saved[key]?.[form]:undefined)||emptySetup();
  const assignments=setup.assignments;

  const patch=(next:Partial<Setup>)=>{if(!key)return;setSaved(s=>{const current=s[key]||{1:emptySetup(),2:emptySetup()};return{...s,[key]:{...current,[form]:{...current[form],...next}}}})};
  const move=(playerId:string,team:number)=>patch({assignments:{...assignments,[playerId]:team}});
  const randomize=()=>{const ids=[...present].sort(()=>Math.random()-.5);const a:Record<string,number>={};ids.forEach((p,i)=>a[p.id]=(i%setup.teamCount)+1);patch({assignments:a})};
  const setCount=(n:2|3)=>{const a={...assignments};if(n===2)Object.keys(a).forEach(id=>{if(a[id]===3)a[id]=2});patch({teamCount:n,assignments:a})};
  const unassigned=present.filter(p=>!assignments[p.id]);
  const teamPlayers=(n:number)=>present.filter(p=>assignments[p.id]===n);
  const onDrop=(e:React.DragEvent,team:number)=>{e.preventDefault();const id=e.dataTransfer.getData('text/player');if(id)move(id,team)};

  return <>
    <button onClick={()=>setOpen(true)} style={styles.launch}><Users size={20}/> Teams zusammenstellen</button>
    {open&&<div style={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div style={styles.modal}>
      <div style={styles.head}><div><small style={styles.kicker}>SPIELFORMEN</small><h2 style={{margin:'3px 0 0'}}>Teams zusammenstellen</h2></div><button style={styles.icon} onClick={()=>setOpen(false)}><X/></button></div>
      {!squad?<p>Keine Mannschaft gefunden.</p>:<>
        <label style={styles.label}>Training<select style={styles.select} value={trainingId} onChange={e=>setTrainingId(e.target.value)}>{trainings.map(t=><option key={t.id} value={t.id}>{fmt(t.date)} · {t.note||'Mannschaftstraining'}</option>)}</select></label>
        {!training?<div style={styles.empty}>Bitte zuerst eine Trainingseinheit speichern.</div>:<>
          <div style={styles.tabs}><button style={form===1?styles.tabActive:styles.tab} onClick={()=>setForm(1)}>Spielform 1</button><button style={form===2?styles.tabActive:styles.tab} onClick={()=>setForm(2)}>Spielform 2</button></div>
          <div style={styles.controls}><div><b>{present.length}</b> anwesende Spieler</div><div style={styles.controlRight}><span>Teams:</span><button style={setup.teamCount===2?styles.smallActive:styles.small} onClick={()=>setCount(2)}>2</button><button style={setup.teamCount===3?styles.smallActive:styles.small} onClick={()=>setCount(3)}>3</button><button style={styles.shuffle} onClick={randomize}><Shuffle size={16}/> Zufällig verteilen</button></div></div>
          <p style={styles.help}>Am PC Spieler ziehen. Am Handy beim Spieler direkt Team 1, 2 oder 3 antippen. Die Einteilung wird automatisch gespeichert.</p>
          <div style={styles.board}>
            <TeamBox title="Noch nicht verteilt" players={unassigned} team={0} count={setup.teamCount} move={move} onDrop={onDrop}/>
            {Array.from({length:setup.teamCount},(_,i)=>i+1).map(n=><TeamBox key={n} title={`Team ${n}`} players={teamPlayers(n)} team={n} count={setup.teamCount} move={move} onDrop={onDrop}/>)}
          </div>
        </>}
      </>}
    </div></div>}
  </>;
}

function TeamBox({title,players,team,count,move,onDrop}:{title:string;players:Player[];team:number;count:2|3;move:(id:string,t:number)=>void;onDrop:(e:React.DragEvent,t:number)=>void}){
  return <section style={styles.box} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,team)}><div style={styles.boxTitle}><b>{title}</b><span>{players.length}</span></div><div style={styles.cards}>{players.map(p=><div key={p.id} draggable onDragStart={e=>e.dataTransfer.setData('text/player',p.id)} style={styles.player}><span style={styles.playerName}>{p.name}</span><span style={styles.teamButtons}>{team!==0&&<button title="Nicht verteilt" style={styles.tiny} onClick={()=>move(p.id,0)}>×</button>}{Array.from({length:count},(_,i)=>i+1).filter(n=>n!==team).map(n=><button key={n} style={styles.tiny} onClick={()=>move(p.id,n)}>T{n}</button>)}</span></div>)}</div></section>
}

const styles:Record<string,React.CSSProperties>={
  launch:{position:'fixed',right:22,bottom:92,zIndex:30,border:0,borderRadius:14,padding:'13px 17px',background:'#173f73',color:'white',fontWeight:800,display:'flex',gap:8,alignItems:'center',boxShadow:'0 8px 24px #0003',cursor:'pointer'},
  backdrop:{position:'fixed',inset:0,zIndex:1000,background:'#0b1b2dcc',display:'flex',alignItems:'center',justifyContent:'center',padding:12},
  modal:{width:'min(1120px,100%)',maxHeight:'94vh',overflow:'auto',background:'#f6f8fb',borderRadius:18,padding:'clamp(14px,3vw,28px)',boxShadow:'0 25px 70px #0006'},
  head:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18},kicker:{fontWeight:900,letterSpacing:1.4,color:'#52708e'},icon:{border:0,background:'white',borderRadius:10,padding:8,cursor:'pointer'},
  label:{display:'grid',gap:7,fontWeight:800},select:{width:'100%',padding:'12px 14px',border:'1px solid #ccd5df',borderRadius:10,background:'white',fontSize:15},
  tabs:{display:'flex',gap:8,margin:'18px 0 12px'},tab:{padding:'10px 16px',border:'1px solid #cbd5e1',background:'white',borderRadius:10,fontWeight:800,cursor:'pointer'},tabActive:{padding:'10px 16px',border:'1px solid #173f73',background:'#173f73',color:'white',borderRadius:10,fontWeight:800,cursor:'pointer'},
  controls:{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:10,background:'white',padding:12,borderRadius:12,border:'1px solid #e0e6ed'},controlRight:{display:'flex',flexWrap:'wrap',gap:7,alignItems:'center'},small:{border:'1px solid #cbd5e1',background:'white',borderRadius:8,padding:'7px 10px',fontWeight:800},smallActive:{border:'1px solid #173f73',background:'#e8f0fa',color:'#173f73',borderRadius:8,padding:'7px 10px',fontWeight:900},shuffle:{border:0,background:'#173f73',color:'white',borderRadius:8,padding:'8px 11px',display:'flex',gap:6,alignItems:'center',fontWeight:800},
  help:{fontSize:13,color:'#5d6b79',margin:'10px 2px'},board:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12,alignItems:'start'},box:{background:'white',border:'1px solid #dce3ea',borderRadius:14,minHeight:150,overflow:'hidden'},boxTitle:{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'#edf2f7'},cards:{display:'grid',gap:7,padding:9},player:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'9px 10px',border:'1px solid #e2e8f0',borderRadius:9,background:'#fff',cursor:'grab'},playerName:{fontWeight:750,fontSize:14,minWidth:0},teamButtons:{display:'flex',gap:4,flexShrink:0},tiny:{border:'1px solid #cbd5e1',background:'#f8fafc',borderRadius:7,padding:'5px 7px',fontSize:11,fontWeight:900,cursor:'pointer'},empty:{marginTop:18,padding:24,textAlign:'center',background:'white',borderRadius:12,color:'#657383'}
};