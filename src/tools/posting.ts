import { BlueskyClient } from '../client.js';

export const postingTools = {
  post: {
    description: `Post to Bluesky. Supports text posts up to 300 characters, with automatic link and mention detection.

Examples:
- Simple text: {"text": "Just shipped a new feature!"}
- With mention: {"text": "Great work @handle.bsky.social!"}
- With link: {"text": "Check this out https://example.com"}`,
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text content of the post (max 300 characters)',
          maxLength: 300,
        },
      },
      required: ['text'],
    },
    handler: async (args: { text: string }, client: BlueskyClient) => {
      const result = await client.post(args.text);

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        url: result.url,
        message: `Post created successfully! View at: ${result.url}`,
      };
    },
  },

  reply: {
    description: `Reply to a post on Bluesky. You must provide the URI and CID of the post you're replying to.

Example: {"uri": "at://did:plc:...", "cid": "bafyrei...", "text": "Great point!"}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post to reply to',
        },
        cid: {
          type: 'string',
          description: 'The CID of the post to reply to',
        },
        text: {
          type: 'string',
          description: 'The reply text (max 300 characters)',
          maxLength: 300,
        },
      },
      required: ['uri', 'cid', 'text'],
    },
    handler: async (
      args: { uri: string; cid: string; text: string },
      client: BlueskyClient
    ) => {
      const result = await client.post(args.text, {
        replyTo: { uri: args.uri, cid: args.cid },
      });

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        url: result.url,
        message: `Reply posted successfully! View at: ${result.url}`,
      };
    },
  },

  create_thread: {
    description: `Create a thread (multiple connected posts). Provide an array of text strings, and they'll be posted as a connected thread.

Example: {"posts": ["First post in the thread", "Second post", "Third post"]}`,
    inputSchema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: 300,
          },
          description: 'Array of post texts (max 300 chars each)',
          minItems: 2,
          maxItems: 25,
        },
      },
      required: ['posts'],
    },
    handler: async (args: { posts: string[] }, client: BlueskyClient) => {
      const results = [];
      let previousPost: { uri: string; cid: string } | undefined;

      for (const text of args.posts) {
        const result = await client.post(
          text,
          previousPost ? { replyTo: previousPost } : undefined
        );

        results.push({
          uri: result.uri,
          cid: result.cid,
          url: result.url,
        });

        previousPost = { uri: result.uri, cid: result.cid };

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        thread: results,
        count: results.length,
        first_post_url: results[0].url,
        message: `Thread created with ${results.length} posts! View at: ${results[0].url}`,
      };
    },
  },
};
