import { io, Socket } from "socket.io-client";

const LOCAL_URL = "http://192.168.86.210:4000";
const PROD_URL = "https://ruleshift-backend.onrender.com";

const SERVER_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? LOCAL_URL
    : PROD_URL;

export const socket: Socket = io(SERVER_URL, {
  transports: ["websocket"],
  autoConnect: true,
});
