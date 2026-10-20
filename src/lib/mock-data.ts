import type { Anime, Episode } from "@/types";

// Cinematic seed data — used as dev-mode fallback + when Kitsu is unreachable.
// Images point at the MAL CDN (stable, hotlinkable through /api/image).
export const MOCK_ANIME: Anime[] = [
  {
    malId: 52991,
    title: "Frieren: Beyond Journey's End",
    titleJapanese: "葬送のフリーレン",
    titleEnglish: "Frieren: Beyond Journey's End",
    synopsis:
      "An elven mage who outlived the hero's party sets out on a new journey — to understand humans, grief, and the time she wasted. A quiet masterpiece about memory and mortality.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/2222/147756.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/2222/147756l.jpg",
    genres: ["Adventure", "Drama", "Fantasy"],
    studios: ["Madhouse"],
    year: 2023,
    type: "TV",
    status: "Finished Airing",
    score: 8.93,
    scoredBy: 412000,
    rank: 1,
    episodes: 28,
    airing: false,
    airedFrom: "2023-09-29",
    broadcast: "Fridays at 23:00 JST",
  },
  {
    malId: 40748,
    title: "Jujutsu Kaisen",
    titleJapanese: "呪術廻戦",
    synopsis:
      "Yuji Itadori swallows a cursed finger and is thrust into a brutal world of sorcerers, curses, and impossible choices.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1792/138022l.jpg",
    genres: ["Action", "Fantasy"],
    studios: ["MAPPA"],
    year: 2023,
    type: "TV",
    status: "Currently Airing",
    score: 8.65,
    scoredBy: 890000,
    rank: 42,
    episodes: 47,
    airing: true,
    airedFrom: "2023-07-06",
    broadcast: "Thursdays at 23:56 JST",
    nextEpisode: {
      number: 48,
      airsAt: new Date(Date.now() + 26 * 3600000).toISOString(),
    },
  },
  {
    malId: 21,
    title: "One Piece",
    titleJapanese: "ワンピース",
    synopsis:
      "Monkey D. Luffy sails the Grand Line with his crew in search of the legendary One Piece treasure.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1244/138851.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
    studios: ["Toei Animation"],
    year: 1999,
    type: "TV",
    status: "Currently Airing",
    score: 8.73,
    scoredBy: 640000,
    rank: 28,
    episodes: 1146,
    airing: true,
    broadcast: "Sundays at 09:30 JST",
    nextEpisode: {
      number: 1147,
      airsAt: new Date(Date.now() + 18 * 3600000 + 42 * 60000).toISOString(),
    },
  },
  {
    malId: 44511,
    title: "Chainsaw Man",
    titleJapanese: "チェンソーマン",
    synopsis:
      "Broke devil hunter Denji fuses with his chainsaw-dog Pochita and becomes something the world has never seen.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1806/126216.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg",
    genres: ["Action", "Fantasy"],
    studios: ["MAPPA"],
    year: 2022,
    type: "TV",
    status: "Finished Airing",
    score: 8.51,
    scoredBy: 720000,
    rank: 110,
    episodes: 12,
    airing: false,
  },
  {
    malId: 5114,
    title: "Fullmetal Alchemist: Brotherhood",
    titleJapanese: "鋼の錬金術師 FULLMETAL ALCHEMIST",
    synopsis:
      "Two brothers break alchemy's greatest taboo and pay the price — then spend years trying to make it right.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
    genres: ["Action", "Adventure", "Drama", "Fantasy"],
    studios: ["Bones"],
    year: 2009,
    type: "TV",
    status: "Finished Airing",
    score: 9.1,
    scoredBy: 1900000,
    rank: 2,
    episodes: 64,
    airing: false,
  },
  {
    malId: 38000,
    title: "Demon Slayer: Kimetsu no Yaiba",
    titleJapanese: "鬼滅の刃",
    synopsis:
      "Tanjiro Kamado becomes a demon slayer to save his sister Nezuko and avenge his family.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
    genres: ["Action", "Fantasy"],
    studios: ["ufotable"],
    year: 2019,
    type: "TV",
    status: "Finished Airing",
    score: 8.53,
    scoredBy: 1100000,
    rank: 100,
    episodes: 26,
    airing: false,
  },
  {
    malId: 48583,
    title: "Shangri-La Frontier",
    titleJapanese: "シャングリラ・フロンティア",
    synopsis:
      "A trash-game hunter takes on a god-tier VR MMO with nothing but skill and spite.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1968/140088.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1968/140088l.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
    studios: ["C2C"],
    year: 2023,
    type: "TV",
    status: "Currently Airing",
    score: 7.89,
    scoredBy: 98000,
    rank: 640,
    episodes: 25,
    airing: true,
    broadcast: "Sundays at 17:00 JST",
    nextEpisode: {
      number: 26,
      airsAt: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    },
  },
  {
    malId: 60489,
    title: "Dandadan",
    titleJapanese: "ダンダダン",
    synopsis:
      "A girl who believes in ghosts and a boy who believes in aliens discover both are very, very real.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1589/143719.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1589/143719l.jpg",
    genres: ["Action", "Comedy", "Supernatural"],
    studios: ["Science SARU"],
    year: 2024,
    type: "TV",
    status: "Currently Airing",
    score: 8.45,
    scoredBy: 210000,
    rank: 140,
    episodes: 12,
    airing: true,
    broadcast: "Fridays at 00:26 JST",
    nextEpisode: {
      number: 13,
      airsAt: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    },
  },
  {
    malId: 56558,
    title: "Vinland Saga",
    titleJapanese: "ヴィンランド・サガ",
    synopsis:
      "Thorfinn's quest for revenge becomes a meditation on violence, fatherhood, and what it means to be a true warrior.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1500/138911.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1500/138911l.jpg",
    genres: ["Action", "Adventure", "Drama"],
    studios: ["MAPPA"],
    year: 2023,
    type: "TV",
    status: "Finished Airing",
    score: 8.75,
    scoredBy: 480000,
    rank: 25,
    episodes: 24,
    airing: false,
  },
  {
    malId: 15417,
    title: "Mushishi",
    titleJapanese: "蟲師",
    synopsis:
      "Ginko wanders a quiet Japan, mediating between humans and the ethereal Mushi — creatures of pure life.",
    coverImage:
      "https://cdn.myanimelist.net/images/anime/1017/138006.jpg",
    bannerImage:
      "https://cdn.myanimelist.net/images/anime/1017/138006l.jpg",
    genres: ["Adventure", "Fantasy", "Slice of Life"],
    studios: ["Artland"],
    year: 2005,
    type: "TV",
    status: "Finished Airing",
    score: 8.65,
    scoredBy: 190000,
    rank: 60,
    episodes: 26,
    airing: false,
  },
];

export function mockEpisodes(anime: Anime, count?: number): Episode[] {
  const n = count ?? anime.episodes ?? 12;
  const titles: Record<number, string[]> = {
    52991: [
      "The Journey's End",
      "It Didn't Have to Be Magic",
      "Killing Magic",
      "The Land Where Souls Rest",
    ],
  };
  return Array.from({ length: Math.min(n, 60) }, (_, i) => {
    const num = i + 1;
    const custom = titles[anime.malId]?.[i];
    return {
      number: num,
      title: custom ?? `Episode ${num}`,
      airDate: anime.airedFrom
        ? new Date(
            new Date(anime.airedFrom).getTime() + i * 7 * 86400000
          )
            .toISOString()
            .slice(0, 10)
        : undefined,
      runtime: 24,
      score: undefined,
    };
  });
}

export const MOCK_TRENDING_IDS = [52991, 60489, 40748, 21, 44511];
