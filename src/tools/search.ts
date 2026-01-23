import { readFileSync } from 'fs';
import { BlueskyClient } from '../client.js';

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
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
  const lowerPath = pathOrData.toLowerCase();
  if (lowerPath.endsWith('.png') || pathOrData.startsWith('data:image/png')) {
    return 'image/png';
  }
  return 'image/jpeg';
}

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

  get_notifications: {
    description: `Get your notifications (likes, reposts, follows, mentions, replies).

Example: {"limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of notifications to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (args: { limit?: number }, client: BlueskyClient) => {
      const notifications = await client.getNotifications(args.limit || 50);

      const results = notifications.map((notif: any) => ({
        uri: notif.uri,
        cid: notif.cid,
        reason: notif.reason, // like, repost, follow, mention, reply, quote
        author: {
          did: notif.author.did,
          handle: notif.author.handle,
          displayName: notif.author.displayName,
        },
        record: notif.record,
        isRead: notif.isRead,
        indexedAt: notif.indexedAt,
      }));

      return {
        notifications: results,
        count: results.length,
        message: `Retrieved ${results.length} notifications`,
      };
    },
  },

  get_suggested_follows: {
    description: `Get suggested accounts to follow based on your network.

Example: {"limit": 25}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of suggestions to retrieve (default: 25, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (args: { limit?: number }, client: BlueskyClient) => {
      const suggestions = await client.getSuggestedFollows(args.limit || 25);

      const results = suggestions.map((actor: any) => ({
        did: actor.did,
        handle: actor.handle,
        displayName: actor.displayName,
        description: actor.description,
        avatar: actor.avatar,
        followersCount: actor.followersCount,
        followsCount: actor.followsCount,
      }));

      return {
        suggestions: results,
        count: results.length,
        message: `Retrieved ${results.length} suggested accounts to follow`,
      };
    },
  },

  update_avatar: {
    description: `Update your profile avatar. Provide either a file path or base64-encoded image data.

Example with file: {"path": "/path/to/avatar.jpg"}
Example with base64: {"data": "base64..."}`,
    inputSchema: {
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
      },
    },
    handler: async (
      args: { path?: string; data?: string },
      client: BlueskyClient
    ) => {
      let imageData: Uint8Array;
      let encoding: string;

      if (args.path) {
        const fileData = readFileSync(args.path);
        imageData = new Uint8Array(fileData);
        encoding = detectImageEncoding(args.path);
      } else if (args.data) {
        imageData = base64ToUint8Array(args.data);
        encoding = detectImageEncoding(args.data);
      } else {
        throw new Error('Must provide either "path" or "data" for the avatar image');
      }

      await client.updateAvatar(imageData, encoding);

      return {
        success: true,
        message: 'Avatar updated successfully!',
      };
    },
  },

  get_lists: {
    description: `Get lists created by an account. If no handle provided, returns your own lists.

Example: {"handle": "user.bsky.social", "limit": 25}`,
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'The handle to get lists for (leave empty for yourself)',
        },
        limit: {
          type: 'number',
          description: 'Number of lists to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
    },
    handler: async (
      args: { handle?: string; limit?: number },
      client: BlueskyClient
    ) => {
      const lists = await client.getLists(args.handle, args.limit || 50);

      const results = lists.map((list: any) => ({
        uri: list.uri,
        cid: list.cid,
        name: list.name,
        description: list.description,
        purpose: list.purpose,
        listItemCount: list.listItemCount,
        indexedAt: list.indexedAt,
      }));

      return {
        handle: args.handle || 'your account',
        lists: results,
        count: results.length,
        message: `Retrieved ${results.length} lists`,
      };
    },
  },

  get_list: {
    description: `Get the members of a specific list.

Example: {"uri": "at://did:plc:.../app.bsky.graph.list/...", "limit": 50}`,
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The AT-URI of the list',
        },
        limit: {
          type: 'number',
          description: 'Number of members to retrieve (default: 50, max: 100)',
          maximum: 100,
        },
      },
      required: ['uri'],
    },
    handler: async (
      args: { uri: string; limit?: number },
      client: BlueskyClient
    ) => {
      const data = await client.getList(args.uri, args.limit || 50);

      const members = data.items.map((item: any) => ({
        uri: item.uri,
        subject: {
          did: item.subject.did,
          handle: item.subject.handle,
          displayName: item.subject.displayName,
        },
      }));

      return {
        list: {
          uri: data.list.uri,
          name: data.list.name,
          description: data.list.description,
          purpose: data.list.purpose,
        },
        members,
        count: members.length,
        message: `Retrieved ${members.length} members from list "${data.list.name}"`,
      };
    },
  },

  create_list: {
    description: `Create a new list. Purpose can be "curatelist" (for sharing interesting accounts) or "modlist" (for muting/blocking).

Example: {"name": "Tech People", "description": "Interesting tech accounts", "purpose": "curatelist"}`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the list',
        },
        description: {
          type: 'string',
          description: 'Description of the list',
        },
        purpose: {
          type: 'string',
          enum: ['curatelist', 'modlist'],
          description: 'Purpose of the list: curatelist (sharing) or modlist (moderation)',
        },
      },
      required: ['name', 'description', 'purpose'],
    },
    handler: async (
      args: { name: string; description: string; purpose: 'curatelist' | 'modlist' },
      client: BlueskyClient
    ) => {
      const result = await client.createList(args.name, args.description, args.purpose);

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        message: `List "${args.name}" created successfully!`,
      };
    },
  },

  add_to_list: {
    description: `Add a user to one of your lists. Provide the list URI and the user's DID.

Example: {"list_uri": "at://did:plc:.../app.bsky.graph.list/...", "did": "did:plc:..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        list_uri: {
          type: 'string',
          description: 'The AT-URI of the list',
        },
        did: {
          type: 'string',
          description: 'The DID of the user to add',
        },
      },
      required: ['list_uri', 'did'],
    },
    handler: async (
      args: { list_uri: string; did: string },
      client: BlueskyClient
    ) => {
      const result = await client.addToList(args.list_uri, args.did);

      return {
        success: true,
        listitem_uri: result.uri,
        message: 'User added to list successfully!',
      };
    },
  },

  remove_from_list: {
    description: `Remove a user from one of your lists. Provide the list item URI (not the list URI or user DID).

Example: {"listitem_uri": "at://did:plc:.../app.bsky.graph.listitem/..."}`,
    inputSchema: {
      type: 'object',
      properties: {
        listitem_uri: {
          type: 'string',
          description: 'The AT-URI of the list item record to delete',
        },
      },
      required: ['listitem_uri'],
    },
    handler: async (args: { listitem_uri: string }, client: BlueskyClient) => {
      await client.removeFromList(args.listitem_uri);

      return {
        success: true,
        message: 'User removed from list successfully!',
      };
    },
  },
};
