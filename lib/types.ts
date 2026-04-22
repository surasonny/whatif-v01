export type Universe = {
  id: string
  label: string
  isMain: boolean
  branchFromEpisode: number | null
  episodes: Episode[]
  challengeStartedAt?: string | null
}

export type Episode = {
  index: number
  title: string
  remixAllowed: boolean
  likes: number
  dislikes: number
  content: string
  coverImageUrl?: string
}

export type MainHistory = {
  fromUniverseId: string
  fromUniverseLabel: string
  toUniverseId: string
  toUniverseLabel: string
  date: string
  totalLikes: number
}

export type Story = {
  id: string
  title: string
  genre: string
  author: string
  hook: string
  coverColor: string
  coverImageUrl?: string
  seedVersion: number
  universes: Universe[]
  mainHistory?: MainHistory[]
}

export interface Comment {
  id: string;
  storyId: string;
  universeId: string;
  episodeIndex: number;
  author: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt: string;
}

export type AppState = {
  dataVersion: number
  comments: Comment[]
  stories: Story[]
}
