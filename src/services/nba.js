import { getJson } from '../lib/http.js';
import { addHours, overlaps, toEspnDate, uniqueStrings } from '../lib/time.js';

export async function getGamesForWindows(config, busyWindows, options = {}) {
  const dates = getDatesForBusyWindows(busyWindows);
  const fallbackWindow = resolveFallbackWindow(busyWindows, options);
  const fallbackDates = getDatesForRange(fallbackWindow.start, fallbackWindow.end);
  const allDates = uniqueStrings([...dates, ...fallbackDates]);

  const allGames = await fetchGamesForDates(allDates);

  const matchedGames = matchGamesToWindows(allGames, busyWindows, config.favoriteTeams);
  if (matchedGames.length) {
    return matchedGames;
  }

  return pickGamesInWindow(allGames, fallbackWindow, config.favoriteTeams);
}

export function matchGamesToWindows(games, busyWindows, favoriteTeams = []) {
  const normalizedFavorites = favoriteTeams.map((team) => team.toLowerCase());

  const overlappingGames = games
    .filter((game) => {
      if (!shouldIncludeGameInRecap(game)) {
        return false;
      }
      const gameStart = new Date(game.startTime);
      const gameEnd = new Date(gameStart.getTime() + 3 * 60 * 60 * 1000);
      return busyWindows.some((event) =>
        overlaps(gameStart, gameEnd, new Date(event.start), new Date(event.end)),
      );
    });

  return overlappingGames
    .map((game) => ({
      ...game,
      isFavorite: normalizedFavorites.length
        ? normalizedFavorites.some((team) =>
            `${game.name} ${game.homeTeam} ${game.awayTeam}`.toLowerCase().includes(team),
          )
        : false,
      finalScore:
        game.homeScore && game.awayScore
          ? `${game.awayTeam} ${game.awayScore}, ${game.homeTeam} ${game.homeScore}`
          : '',
    }))
    .sort((left, right) => {
      if (left.isFavorite !== right.isFavorite) {
        return left.isFavorite ? -1 : 1;
      }

      return new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
    });
}

function getDatesForBusyWindows(busyWindows) {
  const dates = [];

  for (const event of busyWindows) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const inclusiveEnd = new Date(end);
    inclusiveEnd.setHours(0, 0, 0, 0);

    while (cursor <= inclusiveEnd) {
      dates.push(toEspnDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return uniqueStrings(dates);
}

function getDatesForRange(start, end) {
  if (!start || !end) {
    return [];
  }

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  const dates = [];

  while (cursor <= last) {
    dates.push(toEspnDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function resolveFallbackWindow(busyWindows, options) {
  if (options.from || options.to) {
    const start = options.from ? new Date(options.from) : addHours(new Date(), -18);
    const end = options.to ? new Date(options.to) : new Date();
    return { start, end };
  }

  if (busyWindows.length) {
    const starts = busyWindows.map((event) => new Date(event.start).getTime());
    const ends = busyWindows.map((event) => new Date(event.end).getTime());
    return {
      start: new Date(Math.min(...starts)),
      end: new Date(Math.max(...ends)),
    };
  }

  return {
    start: addHours(new Date(), -18),
    end: new Date(),
  };
}

async function fetchGamesForDates(dates) {
  const allGames = [];

  for (const date of dates) {
    const scoreboard = await getJson(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`,
    );

    const games = (scoreboard.events ?? []).map((event) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const home = competitors.find((team) => team.homeAway === 'home');
      const away = competitors.find((team) => team.homeAway === 'away');

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        startTime: event.date,
        status: competition?.status?.type?.description ?? 'Scheduled',
        state: competition?.status?.type?.state ?? '',
        completed: competition?.status?.type?.completed ?? false,
        homeTeam: home?.team?.displayName ?? 'Home Team',
        awayTeam: away?.team?.displayName ?? 'Away Team',
        homeScore: home?.score ?? '',
        awayScore: away?.score ?? '',
      };
    });

    allGames.push(...games);
  }

  return allGames;
}

function pickGamesInWindow(games, window, favoriteTeams = []) {
  const normalizedFavorites = favoriteTeams.map((team) => team.toLowerCase());

  return games
    .filter((game) => {
      if (!shouldIncludeGameInRecap(game)) {
        return false;
      }
      const startTime = new Date(game.startTime);
      return startTime >= window.start && startTime <= window.end;
    })
    .map((game) => ({
      ...game,
      isFavorite: normalizedFavorites.length
        ? normalizedFavorites.some((team) =>
            `${game.name} ${game.homeTeam} ${game.awayTeam}`.toLowerCase().includes(team),
          )
        : false,
      finalScore:
        game.homeScore && game.awayScore
          ? `${game.awayTeam} ${game.awayScore}, ${game.homeTeam} ${game.homeScore}`
          : '',
    }))
    .sort((left, right) => {
      if (left.isFavorite !== right.isFavorite) {
        return left.isFavorite ? -1 : 1;
      }

      return new Date(right.startTime).getTime() - new Date(left.startTime).getTime();
    });
}

function shouldIncludeGameInRecap(game) {
  if (game.completed) {
    return true;
  }

  const awayScore = Number.parseInt(game.awayScore ?? '', 10);
  const homeScore = Number.parseInt(game.homeScore ?? '', 10);
  const hasRealScore = Number.isFinite(awayScore) && Number.isFinite(homeScore) && (awayScore > 0 || homeScore > 0);

  if (hasRealScore) {
    return true;
  }

  const statusText = `${game.status ?? ''} ${game.state ?? ''}`.toLowerCase();
  if (statusText.includes('scheduled') || statusText.includes('pre') || statusText.includes('not started')) {
    return false;
  }

  return false;
}
