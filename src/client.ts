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

  async login(password: string): Promise<void> {
    await this.agent.login({
      identifier: this.handle,
      password: password,
    });
  }

  async post(text: string, options?: {
    replyTo?: { uri: string; cid: string };
    images?: Array<{ data: Uint8Array; alt?: string; encoding?: string }>;
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

      // If parent is itself a reply, use its root as our root
      // Otherwise, the parent IS the root
      const parentRecord = parentPost.value as any;
      const root = parentRecord.reply?.root || {
        uri: options.replyTo.uri,
        cid: options.replyTo.cid,
      };

      record.reply = {
        root: root,
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
            encoding: img.encoding || 'image/jpeg',
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

  async updateProfile(updates: { displayName?: string; description?: string }) {
    await this.agent.upsertProfile((existing) => {
      return {
        ...existing,
        displayName: updates.displayName ?? existing?.displayName,
        description: updates.description ?? existing?.description,
      };
    });
  }

  async deletePost(uri: string) {
    await this.agent.deletePost(uri);
  }

  async quotePost(text: string, quoteUri: string, quoteCid: string): Promise<PostResult> {
    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    const record: any = {
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
      embed: {
        $type: 'app.bsky.embed.record',
        record: {
          uri: quoteUri,
          cid: quoteCid,
        },
      },
    };

    const result = await this.agent.post(record);

    return {
      uri: result.uri,
      cid: result.cid,
      url: `https://bsky.app/profile/${this.handle}/post/${result.uri.split('/').pop()}`,
    };
  }

  async getNotifications(limit: number = 50) {
    const response = await this.agent.listNotifications({ limit });
    return response.data.notifications;
  }

  async getSuggestedFollows(limit: number = 50) {
    const response = await this.agent.app.bsky.actor.getSuggestions({ limit });
    return response.data.actors;
  }

  async updateAvatar(data: Uint8Array, encoding: string) {
    const uploadResponse = await this.agent.uploadBlob(data, { encoding });
    await this.agent.upsertProfile((existing) => {
      return {
        ...existing,
        avatar: uploadResponse.data.blob,
      };
    });
    return uploadResponse.data.blob;
  }

  async getLists(handle?: string, limit: number = 50) {
    const targetHandle = handle || this.handle;
    const response = await this.agent.app.bsky.graph.getLists({
      actor: targetHandle,
      limit,
    });
    return response.data.lists;
  }

  async getList(listUri: string, limit: number = 50) {
    const response = await this.agent.app.bsky.graph.getList({
      list: listUri,
      limit,
    });
    return response.data;
  }

  async createList(name: string, description: string, purpose: 'curatelist' | 'modlist') {
    const response = await this.agent.app.bsky.graph.list.create(
      { repo: this.agent.session!.did },
      {
        name,
        description,
        purpose: `app.bsky.graph.defs#${purpose}`,
        createdAt: new Date().toISOString(),
      }
    );
    return response;
  }

  async addToList(listUri: string, subjectDid: string) {
    const response = await this.agent.app.bsky.graph.listitem.create(
      { repo: this.agent.session!.did },
      {
        list: listUri,
        subject: subjectDid,
        createdAt: new Date().toISOString(),
      }
    );
    return response;
  }

  async removeFromList(listItemUri: string) {
    const rkey = listItemUri.split('/').pop()!;
    await this.agent.app.bsky.graph.listitem.delete({
      repo: this.agent.session!.did,
      rkey,
    });
  }
}
