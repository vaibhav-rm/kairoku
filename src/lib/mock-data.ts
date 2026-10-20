import type { Anime, Episode } from "@/types";

// Cinematic seed data — used as dev-mode fallback + when Kitsu is unreachable.
// Every id and image URL is Kitsu-native (served through /api/image).
export const MOCK_ANIME: Anime[] = [
  {
    animeId: 9046474,
    source: "mock",
    title: "Frieren: Beyond Journey's End",
    titleJapanese: "葬送のフリーレン",
    titleEnglish: "Frieren: Beyond Journey's End",
    synopsis:
      "An elven mage who outlived the hero's party sets out on a new journey — to understand humans, grief, and the time she wasted. A quiet masterpiece about memory and mortality.",
    coverImage:
      "https://media.kitsu.app/anime/46474/poster_image/large-ec9b98dd5fbf8f92532d1edb45f9e882.jpeg",
    bannerImage:
      "https://media.kitsu.app/anime/46474/cover_image/large-167edf3e01fac59ce6aacfeb47df5634.jpeg",
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
    animeId: 9042765,
    source: "mock",
    title: "Jujutsu Kaisen",
    titleJapanese: "呪術廻戦",
    synopsis:
      "Yuji Itadori swallows a cursed finger and is thrust into a brutal world of sorcerers, curses, and impossible choices.",
    coverImage:
      "https://media.kitsu.app/anime/42765/poster_image/large-5ce19551c1a6cf995b378205b9149b5c.jpeg",
    bannerImage:
      "https://media.kitsu.app/anime/cover_images/42765/large.jpg",
    genres: ["Action", "Fantasy"],
    studios: ["MAPPA"],
    year: 2020,
    type: "TV",
    status: "Finished Airing",
    score: 8.65,
    scoredBy: 890000,
    rank: 42,
    episodes: 24,
    airing: false,
    airedFrom: "2020-10-03",
    broadcast: "Fridays at 23:56 JST",
  },
  {
    animeId: 9000012,
    source: "mock",
    title: "One Piece",
    titleJapanese: "ワンピース",
    synopsis:
      "Monkey D. Luffy sails the Grand Line with his crew in search of the legendary One Piece treasure.",
    coverImage:
      "https://media.kitsu.app/anime/poster_images/12/large.jpg",
    bannerImage:
      "https://media.kitsu.app/anime/12/cover_image/large-3e72f400a87b5241780c5082f0582611.jpeg",
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
    animeId: 9043806,
    source: "mock",
    title: "Chainsaw Man",
    titleJapanese: "チェンソーマン",
    synopsis:
      "Broke devil hunter Denji fuses with his chainsaw-dog Pochita and becomes something the world has never seen.",
    coverImage:
      "https://media.kitsu.app/anime/43806/poster_image/large-815d6008fb3b56f4291b9f0ffa05cd8f.jpeg",
    bannerImage:
      "https://media.kitsu.app/anime/43806/cover_image/large-964674a0f11524f62d65dde845ad8e1f.jpeg",
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
    animeId: 9003936,
    source: "mock",
    title: "Fullmetal Alchemist: Brotherhood",
    titleJapanese: "鋼の錬金術師 FULLMETAL ALCHEMIST",
    synopsis:
      "Two brothers break alchemy's greatest taboo and pay the price — then spend years trying to make it right.",
    coverImage:
      "https://media.kitsu.app/anime/poster_images/3936/large.jpg",
    bannerImage:
      "https://media.kitsu.app/anime/cover_images/3936/large.jpg",
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
    animeId: 9041370,
    source: "mock",
    title: "Demon Slayer: Kimetsu no Yaiba",
    titleJapanese: "鬼滅の刃",
    synopsis:
      "Tanjiro Kamado becomes a demon slayer to save his sister Nezuko and avenge his family.",
    coverImage:
      "https://media.kitsu.app/anime/poster_images/41370/large.jpg",
    bannerImage:
      "https://media.kitsu.app/anime/41370/cover_image/large-3de3cc6d2b33162c928de10aa201e4ba.jpeg",
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
    animeId: 9046241,
    source: "mock",
    title: "Shangri-La Frontier",
    titleJapanese: "シャングリラ・フロンティア",
    synopsis:
      "A trash-game hunter takes on a god-tier VR MMO with nothing but skill and spite.",
    coverImage:
      "https://media.kitsu.app/anime/46241/poster_image/large-932c88032c14cb5ebcad1375ab1289e6.jpeg",
    bannerImage:
      "https://media.kitsu.app/anime/46241/cover_image/large-449eb51713fe45045e55ec5372d09578.jpeg",
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
    animeId: 9048269,
    source: "mock",
    title: "Dandadan",
    titleJapanese: "ダンダダン",
    synopsis:
      "A girl who believes in ghosts and a boy who believes in aliens discover both are very, very real.",
    coverImage:
      "https://media.kitsu.app/anime/48269/poster_image/large-589c017798b98c69e3a615ca4191f49d.jpeg",
    bannerImage:
      "https://media.kitsu.app/anime/48269/cover_image/large-2a78bed2943524035cc0146c6633d1bf.jpeg",
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
    animeId: 9041084,
    source: "mock",
    title: "Vinland Saga",
    titleJapanese: "ヴィンランド・サガ",
    synopsis:
      "Thorfinn's quest for revenge becomes a meditation on violence, fatherhood, and what it means to be a true warrior.",
    coverImage:
      "https://media.kitsu.app/anime/poster_images/41084/large.jpg",
    bannerImage:
      "https://media.kitsu.app/anime/41084/cover_image/large-2590d6aecb5433b5693f3224e7265bb9.jpeg",
    genres: ["Action", "Adventure", "Drama"],
    studios: ["MAPPA"],
    year: 2019,
    type: "TV",
    status: "Finished Airing",
    score: 8.75,
    scoredBy: 480000,
    rank: 25,
    episodes: 24,
    airing: false,
  },
  {
    animeId: 9000419,
    source: "mock",
    title: "Mushishi",
    titleJapanese: "蟲師",
    synopsis:
      "Ginko wanders a quiet Japan, mediating between humans and the ethereal Mushi — creatures of pure life.",
    coverImage:
      "https://media.kitsu.app/anime/poster_images/419/large.jpg",
    bannerImage:
      "https://media.kitsu.app/anime/cover_images/419/large.jpg",
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
    9046474: [
      "The Journey's End",
      "It Didn't Have to Be Magic",
      "Killing Magic",
      "The Land Where Souls Rest",
    ],
  };
  return Array.from({ length: Math.min(n, 60) }, (_, i) => {
    const num = i + 1;
    const custom = titles[anime.animeId]?.[i];
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
