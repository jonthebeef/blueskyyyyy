export interface BlueskyConfig {
  handle: string;
  password: string;
  service?: string;
}

export interface PostResult {
  uri: string;
  cid: string;
  url?: string;
}

export interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export interface PostView {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}

export interface ThreadView {
  post: PostView;
  parent?: ThreadView;
  replies?: ThreadView[];
}
