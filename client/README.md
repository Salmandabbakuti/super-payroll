## Push Notifications for Web3 Dapps

This is a simple example of how to use push notifications in a web3 dapp. It uses the [Push Protocol](https://push.org/) to receive push notifications(both persisted and real-time) from another dapp or channel.

#### Packages used

1. @pushprotocol/restapi - opt-in to channels, send and receive notifications to the user's Dapp

2. @pushprotocol/uiweb - to display the notification in the dapp

3. @pushprotocol/socket - to connect and receive real-time notifications from push's websocket server

#### Getting Persisted notifications:

```javascript
await PushAPI.user.getFeeds({
  user: "eip155:5:0xD8634C39BBFd4033c0d3289C4515275102423681", // user address in CAIP
  env: "staging", // or 'prod'
  page: 1,
  limit: 10,
  raw: true,
  spam: false
});
```

#### Getting Real-time notifications:

```javascript
import { createSocketConnection, EVENTS } from "@pushprotocol/socket";

const sdkSocket = createSocketConnection({
  user: `eip155:5:0xD8634C39BBFd4033c0d3289C4515275102423681`, // user address in CAIP
  env: "staging", // or 'prod'
  socketOptions: { autoConnect: true }
});

sdkSocket.on(EVENTS.USER_FEEDS, (notification) => {
  console.log("received a new notification:", notification);
});
```

#### Filtering notifications by channel:

```javascript
const notifications = await PushAPI.user.getFeeds({
  user: "eip155:5:0xD8634C39BBFd4033c0d3289C4515275102423681", // user address in CAIP
  env: "staging", // or 'prod'
  page: 1,
  limit: 10,
  raw: true,
  spam: false
});

const DECENTRAGRAM_CHANNEL_ADDRESS =
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
const decentragramNotifications = notifications.filter(
  ({ sender }) => sender === DECENTRAGRAM_CHANNEL_ADDRESS
);

console.log("DECENTRAGRAM notifications:", decentragramNotifications);
```

### Getting Started

> Note: Rename the .env.example file to .env and add your environment variables

```bash
yarn install
yarn start
```
