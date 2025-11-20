import { StreamVideoClient } from "@stream-io/video-react-sdk";

const apiBase = import.meta.env.VITE_BACKEND_URL; 

export const initStreamClient = async (userId, userName) => {

  const res = await fetch(`${apiBase}/stream/token/${userId}`);
  const data = await res.json();

  if (!data.token || !data.apiKey) {
    throw new Error("Failed to fetch Stream token");
  }
  const client = new StreamVideoClient({ apiKey: data.apiKey });
  const user = {
    id: userId,
    name: userName ||` User ${userId}`,// change one
    image: `https://getstream.io/random_svg/?id=${userId}&name=${userName}`,
  };
  await client.connectUser(user, data.token);
  console.log("✅ Stream user connected:", user);
  return client;
};