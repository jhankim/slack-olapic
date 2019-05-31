# slack-olapic

Olapic Integration for Slack! Inspire customers by showcasing quality UGC from your Olapic Media Library.

# Dependencies

- [Node.js](https://nodejs.org/en/)
- [Bolt](https://slack.dev/bolt/concepts)

# Local development

Since this app is currently under development and is not published in the Slack App Directory, the easiest way to install this integration into your workspace is to [create a new Slack app](https://api.slack.com/apps?new_app=1), and follow the instructions below.

## Ngrok

[Ngrok](http://ngrok.com) is a great tool to tunnel applications that are running locally to a public URL. Using ngrok, we can tunnel application to a public URL before deploying it to a server. We will be using the public URL tunneled by `ngrok` to configure the Slack app in the next section.

1. [Download ngrok](https://ngrok.com/download), follow the installation instructions, and tunnel the application to a public URL using the following command (the app will be served locally using port 3000):

   ```bash
   $ ngrok http 3000
   ```

2. Now you have successfully created the `ngrok` tunnel and the CLI will display the URL that the application is being served on:

   <img src="https://cl.ly/36890b1ba568/Image%202019-05-31%20at%2010.46.58%20AM.png" width="600" />

## Configuring Slack App

Now that you have the public URL, create a new Slack app and configure the app following the below instructions.

1. Create a new Bot User under _Bot Users_ section under Features. You can name it whatever you'd like! This will create a `Bot User OAuth Access Token` used by the app.

1. Enable Interactvity under _Interactive Components_ section, then type in the public URL provided by `ngrok` with `/slack/events` as the route into the Request URL field:

   <img src="https://cl.ly/2f0172218201/Image%2525202019-05-31%252520at%25252010.56.54%252520AM.png" width="600" />

1. Create a new slash commmand under the _Slash Commands_ section with the following values:

   - Command: `/olapic-local`
     - The app you created represents the local instance of the application, so we're using a command specific to the local instance of the app. `/olapic` should be used when configuring the live instance of the application)
   - Request URL: `https://<ngrok-hash>.ngrok.io/slack/events`
     - Replace `<ngrok-hash>` with the hostname provided by ngrok on runtime.
   - Short Description: `Search for UGC!`
   - Usage Hint: `[keywords]`

   <img src="https://cl.ly/2a4e500246c4/Image%202019-05-31%20at%2011.12.47%20AM.png" width="600" />

1. Enable Events under _Event Subscriptions_ section, then type in the public URL provided by `ngrok` with `/slack/events` as the route into the Request URL field:

   <img src="https://cl.ly/b82e6352f194/Image%202019-05-31%20at%2011.11.19%20AM.png" width="600" />

1. The app will require specific permission scopes in order to respond to slash commands and send messages. Add the following permission scopes under _OAuth & Permissions_ section:

   `channels:read`, `chat:write:bot`, `incoming-webhook`, `bot`, `commands`

Now that you configured the app, it's time to run the app locally!

## Run the application locally

1. To run the application locally, clone the repository and run `npm install` to install the dependencies:

   ```bash
   $ git clone https://github.com/jhankim/slack-olapic.git
   $ cd slack-olapic
   $ npm i
   ```

2. This app uses `dotenv` for different environment variables we need for running the application. Create a file called `.env` in the root directory of the repository and fill out the required environment variables:

   ```bash
   SLACK_BOT_TOKEN=<bot-oauth-token> #available in OAuth Tokens & Redirect URLs under the app settings
   SLACK_SIGNING_SECRET=<slack-app-signing-secret> #available in Basic Information under the app settings
   OLAPIC_API_KEY=<olapic-content-api-key>
   OLAPIC_API_HOST=https://content.photorank.me/v1
   ```

3. Once the dependencies are installed, run the server locally:

   ```bash
   $ npm run start:dev
   ```

4. Now the server is running locally on port 3000!
   <img src="https://cl.ly/37208bb63b75/Image%202019-05-31%20at%2010.51.32%20AM.png" width="600" />

## Testing the application

The app responds to the slash command `/olapic-local [keywords]` in any channels that the app is installed.

You can test out the app by searching with relevant keywords using the command.
