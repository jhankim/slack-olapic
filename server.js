require('dotenv').config();
const fetch = require('node-fetch');
const moment = require('moment');
const { App } = require('@slack/bolt');

// Init Bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * Build image blocks with provided data
 * @param {object}
 */
const buildImageBlocks = ({ command, userId, mediaList, nextPageUrl }) => {
  // start with empty array
  let blocks = [];

  // originating context is command
  if (command) {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Here's the search result for: *${command.text}*\n\n`,
        },
      },
      {
        type: 'divider',
      }
    );
  }

  // originating context is from user share
  if (userId) {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${userId}> shared an image!\n\n`,
        },
      },
      {
        type: 'divider',
      }
    );
  }

  mediaList.forEach(media => {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Source:* ${media.source}${
            media.original_source ? `\n*Source URL:* ${media.original_source}` : ''
          }\n*User handle*: @${media.user.username}\n*Caption:* ${
            media.caption
          }\n*Keywords:* ${media.keywords.join(', ')}\n*Date approved*: ${moment(
            media.date_approved
          ).format('YYYY-MM-DD h:mma')}`,
        },
      },
      {
        type: 'image',
        title: {
          type: 'plain_text',
          text: media.images.mobile,
        },
        block_id: `${media.id}`,
        image_url: media.images.mobile,
        alt_text: 'caption goes here!',
      },
      {
        type: 'actions',
        elements: [
          {
            action_id: `share:${media.source}:${media.user.username}:${media.id}`,
            type: 'channels_select',
            placeholder: {
              type: 'plain_text',
              text: 'Share with a channel',
              emoji: true,
            },
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View full resolution image',
              emoji: true,
            },
            url: media.images.original,
            action_id: 'view_full',
          },
        ],
      },
      {
        type: 'divider',
      }
    );
  });

  // If next page URL available, add a button
  if (nextPageUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'load_more',
          value: nextPageUrl,
          style: 'primary',
          text: {
            type: 'plain_text',
            text: 'Load more search results',
            emoji: true,
          },
        },
      ],
    });
  }

  return blocks;
};

/**
 * Slash command handler
 */
const commandText = process.env.NODE_ENV === 'production' ? '/olapic' : '/olapic-local';
app.command(commandText, ({ payload, context, command, ack, say }) => {
  // acknowledge the action
  ack();

  // start magic
  const keywordArray = command.text.split(','),
    apiPayload = {
      items_per_page: 5,
      sort: [
        {
          key: 'date_approved',
          order: 'desc',
        },
      ],
      filters: {
        keywords: {
          values: keywordArray,
          condition: 'or',
        },
        stream_name: {
          value: command.text,
          condition: 'or',
        },
      },
    },
    tokenAndChannel = {
      token: context.botToken,
      channel: payload.channel_id,
    };
  fetch('https://content.photorank.me/v1/media/search', {
    method: 'POST',
    headers: {
      Authorization: `ApiKey token="${process.env.OLAPIC_API_KEY}"`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiPayload),
  })
    .then(response => response.json())
    .then(json => {
      const mediaList = json.data.media;
      const nextPageUrl = json.data.pagination.next;
      if (mediaList.length === 0) {
        app.client.chat.postEphemeral({
          ...tokenAndChannel,
          user: payload.user_id,
          text: `Sorry! I couldn't find any photos matching *${
            command.text
          }* :slightly_frowning_face:`,
        });
        return;
      }
      // create blocks
      const blocks = buildImageBlocks({ command, mediaList, nextPageUrl });

      // post
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: payload.user_id,
        blocks,
      });
    })
    .catch(err => {
      say(`${err}`);
    });
});

/**
 * Action handler - load_more - Loads more content
 */
app.action('load_more', ({ ack, body, context, action }) => {
  ack();
  const { action_id, value } = action;
  const userId = body.user.id;

  const tokenAndChannel = {
    token: context.botToken,
    channel: body.container.channel_id,
  };

  fetch(action.value, {
    headers: {
      Authorization: `ApiKey token="${process.env.OLAPIC_API_KEY}"`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(json => {
      const mediaList = json.data.media;
      const nextPageUrl = json.data.pagination.next;
      if (mediaList.length === 0) {
        app.client.chat.postEphemeral({
          ...tokenAndChannel,
          user: userId,
          text: `Sorry! There are no more photos.`,
        });
        return;
      }
      // create blocks
      const blocks = buildImageBlocks({ mediaList, nextPageUrl });

      // post
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        blocks,
      });
    });
});

/**
 * Action handler - view_full - Empty handler to acknowledge action
 */
app.action('view_full', ({ ack }) => {
  ack();
});

/**
 * Action handler - share - Shares an image with channel
 */
app.action(/^(share:).*/, ({ context, action, ack, body }) => {
  const { action_id, selected_channel } = action,
    userId = body.user.id,
    parsedActionId = action_id.split(':'),
    mediaSource = parsedActionId[1],
    userHandle = parsedActionId[2],
    mediaId = parsedActionId[3],
    tokenAndChannel = {
      token: context.botToken,
      channel: body.container.channel_id,
    };

  fetch(`https://content.photorank.me/v1/media/?ids=${mediaId}`, {
    headers: {
      Authorization: `ApiKey token="${process.env.OLAPIC_API_KEY}"`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(json => {
      const media = json.data.media[mediaId];

      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        text: `Cool! You just shared *@${userHandle}*'s ${mediaSource} image with <#${selected_channel}> :thumbsup::hugging_face:`,
      });

      // build blocks - use array format since buildImageBlocks only accepts arrays
      const blocks = buildImageBlocks({ userId, mediaList: [media] });

      // post message to channel
      app.client.chat.postMessage({
        token: context.botToken,
        channel: selected_channel,
        blocks,
      });
    });

  // Acknowledge action request
  ack();
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
