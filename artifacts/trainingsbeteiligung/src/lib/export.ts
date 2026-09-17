import { useStore } from './store';
import { AppState } from './types';

export function exportToCSV(state: AppState) {
  const team = state.teams.find(t => t.id === state.activeTeamId);
  if (!team) return;

  const players = state.players.filter(p => p.teamId === state.activeTeamId);
  const sessions = state.sessions.filter(s => s.teamId === state.activeTeamId && s.seasonId === state.activeSeasonId).sort((a, b) => a.date.localeCompare(b.date));

  // CSV Header
  let csvContent = '\uFEFF'; // UTF-8 BOM
  
  const headers = ['Spieler', 'Status', 'Von', 'Bis', 'Teilnahmen', 'Möglich', 'Quote %', ...sessions.map(s => s.date)];
  csvContent += headers.join(';') + '\n';

  players.forEach(player => {
    const row = [];
    row.push(`${player.lastName}, ${player.firstName}`);
    row.push(player.activeTo ? 'Inaktiv' : 'Aktiv');
    row.push(player.activeFrom);
    row.push(player.activeTo || '');

    // Calculate stats
    let possible = 0;
    let attended = 0;
    
    const sessionCols = sessions.map(session => {
      // Check if player was active during this session
      const isActive = session.date >= player.activeFrom && (!player.activeTo || session.date <= player.activeTo);
      if (!isActive) return '-';
      
      possible++;
      const attendance = session.attendances.find(a => a.playerId === player.id);
      if (!attendance) return '?'; // should not happen if data is consistent, but fallback
      
      if (attendance.status === 'present') {
        attended++;
        return 'Anwesend';
      } else if (attendance.status === 'excused') {
        return 'Entschuldigt';
      } else if (attendance.status === 'unexcused') {
        return 'Unentschuldigt';
      } else if (attendance.status === 'injured') {
        return 'Verletzt';
      }
      return '-';
    });

    row.push(attended.toString());
    row.push(possible.toString());
    row.push(possible > 0 ? Math.round((attended / possible) * 100).toString() : '0');
    
    row.push(...sessionCols);
    csvContent += row.join(';') + '\n';
  });

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trainingsbeteiligung_${team.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
