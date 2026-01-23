import { readFileSync } from 'fs';
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

// Helper to detect encoding from file path or data
function detectImageEncoding(pathOrData: string): 'image/jpeg' | 'image/png' {
  // Check file extension first
  const lowerPath = pathOrData.toLowerCase();
  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  // Check data URL prefix
  if (pathOrData.startsWith('data:image/png')) {
    return 'image/png';
  }
  if (pathOrData.startsWith('data:image/jpeg') || pathOrData.startsWith('data:image/jpg')) {
    return 'image/jpeg';
  }
  // Default to JPEG
  return 'image/jpeg';
}

// Helper to load image from path or base64
function loadImage(image: { data?: string; path?: string; alt?: string }): {
  data: Uint8Array;
  alt?: string;
  encoding: string;
} {
  if (image.path) {
    // Read from file path
    const fileData = readFileSync(image.path);
    return {
      data: new Uint8Array(fileData),
      alt: image.alt,
      encoding: detectImageEncoding(image.path),
    };
  } else if (image.data) {
    // Convert from base64
    return {
      data: base64ToUint8Array(image.data),
      alt: image.alt,
      encoding: detectImageEncoding(image.data),
    };
  }
  throw new Error('Image must have either "path" or "data" property');
}

export const postingTools = {
  post: {
    description: `Post to Bluesky. Supports text posts up to 300 characters, with automatic link and mention detection. Optionally attach up to 4 images.

Examples:
- Simple text: {"text": "Just shipped a new feature!"}
- With mention: {"text": "Great work @handle.bsky.social!"}
- With link: {"text": "Check this out https://example.com"}
- With image: {"text": "Check this out!", "images": [{"data": "base64...", "alt": "Description"}]}
- With image from file: {"text": "Check this out!", "images": [{"path": "/path/to/image.png", "alt": "Description"}]}`,
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
          description: 'Optional array of images to attach (max 4). Each image needs either a file path or base64-encoded data.',
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute file path to an image (PNG or JPEG)',
              },
              data: {
                type: 'string',
                description: 'Base64-encoded image data (can include data URL prefix)',
              },
              alt: {
                type: 'string',
                description: 'Alt text for accessibility',
              },
            },
          },
        },
      },
      required: ['text'],
    },
    handler: async (args: { text: string; images?: Array<{ data?: string; path?: string; alt?: string }> }, client: BlueskyClient) => {
      // Load images from path or base64
      const processedImages = args.images?.map((img) => loadImage(img));

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

  delete_post: {
    description: `Delete one of your posts. Provide the AT-URI of the post to delete.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post to delete',
        },
      },
      required: ['uri'],
    },
    handler: async (args: { uri: string }, client: BlueskyClient) => {
      await client.deletePost(args.uri);

      return {
        success: true,
        deleted_uri: args.uri,
        message: 'Post deleted successfully!',
      };
    },
  },

  quote_post: {
    description: `Quote post (repost with comment). Creates a new post that embeds the original post.

Example: {"uri": "at://did:plc:.../app.bsky.feed.post/...", "cid": "bafyrei...", "text": "This is so true!"}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the post to quote',
        },
        cid: {
          type: 'string',
          description: 'The CID of the post to quote',
        },
        text: {
          type: 'string',
          description: 'Your comment on the quoted post (max 300 characters)',
          maxLength: 300,
        },
      },
      required: ['uri', 'cid', 'text'],
    },
    handler: async (
      args: { uri: string; cid: string; text: string },
      client: BlueskyClient
    ) => {
      const result = await client.quotePost(args.text, args.uri, args.cid);

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        url: result.url,
        message: `Quote post created successfully! View at: ${result.url}`,
      };
    },
  },
};
