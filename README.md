# blueskyyyyy MCP Server

A Model Context Protocol (MCP) server for Bluesky. Enables AI assistants like Claude to post, search, engage, and manage your Bluesky presence.

Built by [@jonthebeef](https://bsky.app/profile/jonthebeef.bsky.social) with Claude Code.

## Why This MCP?

Saw [someone on Bluesky](https://bsky.app/profile/hydroxide.dev/post/3lmgtwzi4jk2m) say they tried every Bluesky MCP server on GitHub and couldn't get a single one working. Thought "how hard can it be?" - turns out not very. Built this in an afternoon with Claude Code for fun. It works. That's it.

## Features

### Posting & Content
- **post** - Create text posts (up to 300 chars) with auto-detection of links and mentions. Optionally attach up to 4 images.
- **reply** - Reply to any post
- **create_thread** - Post multiple connected posts as a thread
- **quote_post** - Quote post (repost with your own comment)
- **delete_post** - Delete one of your posts

### Feeds & Timeline
- **get_timeline** - Get your home feed
- **get_author_feed** - Get posts from any user
- **get_post_thread** - Get full conversation threads with replies

### Search & Discovery
- **search_posts** - Search all of Bluesky by keyword
- **get_profile** - Get profile info for any user
- **get_followers** - See who follows an account
- **get_following** - See who an account follows
- **get_notifications** - Get your notifications (likes, reposts, follows, mentions, replies)
- **get_suggested_follows** - Get suggested accounts to follow based on your network

### Engagement
- **like_post** / **unlike_post** - Like and unlike posts
- **repost** / **delete_repost** - Repost content
- **follow** / **unfollow** - Follow and unfollow users
- **get_post_likes** - See who liked a post
- **get_post_reposts** - See who reposted a post

### Profile Management
- **update_profile** - Update your display name and/or bio
- **update_avatar** - Update your profile picture (from file path or base64)

### Lists
- **get_lists** - Get lists created by an account
- **get_list** - Get members of a specific list
- **create_list** - Create a new curate list or mod list
- **add_to_list** - Add a user to one of your lists
- **remove_from_list** - Remove a user from a list

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/jonthebeef/blueskyyyyy.git
cd blueskyyyyy
npm install
npm run build
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Bluesky credentials:

```
BLUESKY_HANDLE=yourname.bsky.social
BLUESKY_PASSWORD=your-password
```

### 3. Add to Claude Code

Add to your `~/.config/claude-code/mcp_config.json`:

```json
{
  "mcpServers": {
    "bluesky": {
      "command": "node",
      "args": ["/path/to/blueskyyyyy/dist/index.js"],
      "env": {
        "BLUESKY_HANDLE": "yourname.bsky.social",
        "BLUESKY_PASSWORD": "your-password"
      }
    }
  }
}
```

Replace `/path/to/blueskyyyyy` with the actual path where you cloned this repo.

### 4. Restart Claude Code

Restart Claude Code to load the MCP server.

## Usage Examples

Once configured, use natural language with Claude:

### Posting
```
"Post to Bluesky: Just shipped a new feature!"
"Reply to that post with uri at://... saying thanks"
"Create a thread about my coding journey today"
```

### Feeds & Discovery
```
"Show me my Bluesky timeline"
"What has @user.bsky.social been posting?"
"Search Bluesky for posts about AI coding"
```

### Engagement
```
"Like the post at uri at://..."
"Who follows me on Bluesky?"
"Follow @interesting-person.bsky.social"
"Show me who liked my latest post"
```

### Analytics
```
"Get my profile stats"
"How many followers do I have?"
"What's my most popular recent post?"
```

## Tools Reference

### post

Post to Bluesky with automatic link/mention detection. Optionally attach up to 4 images.

**Parameters:**
- `text` (string, required) - Post content (max 300 chars)
- `images` (array, optional) - Array of images to attach (max 4). Each image needs either:
  - `path` (string) - Absolute file path to an image (PNG or JPEG)
  - `data` (string) - Base64-encoded image data
  - `alt` (string, optional) - Alt text for accessibility

**Examples:**

Text only:
```json
{
  "text": "Just built a Bluesky MCP server! 🚀"
}
```

With image from file:
```json
{
  "text": "Check out this screenshot!",
  "images": [{"path": "/path/to/image.png", "alt": "Screenshot description"}]
}
```

With base64 image:
```json
{
  "text": "Here's a photo",
  "images": [{"data": "iVBORw0KGgo...", "alt": "Photo description"}]
}
```

### reply

Reply to an existing post.

**Parameters:**
- `uri` (string, required) - AT-URI of the post
- `cid` (string, required) - CID of the post
- `text` (string, required) - Reply text (max 300 chars)

**Example:**
```json
{
  "uri": "at://did:plc:abc123.../app.bsky.feed.post/xyz789",
  "cid": "bafyreiabc123...",
  "text": "Great post!"
}
```

### create_thread

Create a multi-post thread.

**Parameters:**
- `posts` (array, required) - Array of post texts (2-25 posts, max 300 chars each)

**Example:**
```json
{
  "posts": [
    "Thread about building in public 1/3",
    "First, you need to overcome the fear of sharing WIP code 2/3",
    "Then just ship it and iterate based on feedback 3/3"
  ]
}
```

### search_posts

Search Bluesky for posts matching a query.

**Parameters:**
- `query` (string, required) - Search term
- `limit` (number, optional) - Results to return (max 100)

**Example:**
```json
{
  "query": "MCP servers",
  "limit": 25
}
```

### get_profile

Get profile information for a user.

**Parameters:**
- `handle` (string, optional) - User handle (leave empty for yourself)

**Example:**
```json
{
  "handle": "user.bsky.social"
}
```

### delete_post

Delete one of your posts.

**Parameters:**
- `uri` (string, required) - The AT-URI of the post to delete

**Example:**
```json
{
  "uri": "at://did:plc:abc123.../app.bsky.feed.post/xyz789"
}
```

### quote_post

Quote post (repost with your own comment).

**Parameters:**
- `uri` (string, required) - The AT-URI of the post to quote
- `cid` (string, required) - The CID of the post to quote
- `text` (string, required) - Your comment (max 300 chars)

**Example:**
```json
{
  "uri": "at://did:plc:abc123.../app.bsky.feed.post/xyz789",
  "cid": "bafyreiabc123...",
  "text": "This is so true!"
}
```

### get_notifications

Get your notifications.

**Parameters:**
- `limit` (number, optional) - Number of notifications (default: 50, max: 100)

**Example:**
```json
{
  "limit": 50
}
```

### get_suggested_follows

Get suggested accounts to follow.

**Parameters:**
- `limit` (number, optional) - Number of suggestions (default: 25, max: 100)

**Example:**
```json
{
  "limit": 25
}
```

### update_profile

Update your display name and/or bio.

**Parameters:**
- `displayName` (string, optional) - New display name
- `description` (string, optional) - New bio

**Example:**
```json
{
  "description": "Product person. Vibe coder. Manchester."
}
```

### update_avatar

Update your profile picture.

**Parameters:**
- `path` (string, optional) - File path to image (PNG or JPEG)
- `data` (string, optional) - Base64-encoded image data

**Example:**
```json
{
  "path": "/path/to/avatar.jpg"
}
```

### get_lists

Get lists created by an account.

**Parameters:**
- `handle` (string, optional) - User handle (leave empty for yourself)
- `limit` (number, optional) - Number of lists (default: 50, max: 100)

**Example:**
```json
{
  "handle": "user.bsky.social"
}
```

### create_list

Create a new list.

**Parameters:**
- `name` (string, required) - List name
- `description` (string, required) - List description
- `purpose` (string, required) - "curatelist" or "modlist"

**Example:**
```json
{
  "name": "Tech People",
  "description": "Interesting tech accounts",
  "purpose": "curatelist"
}
```

### add_to_list

Add a user to a list.

**Parameters:**
- `list_uri` (string, required) - The AT-URI of the list
- `did` (string, required) - The DID of the user to add

**Example:**
```json
{
  "list_uri": "at://did:plc:.../app.bsky.graph.list/abc",
  "did": "did:plc:xyz123..."
}
```

## Understanding URIs and CIDs

Bluesky uses AT Protocol which identifies posts with:
- **URI** (AT-URI): Unique identifier like `at://did:plc:abc.../app.bsky.feed.post/xyz`
- **CID**: Content identifier (cryptographic hash)

You'll get these from search results, timelines, etc. and use them for replies, likes, reposts.

## Rate Limits

Bluesky is generally permissive with rate limits, but:
- Be respectful and don't spam
- Add delays between bulk operations
- The thread tool automatically adds 1s delays

## Troubleshooting

### "Login failed"
- Check that your handle is correct (include .bsky.social)
- Verify your password is correct

### "Invalid AT-URI"
- URIs must start with `at://`
- Get URIs from search results or timeline, don't construct them manually

### "Record not found"
- The post may have been deleted
- Check that you copied the full URI and CID

## Building Automations

This MCP makes it easy to build:

**Auto-poster** - Post your git commits daily
```javascript
// Get commits, generate summary, post to Bluesky
const commits = await getCommits();
const summary = summarizeWithAI(commits);
await post({ text: summary });
```

**Mention monitor** - Get notified of replies
```javascript
// Search for mentions of your handle
const mentions = await search_posts({ query: "@yourhandle" });
```

**Analytics tracker** - Track growth over time
```javascript
const profile = await get_profile();
console.log(`Followers: ${profile.followersCount}`);
```

## Resources

- [Bluesky](https://bsky.app/)
- [AT Protocol Docs](https://docs.bsky.app/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT

**Sources:**
- [Complete Guide to Bluesky API Integration](https://www.ayrshare.com/complete-guide-to-bluesky-api-integration-authorization-posting-analytics-comments/)
- [Posting via the Bluesky API](https://docs.bsky.app/blog/create-post)
- [AT Protocol XRPC API](https://docs.bsky.app/docs/api/at-protocol-xrpc-api)
- [app.bsky.feed.searchPosts](https://docs.bsky.app/docs/api/app-bsky-feed-search-posts)
- [app.bsky.feed.getTimeline](https://docs.bsky.app/docs/api/app-bsky-feed-get-timeline)
