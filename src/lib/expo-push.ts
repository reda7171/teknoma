export async function sendPushNotification(expoPushToken: string, title: string, body: string, data: any = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    console.error('Invalid Expo Push Token:', expoPushToken);
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Error sending push notification:', await response.text());
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
