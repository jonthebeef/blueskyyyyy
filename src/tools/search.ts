import { BlueskyClient } from '../client.js';

export const searchTools = {
  search_posts: {
    description: `Search for posts on Bluesky by keyword or phrase.

Example: {"query": "AI coding tools", "limit": 25}`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default: 25, max: 100)',
          maximum: 100,
        },
      },
      required: ['query'],
    },
    handler: async (
      args: { query: string; limit?: number },
      client: BlueskyClient
    ) => {
      const posts = await client.searchPosts(args.query, args.limit || 25);

      const results = posts.map((post) => ({
        uri: post.uri,
        cid: post.cid,
        author: {
          handle: post.author.handle,
          displayName: post.author.displayName,
        },
        text: (post.record as any).text,
        replyCount: post.replyCount,
        repostCount: post.repostCount,
        likeCount: post.likeCount,
        indexedAt: post.indexedAt,
      }));

      return {
        query: args.query,
        results,
        count: results.length,
        message: `Found ${results.length} posts matching "${args.query}"`,
      };
    },
  },

  update_profile: {
    description: `Update your Bluesky profile. You can update display name and/or bio (description).

Example: {"description": "New bio text here"}`,
    inputSchema: {
      type: 'object',
      properties: {
        displayName: {
          type: 'string',
          description: 'New display name',
        },
        description: {
          type: 'string',
          description: 'New bio/description',
        },
      },
    },
    handler: async (
      args: { displayName?: string; description?: string },
      client: BlueskyClient
    ) => {
      await client.updateProfile(args);

      return {
        success: true,
        updated: {
          displayName: args.displayName ? true : false,
          description: args.description ? true : false,
        },
        message: 'Profile updated successfully',
      };
    },
  },

  get_profile: {
    description: `Get profile information for a Bluesky user. If no handle is provided, returns your own profile.

Example: {"handle": "user.bsky.social"}`,
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description:
            'The handle of the user (e.g., user.bsky.social). Leave empty for your own profile.',
        },
      },
    },
    handler: async (
      args: { handle?: string },
      client: BlueskyClient
    ) => {
      const profile = await client.getProfile(args.handle);

      return {
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        description: profile.description,
        avatar: profile.avatar,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        postsCount: profile.postsCount,
        message: `Profile: @${profile.handle}`,
      };
    },
  },

  get_followers: {
    description: `Get the list of users who follow an account. If no handle is provided, returns your own followers.

Example: {"handle": "user.bsky.social", "limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'The handle to get followers for (leave empty for yourself)',
        },
        limit: {
          type: 'number',
          description: 'Number of followers to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (
      args: { handle?: string; limit?: number },
      client: BlueskyClient
    ) => {
      const followers = await client.getFollowers(args.handle, args.limit || 50);

      const results = followers.map((follower) => ({
        did: follower.did,
        handle: follower.handle,
        displayName: follower.displayName,
        avatar: follower.avatar,
      }));

      return {
        handle: args.handle || 'your account',
        followers: results,
        count: results.length,
        message: `Retrieved ${results.length} followers`,
      };
    },
  },

  get_following: {
    description: `Get the list of users that an account follows. If no handle is provided, returns who you follow.

Example: {"handle": "user.bsky.social", "limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'The handle to get following for (leave empty for yourself)',
        },
        limit: {
          type: 'number',
          description: 'Number of follows to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (
      args: { handle?: string; limit?: number },
      client: BlueskyClient
    ) => {
      const following = await client.getFollows(args.handle, args.limit || 50);

      const results = following.map((follow) => ({
        did: follow.did,
        handle: follow.handle,
        displayName: follow.displayName,
        avatar: follow.avatar,
      }));

      return {
        handle: args.handle || 'your account',
        following: results,
        count: results.length,
        message: `Retrieved ${results.length} accounts being followed`,
      };
    },
  },
};
