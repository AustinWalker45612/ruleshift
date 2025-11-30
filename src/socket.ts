// src/socket.ts
import { io, Socket } from "socket.io-client";

/**
 * Logic:
 * - If you are running locally (localhost), use your LOCAL backend.
 * - Otherwise (your deployed site), use the RENDER backend.
 */

const LOCAL_URL = "http://192.168.86.210:4000"; // your LAN server
const PROD_URL = "https://ruleshift-backend.onrender.com"; // Render URL

const SERVER_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? LOCAL_URL
    : PROD_URL;

export const socket: Socket = io(SERVER_URL, {
  transports: ["websocket"], // good for Render
  autoConnect: true,
});
