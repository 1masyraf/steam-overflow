export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // in minutes
  img_icon_url: string;
  rtime_last_played?: number;
}

export async function getSteamLibrary(steamId: string): Promise<SteamGame[]> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("Missing STEAM_API_KEY environment variable");

  const params = new URLSearchParams({
    key: apiKey,
    steamid: steamId,
    include_appinfo: "true",
    include_played_free_games: "true",
  });
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`;

  const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
  
  if (response.status === 401 || response.status === 403) {
    throw new Error("Steam rejected the API key (check STEAM_API_KEY)");
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Steam library: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Steam returns an empty response object if the profile is private or ID is invalid
  return data.response?.games || [];
}

// lib/steamapi.ts (append to existing file)

export interface EnrichedGameMetadata {
  genres: string[];
  categories: string[];
}

export async function getSteamAppDetails(
  appId: number
): Promise<EnrichedGameMetadata | null> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`;

  const response = await fetch(url, { cache: "no-store" });

  // Handle Steam rate limiting gracefully
  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  const appData = json[String(appId)];

  // Some older/delisted games return { success: false }
  if (!appData || !appData.success || !appData.data) {
    return { genres: [], categories: [] };
  }

  const genres: string[] = (appData.data.genres || []).map(
    (g: { description: string }) => g.description
  );

  const categories: string[] = (appData.data.categories || []).map(
    (c: { description: string }) => c.description
  );

  return { genres, categories };
}