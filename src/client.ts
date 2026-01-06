import { BskyAgent, RichText } from '@atproto/api';
import type { BlueskyConfig, PostResult, ProfileView } from './types.js';

export class BlueskyClient {
  private agent: BskyAgent;
  private handle: string;

  constructor(config: BlueskyConfig) {
    this.agent = new BskyAgent({
      service: config.service || 'https://bsky.social',
    });
    this.handle = config.handle;
  }

  async login(appPassword: string): Promise<void> {
    await this.agent.login({
      identifier: this.handle,
      password: appPassword,
    });
  }

  async post(text: string, options?: {
    replyTo?: { uri: string; cid: string };
    images?: Array<{ data: Uint8Array; alt?: string }>;
  }): Promise<PostResult> {
    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    const record: any = {
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    if (options?.replyTo) {
      const parentPost = await this.agent.getPost({
        repo: options.replyTo.uri.split('/')[2],
        rkey: options.replyTo.uri.split('/').pop()!,
      });

      record.reply = {
        root: {
          uri: options.replyTo.uri,
          cid: options.replyTo.cid,
        },
        parent: {
          uri: options.replyTo.uri,
          cid: options.replyTo.cid,
        },
      };
    }

    if (options?.images && options.images.length > 0) {
      const uploadedImages = await Promise.all(
        options.images.map(async (img) => {
          const response = await this.agent.uploadBlob(img.data, {
            encoding: 'image/jpeg',
          });
          return {
            alt: img.alt || '',
            image: response.data.blob,
          };
        })
      );

      record.embed = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };
    }

    const result = await this.agent.post(record);

    return {
      uri: result.uri,
      cid: result.cid,
      url: `https://bsky.app/profile/${this.handle}/post/${result.uri.split('/').pop()}`,
    };
  }

  async getProfile(handle?: string): Promise<ProfileView> {
    const targetHandle = handle || this.handle;
    const response = await this.agent.getProfile({ actor: targetHandle });

    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName,
      description: response.data.description,
      avatar: response.data.avatar,
      followersCount: response.data.followersCount,
      followsCount: response.data.followsCount,
      postsCount: response.data.postsCount,
    };
  }

  async getTimeline(limit: number = 50) {
    const response = await this.agent.getTimeline({ limit });
    return response.data.feed;
  }

  async getAuthorFeed(handle: string, limit: number = 50) {
    const response = await this.agent.getAuthorFeed({ actor: handle, limit });
    return response.data.feed;
  }

  async getPostThread(uri: string) {
    const response = await this.agent.getPostThread({ uri });
    return response.data.thread;
  }

  async searchPosts(query: string, limit: number = 25) {
    const response = await this.agent.app.bsky.feed.searchPosts({ q: query, limit });
    return response.data.posts;
  }

  async like(uri: string, cid: string) {
    return await this.agent.like(uri, cid);
  }

  async deleteLike(likeUri: string) {
    const uriParts = likeUri.split('/');
    await this.agent.deleteLike(likeUri);
  }

  async repost(uri: string, cid: string) {
    return await this.agent.repost(uri, cid);
  }

  async deleteRepost(repostUri: string) {
    await this.agent.deleteRepost(repostUri);
  }

  async follow(did: string) {
    return await this.agent.follow(did);
  }

  async deleteFollow(followUri: string) {
    await this.agent.deleteFollow(followUri);
  }

  async getFollowers(handle?: string, limit: number = 50) {
    const targetHandle = handle || this.handle;
    const response = await this.agent.getFollowers({ actor: targetHandle, limit });
    return response.data.followers;
  }

  async getFollows(handle?: string, limit: number = 50) {
    const targetHandle = handle || this.handle;
    const response = await this.agent.getFollows({ actor: targetHandle, limit });
    return response.data.follows;
  }

  async getLikes(uri: string, limit: number = 50) {
    const response = await this.agent.getLikes({ uri, limit });
    return response.data.likes;
  }

  async getRepostedBy(uri: string, limit: number = 50) {
    const response = await this.agent.getRepostedBy({ uri, limit });
    return response.data.repostedBy;
  }
}
