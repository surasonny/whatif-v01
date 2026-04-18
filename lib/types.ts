export type Universe = {
  id: string
  label: string
  isMain: boolean
  branchFromEpisode: number | null
  episodes: Episode[]
}

export type Episode = {
  index: number
  title: string
  remixAllowed: boolean
  likes: number
  dislikes: number
  content: string
}

export type Story = {
  id: string
  title: string
  genre: string
  author: string
  hook: string
  coverColor: string
  seedVersion: number
  universes: Universe[]
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

