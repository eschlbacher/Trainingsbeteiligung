import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Download, Menu, Plus, Settings, Shield, Trash2, Users, X, Shuffle,
} from 'lucide-react';

type Status = 'present' | 'excused' | 'unexcused' | 'injured';
type TestResult = { id: string; date: string; value: number; note: string };
type PerformanceTest = { id: string; name: string; unit: 'time'|'meters'|'seconds'|'number'; lowerIsBetter: boolean };
type Player = { id: string; name: string; activeFrom: string; activeTo: string; performance?: Record<string, TestResult[]> };
type Training = { id: string; date: string; note: string; attendance: Record<string, Status>; teamAssignments?: Record<string, 1|2|3> };
type Team = { id: string; name: string; season: string; start: string; end: string; archived: boolean; players: Player[]; trainings: Training[]; performanceTests?: PerformanceTest[] };
type Data = { teams: Team[]; selectedTeamId: string };
type View = 'dashboard' | 'calendar' | 'players' | 'ranking' | 'performance' | 'archive';

const uid = () => crypto.randomUUID();
const iso = (date: Date) => date.toISOString().slice(0, 10);
const fmt = (date: string) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
const monthName = (date: Date) => new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
const activeOn = (p: Player, date: string) => p.activeFrom <= date && (!p.activeTo || p.activeTo >= date);

const firstNames = ['Lukas','Jonas','Felix','Maximilian','Leon','David','Finn','Paul','Noah','Ben','Elias','Moritz','Julian','Tim','Niklas','Jan','Tom','Fabian','Philipp','Simon','Daniel','Florian','Sebastian','Alexander','Tobias','Marcel','Nico','Robin','Kevin','Dennis','Christian','Johannes','Marco','Patrick','Dominik','Andreas'];
const lastNames = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier','Lehmann','Schmid','Schulze','Maier','Köhler','Herrmann','König','Walter'];

function seedTeam(name: string, offset: number): Team {
  const start = '2026-07-01', end = '2027-06-30';
  const players = Array.from({ length: 36 }, (_, i) => ({
    id: uid(), name: `${firstNames[(i + offset) % firstNames.length]} ${lastNames[(i * 5 + offset) % lastNames.length]}`,
    activeFrom: start, activeTo: end,
  }));
  const dates = ['2026-08-04','2026-08-06','2026-08-11','2026-08-13','2026-08-18','2026-08-20','2026-08-25','2026-08-27','2026-09-01','2026-09-03','2026-09-08','2026-09-10','2026-09-15'];
  const trainings = dates.map((date, n) => ({
    id: uid(), date, note: n === 12 ? 'Abschlussspiel und Standards' : '',
    attendance: Object.fromEntries(players.map((p, i) => [p.id, ((i + n * 3) % 17 === 0 ? 'excused' : (i + n) % 31 === 0 ? 'injured' : 'present') as Status])),
  }));
  return { id: uid(), name, season: 'Saison 2026/27', start, end, archived: false, players, trainings };
}

const createInitial = (): Data => {
  const teams = [seedTeam('1. Mannschaft', 0), seedTeam('U19', 7), seedTeam('U17', 13)];
  return { teams, selectedTeamId: teams[0].id };
};

function usePersistentData() {
  const [data, setData] = useState<Data>(() => {
    try { const saved = localStorage.getItem('trainingsbeteiligung-v1'); return saved ? JSON.parse(saved) : createInitial(); }
    catch { return createInitial(); }
  });
  useEffect(() => localStorage.setItem('trainingsbeteiligung-v1', JSON.stringify(data)), [data]);
  return [data, setData] as const;
}

const nav = [
  { id: 'dashboard', label: 'Übersicht', icon: Activity },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'players', label: 'Spieler', icon: Users },
  { id: 'ranking', label: 'Rangliste', icon: BarChart3 },
  { id: 'performance', label: 'Leistung', icon: Activity },
  { id: 'archive', label: 'Archiv', icon: Archive },
] as const;

function App() {
  const [data, setData] = usePersistentData();
  const [view, setView] = useState<View>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<'training'|'player'|'team'|'settings'|'teamBuilder'|null>(null);
  const [trainingDate, setTrainingDate] = useState('');
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [teamBuilderTraining, setTeamBuilderTraining] = useState<Training | null>(null);
  const [performancePlayer, setPerformancePlayer] = useState<Player | null>(null);
  const [toast, setToast] = useState('');
  const team = data.teams.find(t => t.id === data.selectedTeamId) ?? data.teams[0];
  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 2500); };
  const updateTeam = (fn: (t: Team) => Team) => setData(d => ({ ...d, teams: d.teams.map(t => t.id === team.id ? fn(t) : t) }));
  const openTraining = (date: string, existing?: Training) => { setTrainingDate(date); setEditingTraining(existing ?? null); setModal('training'); };
  const title = nav.find(n => n.id === view)?.label;

  if (!team) return null;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Shield size={22}/></span><div><strong>Trainings</strong><span>beteiligung</span></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)}><X/></button></div>
        <div className="team-label">MANNSCHAFT</div>
        <select className="team-select" value={team.id} onChange={e => setData(d => ({...d, selectedTeamId:e.target.value}))}>
          {data.teams.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <nav>{nav.map(({id,label,icon:Icon}) => <button key={id} className={view===id?'active':''} onClick={()=>{setView(id);setMobileNav(false)}}><Icon size={20}/>{label}</button>)}</nav>
        <div className="sidebar-bottom"><button onClick={()=>setModal('settings')}><Settings size={20}/> Einstellungen</button><div className="season-chip"><span>AKTUELLE SAISON</span><strong>{team.season}</strong><small>{fmt(team.start)} – {fmt(team.end)}</small></div></div>
      </aside>
      {mobileNav && <div className="scrim" onClick={()=>setMobileNav(false)}/>}
      <main>
        <header><button className="icon-btn menu-btn" onClick={()=>setMobileNav(true)}><Menu/></button><div><h1>{title}</h1><p>{team.name} · {team.season}</p></div><button className="primary desktop-action" onClick={()=>openTraining(iso(new Date()))}><Plus size={20}/> Training erfassen</button></header>
        <div className="content">
          {view==='dashboard' && <Dashboard team={team} onOpen={openTraining} onNavigate={setView}/>}
          {view==='calendar' && <CalendarView team={team} onOpen={openTraining}/>}
          {view==='players' && <PlayersView team={team} onAdd={()=>setModal('player')} updateTeam={updateTeam} notify={notify} onPerformance={p=>setPerformancePlayer(p)}/>}
          {view==='ranking' && <Ranking team={team}/>} 
          {view==='performance' && <PerformanceView team={team} updateTeam={updateTeam} notify={notify}/>} 
          {view==='archive' && <ArchiveView data={data} team={team} setData={setData} notify={notify}/>}
        </div>
      </main>
      <button className="fab" onClick={()=>openTraining(iso(new Date()))}><Plus/> <span>Training</span></button>
      {modal==='training' && <TrainingModal team={team} date={trainingDate} training={editingTraining} close={()=>setModal(null)} save={tr=>{updateTeam(t=>({...t,trainings: editingTraining?t.trainings.map(x=>x.id===tr.id?tr:x):[...t.trainings,tr]}));setModal(null);notify(editingTraining?'Training aktualisiert':'Training gespeichert');}} remove={editingTraining?()=>{if(confirm('Training wirklich löschen?')){updateTeam(t=>({...t,trainings:t.trainings.filter(x=>x.id!==editingTraining.id)}));setModal(null);notify('Training gelöscht');}}:undefined} onTeams={(tr)=>{setTeamBuilderTraining(tr);setModal('teamBuilder')}}/>}
      {modal==='teamBuilder' && teamBuilderTraining && <TeamBuilder team={team} training={teamBuilderTraining} close={()=>setModal(null)}/>}
      {modal==='player' && <PlayerModal team={team} close={()=>setModal(null)} save={p=>{updateTeam(t=>({...t,players:[...t.players,p]}));setModal(null);notify('Spieler hinzugefügt');}}/>}
      {modal==='settings' && <SettingsModal team={team} data={data} close={()=>setModal(null)} updateTeam={updateTeam} setData={setData} notify={notify}/>}
      {performancePlayer && <PerformancePlayerModal team={team} player={performancePlayer} close={()=>setPerformancePlayer(null)} updateTeam={updateTeam} notify={notify}/>} 
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function stats(team: Team) {
  const possible = team.trainings.reduce((sum,tr)=>sum+team.players.filter(p=>activeOn(p,tr.date)).length,0);
  const present = team.trainings.reduce((sum,tr)=>sum+team.players.filter(p=>activeOn(p,tr.date)&&tr.attendance[p.id]!=='excused'&&tr.attendance[p.id]!=='unexcused'&&tr.attendance[p.id]!=='injured').length,0);
  return { count:team.trainings.length, avg:team.trainings.length?present/team.trainings.length:0, rate:possible?present/possible*100:0 };
}
function Dashboard({team,onOpen,onNavigate}:{team:Team;onOpen:(d:string,t?:Training)=>void;onNavigate:(v:View)=>void}) {
  const s=stats(team), recent=[...team.trainings].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return <><section className="hero"><div><span className="eyebrow">SCHNELLERFASSUNG</span><h2>Bereit fürs nächste Training?</h2><p>Alle aktiven Spieler sind automatisch als anwesend markiert. Du änderst nur die Ausnahmen.</p></div><button onClick={()=>onOpen(iso(new Date()))}><Plus/> Training heute erfassen</button></section>
    <div className="stat-grid"><Stat label="TRAININGSEINHEITEN" value={String(s.count)} sub={`seit ${fmt(team.start)}`} icon={<CalendarDays/>}/><Stat label="Ø TEILNEHMER" value={s.avg.toFixed(1).replace('.',',')} sub={`von ${team.players.filter(p=>activeOn(p,iso(new Date()))).length} aktiven Spielern`} icon={<Users/>}/><Stat label="BETEILIGUNGSQUOTE" value={`${s.rate.toFixed(1).replace('.',',')} %`} sub="gesamte Saison" icon={<BarChart3/>} accent/></div>
    <section className="panel"><div className="panel-head"><div><h3>Letzte Trainingseinheiten</h3><p>Schneller Überblick über die jüngsten Termine</p></div><button className="link" onClick={()=>onNavigate('calendar')}>Alle im Kalender →</button></div>
      <div className="training-list">{recent.map(tr=><TrainingRow key={tr.id} team={team} tr={tr} onClick={()=>onOpen(tr.date,tr)}/>)}{!recent.length&&<Empty text="Noch keine Trainingseinheit erfasst."/>}</div></section></>;
}
function Stat({label,value,sub,icon,accent=false}:{label:string;value:string;sub:string;icon:React.ReactNode;accent?:boolean}){return <div className={`stat ${accent?'accent':''}`}><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function TrainingRow({team,tr,onClick}:{team:Team;tr:Training;onClick:()=>void}) { const act=team.players.filter(p=>activeOn(p,tr.date));const present=act.filter(p=>(tr.attendance[p.id]??'present')==='present').length; const rate=act.length?present/act.length*100:0;return <button className="training-row" onClick={onClick}><div className="date-badge"><strong>{new Date(tr.date+'T12:00:00').getDate()}</strong><span>{new Intl.DateTimeFormat('de-DE',{month:'short'}).format(new Date(tr.date+'T12:00:00')).replace('.','')}</span></div><div className="row-main"><strong>{new Intl.DateTimeFormat('de-DE',{weekday:'long'}).format(new Date(tr.date+'T12:00:00'))}</strong><span>{tr.note||'Mannschaftstraining'}</span></div><div className="att"><strong>{present}<span> / {act.length}</span></strong><small>Teilnehmer</small></div><div className="rate"><strong>{rate.toFixed(0)} %</strong><div><i style={{width:`${rate}%`}}/></div></div><ChevronRight/></button>}

function CalendarView({team,onOpen}:{team:Team;onOpen:(d:string,t?:Training)=>void}) {
  const [cursor,setCursor]=useState(()=>new Date(2026,8,1));
  const year=cursor.getFullYear(),month=cursor.getMonth(),first=new Date(year,month,1),pad=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  const cells=[...Array(pad).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  return <section className="panel calendar-panel"><div className="calendar-head"><button className="icon-btn" onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft/></button><h2>{monthName(cursor)}</h2><button className="icon-btn" onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight/></button></div><div className="week">{['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=><b key={x}>{x}</b>)}</div><div className="calendar-grid">{cells.map((day,i)=>{if(!day)return <span key={i}/>;const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,tr=team.trainings.find(t=>t.date===date);return <button key={date} className={`${tr?'has-training':''} ${date===iso(new Date())?'today':''}`} onClick={()=>onOpen(date,tr)}><span>{day}</span>{tr&&<><i/><small>{team.players.filter(p=>activeOn(p,date)&&(tr.attendance[p.id]??'present')==='present').length} TN</small></>}</button>})}</div><p className="calendar-hint"><span/> Training vorhanden · Datum antippen, um eine Einheit anzulegen oder zu bearbeiten</p></section>
}

function playerStats(team:Team,p:Player){const trs=team.trainings.filter(t=>activeOn(p,t.date));const actual=trs.filter(t=>(t.attendance[p.id]??'present')==='present').length;return{possible:trs.length,actual,rate:trs.length?actual/trs.length*100:0}}
function PlayersView({team,onAdd,updateTeam,notify,onPerformance}:{team:Team;onAdd:()=>void;updateTeam:(f:(t:Team)=>Team)=>void;notify:(s:string)=>void;onPerformance:(p:Player)=>void}) {
  const [search,setSearch]=useState(''); const [selected,setSelected]=useState<string[]>([]);
  const list=team.players.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const allVisible=list.length>0&&list.every(p=>selected.includes(p.id));
  const removeSelected=()=>{if(selected.length&&confirm(`${selected.length} Spieler wirklich löschen?`)){updateTeam(t=>({...t,players:t.players.filter(p=>!selected.includes(p.id))}));notify(`${selected.length} Spieler gelöscht`);setSelected([])}};
  return <section className="panel"><div className="panel-head"><div><h3>Kader</h3><p>{team.players.length} Spieler · {team.players.filter(p=>activeOn(p,iso(new Date()))).length} aktuell aktiv</p></div><button className="primary" onClick={onAdd}><Plus/> Spieler hinzufügen</button></div>
    <div className="toolbar"><input placeholder="Spieler suchen …" value={search} onChange={e=>setSearch(e.target.value)}/>{selected.length>0&&<button className="delete bulk-delete" onClick={removeSelected}><Trash2 size={17}/> {selected.length} ausgewählte löschen</button>}</div>
    {team.players.length===0?<Empty text="Noch keine Spieler angelegt. Füge den ersten Spieler hinzu."/>:<div className="table-wrap"><table><thead><tr><th><input type="checkbox" aria-label="Alle auswählen" checked={allVisible} onChange={()=>setSelected(allVisible?selected.filter(id=>!list.some(p=>p.id===id)):[...new Set([...selected,...list.map(p=>p.id)])])}/></th><th>SPIELER</th><th>AKTIV VON</th><th>AKTIV BIS</th><th>STATUS</th><th/></tr></thead><tbody>{list.map(p=><tr key={p.id} className={selected.includes(p.id)?'selected-row':''}><td><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/></td><td><strong>{p.name}</strong><br/><button className="link" onClick={()=>onPerformance(p)}>Leistungstests</button></td><td>{fmt(p.activeFrom)}</td><td>{p.activeTo?fmt(p.activeTo):'offen'}</td><td><span className={`pill ${activeOn(p,iso(new Date()))?'green':'gray'}`}>{activeOn(p,iso(new Date()))?'Aktiv':'Inaktiv'}</span></td><td><button className="icon-btn danger" onClick={()=>{if(confirm(`${p.name} wirklich löschen?`)){updateTeam(t=>({...t,players:t.players.filter(x=>x.id!==p.id)}));notify('Spieler gelöscht')}}}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>}</section>
}
function Ranking({team}:{team:Team}){const [sort,setSort]=useState<'rate'|'name'|'actual'>('rate');const rows=team.players.map(p=>({p,...playerStats(team,p)})).sort((a,b)=>sort==='name'?a.p.name.localeCompare(b.p.name):b[sort]-a[sort]);return <section className="panel"><div className="panel-head"><div><h3>Spieler-Rangliste</h3><p>Berücksichtigt nur Einheiten innerhalb des Aktivzeitraums</p></div><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="rate">Nach Quote</option><option value="actual">Nach Teilnahmen</option><option value="name">Nach Name</option></select></div><div className="table-wrap"><table><thead><tr><th>RANG</th><th>SPIELER</th><th>MÖGLICH</th><th>TEILNAHMEN</th><th>QUOTE</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.p.id}><td><span className={`rank ${i<3?'top':''}`}>{i+1}</span></td><td><strong>{r.p.name}</strong></td><td>{r.possible}</td><td>{r.actual}</td><td><div className="quote-cell"><strong>{r.rate.toFixed(1).replace('.',',')} %</strong><div><i style={{width:`${r.rate}%`}}/></div></div></td></tr>)}</tbody></table></div></section>}

function TrainingModal({team,date,training,close,save,remove,onTeams}:{team:Team;date:string;training:Training|null;close:()=>void;save:(t:Training)=>void;remove?:()=>void;onTeams:(t:Training)=>void}) {
  const active=team.players.filter(p=>activeOn(p,date)).sort((a,b)=>a.name.localeCompare(b.name));
  const [attendance,setAttendance]=useState<Record<string,Status>>(()=>Object.fromEntries(active.map(p=>[p.id,training?.attendance[p.id]??'present'])));
  const [note,setNote]=useState(training?.note??''); const present=active.filter(p=>attendance[p.id]==='present').length;
  return <div className="modal-wrap"><div className="modal wide"><div className="modal-head"><div><span>{training?'TRAINING BEARBEITEN':'NEUES TRAINING'}</span><h2>{fmt(date)}</h2></div><button className="icon-btn" onClick={close}><X/></button></div><div className="attendance-summary"><div><strong>{present}</strong><span>von {active.length} anwesend</span></div><div className="big-rate">{active.length?Math.round(present/active.length*100):0} %</div></div><div className="hint">Alle Spieler sind zunächst anwesend. Ändere nur die Abwesenden.</div><div className="status-list">{active.map(p=><div className="status-row" key={p.id}><strong>{p.name}</strong><div>{([['present','Anwesend'],['excused','Entschuldigt'],['unexcused','Unentsch.'],['injured','Verletzt']] as [Status,string][]).map(([v,l])=><button key={v} className={`${v} ${attendance[p.id]===v?'selected':''}`} onClick={()=>setAttendance(a=>({...a,[p.id]:v}))}>{l}</button>)}</div></div>)}</div><label className="note-label">Notiz (optional)<textarea maxLength={160} value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. Schwerpunkt, Besonderheiten …"/></label><div className="modal-actions"><button className="secondary" onClick={()=>onTeams({id:training?.id??uid(),date,note,attendance,teamAssignments:training?.teamAssignments})}><Shuffle size={18}/> Teams zusammenstellen</button>{remove&&<button className="delete" onClick={remove}><Trash2/> Löschen</button>}<span/><button className="secondary" onClick={close}>Abbrechen</button><button className="primary" onClick={()=>save({id:training?.id??uid(),date,note,attendance})}>Training speichern</button></div></div></div>
}
function TeamBuilder({team,training,close}:{team:Team;training:Training;close:()=>void}) {
  const present=team.players.filter(p=>activeOn(p,training.date)&&(training.attendance[p.id]??'present')==='present').sort((a,b)=>a.name.localeCompare(b.name));
  const [groups,setGroups]=useState<Record<string,1|2|3>>(()=>training.teamAssignments??{});
  const assign=(id:string,n:1|2|3)=>setGroups(g=>({...g,[id]:n}));
  const saveTeams=()=>{training.teamAssignments=groups;close()};
  return <div className="modal-wrap"><div className="modal wide team-builder"><div className="modal-head"><div><span>TEAMZUSAMMENSTELLUNG</span><h2>Teams zusammenstellen</h2><p>{fmt(training.date)} · {present.length} anwesende Spieler</p></div><button className="icon-btn" onClick={close}><X/></button></div>
    <p className="hint">Bei jedem anwesenden Spieler einfach Team 1, Team 2 oder Team 3 antippen.</p>
    <div className="status-list">{present.map(p=><div className="status-row" key={p.id}><strong>{p.name}</strong><div>{([1,2,3] as const).map(n=><button key={n} className={groups[p.id]===n?'present selected':''} onClick={()=>assign(p.id,n)}>Team {n}</button>)}</div></div>)}</div>
    <div className="modal-actions"><span/><button className="secondary" onClick={close}>Abbrechen</button><button className="primary" onClick={saveTeams}>Fertig</button></div></div></div>
}
function performanceValue(t:PerformanceTest,v:number){if(t.unit==='time'){const m=Math.floor(v/60),s=Math.round(v%60);return `${m}:${String(s).padStart(2,'0')}`}return `${v} ${t.unit==='meters'?'m':t.unit==='seconds'?'s':''}`.trim()}
function PerformancePlayerModal({team,player,close,updateTeam,notify}:{team:Team;player:Player;close:()=>void;updateTeam:(f:(t:Team)=>Team)=>void;notify:(s:string)=>void}){
 const tests=team.performanceTests??[]; const [testId,setTestId]=useState(tests[0]?.id??''); const [date,setDate]=useState(iso(new Date())); const [raw,setRaw]=useState(''); const [note,setNote]=useState(''); const test=tests.find(t=>t.id===testId); const results=(player.performance?.[testId]??[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const parse=()=>{if(!test)return NaN;if(test.unit==='time'&&raw.includes(':')){const [m,s]=raw.split(':').map(Number);return m*60+s}return Number(raw.replace(',','.'))};
 const saveResult=()=>{const value=parse();if(!test||!Number.isFinite(value))return;updateTeam(t=>({...t,players:t.players.map(p=>p.id===player.id?{...p,performance:{...(p.performance??{}),[testId]:[...(p.performance?.[testId]??[]),{id:uid(),date,value,note}].slice(-5)}}:p)}));setRaw('');setNote('');notify('Testergebnis gespeichert')};
 return <div className="modal-wrap"><div className="modal wide"><div className="modal-head"><div><span>LEISTUNGSTESTS</span><h2>{player.name}</h2></div><button className="icon-btn" onClick={close}><X/></button></div>{!tests.length?<div className="hint">Lege zuerst unter „Leistung“ einen Leistungstest an.</div>:<><div className="form"><label>Test<select value={testId} onChange={e=>setTestId(e.target.value)}>{tests.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="form-row"><label>Datum<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Wert<input value={raw} onChange={e=>setRaw(e.target.value)} placeholder={test?.unit==='time'?'z. B. 18:57':'Wert'}/></label></div><label>Notiz (optional)<input value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. nach Verletzung"/></label><button className="primary" disabled={!raw||results.length>=5} onClick={saveResult}>Ergebnis speichern ({results.length}/5)</button></div>{test&&<div className="training-list">{results.map((r,i)=><div className="training-row" key={r.id}><div className="date-badge"><strong>{i+1}</strong><span>Test</span></div><div className="row-main"><strong>{performanceValue(test,r.value)}</strong><span>{fmt(r.date)}{r.note?' · '+r.note:''}</span></div></div>)}</div>}</>}</div></div>
}
function PerformanceView({team,updateTeam,notify}:{team:Team;updateTeam:(f:(t:Team)=>Team)=>void;notify:(s:string)=>void}){
 const tests=team.performanceTests??[]; const [name,setName]=useState(''); const [unit,setUnit]=useState<PerformanceTest['unit']>('time'); const [lower,setLower]=useState(true); const [selected,setSelected]=useState(tests[0]?.id??''); const test=tests.find(t=>t.id===selected)??tests[0];
 const addTest=()=>{if(!name.trim()||tests.length>=5)return;const nt={id:uid(),name:name.trim(),unit,lowerIsBetter:lower};updateTeam(t=>({...t,performanceTests:[...(t.performanceTests??[]),nt]}));setName('');setSelected(nt.id);notify('Leistungstest angelegt')};
 const series=test?Array.from({length:5},(_,i)=>{const vals=team.players.map(p=>(p.performance?.[test.id]??[]).slice().sort((a,b)=>a.date.localeCompare(b.date))[i]?.value).filter((v):v is number=>typeof v==='number');return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}):[];
 return <><section className="panel"><div className="panel-head"><div><h3>Leistungstests</h3><p>Bis zu 5 eigene Tests · je Spieler maximal 5 Messungen</p></div></div><div className="form-row"><input value={name} onChange={e=>setName(e.target.value)} placeholder="z. B. 5.000-m-Lauf"/><select value={unit} onChange={e=>setUnit(e.target.value as PerformanceTest['unit'])}><option value="time">min:sek</option><option value="meters">Meter</option><option value="seconds">Sekunden</option><option value="number">Zahl / Level</option></select><select value={lower?'lower':'higher'} onChange={e=>setLower(e.target.value==='lower')}><option value="lower">Niedriger ist besser</option><option value="higher">Höher ist besser</option></select><button className="primary" disabled={!name.trim()||tests.length>=5} onClick={addTest}><Plus size={18}/> Test anlegen</button></div>{tests.length>0&&<div className="toolbar"><select value={test?.id??''} onChange={e=>setSelected(e.target.value)}>{tests.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}</section>{test&&<section className="panel"><div className="panel-head"><div><h3>Teamentwicklung · {test.name}</h3><p>Durchschnitt der vorhandenen Spielerwerte je Messung</p></div></div><div style={{display:'flex',alignItems:'end',gap:12,height:220,padding:'20px 10px'}}>{series.map((v,i)=>{const vals=series.filter((x):x is number=>x!==null);const max=Math.max(...vals,1),h=v===null?0:Math.max(12,v/max*170);return <div key={i} style={{flex:1,textAlign:'center'}}><div title={v===null?'Kein Wert':performanceValue(test,v)} style={{height:h,background:'currentColor',opacity:.65,borderRadius:'8px 8px 0 0'}}/><strong>{v===null?'–':performanceValue(test,v)}</strong><small style={{display:'block'}}>Test {i+1}</small></div>})}</div></section>}</>
}
function PlayerModal({team,close,save}:{team:Team;close:()=>void;save:(p:Player)=>void}){const[name,setName]=useState(''),[from,setFrom]=useState(team.start),[to,setTo]=useState(team.end);return <div className="modal-wrap"><div className="modal small"><div className="modal-head"><h2>Spieler hinzufügen</h2><button className="icon-btn" onClick={close}><X/></button></div><div className="form"><label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Vor- und Nachname"/></label><div className="form-row"><label>Aktiv von<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Aktiv bis<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div></div><div className="modal-actions"><span/><button className="secondary" onClick={close}>Abbrechen</button><button className="primary" disabled={!name.trim()} onClick={()=>save({id:uid(),name:name.trim(),activeFrom:from,activeTo:to})}>Hinzufügen</button></div></div></div>}

function download(team:Team,type:'players'|'trainings'){const esc=(s:string|number)=>`\"${String(s).replaceAll('\"','\"\"')}\"`;let rows:string[][]=[];if(type==='players'){rows=[['Spieler','Aktiv von','Aktiv bis','Mögliche Trainings','Teilnahmen','Quote %'],...team.players.map(p=>{const s=playerStats(team,p);return[p.name,p.activeFrom,p.activeTo,String(s.possible),String(s.actual),s.rate.toFixed(1).replace('.',',')]})]}else{rows=[['Datum','Notiz','Aktive Spieler','Teilnehmer','Quote %','Entschuldigt','Unentschuldigt','Verletzt'],...team.trainings.sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{const ps=team.players.filter(p=>activeOn(p,t.date)),count=(st:Status)=>ps.filter(p=>(t.attendance[p.id]??'present')===st).length,pr=count('present');return[t.date,t.note,String(ps.length),String(pr),(ps.length?pr/ps.length*100:0).toFixed(1).replace('.',','),String(count('excused')),String(count('unexcused')),String(count('injured'))]})]};const csv='\\uFEFF'+rows.map(r=>r.map(esc).join(';')).join('\\r\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`${team.name.replaceAll(' ','-')}-${type}.csv`;a.click();URL.revokeObjectURL(a.href)}
function ArchiveView({data,team,setData,notify}:{data:Data;team:Team;setData:React.Dispatch<React.SetStateAction<Data>>;notify:(s:string)=>void}){const archived=data.teams.filter(t=>t.archived);return <><section className="panel export-panel"><div><Download/><div><h3>Daten exportieren</h3><p>Excel-kompatible CSV-Dateien mit allen Saisonwerten herunterladen.</p></div></div><div><button className="secondary" onClick={()=>{download(team,'players');notify('Spielerdaten exportiert')}}>Spielerdaten CSV</button><button className="primary" onClick={()=>{download(team,'trainings');notify('Trainingsdaten exportiert')}}>Trainingsdaten CSV</button></div></section><section className="panel"><div className="panel-head"><div><h3>Saisonarchiv</h3><p>Abgeschlossene Mannschaften und Saisons</p></div><button className="secondary" onClick={()=>{if(confirm('Aktuelle Mannschaft archivieren?')){setData(d=>({...d,teams:d.teams.map(t=>t.id===team.id?{...t,archived:true}:t),selectedTeamId:d.teams.find(t=>t.id!==team.id&&!t.archived)?.id??team.id}));notify('Saison archiviert')}}}>Aktuelle Saison archivieren</button></div>{archived.length?archived.map(t=><div className="archive-row" key={t.id}><Archive/><div><strong>{t.name} · {t.season}</strong><span>{t.trainings.length} Trainings · {stats(t).rate.toFixed(1).replace('.',',')} % Beteiligung</span></div></div>):<Empty text="Noch keine Saison archiviert."/>}</section></>}
function SettingsModal({team,data,close,updateTeam,setData,notify}:{team:Team;data:Data;close:()=>void;updateTeam:(f:(t:Team)=>Team)=>void;setData:React.Dispatch<React.SetStateAction<Data>>;notify:(s:string)=>void}){const[name,setName]=useState(team.name),[season,setSeason]=useState(team.season),[start,setStart]=useState(team.start),[end,setEnd]=useState(team.end),[newTeam,setNewTeam]=useState('');return <div className="modal-wrap"><div className="modal small"><div className="modal-head"><h2>Einstellungen</h2><button className="icon-btn" onClick={close}><X/></button></div><div className="form"><label>Mannschaftsname<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Saisonbezeichnung<input value={season} onChange={e=>setSeason(e.target.value)}/></label><div className="form-row"><label>Saisonstart<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Saisonende<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><hr/><label>Neue Mannschaft<div className="inline-add"><input value={newTeam} onChange={e=>setNewTeam(e.target.value)} placeholder="z. B. U15"/><button className="secondary" disabled={!newTeam.trim()} onClick={()=>{const t:Team={id:uid(),name:newTeam.trim(),season:team.season,start:team.start,end:team.end,archived:false,players:[],trainings:[]};setData(d=>({...d,teams:[...d.teams,t],selectedTeamId:t.id}));close();notify('Mannschaft angelegt')}}>Anlegen</button></div></label></div><div className="modal-actions"><span/><button className="secondary" onClick={close}>Abbrechen</button><button className="primary" onClick={()=>{updateTeam(t=>({...t,name,season,start,end}));close();notify('Einstellungen gespeichert')}}>Speichern</button></div></div></div>}
function Empty({text}:{text:string}){return <div className="empty"><CalendarDays/><p>{text}</p></div>}
export default App;