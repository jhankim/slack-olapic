const fetch = require('node-fetch');
const utils = require('../utils');

// Olapic API Config
const olapicAPIConfig = require('../config');

const main = ({ payload, context, command, ack, say }) => {
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

  // get headers from olapic API config
  const { headers } = olapicAPIConfig;
  fetch(`${olapicAPIConfig.host}/media/search`, {
    method: 'POST',
    headers,
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
      const blocks = utils.buildImageBlocks({ command, mediaList, nextPageUrl });

      // post
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: payload.user_id,
        blocks,
      });
    })
    .catch(err => {
      console.log(err);
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        text:
          'Oops! Something went wrong with connecting with the Olapic API :slightly_frowning_face:',
      });
    });
};

module.exports = {
  main,
};
