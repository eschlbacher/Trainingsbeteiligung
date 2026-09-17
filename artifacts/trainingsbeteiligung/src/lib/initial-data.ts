import { AppState, Team, Season, Player, TrainingSession } from './types';

const firstNames = ["Lukas", "Leon", "Finn", "Jonas", "Luis", "Maximilian", "Felix", "Noah", "Paul", "Julian", "Elias", "Tim", "Moritz", "Philipp", "Niklas", "Tom", "Jan", "Jakob", "Alexander", "David", "Simon", "Luca", "Ben", "Florian", "Max", "Nils", "Johannes", "Kevin", "Fabian", "Daniel", "Dennis", "Marc", "Anton", "Emil", "Oskar"];
const lastNames = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Braun", "Werner", "Heinrich", "Krüger", "Hofmann", "Köhler", "Lehmann", "Maier", "Huber", "Kaiser", "Fuchs", "Peters", "Lang", "Scholz", "Möller", "Weiß", "Jung"];

const generateId = () => crypto.randomUUID();

function generatePlayers(teamId: string, count: number, activeFrom: string): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    players.push({
      id: generateId(),
      teamId,
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      activeFrom
    });
  }
  return players;
}

export function generateInitialData(): AppState {
  const currentYear = new Date().getFullYear();
  const seasonStart = `${currentYear}-07-01`;
  const seasonEnd = `${currentYear + 1}-06-30`;

  const season1: Season = {
    id: generateId(),
    name: `Saison ${currentYear}/${currentYear + 1}`,
    startDate: seasonStart,
    endDate: seasonEnd
  };

  const team1: Team = { id: generateId(), name: "1. Mannschaft" };
  const team2: Team = { id: generateId(), name: "2. Mannschaft" };
  const team3: Team = { id: generateId(), name: "U19" };

  const teams = [team1, team2, team3];
  
  const players: Player[] = [
    ...generatePlayers(team1.id, 35, seasonStart),
    ...generatePlayers(team2.id, 35, seasonStart),
    ...generatePlayers(team3.id, 35, seasonStart)
  ];

  return {
    teams,
    seasons: [season1],
    players,
    sessions: [],
    activeTeamId: team1.id,
    activeSeasonId: season1.id
  };
}
