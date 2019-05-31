require('dotenv').config();
const { App } = require('@slack/bolt');

// actions, commands, utils
const actions = require('./actions');
const commands = require('./commands');

// Init Bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * Slash command handler
 */
const commandText = process.env.NODE_ENV === 'production' ? '/olapic' : '/olapic-local';
app.command(commandText, commands.main);

/**
 * Action handler - load_more - Loads more content
 */
app.action('load_more', actions.loadMore);

/**
 * Action handler - view_full - Empty handler to acknowledge action
 */
app.action('view_full', ({ ack }) => {
  ack();
});

/**
 * Action handler - share - Shares an image with channel
 */
app.action(/^(share:).*/, actions.share);

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
