import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  "mailto:test@test.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export default webpush;