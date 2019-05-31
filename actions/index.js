const fetch = require('node-fetch');
const utils = require('../utils');

// Olapic API Config
const olapicAPIConfig = require('../config');

const loadMore = ({ ack, body, context, action }) => {
  // acknowledge the action
  ack();

  // parse user ID from the body
  const userId = body.user.id;
  const tokenAndChannel = {
    token: context.botToken,
    channel: body.container.channel_id,
  };

  // get headers from olapic API config
  const { headers } = olapicAPIConfig;
  fetch(action.value, {
    headers,
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
      const blocks = utils.buildImageBlocks({ mediaList, nextPageUrl });

      // post the page of results back to user
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        blocks,
      });
    })
    .catch(err => {
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        text:
          'Oops! Something went wrong with connecting with the Olapic API :slightly_frowning_face:',
      });
    });
};

const share = ({ context, action, ack, body }) => {
  // acknowledge the action
  ack();

  // parse variables for later use
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

  // get header from olapic API config
  const { headers } = olapicAPIConfig;
  fetch(`${olapicAPIConfig.host}/media/?ids=${mediaId}`, {
    headers,
  })
    .then(response => response.json())
    .then(json => {
      const media = json.data.media[mediaId];

      // build blocks - use array format since buildImageBlocks only accepts arrays
      const blocks = buildImageBlocks({ userId, mediaList: [media] });

      // post message to channel
      app.client.chat
        .postMessage({
          token: context.botToken,
          channel: selected_channel,
          blocks,
        })
        .then(() =>
          app.client.chat.postEphemeral({
            ...tokenAndChannel,
            user: userId,
            text: `Cool! You just shared *@${userHandle}*'s ${mediaSource} image with <#${selected_channel}> :thumbsup::hugging_face:`,
          })
        )
        .catch(err => {
          app.client.chat.postEphemeral({
            ...tokenAndChannel,
            user: userId,
            text: err,
          });
        });
    })
    .catch(err => {
      app.client.chat.postEphemeral({
        ...tokenAndChannel,
        user: userId,
        text:
          'Oops! Something went wrong with connecting with the Olapic API :slightly_frowning_face:',
      });
    });
};

module.exports = {
  loadMore,
  share,
};
