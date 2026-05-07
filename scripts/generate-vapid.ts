import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n--- NEW VAPID KEYS GENERATED ---\n');
console.log('VAPID_PUBLIC_KEY:', vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY:', vapidKeys.privateKey);
console.log('\n--- END ---\n');
