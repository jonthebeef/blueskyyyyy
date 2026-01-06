import { BlueskyClient } from '../client.js';

export const feedTools = {
  get_timeline: {
    description: `Get your home timeline feed. Shows posts from accounts you follow.

Example: {"limit": 20}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of posts to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (args: { limit?: number }, client: BlueskyClient) => {
      const feed = await client.getTimeline(args.limit || 50);

      const posts = feed.map((item) => ({
        uri: item.post.uri,
        cid: item.post.cid,
        author: {
          handle: item.post.author.handle,
          displayName: item.post.author.displayName,
        },
        text: (item.post.record as any).text,
        replyCount: item.post.replyCount,
        repostCount: item.post.repostCount,
        likeCount: item.post.likeCount,
        indexedAt: item.post.indexedAt,
      }));

      return {
        posts,
        count: posts.length,
        message: `Retrieved ${posts.length} posts from your timeline`,
      };
    },
  },

  get_author_feed: {
    description: `Get posts from a specific user's profile.

Example: {"handle": "user.bsky.social", "limit": 25}`,
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'The handle of the user (e.g., user.bsky.social)',
        },
        limit: {
          type: 'number',
          description: 'Number of posts to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
      required: ['handle'],
    },
    handler: async (
      args: { handle: string; limit?: number },
      client: BlueskyClient
    ) => {
      const feed = await client.getAuthorFeed(args.handle, args.limit || 50);

      const posts = feed.map((item) => ({
        uri: item.post.uri,
        cid: item.post.cid,
        text: (item.post.record as any).text,
        replyCount: item.post.replyCount,
        repostCount: item.post.repostCount,
        likeCount: item.post.likeCount,
        indexedAt: item.post.indexedAt,
      }));

      return {
        handle: args.handle,
        posts,
        count: posts.length,
        message: `Retrieved ${posts.length} posts from @${args.handle}`,
      };
    },
  },

  get_post_thread: {
    description: `Get a full post thread including the original post and all replies.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post',
        },
      },
      required: ['uri'],
    },
    handler: async (args: { uri: string }, client: BlueskyClient) => {
      const thread = await client.getPostThread(args.uri);

      const formatThread = (threadData: any): any => {
        if (!threadData || threadData.$type === 'app.bsky.feed.defs#notFoundPost') {
          return null;
        }

        return {
          uri: threadData.post.uri,
          cid: threadData.post.cid,
          author: {
            handle: threadData.post.author.handle,
            displayName: threadData.post.author.displayName,
          },
          text: (threadData.post.record as any).text,
          replyCount: threadData.post.replyCount,
          repostCount: threadData.post.repostCount,
          likeCount: threadData.post.likeCount,
          replies: threadData.replies?.map(formatThread).filter(Boolean) || [],
        };
      };

      const formattedThread = formatThread(thread);

      return {
        thread: formattedThread,
        message: 'Thread retrieved successfully',
      };
    },
  },
};
