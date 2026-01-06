import { BlueskyClient } from '../client.js';

export const engagementTools = {
  like_post: {
    description: `Like a post on Bluesky. Provide the post URI and CID.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/...", "cid": "bafyrei..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post to like',
        },
        cid: {
          type: 'string',
          description: 'The CID of the post to like',
        },
      },
      required: ['uri', 'cid'],
    },
    handler: async (
      args: { uri: string; cid: string },
      client: BlueskyClient
    ) => {
      const result = await client.like(args.uri, args.cid);

      return {
        success: true,
        like_uri: result.uri,
        message: 'Post liked successfully!',
      };
    },
  },

  unlike_post: {
    description: `Remove a like from a post. Provide the URI of the like record (not the post).

Example: {"like_uri": "at://did:plc:.../app.bsky.feed.like/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        like_uri: {
          type: 'string',
          description: 'The AT-URI of the like record to delete',
        },
      },
      required: ['like_uri'],
    },
    handler: async (args: { like_uri: string }, client: BlueskyClient) => {
      await client.deleteLike(args.like_uri);

      return {
        success: true,
        message: 'Like removed successfully!',
      };
    },
  },

  repost: {
    description: `Repost (similar to retweet) a post on Bluesky.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/...", "cid": "bafyrei..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post to repost',
        },
        cid: {
          type: 'string',
          description: 'The CID of the post to repost',
        },
      },
      required: ['uri', 'cid'],
    },
    handler: async (
      args: { uri: string; cid: string },
      client: BlueskyClient
    ) => {
      const result = await client.repost(args.uri, args.cid);

      return {
        success: true,
        repost_uri: result.uri,
        message: 'Post reposted successfully!',
      };
    },
  },

  delete_repost: {
    description: `Delete a repost. Provide the URI of the repost record (not the original post).

Example: {"repost_uri": "at://did:plc:.../app.bsky.feed.repost/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        repost_uri: {
          type: 'string',
          description: 'The AT-URI of the repost record to delete',
        },
      },
      required: ['repost_uri'],
    },
    handler: async (args: { repost_uri: string }, client: BlueskyClient) => {
      await client.deleteRepost(args.repost_uri);

      return {
        success: true,
        message: 'Repost deleted successfully!',
      };
    },
  },

  follow: {
    description: `Follow a user on Bluesky. Provide their DID (decentralized identifier).

Example: {"did": "did:plc:..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        did: {
          type: 'string',
          description: 'The DID of the user to follow',
        },
      },
      required: ['did'],
    },
    handler: async (args: { did: string }, client: BlueskyClient) => {
      const result = await client.follow(args.did);

      return {
        success: true,
        follow_uri: result.uri,
        message: 'User followed successfully!',
      };
    },
  },

  unfollow: {
    description: `Unfollow a user. Provide the URI of the follow record.

Example: {"follow_uri": "at://did:plc:.../app.bsky.graph.follow/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        follow_uri: {
          type: 'string',
          description: 'The AT-URI of the follow record to delete',
        },
      },
      required: ['follow_uri'],
    },
    handler: async (args: { follow_uri: string }, client: BlueskyClient) => {
      await client.deleteFollow(args.follow_uri);

      return {
        success: true,
        message: 'User unfollowed successfully!',
      };
    },
  },

  get_post_likes: {
    description: `Get a list of users who liked a specific post.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/...", "limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post',
        },
        limit: {
          type: 'number',
          description: 'Number of likes to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
      required: ['uri'],
    },
    handler: async (
      args: { uri: string; limit?: number },
      client: BlueskyClient
    ) => {
      const likes = await client.getLikes(args.uri, args.limit || 50);

      const results = likes.map((like) => ({
        did: like.actor.did,
        handle: like.actor.handle,
        displayName: like.actor.displayName,
        indexedAt: like.indexedAt,
      }));

      return {
        uri: args.uri,
        likes: results,
        count: results.length,
        message: `Retrieved ${results.length} likes`,
      };
    },
  },

  get_post_reposts: {
    description: `Get a list of users who reposted a specific post.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/...", "limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post',
        },
        limit: {
          type: 'number',
          description: 'Number of reposts to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
      required: ['uri'],
    },
    handler: async (
      args: { uri: string; limit?: number },
      client: BlueskyClient
    ) => {
      const reposts = await client.getRepostedBy(args.uri, args.limit || 50);

      const results = reposts.map((repost) => ({
        did: repost.did,
        handle: repost.handle,
        displayName: repost.displayName,
      }));

      return {
        uri: args.uri,
        reposts: results,
        count: results.length,
        message: `Retrieved ${results.length} reposts`,
      };
    },
  },
};
