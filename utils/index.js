const moment = require('moment');

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
          text: `<@${userId}> shared an image from Olapic!\n\n`,
        },
      },
      {
        type: 'divider',
      }
    );
  }

  // build the blocks!
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

module.exports = {
  buildImageBlocks,
};
