import { BlueskyClient } from '../client.js';

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to detect image encoding from base64 data URL or raw data
function detectImageEncoding(base64: string): 'image/jpeg' | 'image/png' {
  if (base64.startsWith('data:image/png')) {
    return 'image/png';
  }
  if (base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg')) {
    return 'image/jpeg';
  }
  // Check magic bytes if no data URL prefix
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  const decoded = atob(data.slice(0, 16));
  // PNG magic bytes: 137 80 78 71
  if (decoded.charCodeAt(0) === 137 && decoded.charCodeAt(1) === 80) {
    return 'image/png';
  }
  // Default to JPEG
  return 'image/jpeg';
}

export const postingTools = {
  post: {
    description: `Post to Bluesky. Supports text posts up to 300 characters, with automatic link and mention detection. Optionally attach up to 4 images.

Examples:
- Simple text: {"text": "Just shipped a new feature!"}
- With mention: {"text": "Great work @handle.bsky.social!"}
- With link: {"text": "Check this out https://example.com"}
- With image: {"text": "Check this out!", "images": [{"data": "base64...", "alt": "Description"}]}`,
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text content of the post (max 300 characters)',
          maxLength: 300,
        },
        images: {
          type: 'array',
          description: 'Optional array of images to attach (max 4). Each image needs base64-encoded data.',
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              data: {
                type: 'string',
                description: 'Base64-encoded image data (can include data URL prefix)',
              },
              alt: {
                type: 'string',
                description: 'Alt text for accessibility',
              },
            },
            required: ['data'],
          },
        },
      },
      required: ['text'],
    },
    handler: async (args: { text: string; images?: Array<{ data: string; alt?: string }> }, client: BlueskyClient) => {
      // Convert base64 images to Uint8Array format the client expects
      const processedImages = args.images?.map((img) => ({
        data: base64ToUint8Array(img.data),
        alt: img.alt,
        encoding: detectImageEncoding(img.data),
      }));

      const result = await client.post(args.text, {
        images: processedImages,
      });

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
