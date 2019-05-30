require('dotenv').config();
const fetch = require('node-fetch');
const moment = require('moment');
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const buildImageBlocks = ({ command, mediaList, nextPageUrl }) => {
  let blocks = [];

  if (command) {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Here's the result for: *${command.text}*\n\n`,
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
          text: `*Source:* ${media.source}\n*Username*: @${media.user.username}\n*Caption:* ${
            media.caption
          }\n*Keywords:* ${media.keywords.join(', ')}\n*Date approved*: ${moment(
            media.date_approved
          ).format('YYYY-MM-DD h:mma')}${media.original_source &&
            `\n*URL:* ${media.original_source}`}`,
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
        ],
      },
      {
        type: 'divider',
      }
    );
  });

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

  return blocks;
};

const commandText = process.env.NODE_ENV === 'production' ? '/olapic' : '/olapic-local';
app.command(commandText, ({ payload, context, command, ack, say }) => {
  // Acknowledge the action
  ack();

  // Start magic
  const keywordArray = command.text.split(',');
  const apiPayload = {
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
  };
  const tokenAndChannel = {
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
      let blocks = buildImageBlocks({ mediaList, nextPageUrl });

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

app.action('load_more', ({ ack, body, context, payload, action }) => {
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
      let blocks = buildImageBlocks({ mediaList, nextPageUrl });

      // post
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        blocks,
      });
    });
});

app.action(/^(share:).*/, ({ context, payload, action, ack, say, body }) => {
  const { action_id, selected_channel } = action;
  const userId = body.user.id;
  const mediaSource = action_id.split(':')[1];
  const userHandle = action_id.split(':')[2];
  const mediaId = action_id.split(':')[3];
  const tokenAndChannel = {
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
      app.client.chat.postMessage({
        token: context.botToken,
        channel: selected_channel,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<@${userId}> shared an image!\n\n`,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Source:* ${media.source}\n*Username*: @${media.user.username}\n*Caption:* ${
                media.caption
              }\n*Keywords:* ${media.keywords.join(', ')}\n*Date approved*: ${moment(
                media.date_approved
              ).format('YYYY-MM-DD h:mma')}${media.original_source &&
                `\n*URL:* ${media.original_source}`}`,
            },
          },
          {
            type: 'image',
            title: {
              type: 'plain_text',
              text: media.images.normal,
            },
            block_id: `${media.id}`,
            image_url: media.images.normal,
            alt_text: 'caption goes here!',
          },
        ],
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
