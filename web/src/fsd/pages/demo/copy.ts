export const DEMO_TITLE = "Get a demo";
export const DEMO_DESCRIPTION =
  "Ask for a host in the cabinet. Say which web server reports, and how. The collector does not change the request.";
export const DEMO_KICKER = "Demo";
export const DEMO_LEDE =
  "Tell us the web server and how it reports. We open a host in the cabinet and send the env file for that host. The request still reaches the application.";
export const DEMO_NAME = "Name";
export const DEMO_CHANNEL = "How to reply";
export const DEMO_EMAIL = "Email";
export const DEMO_TELEGRAM = "Telegram";
export const DEMO_WHATSAPP = "WhatsApp";
export const DEMO_TELEGRAM_HINT = "@username";
export const DEMO_WHATSAPP_HINT = "With the country code";
export const DEMO_HOST = "Web server";
export const DEMO_HOST_HINT = "shop.example";
export const DEMO_MESSAGE = "How it reports";
export const DEMO_MESSAGE_HINT = "OpenResty, the Linux daemon, or Coolify.";
export const DEMO_SUBMIT = "Send";
export const DEMO_SENT = "The note is in. We will write back about a host for your server.";
export const DEMO_ERROR = "The note did not go through. Try again in a minute.";
export const DEMO_BUSY = "Too many notes from here. Try again later.";
export const DEMO_BAD = "Check the name, the contact, and the note.";
export const DEMO_INTEREST = "This note is about";

export function demoText() {
  return [DEMO_TITLE, DEMO_DESCRIPTION, DEMO_LEDE, DEMO_NAME, DEMO_CHANNEL, DEMO_EMAIL, DEMO_TELEGRAM, DEMO_WHATSAPP, DEMO_HOST, DEMO_MESSAGE, DEMO_SENT].join(" ");
}
