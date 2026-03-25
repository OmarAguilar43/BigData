import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBHBIyyf70o2W0NFssw0yS-k-DEFjuhov8",
    authDomain: "sensor-dht11-199d3.firebaseapp.com",
    databaseURL: "https://sensor-dht11-199d3-default-rtdb.firebaseio.com",
    projectId: "sensor-dht11-199d3",
    storageBucket: "sensor-dht11-199d3.firebasestorage.app",
    messagingSenderId: "1038293110153",
    appId: "1:1038293110153:web:385f07f8d4b42325afa558"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { db };
